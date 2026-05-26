# Execution Checklist — the daily anchor

**Open this file at the start of every work session this week.** It tells you the single next thing to do.

**Today:** Monday 2026-05-25 (planning done, prep work this evening)
**Submission target:** Friday 2026-05-29 morning
**CGI interview:** Wednesday 2026-05-27 morning (protected)

---

## Tonight (Monday 25 May) — prep + design handoff

The planning is done. Tonight is two small jobs:

- [x] Sign up for Voyage AI — DONE per Tom
- [x] Move files to iCloud for disk space — DONE per Tom
- [X] Hand `plans/claude-design-spec.md` to Claude Design for overnight iteration
- [X] **Sleep**

Email to Lee can wait until Tuesday morning (Lee won't see it tonight anyway).

---

## Tuesday 26 May — Foundation day

### Morning (9:00 - 12:30)

- [X] **9:00** — Send email to Lee from `taskandemails/email-to-lee-2026-05-25.md`. Verify Gav is CC'd. Hit send.
- [x] **9:15** — Review Claude Design output (came in overnight). ✅ DONE — Iteration 3 (Claude × RiverAI Hybrid) selected. See `plans/design-decision-locked.md` for record + 6 must-do tweaks before the Next.js stretch build.
- [x] **10:00** — Open Pinecone dashboard. Verify fresh project `isq-agent` + index `isq-agent-knowledge` (1024 dims) exists. Copy API key to local notes.
- [x] **10:15** — Initialise repo: `mkdir ~/Repos/isq-agent && cd ~/Repos/isq-agent && git init`
- [x] **10:20** — Copy planning artefacts:
  ```bash
  cp -r ~/Repos/RiverAICodeAssesmentPlan/plans ~/Repos/isq-agent/plans
  ```
- [x] **10:25** — Create `.gitignore`, `LICENSE` (MIT, copy from Morpheus), `.env.example`. **Do not commit** `source-corpus/` (gitignored per Audit 3 decision).
- [X] **10:35** — Save all API keys to `.env` (local, not committed): `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX=isq-agent-knowledge`
- [x] **10:45** — First commit: `chore: initial scaffolding with plans folder`
- [X] **11:00** — Plan 2 Manual Coding Exercise 1: type `Voyage client wrapper. Run smoke test.
- [X] **11:45** — Commit: `feat(voyage): add voyage embedding client wrapper`

Lunch break.

### Afternoon (13:30 - 17:30)

- [ ] **13:30** — Plan 3 work: create `config.py`, empty router stubs, then Exercise 2 (FastAPI `main.py`). uvicorn smoke test.
- [ ] **14:30** — Commit: `feat(api): scaffold fastapi app with cors and structured logging`
- [ ] **14:45** — Plan 5 work: create `.pre-commit-config.yaml`, `.github/workflows/ci.yml`, `.github/pull_request_template.md`
- [ ] **15:30** — Plan 5 Exercise 4: backfill tests for Voyage client + FastAPI main
- [ ] **16:15** — Install pre-commit, run all hooks, fix any failures
- [ ] **16:30** — Push to GitHub (create public repo `isq-agent` if not done yet)
- [ ] **16:45** — Verify CI green. Enable branch protection on `main`.
- [ ] **17:00** — Tag `v0.0.1`: `git tag -a v0.0.1 -m "v0.0.1 — initial scaffolding, CI, tests"`
- [ ] **17:15** — Push tag

Buffer 15 min for things that slip.

### Evening (optional, if energy)

- [ ] Start Plan 4 work (chunking + document processor)
- [ ] **OR** stop, sleep, hit Plan 4 fresh Wednesday afternoon

End of day: **stop**. Plan 4 can slide.

---

## Wednesday 27 May — CGI + Plan 6

### Morning — PROTECTED for CGI interview

- [ ] **Do not open ISQ Agent before CGI**
- [ ] Lunch + decompress (1 hour minimum)

### Afternoon (13:30 - 17:30) — Plan 4 catch-up + Plan 6

- [ ] **13:30** — Plan 4: chunking + document processor + Pinecone client + query rewriter + `/index` endpoint. Lift Morpheus modules with Matrix-strip checklist.
- [ ] Plan 4 Exercise 3: chunking tests first, watch fail, implement
- [ ] Run real indexing: `curl -X POST http://localhost:8000/index -d '{"force_reindex":true}'`. Verify ~70 vectors in Pinecone dashboard.
- [ ] Commit, PR, squash-merge. Tag `v0.1.0` — RAG core operational.

### Evening (19:00 - 22:00)

- [ ] **19:00** — Plan 6 work: question extraction (unified LLM path)
- [ ] Plan 6 Exercise 5: test_question_extractor.py first
- [ ] Add `/extract-questions` endpoint
- [ ] Commit, PR, squash-merge. Tag `v0.2.0`.

End of day: **stop earlier than usual**. Thursday is heavy.

---

## Thursday 28 May — Plans 7 + 8 + 9 (the heavy day)

Per Audit 3 Section 3 — Plan 7 moved here from Wednesday evening.

### Morning (9:00 - 12:30)

- [ ] **9:00** — Plan 7: answer generator (Exercise 6 first — test_generator.py)
- [ ] Implement generator with Claude tool-use, system prompt, few-shots
- [ ] Wire `/answer` endpoint
- [ ] Commit, PR, squash-merge. Tag `v0.3.0`.

### Afternoon (13:30 - 17:30)

- [ ] **13:30** — Plan 8: confidence aggregator (Exercise 7 first)
- [ ] Wire into `/answer` endpoint
- [ ] Commit, PR, squash-merge. Tag `v0.4.0`.
- [ ] **15:00** — Plan 9 DOCX renderer (Exercise 8 first — test_render_docx.py)
- [ ] Implement DOCX renderer
- [ ] Commit, PR, squash-merge.

### Evening (19:00 - 22:00)

- [ ] **19:00** — Plan 9 XLSX + JSON renderers (PDF deferred to Friday morning per Audit 3)
- [ ] Update n8n workflow to call all three renderers in parallel
- [ ] End-to-end smoke test with Sunflowers PDF
- [ ] Tag `v0.5.0` — pipeline complete (sans PDF)
- [ ] Quick Plan 10 read-through (don't rehearse yet)

End of day: **stop**. Friday morning is intense.

---

## Friday 29 May — Polish + submit

### Morning early (8:00 - 10:30) — final code + polish

- [ ] **8:00** — Plan 9 PDF renderer if shipping. If not, document as v1.1 backlog.
- [ ] **9:00** — Plan 9.5: packaged Claude Code skill (Exercise 8.5 — SKILL.md first)
- [ ] Test skill installs cleanly in a fresh Claude Code chat
- [ ] Commit, PR, squash-merge. Tag `v0.6.0`.
- [ ] **10:00** — Plan 11 README: write per Section 1 structure
- [ ] Architecture diagram export from Plan 3 Mermaid → PNG
- [ ] Create `docs/attributions.md`
- [ ] Create supporting files: `Makefile`, `SECURITY.md`, `CHANGELOG.md`, `scripts/` smoke-test scripts
- [ ] Backfill prompts for Plans 4-7 if not done

### Morning mid (10:30 - 12:00) — rehearsal

- [ ] **10:30** — Plan 10: silent dry-run of full demo
- [ ] **11:00** — Time the read-through (target ≤12 minutes)
- [ ] **11:30** — Record yourself once, watch back, iterate awkward sections
- [ ] **11:45** — Pre-meeting checklist saved as sticky note

### Morning late (12:00 - 13:00) — final submission

- [ ] Final smoke tests: Sunflowers PDF + Blackridge PDF + Simple Salvage XLSX
- [ ] Run `gitleaks detect --source . --no-git` (zero secrets)
- [ ] Run Matrix-strip grep (only attributions match)
- [ ] Final polish checklist (Plan 11 Section 4) — every box ticked
- [ ] Tag `v1.0.0`: `git tag -a v1.0.0 -m "v1.0.0 — submitted to RiverAI"`
- [ ] Push everything: `git push origin main --tags`
- [ ] Send submission email from `taskandemails/email-to-lee-submission.md`
- [ ] Update Notion job tracker: status → Submitted

### Afternoon — REST

- [ ] Close the laptop
- [ ] Walk away from screens for the weekend
- [ ] The hard work is done

---

## Cumulative tag milestones

| Tag | After | Status check |
|---|---|---|
| v0.0.1 | Tue scaffolding | repo + CI + first commits |
| v0.1.0 | Wed PM Plan 4 | RAG core operational |
| v0.2.0 | Wed PM Plan 6 | question extraction live |
| v0.3.0 | Thu AM Plan 7 | answer generation live |
| v0.4.0 | Thu PM Plan 8 | confidence + flagging live |
| v0.5.0 | Thu PM Plan 9 | DOCX + XLSX + JSON renderers |
| v0.6.0 | Fri AM Plan 9.5 | packaged skill |
| v1.0.0 | Fri morning | submission to RiverAI |

---

## If something goes wrong

| Situation | Response |
|---|---|
| Plan slips by half a day | Check the buffer (Wednesday afternoon, Friday late morning). Acceptable to slip Plan 9 PDF (already optional). |
| Plan slips by a full day | Drop the lowest-priority stretch: PDF renderer first, then Plan 9.5 skill if needed. Core MVP must ship. |
| Voyage / Pinecone / Anthropic outage | Stop work, monitor status pages, document the outage in a note. Don't waste hours retrying. |
| Tom feels overwhelmed | Re-read this checklist. Do the single next thing. Don't look at the week ahead, just the next 2 hours. |
| CGI interview takes more energy than expected | Wednesday evening optional. Push Plan 6 to Thursday morning. Plan 7 → Thursday afternoon. |
| Lee replies with a hard deadline | Re-prioritise. Tell Tom immediately. |

---

## The single rule

**Read this checklist before opening any other file. Do the single next unchecked item. Don't skip ahead.**

The plans are detailed for a reason. The checklist exists so you don't have to remember the plans. Trust the discipline you set up Monday night.
