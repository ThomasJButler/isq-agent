# Companion Prompt — Plan 7 (Answer Generation)

**Use this prompt in Claude Code (VSCode) when you're ready to build Plan 7.**

This is the highest-stakes code in the project. Take it slow.

Paste everything below the `---` line as your first message.

---

You're helping me build **Plan 7 — Answer Generation Strategy (TDD-first)** of the ISQ Agent project.

## Read these first

In `/Users/tombutler/Repos/RiverAICodeAssesmentPlan/plans/`:
- **plan-07-answer-generation.md** (the plan you're executing)
- **plan-04-knowledge-base-and-retrieval.md** (the retriever this generator consumes)
- **plan-06-question-extraction.md** (the question shape this generator answers)
- **plan-08-confidence-and-flagging.md** (the next plan — confidence aggregator uses your self_score)

## Branch + workflow

```bash
cd ~/Repos/isq-agent
git checkout -b feature/answer-generator
```

## What to do FIRST (TDD discipline)

Guide me through typing `rag-service/tests/test_generator.py` per **Plan 7 Section 8 Part A**.

Watch tests fail. Then implement `rag-service/app/rag/generator.py` (Part C) at normal code-write pace.

Then wire up `rag-service/app/api/answer.py` per Section 8 Part E.

## What's LOCKED

- **Single Claude call per question** (NewsPerspective single-call shape)
- **Anthropic tool-use** forcing the `submit_answer` schema (Plan 7 Section 7)
- **System prompt** verbatim from Plan 7 Section 3 — strict rules + self-score definitions
- **Two few-shot examples** from ISQ_01 (Plan 7 Section 3) — one easy case, one scope-mismatch case
- **Source weighting at three layers**: retrieval rank + prompt rule #3 + cites_policy self-score
- **Citation verification + hallucination penalty** (Plan 7 Section 5) — penalise cites_policy by 0.2 if LLM cites a source_id we didn't provide
- **Edge case: zero chunks → deterministic needs_review** (no Claude call, saves token)
- **Edge case: Claude refusal → first-class needs_review handling**
- **Explicit metric fields in AnswerResult**: `tokens_in`, `tokens_out`, `cost_usd`, `latency_ms` (per Audit 3 coherence fix)

## Anthropic rate limiting (Audit 3 gotcha)

Claude Sonnet 4.5 typically rate-limited to 50 RPM on standard accounts. The n8n workflow per-question loop must:
- Set `Batch size = 5` in the HTTP Request node (not 10+)
- Retry on 429 per Plan 3 Section 4 retry policy
- Respect `Retry-After` header

Note this when wiring n8n later; for the rag-service `/answer` endpoint itself, just handle 429 from Anthropic gracefully and surface it as a 503 so n8n's retry logic kicks in.

## What's DEFERRED (don't build now)

- **Extended thinking for hard questions** — flagged in audit, deferred. Mention in walkthrough as "what I'd do with more time."
- **Streaming responses** — out of scope for v1.

## Acceptance

- [ ] All tests in `test_generator.py` pass
- [ ] `_verify_citations` correctly detects hallucinated source_ids
- [ ] System prompt + few-shots committed verbatim from Plan 7
- [ ] `/answer` endpoint live, returns full canonical shape
- [ ] Smoke test: real Sunflowers Q1 returns grounded answer with cites_policy >= 0.9
- [ ] Smoke test: Blackridge OT question returns needs_review=true with scope-mismatch reason
- [ ] Commits use Conventional Commits format
- [ ] PR opened, self-reviewed, squash-merged
- [ ] Tag `v0.3.0` after merge

## Smoke test once merged

```bash
curl -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: smoketest-q01" \
  -d '{"question": "Do you maintain a formal Information Security Policy?", "source_format": "pdf"}'
# Expected: answer with cites_policy near 1.0, on_topic near 1.0, needs_review false
```

Then the scope-mismatch test:

```bash
curl -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: smoketest-ot" \
  -d '{"question": "How is privileged access to operational technology (OT) controlled?"}'
# Expected: answer mentions Northstar is software-only, needs_review=true with OT scope reason
```

## Failure modes to avoid

- Don't omit the citation verification — silent acceptance of hallucinated citations is bad
- Don't change the system prompt without consulting me — it's tuned for the use case
- Don't skip the deterministic empty-chunks path — saves a token and is more honest
- Don't introduce streaming — out of scope for v1
- Don't write code for the TODOs in the test file — those are mine

## Acknowledge before proceeding

Reply with:
1. Confirmation you've read Plan 7 + Plan 4 + Plan 6 + Plan 8 outline
2. The exact next step
3. Any clarifying questions

Then ask me: "Ready to start typing `test_generator.py`?"
