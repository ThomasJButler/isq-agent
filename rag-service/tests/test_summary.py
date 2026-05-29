"""
Tests for the ISQ-level summary roll-up (Plan 8).

Written FIRST per TDD discipline. Implementation in app/confidence/summary.py
follows. The summary folds a run's per-question results into one ISQSummary: the
flagged count + 1-based question numbers, an average confidence over the answers
that generated, summed cost/tokens/latency, and a banner.

Two banner types: "all_flagged" (every question flagged — the corpus may not cover
this questionnaire) and the more specific "all_failed" (every question's generation
gave up). A failed question carries confidence=None and always counts as flagged.

Pure unit — no client fixture, no network. Module-top import (matches test_chunking):
a missing summary module fails the whole file at collection, the red signal.
"""

import pytest

from app.confidence.summary import ISQSummary, determine_banner, summarise


def _answer(
    *,
    score=0.9,
    needs_review=False,
    cost=0.001,
    tokens_in=100,
    tokens_out=50,
    latency=1200.0,
):
    """A generated per-question result dict (the wired /answer response shape)."""
    return {
        "confidence": {
            "score": score,
            "dimensions": {
                "cites_policy": 1.0,
                "on_topic": 1.0,
                "vendor_tone": 1.0,
                "complete": 1.0,
            },
            "needs_review": needs_review,
            "review_reason": "flagged" if needs_review else None,
        },
        "metrics": {
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "cost_usd": cost,
            "latency_ms": latency,
        },
    }


def _failed():
    """A question whose generation gave up after retries: confidence is null."""
    return {"confidence": None, "review_reason": "generation failed", "metrics": {}}


class TestFlagging:
    def test_count_flagged_questions(self):
        """flagged_count and 1-based indices reflect which answers need review."""
        results = [
            _answer(needs_review=False),
            _answer(needs_review=True),
            _answer(needs_review=False),
            _answer(needs_review=True),
        ]
        summary = summarise(results)
        assert summary.total_questions == 4
        assert summary.flagged_count == 2
        assert summary.flagged_question_indices == [2, 4]  # 1-based question numbers

    def test_failed_question_counts_as_flagged(self):
        """A failed question (confidence=None) always counts as flagged."""
        results = [_answer(needs_review=False), _failed()]
        summary = summarise(results)
        assert summary.flagged_count == 1
        assert summary.flagged_question_indices == [2]

    def test_zero_flagged_no_banner(self):
        """No flagged answers → flagged_count 0, no banner."""
        summary = summarise([_answer(), _answer()])
        assert summary.flagged_count == 0
        assert summary.banner is None


class TestBanners:
    def test_all_flagged_emits_banner(self):
        """Every answer flagged (but generated) → the all_flagged banner."""
        summary = summarise([_answer(needs_review=True), _answer(needs_review=True)])
        assert summary.banner == "all_flagged"

    def test_some_flagged_no_banner(self):
        """A partial flag count emits no banner — the inline flags carry it."""
        summary = summarise([_answer(needs_review=True), _answer(needs_review=False)])
        assert summary.banner is None

    def test_all_failed_emits_all_failed_banner(self):
        """Every question's generation failed → the more specific all_failed banner."""
        summary = summarise([_failed(), _failed()])
        assert summary.banner == "all_failed"

    def test_all_failed_takes_precedence_over_all_flagged(self):
        """all_failed wins when every question failed (failed implies flagged)."""
        # All failed (3,3,3) → all_failed; all flagged but generated (3,0,3) → all_flagged.
        assert (
            determine_banner(flagged_count=3, failed_count=3, total=3) == "all_failed"
        )
        assert (
            determine_banner(flagged_count=3, failed_count=0, total=3) == "all_flagged"
        )

    def test_no_banner_when_some_generated_among_failures(self):
        """A failure plus generated answers that all flag → all_flagged, not all_failed."""
        summary = summarise([_failed(), _answer(needs_review=True)])
        assert summary.banner == "all_flagged"

    def test_determine_banner_empty_run(self):
        """An empty run emits no banner (no questions to flag)."""
        assert determine_banner(flagged_count=0, failed_count=0, total=0) is None


class TestTotals:
    def test_summary_includes_total_cost(self):
        """total_cost_usd sums cost across every answer's metrics."""
        summary = summarise(
            [_answer(cost=0.01), _answer(cost=0.02), _answer(cost=0.03)]
        )
        assert summary.total_cost_usd == pytest.approx(0.06)

    def test_summary_includes_total_tokens(self):
        """total_tokens_in/out sum across every answer's metrics."""
        results = [
            _answer(tokens_in=100, tokens_out=50),
            _answer(tokens_in=200, tokens_out=80),
        ]
        summary = summarise(results)
        assert summary.total_tokens_in == 300
        assert summary.total_tokens_out == 130

    def test_failed_question_contributes_no_cost(self):
        """A failed question has no metrics and must not break the totals."""
        summary = summarise([_answer(cost=0.01), _failed()])
        assert summary.total_cost_usd == pytest.approx(0.01)
        assert summary.total_questions == 2


class TestAverageConfidence:
    def test_average_confidence_is_mean_over_generated_answers(self):
        """average_confidence is the mean score over answers that generated."""
        summary = summarise(
            [_answer(score=0.9), _answer(score=0.7), _answer(score=0.8)]
        )
        assert summary.average_confidence == pytest.approx(0.8)

    def test_average_confidence_excludes_failed_questions(self):
        """Failed questions (no score) are excluded from the mean, not counted as 0.0."""
        summary = summarise([_answer(score=0.9), _failed()])
        assert summary.average_confidence == pytest.approx(0.9)

    def test_average_confidence_zero_when_nothing_generated(self):
        """An all-failed run has no scores to average → 0.0 (banner carries the real story)."""
        summary = summarise([_failed(), _failed()])
        assert summary.average_confidence == pytest.approx(0.0)


class TestContractShape:
    def test_summary_is_isqsummary_with_expected_fields(self):
        """The roll-up exposes the fields Plan 9's renderers and the dashboard depend on."""
        summary = summarise([_answer()])
        assert isinstance(summary, ISQSummary)
        for field in (
            "total_questions",
            "flagged_count",
            "flagged_question_indices",
            "average_confidence",
            "total_cost_usd",
            "total_tokens_in",
            "total_tokens_out",
            "total_latency_ms",
            "banner",
        ):
            assert hasattr(summary, field)
