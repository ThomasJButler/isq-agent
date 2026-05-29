# Companion Prompt — Plan 8 (Confidence + Flagging)

**Use this prompt in Claude Code (VSCode) when you're ready to build Plan 8.**

Paste everything below the `---` line as your first message in a Claude Code session.

---

You're helping me build **Plan 8 — Confidence + Flagging Strategy (TDD-first)** of the ISQ Agent project.

## Read these first

In `plans/`:
- **plan-08-confidence-and-flagging.md** (the plan you're executing)
- **plan-07-answer-generation.md** (the `self_score` output we aggregate)
- **plan-01-initial-sketch.md** Section 7d (working-style commitments) + decision table

## Branch + workflow (Plan 5 lock)

```bash
cd ~/Repos/isq-agent
git checkout -b feature/confidence-aggregator
```

- Conventional Commits format on every commit (`test(...)`, `feat(...)`, `chore(...)`)
- Squash-and-merge to main via PR (even solo)
- Pre-commit hooks must pass before each commit
- GitHub Actions CI must pass before merge

## What to do FIRST (TDD discipline)

Guide me through typing `rag-service/tests/test_confidence.py` per **Plan 8 Section 9 Part A**.

- Do NOT write the implementation for me. Section 9 Part C is mine.
- The TODOs in the test file are mine to fill in. Do NOT solve them.
- After I've typed the tests, run `pytest tests/test_confidence.py -v` and confirm they fail for the right reason.

## After tests fail, then implement

Help me implement `rag-service/app/confidence/aggregator.py` per Section 9 Part C. I'll code-write at normal pace. You can correct typos and structure issues but the logic decisions are mine.

Module structure (Plan 8 Section 9 Part C):
1. Constants: `WEIGHTS`, `AGGREGATE_THRESHOLD`, `CITES_POLICY_FLOOR`, `TOP_CHUNK_SCORE_THRESHOLD`, `OVER_CLAIM_PENALTY`
2. `InvalidScoreError` exception
3. `AggregatedConfidence` dataclass
4. Helpers: `_validate_self_score`, `_apply_retrieval_sanity_check`, `_compute_weighted_mean`, `_determine_flags`, `_build_review_reason`
5. Entry point: `aggregate_confidence(self_score, top_chunk_score, llm_review_reason)`

## Then wire it into the /answer endpoint

Update `rag-service/app/api/answer.py` per Section 9 Part E so the aggregator runs after `generate_answer()`. Update `tests/test_answer_endpoint.py` to assert the new confidence shape matches Plan 2's service contract.

## What's LOCKED (don't change without consulting me)

- Weights: `cites_policy=0.40, on_topic=0.25, vendor_tone=0.20, complete=0.15`
- Thresholds: `AGGREGATE_THRESHOLD=0.6`, `CITES_POLICY_FLOOR=0.5`
- Retrieval sanity check: `TOP_CHUNK_SCORE_THRESHOLD=0.7`, `OVER_CLAIM_PENALTY=0.2`
- Banner conditions: only `"all_flagged"` for now (other banners deferred)
- Strict `<` for thresholds (so 0.6 is NOT flagged, only `< 0.6`)

## Acceptance (Plan 8 Section 11)

- [ ] All tests in `test_confidence.py` pass
- [ ] Confidence aggregator wired into `/answer` endpoint
- [ ] `tests/test_answer_endpoint.py` updated to assert confidence shape
- [ ] Three commits with proper Conventional Commits format
- [ ] PR opened, self-reviewed, squash-merged to main
- [ ] Tag `v0.4.0` after merge

## Smoke test once merged

```bash
curl -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: smoke-conf-q01" \
  -d '{"question": "Do you maintain a formal Information Security Policy?", "source_format": "pdf"}'
# Expected: confidence object with score, dimensions, needs_review, review_reason
```

And test the flagged path:

```bash
curl -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: smoke-conf-ot" \
  -d '{"question": "How is privileged access to operational technology controlled?"}'
# Expected: needs_review: true, review_reason mentions OT scope mismatch
```

## Failure modes to avoid

- Don't change the locked weights or thresholds — they're tuned for the use case
- Don't use a different aggregation function (no max, no min, no median — weighted mean only)
- Don't introduce mocks where real component tests will do
- Don't write code for the TODOs in the test file — those are mine
- Don't skip the wire-into-endpoint step — the aggregator must show up in the response

## Acknowledge before proceeding

Reply with:
1. Confirmation that you've read Plan 8 and Plan 7
2. The exact next step (tests first, what file, what content)
3. Any clarifying questions

Then ask me: "Ready to start typing `test_confidence.py`?"
