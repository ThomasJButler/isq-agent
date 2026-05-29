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

import logging
import time
from typing import Any

from anthropic import Anthropic

from app.core.config import settings
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


class AnswerGenerator:
    """Drafts a grounded, self-scored answer via a forced Claude tool call."""

    # Answers are short (a few sentences) plus a compact tool payload; 1024 is ample.
    MAX_TOKENS = 1024
    # claude-sonnet-4-5 list pricing, USD per million tokens. Valid only for that
    # model — cost_usd would be wrong if a different model were injected, so update
    # these alongside any model change (the model is fixed by CLAUDE.md today).
    COST_PER_MTOK_IN = 3.0
    COST_PER_MTOK_OUT = 15.0
    # Prompt-cache multipliers on the base input rate (claude-sonnet-4-5): a cache
    # write costs 1.25x, a cache read 0.1x. Without these, billing the cached system
    # block at the full input rate would overstate cost on questions 2..N of an ISQ.
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
        response = self.client.messages.create(
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
        citations = raw.get("citations", [])
        self_score = dict(raw.get("self_score", {}))

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
            self_score["cites_policy"] = max(
                0.0, self_score.get("cites_policy", 0.0) - 0.2
            )

        return self._result(
            answer=raw.get("answer", ""),
            citations=citations,
            self_score=self_score,
            needs_review_reason=raw.get("needs_review_reason"),
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
            input_tokens / 1_000_000 * self.COST_PER_MTOK_IN
            + cache_creation
            / 1_000_000
            * self.COST_PER_MTOK_IN
            * self.CACHE_WRITE_MULTIPLIER
            + cache_read
            / 1_000_000
            * self.COST_PER_MTOK_IN
            * self.CACHE_READ_MULTIPLIER
            + output_tokens / 1_000_000 * self.COST_PER_MTOK_OUT
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
