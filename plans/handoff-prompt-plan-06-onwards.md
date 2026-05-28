# Handoff Prompt — Continue ISQ Agent from Plan 6

**Purpose:** Copy-paste everything below the `---` into a fresh Claude Code chat (opened in `/Users/tombutler/Repos/isq-agent`) to continue the project from Plan 6 without re-explaining context. Supersedes `plans/implementation-chat-prompt.md` (which was written pre-build and assumed manual coding exercises Tom no longer does).

**Snapshot when written:** 2026-05-28. Plans 1–5 complete and merged to `main`. Tag `v0.1.0`. CI green. Next: Plan 6 (question extraction).

---

# ISQ Agent — Implementation Brief (Plan 6 onward)

You're continuing an in-progress AI engineering project for Tom Butler, in the repo at `/Users/tombutler/Repos/isq-agent` (Claude Code, working tree access). Planning is done; Plans 1–5 are built and merged. Your job: build Plan 6 onward, following the locked TDD + git discipline and Tom's working style.

## What you're building

An **ISQ Agent** for fictional company Northstar Labs — an AI workflow that accepts a blank Information Security Questionnaire (PDF or XLSX), extracts the questions, grounds answers in Northstar Labs' 6 policies + 3 historical completed ISQs via RAG, generates evidence-backed answers with Claude, flags low-confidence answers for review, and renders output in three formats (filled original, DOCX, JSON).

**Two-tier architecture:** n8n workflow tier (port 5678) + Python FastAPI `rag-service` tier (port 8000). Both run via `docker compose up`. Most `rag-service` code was lifted from Tom's existing "Morpheus" RAG product and scrubbed of its Matrix theming.

## Why it exists

Technical assessment for **RiverAI** (Tom interviewing for AI Engineer). CEO Gav Winter + Senior AI Engineer Lee Jackson will demo + walkthrough with Tom. The walkthrough is half the deliverable — architecture, design decisions, failure modes, "what I'd do with more time" all matter. The repo is **public**, so commit history and CI status are visible hiring signals.

## Current state (verified at handoff)

- **Branch:** `main`, clean. Latest: `a77efbc fix: address Plan 5 code-review findings (#7)`.
- **Tag:** `v0.1.0` (RAG core operational, on the Plan 4 merge).
- **Tests:** 65 passing on **Python 3.11** (`cd rag-service && source .venv/bin/activate && pytest -v`).
- **CI:** GitHub Actions green on `main` (ruff check + ruff format --check + pytest + matrix-strip guard). Pre-commit hooks live.
- **Built so far:**
  - Plan 2 — Voyage embedding client (`app/voyage/client.py`) + backfilled tests
  - Plan 3 — FastAPI scaffold (`app/main.py`, CORS, structured logging, `GET /`, `GET /health`) + smoke tests
  - Plan 4 — RAG core: `app/utils/chunking.py`, `app/utils/document_processor.py` (PDF/DOCX/XLSX), `app/core/pinecone_client.py` (v5), `app/rag/query_rewriter.py`, `app/rag/retriever.py`, `POST /index` — all TDD, ~42 tests
  - Plan 5 — GitHub Flow, Conventional Commits, `.pre-commit-config.yaml`, `.github/workflows/ci.yml` (Python 3.11), PR template, `CONTRIBUTING.md`, matrix-strip leakage guard, ruff pinned `0.15.15`
- **Empty/reserved:** `app/extraction/` (Plan 6), `app/confidence/` (Plan 8), `app/render/` (Plan 9).
- **Pinecone:** index `isq-agent-knowledge` (1024 dims, cosine, serverless). Real indexing has NOT been run against the live corpus yet (verify with Tom; it needs API keys + a running server).

## Read first (in the repo)

1. `CLAUDE.md` — project guidance: architecture, essential commands, RAG config (chunk 500/overlap 50, source weighting policies×1.0/historical_isqs×0.95, min_score 0.5, top_k 5), models (`voyage-3-large`, `claude-sonnet-4-5`), critical invariants (Pinecone v5 only, deterministic vector IDs, weighting-before-min_score).
2. `RALPH.md` — the autonomous Ralph loop rules (loop operating/TDD/git rules + how to run `./loop.sh`).
3. `IMPLEMENTATION_PLAN.md` — current status + ordered checklist (the Ralph loop's working memory).
4. `plans/plan-06-question-extraction.md` — **the active plan** (full spec below).
5. `plans/git-conventions.md` — branch naming, Conventional Commits, milestone tags.
6. `plans/plan-07-answer-generation.md` … `plan-11` — what comes after (note: Plan 7 has a prompt-caching enhancement note).

## Working-style commitments (NON-NEGOTIABLE)

### 1. TDD is paramount (locked Plans 4–10)
Tests FIRST. Write the test file, run it, watch it fail (ModuleNotFoundError / AssertionError), then implement the minimum to pass, then confirm green. Each plan has a "Test plan" section — honour it. Commit the test file and implementation separately (one concern per commit).

### 2. Tom does NOT hand-type code anymore
**Important change from the original brief.** Earlier plans had "🖐️ Manual Coding Exercises" for Tom to type himself. Due to time, Tom now wants **you to write the code** (test-first), and he studies it after. Do NOT make him type implementations or leave TODO gaps for him. The exercise sections in the plans are still useful as *specs* (they contain the test cases and structure) — implement them fully.

### 3. Git discipline (Plan 5, locked)
- **GitHub Flow:** every change on a short-lived branch (`feature/`, `fix/`, `test/`, `docs/`, `chore/`), via PR, squash-merge, delete branch.
- **Conventional Commits:** `<type>(<scope>): <subject>` — imperative, lowercase, no trailing period, <72 chars. Stage files explicitly (never `git add .`).
- **Pre-commit + CI must pass.** Python 3.11; ruff pinned `0.15.15` (local + pre-commit + CI must agree). No `--no-verify`. No force-push to `main`.
- **Milestone tags:** next is `v0.2.0` after Plan 6 (question extraction live).

### 4. Review every PR with `/code-review:code-review` BEFORE merging
Tom is building foolproof habits and **deliberately slowing iteration**. From Plan 6 on: open the PR, run the `/code-review:code-review` skill on the **open** PR (it gates on closed PRs, so review before merging), address real findings, then squash-merge. CodeRabbit also auto-reviews as a backup. Don't merge unreviewed.

### 5. ZERO Matrix theming
The lifted code must never contain Matrix-universe terms (Morpheus, Neo, Trinity, Zion, "the matrix", agent smith, red/blue pill, etc.). Enforced by `rag-service/tests/test_isq_prompts_no_matrix_leakage.py` (in CI + pre-commit). Don't break it.

### 6. Tom's voice for prose (READMEs, PRs, docs, walkthrough)
Direct, Northern English, slightly informal, contractions, confident-not-cocky. **Banned:** "genuinely", "leverage", "cutting-edge", "proven track record", em dashes, "I'd welcome the opportunity". **Prefer:** "properly", "I'm after", "a chat".

### 7. Concept Primers on request
When introducing dense concepts, offer simple analogies as **📘 Concept Primer** notes — Tom re-explains these in his walkthrough.

## Tooling available
- **Ralph loop:** `./loop.sh build 1 coach` runs one narrated TDD slice from `IMPLEMENTATION_PLAN.md`; `RALPH_ALLOW_UNSAFE_PERMISSIONS=1 ./loop.sh build 5 coach` runs autonomous, commit-capable iterations. Logs in `.claude-run/` (gitignored). Good for the test-first module-building plans.
- **Dev plugins** (reference, local-only `.claude/INSTALLED-PLUGINS.md`): pinecone (MCP — inspect the live index), github (MCP/PRs), commit-commands, pr-review-toolkit, code-review, coderabbit, pyright-lsp, claude-api, etc.
- **External services** (keys in repo-root `.env`, never commit): Voyage (`VOYAGE_API_KEY`, `voyage-3-large`), Anthropic (`ANTHROPIC_API_KEY`, `claude-sonnet-4-5`), Pinecone (`PINECONE_API_KEY`, index `isq-agent-knowledge`).

## Plan 6 — what to build next (summary; read the full plan)

**Goal:** a `POST /extract-questions` endpoint on `rag-service` that turns an inbound questionnaire into a structured list of questions.

- **Unified LLM extraction** (locked decision): both PDF and XLSX go through the SAME Claude **tool-use** call (guaranteed-schema JSON, no fragile parsing). XLSX rows are flattened to text first (`flatten_xlsx_to_text` helper), then fed to the same extractor prompt. `extraction_method` returns `"llm"`. (Note: the plan body also describes a tabular XLSX path and `"tabular"` method — Section 3 supersedes it with the unified-LLM decision; confirm with Tom which he wants, but the locked call is unified-LLM.)
- **Endpoint contract:** request `{ source_format, source_text | source_rows, filename }` → response `{ questions:[{question_id, index, text, page}], total, extraction_method, warnings, metrics }`. Stable `question_id` derived from filename prefix + zero-padded index (e.g. `sun-q01`), deterministic across runs.
- **Tool-use schema:** force `extract_questions` tool with `tool_choice` (Plan 6 §5 has the exact `input_schema`). System prompt extracts only numbered questions, ignores response placeholders / instructions / headers, strips trailing punctuation, emits warnings (`skipped_numbering`, `duplicate_numbering_detected`, `large_questionnaire`, `no_questions_detected`, `unnumbered_questions`).
- **Edge cases:** Plan 6 §7 table (zero questions, skipped/duplicate numbering, embedded placeholders, unnumbered, Anthropic failure → 503 for n8n retry).
- **Test plan:** Plan 6 §2 — ~20 tests across `tests/test_question_extractor.py` and `tests/test_extract_questions_endpoint.py`. Write these FIRST.
- **Centralise prompts** in `app/core/isq_prompts.py` (the matrix-strip guard scans `app/`, so keep it clean).
- **Wire the endpoint** into `app/main.py` (it already includes `health`/`answer`/`index` routers — add the extract router).

### Plan 6 git execution (from the plan)
Branch `feature/question-extraction`. Commits in order: `test(extraction): add tests for question extractor` → `feat(extraction): add unified LLM question extractor via claude tool-use` → `feat(api): add POST /extract-questions endpoint`. Open PR → **run `/code-review:code-review` on the open PR** → address findings → squash-merge. After merge, tag `v0.2.0`.

## What's NOT done / open decisions to raise with Tom
- Real `/index` run against the live corpus (verify it's been done; ~70 vectors expected in Pinecone).
- `v0.0.1` tag was intentionally **skipped** (it would sit lower than the already-existing `v0.1.0` on a later commit, since Plan 4 was built before Plan 5 — backwards versioning). If Tom wants the milestone marked, decide then.
- Plan 6 PDF/XLSX path: confirm unified-LLM (Section 3) vs the dual-path described elsewhere in the plan body.

## Acknowledge before proceeding
Respond with: (1) confirmation of which files you've read, (2) a summary of the concrete next step (the first Plan 6 TDD slice), (3) any questions. Then ask Tom: "Confirm we're starting Plan 6 (question extraction) — and has the real `/index` run been done against the corpus yet?" Don't just say "ready" — prove understanding by summarising back. Keep Tom's small-actionable-steps preference in mind (he has ADHD; confirm direction before going deep).

---

**End of brief. Paste everything from "# ISQ Agent — Implementation Brief (Plan 6 onward)" downward into the new chat.**
