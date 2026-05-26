# Plan 8 — Confidence + Flagging Strategy (TDD-first)

**Status:** Plan 8. TDD-first (Plan 4 lock). Branching + Conventional Commits + CI (Plan 5 lock). Generator returns `self_score` + `needs_review_reason` (Plan 7).

**Owner:** Tom Butler
**Date:** 2026-05-25
**Prior plans:** Plan 1-7 ✅

---

## 0. What this plan does and doesn't do

**Locks in:**
- The hybrid confidence aggregator (LLM self-score from Plan 7 + retrieval similarity sanity check from Plan 4)
- Weighted-mean formula with locked weights
- Threshold logic for `needs_review: true`
- Retrieval sanity-check downgrade logic (protects against over-claiming LLM)
- Propagation of `needs_review` into the three rendered outputs (JSON, DOCX, filled PDF/XLSX)
- ISQ-level aggregates (count flagged, banner conditions)
- Test plan written FIRST

**Doesn't yet cover:**
- Output rendering libraries + style (Plan 9 — but uses the propagation contract this plan defines)
- Demo script (Plan 10)
- Final execution timeline (Plan 11)

---

## 1. The hybrid confidence design (recap from prior plans)

Two signals combine:

**Signal A — LLM self-score (from Plan 7):**
- 4 dimensions: `cites_policy`, `on_topic`, `vendor_tone`, `complete`
- Each 0.0-1.0
- Returned by the answer generator as part of the tool-use response

**Signal B — Retrieval similarity sanity check (from Plan 4):**
- The score of the top chunk returned by Pinecone (cosine similarity, 0.0-1.0)
- A sanity check on the LLM's self-assessment

**Why both:**
- LLM self-score is fast, multidimensional, and language-aware — but can over-claim ("I'm confident!" when it's not)
- Retrieval similarity is objective and grounded — but flat (one number per question, can't distinguish "fully answered" from "loosely on topic")
- Combining: LLM provides nuance, retrieval provides honesty

Walkthrough talking point: "I considered pure LLM self-rating and pure retrieval similarity. Pure LLM is gameable — Claude can claim 0.95 on a thin answer. Pure retrieval is too coarse — a chunk with 0.9 similarity might still produce a bad answer if the LLM misreads it. Hybrid was the right call: LLM provides multidimensional self-assessment, retrieval provides a sanity check."

---

## 2. Test plan (defined FIRST)

### Tests for the confidence aggregator (`tests/test_confidence.py`)

| Test name | What it verifies |
|---|---|
| `test_aggregate_returns_weighted_mean` | Given known dimension scores, returns the expected weighted-mean aggregate |
| `test_aggregate_weights_sum_to_one` | The weight constants in the module sum to exactly 1.0 |
| `test_aggregate_handles_all_ones` | All dimensions 1.0 → aggregate 1.0 |
| `test_aggregate_handles_all_zeros` | All dimensions 0.0 → aggregate 0.0 |
| `test_aggregate_rejects_out_of_range_scores` | Any dimension >1.0 or <0.0 raises `InvalidScoreError` |
| `test_aggregate_clamps_top_chunk_score` | Top chunk score >1.0 (theoretically impossible) clamps to 1.0 |
| `test_retrieval_sanity_check_downgrades_cites_policy` | When `top_chunk_score < 0.7` AND `cites_policy >= 0.9`, downgrade cites_policy by 0.2 |
| `test_retrieval_sanity_check_no_op_when_top_score_high` | When `top_chunk_score >= 0.7`, no downgrade |
| `test_retrieval_sanity_check_no_op_when_cites_policy_low` | When `cites_policy < 0.9`, no downgrade (only protects against over-claiming) |
| `test_flag_when_aggregate_below_06` | Aggregate < 0.6 → `needs_review = True` |
| `test_no_flag_when_aggregate_exactly_06` | Aggregate == 0.6 → NOT flagged (strict <) |
| `test_flag_when_cites_policy_below_05` | `cites_policy < 0.5` → flagged, even if aggregate is high |
| `test_flag_when_llm_set_review_reason` | LLM provided a `needs_review_reason` → flagged |
| `test_flag_combines_all_three_triggers` | Any of the three triggers fires → flagged |
| `test_review_reason_aggregates_multiple_triggers` | When multiple triggers fire, `review_reason` mentions all of them |
| `test_aggregate_response_matches_service_contract` | Output shape matches Plan 2 `confidence` field structure |

### Tests for ISQ-level summary (`tests/test_summary.py`)

| Test name | What it verifies |
|---|---|
| `test_count_flagged_questions` | Given a list of AnswerResults, counts how many have `needs_review=True` |
| `test_all_flagged_emits_banner` | When all answers flagged, summary includes `banner: "all_flagged"` |
| `test_some_flagged_no_banner` | When some flagged, no banner — just count |
| `test_zero_flagged_no_banner` | When none flagged, no banner |
| `test_summary_includes_total_cost` | Sums cost_usd across all answers |
| `test_summary_includes_total_tokens` | Sums tokens_in + tokens_out |

**Test count for Plan 8:** ~22 tests. Estimated writing time: ~90 minutes.

---

## 3. Weighted-mean formula (LOCKED)

### Weights

```python
WEIGHTS = {
    "cites_policy": 0.40,  # most important — is it grounded?
    "on_topic":     0.25,  # second — does it answer the question asked?
    "vendor_tone":  0.20,  # third — does it sound professional?
    "complete":     0.15,  # fourth — partial-but-correct beats complete-but-wrong
}
# Sum: 1.00
```

### Formula

```python
def aggregate_self_score(self_score: dict[str, float]) -> float:
    """Weighted mean of the 4 self-score dimensions. Returns 0.0-1.0."""
    return sum(self_score[dim] * weight for dim, weight in WEIGHTS.items())
```

### Why these weights (walkthrough talking points)

- **cites_policy heaviest (0.40):** an ungrounded answer is the worst failure mode for an audit-facing tool. We'd rather ship a flagged answer than an answer that sounds confident but isn't backed by policy.
- **on_topic second (0.25):** off-topic answers waste the reviewer's time and damage the vendor's credibility.
- **vendor_tone third (0.20):** matters for brand impression. A tonally-off answer is recoverable; an off-topic one is not.
- **complete fourth (0.15):** a partial-but-correct answer is recoverable via "see also" notes. A complete-but-wrong answer is harder to fix.

Weights are **publicly documented** (in the module's docstring + README) so reviewers can audit the bias. Walkthrough: "the weights aren't hidden in the code — Lee can read the docstring and see exactly how I prioritise grounding over completeness."

---

## 4. Threshold logic for `needs_review`

Triggers (any one fires → flagged):

```python
def should_flag(aggregate: float, self_score: dict, llm_review_reason: str | None) -> bool:
    return (
        aggregate < AGGREGATE_THRESHOLD                # 0.6
        or self_score["cites_policy"] < CITES_POLICY_FLOOR  # 0.5
        or llm_review_reason is not None
    )
```

### Constants (LOCKED)

```python
AGGREGATE_THRESHOLD = 0.6   # below this, flag
CITES_POLICY_FLOOR = 0.5    # cites_policy below this, flag (even if aggregate high)
```

### Why three triggers, not one

| Trigger | Catches |
|---|---|
| `aggregate < 0.6` | Generally weak answers — multiple dimensions middling |
| `cites_policy < 0.5` | Specifically ungrounded answers, even if otherwise strong (e.g. eloquent + on-topic + vendor-tone + complete BUT not from policy) |
| `llm_review_reason is not None` | LLM's own judgement — scope mismatches, contradictions, ambiguity. Honours the LLM as a first-class voter. |

Without trigger 2, an answer scoring `{cites_policy: 0.4, on_topic: 1.0, vendor_tone: 1.0, complete: 1.0}` would aggregate to 0.76 and ship without a flag — but it's not grounded. Trigger 2 catches it.

Without trigger 3, the LLM's nuanced scope-mismatch detection (Plan 7 Example 2) wouldn't propagate. Trigger 3 ensures the LLM's own judgement counts.

### Combining review reasons

When multiple triggers fire, `review_reason` should mention all of them:

```python
def build_review_reason(triggers: list[str], llm_reason: str | None) -> str:
    parts = []
    if "aggregate_below_threshold" in triggers:
        parts.append("aggregate confidence below threshold")
    if "cites_policy_below_floor" in triggers:
        parts.append("answer not grounded in policy documents")
    if llm_reason:
        parts.append(f"LLM flagged: {llm_reason}")
    return "; ".join(parts) or "no specific reason recorded"
```

Example combined reason: `"aggregate confidence below threshold; answer not grounded in policy documents"`.

---

## 5. Retrieval sanity check (downgrade logic)

### The over-claiming problem

The LLM can return `cites_policy: 1.0` even when the retrieval was weak. This happens when:
- Top chunk score is low (0.5-0.7)
- LLM still considers the chunk "policy" because the metadata says so
- LLM reports full confidence

Result: a flag would be appropriate but the self-score blocks it.

### The check

```python
TOP_CHUNK_SCORE_THRESHOLD = 0.7
OVER_CLAIM_PENALTY = 0.2

def apply_retrieval_sanity_check(self_score: dict, top_chunk_score: float) -> dict:
    """
    If the top retrieved chunk is weak AND the LLM claims strong grounding,
    downgrade cites_policy. Protects against LLM over-claiming.
    """
    adjusted = self_score.copy()
    if (
        top_chunk_score < TOP_CHUNK_SCORE_THRESHOLD
        and self_score["cites_policy"] >= 0.9
    ):
        adjusted["cites_policy"] = max(
            0.0,
            self_score["cites_policy"] - OVER_CLAIM_PENALTY,
        )
    return adjusted
```

### When this fires vs doesn't

| top_chunk_score | cites_policy (LLM) | Action |
|---|---|---|
| 0.9 | 1.0 | No-op (retrieval strong, LLM confident — agree) |
| 0.6 | 1.0 | **Downgrade** to 0.8 (LLM over-claiming relative to retrieval) |
| 0.6 | 0.5 | No-op (LLM already humble — no need to downgrade) |
| 0.4 | 0.3 | No-op (both agree the answer is weak) |

Walkthrough talking point: "The sanity check only fires when the LLM is over-claiming relative to retrieval. If both signals agree the answer is weak, we don't double-penalise. If the LLM is appropriately humble, we don't second-guess it. It's specifically a 'check the boastful LLM' rule."

---

## 6. Propagation into the three rendered outputs

### Output 1 — JSON (canonical structured response)

```json
{
  "answer": "Yes. Northstar Labs maintains...",
  "citations": [...],
  "confidence": {
    "score": 0.91,
    "dimensions": {
      "cites_policy": 1.0,
      "on_topic": 0.95,
      "vendor_tone": 0.90,
      "complete": 0.80
    },
    "needs_review": false,
    "review_reason": null
  },
  "metrics": {...}
}
```

For flagged answers: `needs_review: true`, `review_reason` populated.

### Output 2 — Clean DOCX report

Each answer rendered as:

```
Q1: Do you maintain a formal Information Security Policy?
─────────────────────────────────────────────────────
Yes. Northstar Labs maintains a formal Information Security Policy
which is reviewed annually and approved by senior leadership...

Confidence: 0.91 | Citations: ISP §1, ISQ_01 Q1
```

For flagged answers:

```
Q5: How is privileged access to operational technology (OT) controlled?  [⚠ REVIEW]
─────────────────────────────────────────────────────────────────────────
Northstar Labs does not operate operational technology (OT) systems...

Confidence: 0.55 | Citations: ISP §2
Review reason: LLM flagged: Question asks specifically about operational technology.
Northstar Labs is software-only. Answer represents a scope-limitation statement.
```

**Plus a summary table at the top** of the DOCX:

```
SUMMARY
─────────────────────────────────────────────────────
Total questions:           20
Flagged for review:        2 (Q5, Q11)
Total estimated cost:      $0.078
Total time:                42s

Banner: (none — see flagged questions inline)
```

### Output 3 — Filled original PDF/XLSX

Each Response box gets the answer, plus a small `[REVIEW]` indicator if flagged:

```
5. How is privileged access to operational technology (OT) controlled?

  [REVIEW] Northstar Labs does not operate operational technology (OT) systems...
```

For PDFs, the `[REVIEW]` indicator is bold + boxed. For XLSX, the cell gets a yellow fill colour + the text starts with `[REVIEW]`.

**Plus a cover page (PDF) or summary sheet (XLSX)** listing flagged questions, identical to the DOCX summary table.

### "All flagged" banner

When EVERY question is flagged:

```
⚠ ALL ANSWERS FLAGGED FOR REVIEW
The knowledge base may not cover this questionnaire's domain.
Consider whether the source corpus needs extending for this requester.
```

Banner appears at the top of DOCX, cover page of PDF, and as a `summary.banner: "all_flagged"` field in JSON.

Trigger condition: `flagged_count == total_questions AND total_questions > 0`.

### Propagation contract (locked for Plan 9)

The confidence aggregator returns a result that Plan 9's renderers can consume:

```python
@dataclass
class AggregatedConfidence:
    score: float  # 0.0-1.0
    dimensions: dict[str, float]  # 4 dimensions
    needs_review: bool
    review_reason: str | None
    triggers_fired: list[str]  # for logging/debugging
```

And each `AnswerResult` from Plan 7 gets enriched with this confidence object before being passed to renderers.

---

## 7. ISQ-level summary aggregates

After all questions are answered, n8n assembles a summary:

```python
@dataclass
class ISQSummary:
    total_questions: int
    flagged_count: int
    flagged_question_indices: list[int]
    total_cost_usd: float
    total_tokens_in: int
    total_tokens_out: int
    total_latency_ms: int
    banner: str | None  # "all_flagged" | None
```

### Banner logic

```python
def determine_banner(flagged_count: int, total: int) -> str | None:
    if total > 0 and flagged_count == total:
        return "all_flagged"
    return None
```

(Could add more banner types in future: `"mostly_flagged"` when >75% flagged, `"corpus_gap_detected"` when multiple OT-style scope-mismatches. Deferred.)

---

## 8. Edge cases (locked)

| Edge case | Behaviour |
|---|---|
| `aggregate == 0.6` exactly | NOT flagged (strict `<`) |
| `cites_policy == 0.5` exactly | NOT flagged (strict `<`) |
| All 4 dimensions are 0.0 | aggregate 0.0, flagged on all 3 triggers, `review_reason` mentions all |
| LLM returned `needs_review_reason` AND aggregate is high (0.9) | Still flagged — LLM's judgement wins |
| Retrieval sanity check downgrades cites_policy from 1.0 to 0.8 BUT aggregate is still 0.85 | NOT flagged (aggregate above threshold, cites_policy above floor) |
| Retrieval sanity check downgrades cites_policy from 1.0 to 0.4 (penalty of 0.6 — extreme case) | Flagged on `cites_policy_below_floor` trigger |
| Question 1 of 20 fails (Anthropic 503 after retries) | That single question gets `confidence=null`, `needs_review=true`, `review_reason: "generation failed"` — other 19 proceed |
| All 20 questions fail | ISQSummary banner: `"all_failed"` (new banner) — different from `"all_flagged"` |

---

## 9. 🖐️ Manual Coding Exercise 7 — TEST FILE FIRST

**Purpose:** TDD cycle for confidence aggregation. Pure-Python logic, no LLM, no network — perfect for fast iteration. ~70 lines of tests + ~80 lines of implementation. ~40 minutes total.

### Part A — type the test file FIRST

**File:** `rag-service/tests/test_confidence.py`

```python
"""
Tests for the confidence aggregator.
Written FIRST per TDD discipline. Implementation in app/confidence/aggregator.py follows.
"""

import pytest
from app.confidence.aggregator import (
    aggregate_confidence,
    AggregatedConfidence,
    InvalidScoreError,
    WEIGHTS,
    AGGREGATE_THRESHOLD,
    CITES_POLICY_FLOOR,
)


class TestWeights:
    def test_weights_sum_to_one(self):
        assert sum(WEIGHTS.values()) == pytest.approx(1.0, rel=1e-6)

    def test_cites_policy_weighted_heaviest(self):
        assert WEIGHTS["cites_policy"] == max(WEIGHTS.values())

    def test_complete_weighted_lightest(self):
        assert WEIGHTS["complete"] == min(WEIGHTS.values())


class TestAggregateScore:
    def test_all_ones_produces_aggregate_one(self):
        self_score = {"cites_policy": 1.0, "on_topic": 1.0, "vendor_tone": 1.0, "complete": 1.0}
        result = aggregate_confidence(self_score=self_score, top_chunk_score=0.9, llm_review_reason=None)
        assert result.score == pytest.approx(1.0)

    def test_all_zeros_produces_aggregate_zero(self):
        self_score = {"cites_policy": 0.0, "on_topic": 0.0, "vendor_tone": 0.0, "complete": 0.0}
        result = aggregate_confidence(self_score=self_score, top_chunk_score=0.0, llm_review_reason=None)
        assert result.score == pytest.approx(0.0)

    def test_aggregate_uses_correct_weighted_mean(self):
        # cites_policy=1.0 (×0.40 = 0.40)
        # on_topic=0.5    (×0.25 = 0.125)
        # vendor_tone=0.5 (×0.20 = 0.10)
        # complete=0.5    (×0.15 = 0.075)
        # Total: 0.70
        self_score = {"cites_policy": 1.0, "on_topic": 0.5, "vendor_tone": 0.5, "complete": 0.5}
        result = aggregate_confidence(self_score=self_score, top_chunk_score=0.9, llm_review_reason=None)
        assert result.score == pytest.approx(0.70)


class TestInputValidation:
    def test_rejects_score_above_one(self):
        bad_score = {"cites_policy": 1.5, "on_topic": 0.8, "vendor_tone": 0.8, "complete": 0.8}
        with pytest.raises(InvalidScoreError):
            aggregate_confidence(self_score=bad_score, top_chunk_score=0.9, llm_review_reason=None)

    def test_rejects_negative_score(self):
        bad_score = {"cites_policy": -0.1, "on_topic": 0.8, "vendor_tone": 0.8, "complete": 0.8}
        with pytest.raises(InvalidScoreError):
            aggregate_confidence(self_score=bad_score, top_chunk_score=0.9, llm_review_reason=None)

    def test_rejects_missing_dimension(self):
        bad_score = {"cites_policy": 0.8, "on_topic": 0.8, "vendor_tone": 0.8}  # missing 'complete'
        with pytest.raises(InvalidScoreError):
            aggregate_confidence(self_score=bad_score, top_chunk_score=0.9, llm_review_reason=None)


class TestRetrievalSanityCheck:
    def test_downgrades_when_top_score_low_and_cites_high(self):
        # top_chunk_score 0.5 + cites_policy 1.0 → over-claiming → downgrade by 0.2
        self_score = {"cites_policy": 1.0, "on_topic": 0.9, "vendor_tone": 0.9, "complete": 0.9}
        result = aggregate_confidence(self_score=self_score, top_chunk_score=0.5, llm_review_reason=None)
        # cites_policy should be downgraded to 0.8
        assert result.dimensions["cites_policy"] == pytest.approx(0.8)

    def test_no_downgrade_when_top_score_high(self):
        self_score = {"cites_policy": 1.0, "on_topic": 0.9, "vendor_tone": 0.9, "complete": 0.9}
        result = aggregate_confidence(self_score=self_score, top_chunk_score=0.9, llm_review_reason=None)
        assert result.dimensions["cites_policy"] == pytest.approx(1.0)

    def test_no_downgrade_when_cites_policy_already_low(self):
        # LLM already humble — don't double-penalise
        self_score = {"cites_policy": 0.5, "on_topic": 0.5, "vendor_tone": 0.5, "complete": 0.5}
        result = aggregate_confidence(self_score=self_score, top_chunk_score=0.5, llm_review_reason=None)
        assert result.dimensions["cites_policy"] == pytest.approx(0.5)


class TestNeedsReviewFlagging:
    def test_flags_when_aggregate_below_threshold(self):
        # cites_policy=0.5, others=0.5 → aggregate 0.5 < 0.6 → flag
        self_score = {"cites_policy": 0.5, "on_topic": 0.5, "vendor_tone": 0.5, "complete": 0.5}
        result = aggregate_confidence(self_score=self_score, top_chunk_score=0.9, llm_review_reason=None)
        assert result.needs_review is True

    def test_no_flag_when_aggregate_exactly_at_threshold(self):
        # Need to hit exactly 0.6. cites=0.6, on=0.6, vendor=0.6, complete=0.6 → aggregate 0.6
        # Strict < means 0.6 is NOT flagged
        self_score = {"cites_policy": 0.6, "on_topic": 0.6, "vendor_tone": 0.6, "complete": 0.6}
        result = aggregate_confidence(self_score=self_score, top_chunk_score=0.9, llm_review_reason=None)
        # TODO ① — Tom: assert result.needs_review is False
        # ~1 line.
        pass

    def test_flags_when_cites_policy_below_floor_even_if_aggregate_high(self):
        # cites=0.4 (×0.4 = 0.16), others=1.0 (sum 0.6) → aggregate 0.76 BUT cites_policy < 0.5 → flag
        self_score = {"cites_policy": 0.4, "on_topic": 1.0, "vendor_tone": 1.0, "complete": 1.0}
        result = aggregate_confidence(self_score=self_score, top_chunk_score=0.9, llm_review_reason=None)
        assert result.score > 0.6
        # TODO ② — Tom: assert result.needs_review is True (because cites_policy floor trigger)
        # ~1 line.
        pass

    def test_flags_when_llm_review_reason_set(self):
        self_score = {"cites_policy": 1.0, "on_topic": 1.0, "vendor_tone": 1.0, "complete": 1.0}
        result = aggregate_confidence(
            self_score=self_score,
            top_chunk_score=0.9,
            llm_review_reason="Scope mismatch — Northstar doesn't do OT",
        )
        assert result.needs_review is True
        assert "scope mismatch" in result.review_reason.lower()

    def test_combines_multiple_trigger_reasons(self):
        self_score = {"cites_policy": 0.3, "on_topic": 0.3, "vendor_tone": 0.3, "complete": 0.3}
        result = aggregate_confidence(
            self_score=self_score,
            top_chunk_score=0.4,
            llm_review_reason="LLM also flagged",
        )
        # All three triggers fired
        assert result.needs_review is True
        assert "aggregate" in result.review_reason.lower()
        assert "policy" in result.review_reason.lower()
        assert "llm" in result.review_reason.lower()


class TestServiceContractShape:
    def test_response_matches_service_contract(self):
        self_score = {"cites_policy": 1.0, "on_topic": 0.95, "vendor_tone": 0.9, "complete": 0.8}
        result = aggregate_confidence(self_score=self_score, top_chunk_score=0.9, llm_review_reason=None)
        # Plan 2 service contract requires these fields
        assert hasattr(result, "score")
        assert hasattr(result, "dimensions")
        assert hasattr(result, "needs_review")
        assert hasattr(result, "review_reason")
        assert hasattr(result, "triggers_fired")
```

### Part B — run tests, watch them fail

```bash
cd rag-service
pytest tests/test_confidence.py -v
# Expected: ModuleNotFoundError. Tests fail for the right reason.
```

### Part C — implement to make tests pass

**File:** `rag-service/app/confidence/aggregator.py`

Structure (code-write at normal pace, ~80 lines):

1. Module constants: `WEIGHTS`, `AGGREGATE_THRESHOLD`, `CITES_POLICY_FLOOR`, `TOP_CHUNK_SCORE_THRESHOLD`, `OVER_CLAIM_PENALTY`
2. `InvalidScoreError` exception class
3. `AggregatedConfidence` dataclass with fields: `score`, `dimensions`, `needs_review`, `review_reason`, `triggers_fired`
4. `_validate_self_score(self_score)` — raises `InvalidScoreError` for missing dims, out-of-range values
5. `_apply_retrieval_sanity_check(self_score, top_chunk_score)` — returns adjusted dimensions dict
6. `_compute_weighted_mean(dimensions)` — returns aggregate float
7. `_determine_flags(aggregate, dimensions, llm_review_reason)` — returns `(needs_review, triggers_fired)`
8. `_build_review_reason(triggers, llm_reason)` — returns combined human-readable reason
9. `aggregate_confidence(self_score, top_chunk_score, llm_review_reason)` — entry point, calls all helpers

### Part D — verify all tests green

```bash
pytest tests/test_confidence.py -v
# Expected: all green
```

### Part E — wire into the /answer endpoint

Update `app/api/answer.py`:

```python
from app.confidence.aggregator import aggregate_confidence

# After generate_answer returns:
confidence = aggregate_confidence(
    self_score=result.self_score,
    top_chunk_score=chunks[0]["score"] if chunks else 0.0,
    llm_review_reason=result.needs_review_reason,
)

return AnswerResponse(
    answer=result.answer,
    citations=result.citations,
    confidence={
        "score": confidence.score,
        "dimensions": confidence.dimensions,
        "needs_review": confidence.needs_review,
        "review_reason": confidence.review_reason,
    },
    metrics=result.metrics,
)
```

Plus update `tests/test_answer_endpoint.py` to assert the confidence shape matches Plan 2's service contract.

### Acceptance for TODOs

- **TODO ①** (Part A line ~125): `assert result.needs_review is False` — 1 line
- **TODO ②** (Part A line ~135): `assert result.needs_review is True` — 1 line

### Commit pattern

```bash
git checkout -b feature/confidence-aggregator
git add tests/test_confidence.py
git commit -m "test(confidence): add failing tests for hybrid confidence aggregator"
git add app/confidence/
git commit -m "feat(confidence): add weighted-mean aggregator with retrieval sanity check"
git add app/api/answer.py tests/test_answer_endpoint.py
git commit -m "feat(api): wire confidence aggregator into /answer response"
git push -u origin feature/confidence-aggregator
# Open PR, self-review, squash-merge
# Tag v0.4.0 — confidence + flagging live end-to-end
```

---

## 10. 📘 Concept Primer

### Weighted means

If you have four scores and you want to combine them into one number, the simplest thing is to take their average — add them up and divide by four. That treats all four scores as equally important.

But sometimes one score matters more than another. **Weighted mean** lets you say "this score counts more than that one." You give each score a weight (between 0 and 1), make sure the weights add up to 1, then multiply each score by its weight and add them up.

For us: `cites_policy` has weight 0.4 (40% of the final score), `complete` has weight 0.15 (15%). An answer that's strongly grounded but slightly incomplete still scores well overall. An answer that's complete but ungrounded scores badly.

It's like grading an exam where some questions are worth more marks than others.

### Thresholds

A threshold is a cut-off number. "If the score is below this number, do X. Otherwise do Y."

We use 0.6 as the aggregate threshold. An answer scoring 0.65 ships without review. An answer scoring 0.55 gets flagged for human review.

Choosing the threshold is a trade-off:
- Threshold too low (0.3): too many bad answers ship without review
- Threshold too high (0.85): too many decent answers get unnecessarily flagged, reviewer fatigue

0.6 is the sweet spot we picked. Tunable — if Lee says "flag more aggressively" we'd raise it to 0.7. The number lives as a constant in code, so changing it is one line.

### Hybrid scoring

We're combining two different signals:
1. **LLM self-score** — Claude rates its own answer across 4 dimensions
2. **Retrieval similarity** — how similar was the top retrieved chunk to the question?

Why both? Because each has weaknesses:
- LLM self-score is multidimensional but can be over-confident
- Retrieval similarity is honest but flat (one number, no nuance)

By combining them, we get the best of both: the LLM provides depth, the retrieval provides a sanity check. If the LLM claims "100% grounded!" but retrieval scored only 0.5, we know the LLM is over-claiming and we downgrade it.

It's like checking a friend's story against their phone records. Their story might be detailed and convincing, but if the records contradict it, you trust the records.

---

## 11. End-of-Plan-8 checklist

For the build session:

- [ ] `git checkout -b feature/confidence-aggregator`
- [ ] Create `rag-service/app/confidence/__init__.py`
- [ ] Create `rag-service/tests/test_confidence.py` (Manual Coding Exercise 7 Part A) — TYPE
- [ ] Run `pytest tests/test_confidence.py -v` — confirm failures
- [ ] Implement `rag-service/app/confidence/aggregator.py` (Part C) — code-write at normal pace
- [ ] Run tests until green
- [ ] Commit: `test(confidence): add failing tests for hybrid confidence aggregator`
- [ ] Commit: `feat(confidence): add weighted-mean aggregator with retrieval sanity check`
- [ ] Update `app/api/answer.py` to wire confidence into response
- [ ] Update `tests/test_answer_endpoint.py` for new shape
- [ ] Commit: `feat(api): wire confidence aggregator into /answer response`
- [ ] Open PR, self-review, squash-merge
- [ ] Delete feature branch
- [ ] Tag `v0.4.0` — confidence + flagging live end-to-end

Optional smoke test against real corpus:

```bash
curl -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: smoketest-conf-q01" \
  -d '{"question": "Do you maintain a formal Information Security Policy?", "source_format": "pdf"}'
# Expected: response includes confidence.{score, dimensions, needs_review, review_reason}
```

And test the "flagged" path:

```bash
curl -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: smoketest-conf-ot" \
  -d '{"question": "How is privileged access to operational technology (OT) controlled?"}'
# Expected: needs_review: true, review_reason mentions OT scope mismatch
```

---

## 12. What Plan 9 will tackle

Plan 9 — **Output Rendering Strategy (TDD-first)**:

- Three render adapters over the canonical JSON: clean DOCX report, filled original (PDF + XLSX), structured JSON
- Library choices: python-docx (DOCX), pypdf + ReportLab (PDF overlay or typeset), openpyxl (XLSX cell-fill)
- Visual style: clean enterprise (Calibri/Times, navy + grey, no flair) per Plan 1 Section 7a
- How `needs_review` propagates visually (yellow `[REVIEW]` badge in DOCX, cell highlight in XLSX, cover page in PDF)
- Summary table generation (top of DOCX, cover page of PDF, summary sheet of XLSX)
- 🖐️ **Manual Coding Exercise 8** — typing `tests/test_render_docx.py` first, then the DOCX renderer
- 📘 Concept Primer sections: PDF overlay vs typeset, python-docx, cell colouring in openpyxl

---

## Git execution block

See `git-conventions.md` for the full reference.

**Branch:** `feature/confidence-and-flagging`

**Commits (in order):**
1. `test(confidence): add tests for weighted mean and threshold triggers` — stages `rag-service/tests/test_confidence.py`
2. Run `pytest rag-service/tests/test_confidence.py -v` — confirm tests fail for the right reason
3. `feat(confidence): add hybrid aggregator (weighted mean + retrieval sanity check)` — stages `rag-service/app/confidence/aggregator.py`
4. `feat(api): wire confidence aggregator into /answer response` — stages updates to `rag-service/app/api/answer.py`
5. Two end-to-end smoke tests — one strong-citation (expect `needs_review: false`), one scope-mismatch (expect `needs_review: true`).

**Push + PR:**
```bash
git push -u origin feature/confidence-and-flagging
gh pr create --fill
```

**After merge — tag `v0.4.0`:**
```bash
git checkout main && git pull
git tag -a v0.4.0 -m "v0.4.0 — confidence + flagging live"
git push origin v0.4.0
```

---

## Plan 8 done ✅

Confidence + flagging locked. Hybrid aggregator (LLM self-score + retrieval sanity check). Weighted mean with locked weights. Three flag triggers. Retrieval sanity check protects against over-claiming. Propagation contract for renderers. Test plan written first. Manual Coding Exercise 7 follows TDD-with-branching pattern.

**Tom's reaction needed before Plan 9:**

1. Locked weights (40/25/20/15) — happy or want to tune?
2. Threshold constants (aggregate 0.6, cites_policy floor 0.5) — feel right?
3. Retrieval sanity check (only fires when LLM over-claims) — agreed?
4. Banner conditions — only `"all_flagged"` for now, others deferred — happy?
5. Plan 9 outline — happy?

Say "go" and I'll write Plan 9.
