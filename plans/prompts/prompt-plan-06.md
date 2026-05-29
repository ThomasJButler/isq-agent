# Companion Prompt — Plan 6 (Question Extraction)

**Use this prompt in Claude Code (VSCode) when you're ready to build Plan 6.**

Paste everything below the `---` line as your first message.

---

You're helping me build **Plan 6 — Question Extraction Strategy (TDD-first)** of the ISQ Agent project.

## Read these first

In `plans/`:
- **plan-06-question-extraction.md** (the plan you're executing)
- **plan-04-knowledge-base-and-retrieval.md** (the test-first methodology you'll follow)
- **plan-05-branching-and-git-workflow.md** (branching + Conventional Commits discipline)

## Branch + workflow

```bash
cd ~/Repos/isq-agent
git checkout -b feature/question-extraction
```

## What to do FIRST (TDD discipline)

Guide me through typing `rag-service/tests/test_question_extractor.py` per **Plan 6 Section 8 Part A**.

Watch tests fail. Then implement `rag-service/app/extraction/question_extractor.py` (Part C) at normal code-write pace.

Then add the endpoint: `rag-service/app/api/extract_questions.py` per Section 8 Part E.

## What's LOCKED

- **Unified LLM extraction** — PDF and XLSX both go through Claude (XLSX flattened to text first)
- **Claude tool-use** for guaranteed JSON output (not "return JSON" in prompt)
- **`extraction_method` always returns `"llm"`** (single unified path)
- **Stable `question_id`** format: `<filename-prefix-3-chars>-q<index-zero-padded>` e.g. `sun-q01`
- **Edge case behaviour table** (Plan 6 Section 7) — locked per row
- **>100 questions warning logic is CUT** (Audit 3 — keep in walkthrough as talking point only, no code path)

## What changed vs original plan

- Section 3 was rewritten to unified LLM path (Audit 1 decision)
- Section 6 (XLSX tabular logic) replaced with `flatten_xlsx_to_text` helper
- All extraction returns `extraction_method: "llm"`

## Acceptance

- [ ] All tests in `test_question_extractor.py` pass
- [ ] `/extract-questions` endpoint live
- [ ] Smoke test: real Sunflowers PDF returns ~20 questions
- [ ] Smoke test: real Simple Salvage XLSX returns 10 questions (via flattening)
- [ ] Commits use Conventional Commits format
- [ ] PR opened, self-reviewed, squash-merged
- [ ] Tag `v0.2.0` after merge

## Smoke test once merged

```bash
# PDF path
curl -X POST http://localhost:8000/extract-questions \
  -H "Content-Type: application/json" \
  -d '{"source_format": "pdf", "source_text": "<paste a few KB of Sunflowers PDF text>", "filename": "Sunflowers.pdf"}'
# Expected: questions array with ~20 entries, extraction_method: "llm"

# XLSX path
# (use a small script to flatten Simple Salvage XLSX rows to text first, then POST)
```

## Failure modes to avoid

- Don't reintroduce a tabular extraction path — unified LLM is locked
- Don't skip the tool-use schema — "return JSON" in prompt is fragile
- Don't write code for the >100Q warning — Audit 3 cut it
- Don't store the LLM extraction in any cache yet — extraction is per-ISQ, not per-question
- Don't write code for the TODOs in the test file — those are mine

## Acknowledge before proceeding

Reply with:
1. Confirmation you've read Plan 6 + Plan 4 + Plan 5
2. The exact next step
3. Any clarifying questions

Then ask me: "Ready to start typing `test_question_extractor.py`?"
