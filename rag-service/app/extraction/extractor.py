"""
Unified LLM question extractor (Plan 6).

Both PDF text and (flattened) XLSX rows go through the SAME Claude tool-use call,
so there is one extraction path, one prompt, and one output schema —
`extraction_method` is always "llm". The forced `extract_questions` tool
guarantees schema-valid JSON back, so there is no fragile text parsing.

question_ids are derived deterministically from the filename + 1-based ordinal
position, so re-running extraction on the same questionnaire yields identical ids
(downstream answer generation keys off them). The model's page value is carried
through, but the 1-based ordinal — not the model's reported number — drives both
the output index and the id, so skipped or duplicate source numbering still yields
unique, sequential output.
"""

import logging
import time
from pathlib import Path
from typing import Any

from anthropic import Anthropic

from app.core.config import settings
from app.core.llm import create_message
from app.core.pricing import rates_for
from app.core.isq_prompts import (
    EXTRACT_QUESTIONS_TOOL,
    EXTRACTION_SYSTEM_PROMPT,
    build_user_prompt,
)

logger = logging.getLogger(__name__)


def flatten_xlsx_to_text(rows: list[dict[str, Any]], filename: str) -> str:
    """
    Render XLSX rows as plain text for the unified extractor.

    Each row becomes "col: value" cells joined by " | ", skipping empty cells.
    Empty rows are preserved as blank lines so the model still sees the structural
    break between a title block and the question block.
    """
    lines = [f"# {filename}", ""]
    for row in rows:
        cells = [
            f"{key}: {value}" for key, value in row.items() if value not in (None, "")
        ]
        lines.append(" | ".join(cells) if cells else "")
    return "\n".join(lines)


def _make_question_id(filename: str, index: int) -> str:
    """
    Deterministic id: first three ASCII-alpha chars of the filename stem
    (lowercased) + "-q" + zero-padded ordinal. Falls back to "isq" when the stem
    has no usable alpha prefix, so unusual filenames never raise.

        Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf -> sun-q01
        Simple_Salvage_Basic_ISQ.xlsx                      -> sim-q01
    """
    stem = Path(filename).stem.lower()
    alpha = "".join(c for c in stem if c.isascii() and c.isalpha())
    prefix = alpha[:3] or "isq"
    return f"{prefix}-q{index:02d}"


class QuestionExtractor:
    """Extracts questions from a questionnaire via a forced Claude tool-use call."""

    # A large questionnaire (100+ questions) is a sizeable structured output;
    # leave generous headroom so the tool result is never truncated.
    MAX_TOKENS = 8192

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

    def extract(self, source_text: str, filename: str) -> dict:
        """
        Turn questionnaire text into a structured question list.

        Empty / whitespace-only input short-circuits to zero questions with the
        "no_questions_detected" warning and NO LLM call — nothing to extract.
        (extraction_method is still "llm": it names the pipeline, not whether a
        call was actually made.)
        """
        if not source_text or not source_text.strip():
            return self._result([], ["no_questions_detected"], 0, 0, 0.0)

        start = time.perf_counter()
        response = create_message(
            self.client,
            model=self.model,
            max_tokens=self.MAX_TOKENS,
            temperature=0,  # deterministic extraction
            system=EXTRACTION_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": build_user_prompt(filename, source_text)}
            ],
            tools=[EXTRACT_QUESTIONS_TOOL],
            tool_choice={"type": "tool", "name": "extract_questions"},
        )
        latency_ms = (time.perf_counter() - start) * 1000

        tool_block = next(
            (b for b in response.content if getattr(b, "type", None) == "tool_use"),
            None,
        )
        if tool_block is None:
            # Forced tool_choice should always yield a tool_use block; treat its
            # absence as "nothing extracted" rather than crashing the request.
            logger.warning("No tool_use block in extraction response for %s", filename)
            raw = {"questions": [], "warnings": []}
        else:
            raw = tool_block.input  # anthropic parses tool args into a dict

        warnings = list(raw.get("warnings", []))
        questions = [
            {
                "question_id": _make_question_id(filename, ordinal),
                "index": ordinal,
                "text": (item.get("text") or "").strip(),
                "page": item.get("page"),
            }
            for ordinal, item in enumerate(raw.get("questions", []), start=1)
        ]

        if not questions and "no_questions_detected" not in warnings:
            warnings.append("no_questions_detected")

        tokens_in = getattr(response.usage, "input_tokens", 0)
        tokens_out = getattr(response.usage, "output_tokens", 0)
        return self._result(questions, warnings, tokens_in, tokens_out, latency_ms)

    def _result(self, questions, warnings, tokens_in, tokens_out, latency_ms) -> dict:
        """Assemble the response payload, including cost/latency metrics."""
        cost_usd = (
            tokens_in / 1_000_000 * self.cost_per_mtok_in
            + tokens_out / 1_000_000 * self.cost_per_mtok_out
        )
        return {
            "questions": questions,
            "total": len(questions),
            "extraction_method": "llm",
            "warnings": warnings,
            "metrics": {
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
                "cost_usd": round(cost_usd, 6),
                "latency_ms": round(latency_ms, 2),
            },
        }
