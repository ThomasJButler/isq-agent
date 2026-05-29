"""
Hybrid confidence aggregator (Plan 8).

Folds Plan 7's four LLM self-score dimensions into a single 0.0-1.0 confidence
scalar via a locked weighted mean, applies a retrieval sanity check that guards
against an over-claiming cites_policy, then decides needs_review on three triggers.

The weights are public (here and in the README) so a reviewer can audit the bias:
grounding (cites_policy) is weighted heaviest because an ungrounded answer is the
worst failure mode for an audit-facing tool; completeness weighs least because a
partial-but-correct answer is recoverable where a complete-but-wrong one isn't.

Two signals combine. Signal A is the LLM self-score: nuanced and multidimensional,
but it can over-claim. Signal B is the top retrieved chunk's similarity: objective,
but flat. The LLM provides dimension; retrieval provides honesty.
"""

from dataclasses import dataclass

# Dimension weights — sum to 1.0. Order reflects priority: grounding first, completeness last.
WEIGHTS = {
    "cites_policy": 0.40,  # most important — is it grounded in policy?
    "on_topic": 0.25,  # second — does it answer the question asked?
    "vendor_tone": 0.20,  # third — does it sound professional?
    "complete": 0.15,  # fourth — partial-but-correct beats complete-but-wrong
}

AGGREGATE_THRESHOLD = 0.6  # aggregate below this → flag
CITES_POLICY_FLOOR = 0.5  # cites_policy below this → flag, even if aggregate is high
TOP_CHUNK_SCORE_THRESHOLD = 0.7  # retrieval sanity check fires below this score...
OVER_CLAIM_PENALTY = 0.2  # ...downgrading an over-claiming cites_policy by this much


class InvalidScoreError(ValueError):
    """Raised when a self_score is missing a dimension or holds an out-of-range value."""


@dataclass
class AggregatedConfidence:
    """The confidence verdict for one answer. Consumed by /answer and Plan 9 renderers."""

    score: float
    dimensions: dict[str, float]
    needs_review: bool
    review_reason: str | None
    triggers_fired: list[str]


def _validate_self_score(self_score: dict[str, float]) -> None:
    """Reject a self_score missing any dimension or holding an out-of-range value."""
    for dim in WEIGHTS:
        if dim not in self_score:
            raise InvalidScoreError(f"self_score is missing dimension '{dim}'")
        value = self_score[dim]
        if not 0.0 <= value <= 1.0:
            raise InvalidScoreError(
                f"dimension '{dim}' must be in [0.0, 1.0], got {value}"
            )


def _apply_retrieval_sanity_check(
    self_score: dict[str, float], top_chunk_score: float
) -> dict[str, float]:
    """Downgrade an over-claiming cites_policy. Returns a fresh dimensions dict.

    Fires only when retrieval is weak (top_chunk_score below threshold) AND the LLM
    is confident (cites_policy >= 0.9). When both signals already agree the answer is
    weak, or the LLM is appropriately humble, this is a no-op — it only checks a
    boastful LLM, it never second-guesses a cautious one.
    """
    adjusted = dict(self_score)
    if (
        top_chunk_score < TOP_CHUNK_SCORE_THRESHOLD
        and self_score["cites_policy"] >= 0.9
    ):
        adjusted["cites_policy"] = max(
            0.0, self_score["cites_policy"] - OVER_CLAIM_PENALTY
        )
    return adjusted


def _compute_weighted_mean(dimensions: dict[str, float]) -> float:
    """Weighted mean of the four dimensions using the locked WEIGHTS."""
    return sum(dimensions[dim] * weight for dim, weight in WEIGHTS.items())


def _determine_flags(
    aggregate: float, dimensions: dict[str, float], llm_review_reason: str | None
) -> tuple[bool, list[str]]:
    """Return (needs_review, triggers_fired). Any one trigger flags the answer."""
    triggers: list[str] = []
    if aggregate < AGGREGATE_THRESHOLD:
        triggers.append("aggregate_below_threshold")
    if dimensions["cites_policy"] < CITES_POLICY_FLOOR:
        triggers.append("cites_policy_below_floor")
    if llm_review_reason is not None:
        triggers.append("llm_flagged")
    return bool(triggers), triggers


def _build_review_reason(
    triggers: list[str], llm_review_reason: str | None
) -> str | None:
    """Human-readable reason naming every trigger that fired, or None if none did."""
    parts: list[str] = []
    if "aggregate_below_threshold" in triggers:
        parts.append("aggregate confidence below threshold")
    if "cites_policy_below_floor" in triggers:
        parts.append("answer not grounded in policy documents")
    if llm_review_reason is not None:
        parts.append(f"LLM flagged: {llm_review_reason}")
    return "; ".join(parts) if parts else None


def aggregate_confidence(
    self_score: dict[str, float],
    top_chunk_score: float,
    llm_review_reason: str | None,
) -> AggregatedConfidence:
    """Fold the self-score + retrieval signal into one AggregatedConfidence verdict.

    self_score: the four 0.0-1.0 dimensions from the answer generator.
    top_chunk_score: the top retrieved chunk's (weighted) similarity, 0.0-1.0.
    llm_review_reason: the generator's own review note, or None.
    """
    _validate_self_score(self_score)
    top_chunk_score = min(1.0, max(0.0, top_chunk_score))
    dimensions = _apply_retrieval_sanity_check(self_score, top_chunk_score)
    score = _compute_weighted_mean(dimensions)
    needs_review, triggers = _determine_flags(score, dimensions, llm_review_reason)
    review_reason = _build_review_reason(triggers, llm_review_reason)
    return AggregatedConfidence(
        score=score,
        dimensions=dimensions,
        needs_review=needs_review,
        review_reason=review_reason,
        triggers_fired=triggers,
    )
