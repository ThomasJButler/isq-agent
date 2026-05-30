"""
Tests for the hybrid confidence aggregator (Plan 8).

Written FIRST per TDD discipline. Implementation in app/confidence/aggregator.py
follows. The aggregator folds Plan 7's four self-score dimensions into one scalar
via a locked weighted mean, applies a retrieval sanity check that downgrades an
over-claiming cites_policy, and decides needs_review on three triggers. These tests
pin the locked weights, the formula, input validation, the sanity check, every flag
trigger, and the public AggregatedConfidence shape.

Pure unit — no client fixture, no network. Module-top import (matches test_chunking):
a missing aggregator module fails the whole file at collection, the red signal.
"""

import pytest

from app.confidence.aggregator import (
    AGGREGATE_THRESHOLD,
    CITES_POLICY_FLOOR,
    WEIGHTS,
    AggregatedConfidence,
    InvalidScoreError,
    aggregate_confidence,
)


class TestWeights:
    def test_weights_sum_to_one(self):
        """The four dimension weights sum to exactly 1.0."""
        assert sum(WEIGHTS.values()) == pytest.approx(1.0, rel=1e-6)

    def test_cites_policy_weighted_heaviest(self):
        """Grounding is the priority, so cites_policy carries the most weight."""
        assert WEIGHTS["cites_policy"] == max(WEIGHTS.values())

    def test_complete_weighted_lightest(self):
        """Partial-but-correct beats complete-but-wrong, so complete weighs least."""
        assert WEIGHTS["complete"] == min(WEIGHTS.values())


class TestAggregateScore:
    def test_all_ones_produces_aggregate_one(self):
        """Every dimension perfect → aggregate 1.0."""
        self_score = {
            "cites_policy": 1.0,
            "on_topic": 1.0,
            "vendor_tone": 1.0,
            "complete": 1.0,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.9, llm_review_reason=None
        )
        assert result.score == pytest.approx(1.0)

    def test_all_zeros_produces_aggregate_zero(self):
        """Every dimension zero → aggregate 0.0."""
        self_score = {
            "cites_policy": 0.0,
            "on_topic": 0.0,
            "vendor_tone": 0.0,
            "complete": 0.0,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.0, llm_review_reason=None
        )
        assert result.score == pytest.approx(0.0)

    def test_aggregate_uses_correct_weighted_mean(self):
        """Known dimensions produce the expected weighted mean (0.70)."""
        # cites_policy=1.0 (×0.40 = 0.40), on_topic=0.5 (×0.25 = 0.125),
        # vendor_tone=0.5 (×0.20 = 0.10), complete=0.5 (×0.15 = 0.075) → 0.70
        self_score = {
            "cites_policy": 1.0,
            "on_topic": 0.5,
            "vendor_tone": 0.5,
            "complete": 0.5,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.9, llm_review_reason=None
        )
        assert result.score == pytest.approx(0.70)


class TestInputValidation:
    def test_rejects_score_above_one(self):
        """A dimension above 1.0 is invalid input."""
        bad_score = {
            "cites_policy": 1.5,
            "on_topic": 0.8,
            "vendor_tone": 0.8,
            "complete": 0.8,
        }
        with pytest.raises(InvalidScoreError):
            aggregate_confidence(
                self_score=bad_score, top_chunk_score=0.9, llm_review_reason=None
            )

    def test_rejects_negative_score(self):
        """A negative dimension is invalid input."""
        bad_score = {
            "cites_policy": -0.1,
            "on_topic": 0.8,
            "vendor_tone": 0.8,
            "complete": 0.8,
        }
        with pytest.raises(InvalidScoreError):
            aggregate_confidence(
                self_score=bad_score, top_chunk_score=0.9, llm_review_reason=None
            )

    def test_rejects_missing_dimension(self):
        """A self_score missing one of the four dimensions is invalid input."""
        bad_score = {
            "cites_policy": 0.8,
            "on_topic": 0.8,
            "vendor_tone": 0.8,
        }  # no 'complete'
        with pytest.raises(InvalidScoreError):
            aggregate_confidence(
                self_score=bad_score, top_chunk_score=0.9, llm_review_reason=None
            )

    def test_clamps_top_chunk_score_above_one(self):
        """A top_chunk_score above 1.0 (theoretically impossible) clamps, never raises."""
        self_score = {
            "cites_policy": 1.0,
            "on_topic": 1.0,
            "vendor_tone": 1.0,
            "complete": 1.0,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=1.5, llm_review_reason=None
        )
        # Clamped to 1.0 (>= 0.7), so the sanity check is a no-op and cites stays 1.0.
        assert result.dimensions["cites_policy"] == pytest.approx(1.0)


class TestRetrievalSanityCheck:
    def test_downgrades_when_top_score_low_and_cites_high(self):
        """Weak retrieval + a confident cites_policy → downgrade by the over-claim penalty."""
        self_score = {
            "cites_policy": 1.0,
            "on_topic": 0.9,
            "vendor_tone": 0.9,
            "complete": 0.9,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.5, llm_review_reason=None
        )
        assert result.dimensions["cites_policy"] == pytest.approx(0.8)

    def test_no_downgrade_when_top_score_high(self):
        """Strong retrieval and a confident LLM agree — no downgrade."""
        self_score = {
            "cites_policy": 1.0,
            "on_topic": 0.9,
            "vendor_tone": 0.9,
            "complete": 0.9,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.9, llm_review_reason=None
        )
        assert result.dimensions["cites_policy"] == pytest.approx(1.0)

    def test_no_downgrade_when_cites_policy_already_low(self):
        """An already-humble cites_policy is not double-penalised on weak retrieval."""
        self_score = {
            "cites_policy": 0.5,
            "on_topic": 0.5,
            "vendor_tone": 0.5,
            "complete": 0.5,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.5, llm_review_reason=None
        )
        assert result.dimensions["cites_policy"] == pytest.approx(0.5)

    def test_sanity_downgrade_alone_cannot_breach_cites_floor(self):
        """The locked 0.2 penalty on a >=0.9 cites can't drop it below the 0.5 floor.

        Plan §8's "1.0 -> 0.4" row is illustrative: with OVER_CLAIM_PENALTY=0.2 the
        lowest a single downgrade reaches is 0.9-0.2=0.7, always above the floor. So a
        downgrade never trips cites_policy_below_floor on its own.
        """
        self_score = {
            "cites_policy": 1.0,
            "on_topic": 0.9,
            "vendor_tone": 0.9,
            "complete": 0.9,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.5, llm_review_reason=None
        )
        assert result.dimensions["cites_policy"] >= CITES_POLICY_FLOOR
        assert "cites_policy_below_floor" not in result.triggers_fired


class TestNeedsReviewFlagging:
    def test_flags_when_aggregate_below_threshold(self):
        """Aggregate below 0.6 → flagged."""
        self_score = {
            "cites_policy": 0.5,
            "on_topic": 0.5,
            "vendor_tone": 0.5,
            "complete": 0.5,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.9, llm_review_reason=None
        )
        assert result.needs_review is True

    def test_no_flag_when_aggregate_exactly_at_threshold(self):
        """Aggregate exactly 0.6 is NOT flagged (strict <)."""
        self_score = {
            "cites_policy": 0.6,
            "on_topic": 0.6,
            "vendor_tone": 0.6,
            "complete": 0.6,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.9, llm_review_reason=None
        )
        assert result.needs_review is False

    def test_flags_when_cites_policy_below_floor_even_if_aggregate_high(self):
        """An ungrounded answer is flagged even when the aggregate clears the threshold."""
        # cites=0.4 (×0.4=0.16) + others=1.0 (0.60) → aggregate 0.76, but cites < 0.5 floor.
        self_score = {
            "cites_policy": 0.4,
            "on_topic": 1.0,
            "vendor_tone": 1.0,
            "complete": 1.0,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.9, llm_review_reason=None
        )
        assert result.score > 0.6
        assert result.needs_review is True

    def test_no_flag_when_cites_policy_exactly_at_floor(self):
        """cites_policy exactly 0.5 is NOT flagged on the floor trigger (strict <)."""
        self_score = {
            "cites_policy": 0.5,
            "on_topic": 1.0,
            "vendor_tone": 1.0,
            "complete": 1.0,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.9, llm_review_reason=None
        )
        assert result.needs_review is False

    def test_flags_when_llm_review_reason_set(self):
        """The LLM's own review reason flags even a self-scored-perfect answer."""
        self_score = {
            "cites_policy": 1.0,
            "on_topic": 1.0,
            "vendor_tone": 1.0,
            "complete": 1.0,
        }
        result = aggregate_confidence(
            self_score=self_score,
            top_chunk_score=0.9,
            llm_review_reason="Scope mismatch - Northstar doesn't do OT",
        )
        assert result.needs_review is True
        assert "scope mismatch" in result.review_reason.lower()

    def test_combines_multiple_trigger_reasons(self):
        """When all three triggers fire, review_reason mentions all of them."""
        self_score = {
            "cites_policy": 0.3,
            "on_topic": 0.3,
            "vendor_tone": 0.3,
            "complete": 0.3,
        }
        result = aggregate_confidence(
            self_score=self_score,
            top_chunk_score=0.4,
            llm_review_reason="LLM also flagged",
        )
        assert result.needs_review is True
        assert "aggregate" in result.review_reason.lower()
        assert "policy" in result.review_reason.lower()
        assert "llm" in result.review_reason.lower()

    def test_all_zeros_flags_on_aggregate_and_cites_triggers(self):
        """All dimensions 0.0 (no LLM reason) → flagged on the aggregate and cites triggers."""
        self_score = {
            "cites_policy": 0.0,
            "on_topic": 0.0,
            "vendor_tone": 0.0,
            "complete": 0.0,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.0, llm_review_reason=None
        )
        assert result.needs_review is True
        assert "aggregate_below_threshold" in result.triggers_fired
        assert "cites_policy_below_floor" in result.triggers_fired
        assert "aggregate" in result.review_reason.lower()
        assert "policy" in result.review_reason.lower()


class TestServiceContractShape:
    def test_response_matches_service_contract(self):
        """The result exposes the fields renderers (Plan 9) and the API depend on."""
        self_score = {
            "cites_policy": 1.0,
            "on_topic": 0.95,
            "vendor_tone": 0.9,
            "complete": 0.8,
        }
        result = aggregate_confidence(
            self_score=self_score, top_chunk_score=0.9, llm_review_reason=None
        )
        assert isinstance(result, AggregatedConfidence)
        assert hasattr(result, "score")
        assert hasattr(result, "dimensions")
        assert hasattr(result, "needs_review")
        assert hasattr(result, "review_reason")
        assert hasattr(result, "triggers_fired")
        assert set(result.dimensions) == set(WEIGHTS)
        assert isinstance(result.triggers_fired, list)
        # AGGREGATE_THRESHOLD is exported and usable as the documented flag cut-off.
        assert 0.0 < AGGREGATE_THRESHOLD < 1.0


class TestConfigurableThresholds:
    """The flag cut-offs are env-overridable (v1.2) so the sensitivity can be swept."""

    def test_flag_thresholds_come_from_settings(self):
        """The cut-offs are sourced from Settings, defaulting to the audited 0.6 / 0.5."""
        from app.confidence import aggregator
        from app.core.config import settings

        assert aggregator.AGGREGATE_THRESHOLD == settings.confidence_flag_threshold
        assert aggregator.CITES_POLICY_FLOOR == settings.cites_policy_floor
        assert settings.confidence_flag_threshold == 0.6
        assert settings.cites_policy_floor == 0.5

    def test_lowering_the_threshold_clears_a_borderline_answer(self, monkeypatch):
        """A 0.55 aggregate flags at the default 0.6 but clears once the threshold drops to
        0.45 — the same override a Render env var would apply for a tuning sweep."""
        from app.confidence import aggregator

        score = {
            "cites_policy": 0.55,  # above its 0.5 floor, so only the aggregate trigger is in play
            "on_topic": 0.55,
            "vendor_tone": 0.55,
            "complete": 0.55,
        }
        flagged = aggregate_confidence(
            self_score=score, top_chunk_score=0.9, llm_review_reason=None
        )
        assert flagged.needs_review  # 0.55 < default 0.6

        monkeypatch.setattr(aggregator, "AGGREGATE_THRESHOLD", 0.45)
        cleared = aggregate_confidence(
            self_score=score, top_chunk_score=0.9, llm_review_reason=None
        )
        assert (
            not cleared.needs_review
        )  # 0.55 > 0.45, and cites_policy 0.55 ≥ its floor
