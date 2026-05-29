"""
ISQ-level summary roll-up (Plan 8).

After every question in an inbound ISQ has been answered, this folds the per-question
results into one ISQSummary for the rendered outputs (Plan 9) and the dashboard: how
many answers need review (with their 1-based question numbers), the average confidence
over the answers that generated, the run's total cost / tokens / latency, and a banner.

A question whose generation gave up after retries carries confidence=None; it always
counts as flagged and is excluded from the average — a failure is the absence of an
answer, not a zero-confidence one. Two banners: "all_flagged" when every question is
flagged (the corpus may not cover this questionnaire's domain) and the more specific
"all_failed" when every question's generation failed.

Note on naming: the dashboard reads a flat `flagged_indices`; this descriptive
`flagged_question_indices` is the renderer-facing contract. Reconciling the two (and
the flat-vs-nested confidence shape) belongs in the future dashboard plan's adapter.
"""

from dataclasses import dataclass


@dataclass
class ISQSummary:
    """Run-level roll-up over per-question results. Consumed by Plan 9 renderers."""

    total_questions: int
    flagged_count: int
    flagged_question_indices: list[int]  # 1-based question numbers
    average_confidence: float  # mean score over generated answers; 0.0 if none
    total_cost_usd: float
    total_tokens_in: int
    total_tokens_out: int
    total_latency_ms: float
    banner: str | None  # "all_failed" | "all_flagged" | None


def determine_banner(flagged_count: int, failed_count: int, total: int) -> str | None:
    """Pick the run-level banner. all_failed is more specific than all_flagged.

    A failed question counts as flagged, so an all-failed run is also all-flagged; we
    surface the more specific banner first.
    """
    if total <= 0:
        return None
    if failed_count == total:
        return "all_failed"
    if flagged_count == total:
        return "all_flagged"
    return None


def _is_flagged(result: dict) -> bool:
    """A result needs review if generation failed (no confidence) or the aggregator
    flagged it."""
    confidence = result.get("confidence")
    if confidence is None:
        return True
    return bool(confidence.get("needs_review"))


def summarise(results: list[dict]) -> ISQSummary:
    """Fold per-question results into one ISQSummary. See module docstring."""
    total = len(results)
    flagged_indices: list[int] = []
    failed_count = 0
    cost_usd = 0.0
    tokens_in = 0
    tokens_out = 0
    latency_ms = 0.0
    scores: list[float] = []

    for position, result in enumerate(results, start=1):  # 1-based question numbers
        confidence = result.get("confidence")
        if confidence is None:
            failed_count += 1
        else:
            scores.append(confidence["score"])
        if _is_flagged(result):
            flagged_indices.append(position)

        metrics = result.get("metrics") or {}
        cost_usd += metrics.get("cost_usd", 0.0)
        tokens_in += metrics.get("tokens_in", 0)
        tokens_out += metrics.get("tokens_out", 0)
        latency_ms += metrics.get("latency_ms", 0.0)

    average_confidence = sum(scores) / len(scores) if scores else 0.0

    return ISQSummary(
        total_questions=total,
        flagged_count=len(flagged_indices),
        flagged_question_indices=flagged_indices,
        average_confidence=average_confidence,
        total_cost_usd=cost_usd,
        total_tokens_in=tokens_in,
        total_tokens_out=tokens_out,
        total_latency_ms=latency_ms,
        banner=determine_banner(len(flagged_indices), failed_count, total),
    )
