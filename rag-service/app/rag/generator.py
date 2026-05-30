"""
Answer generator (Plan 7) — the generation step of the RAG pipeline.

Takes one ISQ question plus the retriever's top-k chunks and has Claude draft a
grounded, vendor-appropriate answer via a forced `submit_answer` tool call. The
tool guarantees schema-valid JSON back: the answer, the citations it used, and an
honest four-dimension self-score (Plan 8 turns those into a single confidence
scalar). A citation lint penalises any cited source the model didn't actually get.

The static system block (rules + few-shot examples) is constant across every
question in a questionnaire run, so it is marked for ephemeral prompt caching —
questions 2..N of an ISQ re-read it cheaply instead of re-sending the bulk of the
prompt tokens.
"""

import json
import logging
import re
import time
from typing import Any

from anthropic import Anthropic

from app.core.config import settings
from app.core.llm import create_message
from app.core.pricing import rates_for
from app.core.isq_prompts import (
    ANSWER_FEW_SHOTS,
    ANSWER_SYSTEM_PROMPT,
    SUBMIT_ANSWER_TOOL,
    build_answer_user_prompt,
    format_chunks_for_prompt,
)

logger = logging.getLogger(__name__)

# The cached static prefix: rules + worked examples, identical for every question.
_SYSTEM_BLOCK = ANSWER_SYSTEM_PROMPT + "\n\n" + ANSWER_FEW_SHOTS

# Returned when nothing cleared the retrieval floor — deterministic, no LLM call.
_NO_SOURCE_ANSWER = (
    "Northstar Labs cannot provide a grounded answer to this question from our "
    "published policy documents. Please contact us directly to discuss this area."
)

# The four self-score dimensions the confidence aggregator requires (and their order).
_SCORE_DIMENSIONS = ("cites_policy", "on_topic", "vendor_tone", "complete")

# Anti-corruption layer (v1.2). Forced tool-use guarantees a tool *call*, not
# schema-*perfect* JSON, and real models deviate: Haiku 4.5 returns citations as bare
# strings, Opus 4.8 omits a self-score dimension or leaks its tool-call XML scaffolding
# into the answer string ("...prose.</answer>\n<parameter name="citations">[...]"). These
# helpers normalise the raw tool output to the clean contract the rest of the pipeline
# assumes, so a deviation degrades honestly instead of crashing or shipping garbage.
_SCAFFOLD_MARKER = re.compile(
    r"</answer>|<parameter\s+name=|<function_calls>|</?invoke>|</function_calls>",
    re.IGNORECASE,
)
_CITATIONS_PARAM = re.compile(r'<parameter\s+name="citations">', re.IGNORECASE)


def _coerce_citations(citations: Any) -> list[dict]:
    """Normalise the model's citations to a list of dicts.

    A bare string (e.g. "nlisp-p3-c0") becomes {"source_id": <string>} so the citation
    lint and the renderers — both of which call c.get("source_id") — never trip on a str.
    Non-string, non-dict items can't be a citation and are dropped.
    """
    normalised: list[dict] = []
    for citation in citations or []:
        if isinstance(citation, dict):
            normalised.append(citation)
        elif isinstance(citation, str):
            normalised.append({"source_id": citation})
    return normalised


def _strip_scaffolding(answer: Any) -> tuple[str, list[dict]]:
    """Cut any leaked tool-call scaffolding off the answer text.

    Returns (clean_answer, recovered_citations). When the model runs the answer value
    past </answer> into the next <parameter> block, the prose before the marker is the
    real answer; a citations array embedded in the leaked tail is recovered so grounding
    isn't lost. A non-string answer (e.g. null) yields ("", []).
    """
    if not isinstance(answer, str):
        return "", []
    marker = _SCAFFOLD_MARKER.search(answer)
    if marker is None:
        return answer, []
    clean = answer[: marker.start()].rstrip()
    recovered: list[dict] = []
    cite_param = _CITATIONS_PARAM.search(answer)
    if cite_param:
        # Parse the JSON array starting at its opening bracket. raw_decode stops at the
        # array's own close, so trailing scaffolding (a following <parameter> block, even
        # one containing brackets) is ignored — more robust than a greedy regex.
        tail = answer[cite_param.end() :]
        bracket = tail.find("[")
        if bracket != -1:
            try:
                parsed, _ = json.JSONDecoder().raw_decode(tail[bracket:])
            except (ValueError, TypeError):
                parsed = None
            if isinstance(parsed, list):
                recovered = _coerce_citations(parsed)
    return clean, recovered


def _normalise_self_score(self_score: Any) -> dict[str, float]:
    """Ensure all four dimensions are present and in [0, 1].

    A missing dimension defaults to 0.0 (conservative — biases toward the review flag
    rather than crashing the strict aggregator); out-of-range or non-numeric values are
    coerced and clamped.
    """
    source = self_score if isinstance(self_score, dict) else {}
    normalised: dict[str, float] = {}
    for dimension in _SCORE_DIMENSIONS:
        try:
            value = float(source.get(dimension, 0.0))
        except (TypeError, ValueError):
            value = 0.0
        normalised[dimension] = min(1.0, max(0.0, value))
    return normalised


class AnswerGenerator:
    """Drafts a grounded, self-scored answer via a forced Claude tool call."""

    # Answers are short (a few sentences) plus a compact tool payload; 1024 is ample.
    MAX_TOKENS = 1024
    # Prompt-cache multipliers on the base input rate: a cache write costs 1.25x, a
    # cache read 0.1x. Without these, billing the cached system block at the full input
    # rate would overstate cost on questions 2..N of an ISQ. The per-model base rates
    # live in app.core.pricing and are resolved per instance (see __init__).
    CACHE_WRITE_MULTIPLIER = 1.25
    CACHE_READ_MULTIPLIER = 0.10

    def __init__(self, api_key: str | None = None, model: str | None = None):
        """
        Args:
            api_key: Anthropic API key. Falls back to settings.anthropic_api_key.
            model: Model name. Falls back to settings.anthropic_model.
        """
        self.model = model or settings.anthropic_model
        self.client = Anthropic(api_key=api_key or settings.anthropic_api_key)
        # Token rates track the configured model, so cost_usd is correct whichever
        # model runs, not pinned to one model's prices (app.core.pricing).
        self.cost_per_mtok_in, self.cost_per_mtok_out = rates_for(self.model)

    def generate(
        self,
        question: str,
        chunks: list[dict[str, Any]],
        index: int | None = None,
        total: int | None = None,
    ) -> dict:
        """
        Draft an answer for one question from its retrieved chunks.

        No chunks → a deterministic needs_review result with NO LLM call (nothing to
        ground an answer in). Anthropic API errors are NOT caught here; they
        propagate to the endpoint, which maps transient vs permanent failures.
        """
        if not chunks:
            return self._result(
                answer=_NO_SOURCE_ANSWER,
                citations=[],
                self_score={
                    "cites_policy": 0.0,
                    "on_topic": 0.5,
                    "vendor_tone": 0.9,
                    "complete": 0.3,
                },
                needs_review_reason=(
                    "No source documents matched this question above the relevance "
                    "threshold. Recommend manual review and a possible policy-gap check."
                ),
                input_tokens=0,
                output_tokens=0,
                latency_ms=0.0,
            )

        user_prompt = build_answer_user_prompt(
            question, format_chunks_for_prompt(chunks), index, total
        )

        start = time.perf_counter()
        response = create_message(
            self.client,
            model=self.model,
            max_tokens=self.MAX_TOKENS,
            temperature=0,
            system=[
                {
                    "type": "text",
                    "text": _SYSTEM_BLOCK,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_prompt}],
            tools=[SUBMIT_ANSWER_TOOL],
            tool_choice={"type": "tool", "name": "submit_answer"},
        )
        latency_ms = (time.perf_counter() - start) * 1000

        usage = response.usage
        input_tokens = getattr(usage, "input_tokens", 0) or 0
        output_tokens = getattr(usage, "output_tokens", 0) or 0
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        cache_creation = getattr(usage, "cache_creation_input_tokens", 0) or 0

        tool_block = next(
            (b for b in response.content if getattr(b, "type", None) == "tool_use"),
            None,
        )
        if tool_block is None:
            # A refusal (or no structured output) despite forced tool_choice — flag
            # for review rather than fabricate an answer.
            logger.warning(
                "No submit_answer tool_use block returned; flagging for review"
            )
            return self._result(
                answer="An automated draft could not be produced for this question.",
                citations=[],
                self_score={
                    "cites_policy": 0.0,
                    "on_topic": 0.0,
                    "vendor_tone": 0.0,
                    "complete": 0.0,
                },
                needs_review_reason="Model did not return a structured answer; manual review needed.",
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cache_read=cache_read,
                cache_creation=cache_creation,
                latency_ms=latency_ms,
            )

        raw = tool_block.input

        # Normalise the raw tool output before scoring (see the anti-corruption helpers
        # above): strip any leaked scaffolding off the answer, coerce citations to dicts,
        # and fill/clamp the self-score. A model deviation then degrades honestly.
        # `or ""` collapses an explicit null answer to "" so it doesn't read as a leak.
        raw_answer = raw.get("answer") or ""
        answer, recovered_citations = _strip_scaffolding(raw_answer)
        citations = _coerce_citations(raw.get("citations", []))
        self_score = _normalise_self_score(raw.get("self_score", {}))
        needs_review_reason = raw.get("needs_review_reason")

        # If the answer leaked tool-call scaffolding, the citations often went with it.
        # Prefer the recovered set so grounding survives; if they can't be recovered, dock
        # cites_policy and set a review reason, so the now-uncited answer is flagged for a
        # human (the review reason fires the aggregator's flag) rather than passing as confident.
        if answer != raw_answer:
            logger.warning("Tool-call scaffolding leaked into the answer; stripped it")
            if not citations and recovered_citations:
                citations = recovered_citations
            elif not citations:
                self_score["cites_policy"] = max(0.0, self_score["cites_policy"] - 0.2)
                needs_review_reason = needs_review_reason or (
                    "Model output was malformed (tool-call formatting leaked into the "
                    "answer) and citations could not be recovered; manual review needed."
                )

        # Citation lint: if the model cited a source we didn't provide, log it and
        # dock cites_policy — a hallucinated citation is the opposite of grounded.
        provided_ids = {c["id"] for c in chunks}
        hallucinated = [
            c.get("source_id")
            for c in citations
            if c.get("source_id") not in provided_ids
        ]
        if hallucinated:
            logger.warning("Citations not in provided chunks: %s", hallucinated)
            self_score["cites_policy"] = max(0.0, self_score["cites_policy"] - 0.2)

        return self._result(
            answer=answer,
            citations=citations,
            self_score=self_score,
            needs_review_reason=needs_review_reason,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cache_read=cache_read,
            cache_creation=cache_creation,
            latency_ms=latency_ms,
        )

    def _result(
        self,
        *,
        answer,
        citations,
        self_score,
        needs_review_reason,
        input_tokens,
        output_tokens,
        latency_ms,
        cache_read=0,
        cache_creation=0,
    ) -> dict:
        """Assemble the answer payload, including cache-aware cost/latency metrics."""
        cost_usd = (
            input_tokens / 1_000_000 * self.cost_per_mtok_in
            + cache_creation
            / 1_000_000
            * self.cost_per_mtok_in
            * self.CACHE_WRITE_MULTIPLIER
            + cache_read
            / 1_000_000
            * self.cost_per_mtok_in
            * self.CACHE_READ_MULTIPLIER
            + output_tokens / 1_000_000 * self.cost_per_mtok_out
        )
        return {
            "answer": answer,
            "citations": citations,
            "self_score": self_score,
            "needs_review_reason": needs_review_reason,
            "metrics": {
                # tokens_in is the total input processed (uncached + cache read/write).
                "tokens_in": input_tokens + cache_read + cache_creation,
                "tokens_out": output_tokens,
                "cost_usd": round(cost_usd, 6),
                "latency_ms": round(latency_ms, 2),
            },
        }
