# Handoff Prompt — Continue ISQ Agent from Plan 10 (Demo + Walkthrough)

**Purpose:** Copy-paste everything below the `---` into a fresh Claude Code chat (opened in `~/Repos/isq-agent`) to run Plan 10 without re-explaining context. Supersedes `plans/handoff-prompt-plan-08.md` (written at Plan 8).

**Snapshot when written:** 2026-05-29. Plans 1–8 merged (`v0.4.0`). Plan 9 (DOCX + XLSX + JSON renderers) and the `/process-questionnaire` assembler built; Plan 9.5 (packaged Claude Code skill) built. At the time this was written the assembler (**PR #17**) and skill (**PR #18**) were OPEN, plus a follow-up `fix(render)` for the `all_failed` banner and a small `fix(api)` for two #17 review nits. **Plan 10 is meant to start once those are merged and `v0.5.0` + `v0.6.0` are tagged** — so the first thing the new chat does is VERIFY the real state (commands below), not trust this snapshot.

> **Accuracy note (read this):** This handoff is the bridge from "build" to "ship". Two things the planning-era Plan 10 doc gets slightly wrong and you must correct:
> 1. **The draft walkthrough script in `plan-10` §1/§4 is NOT in Tom's voice** — it contains the banned word "genuinely" ("n8n is genuinely the orchestrator") and is littered with em dashes. The whole point of Plan 10's artefact is that it's the words *Tom* says, so the committed `docs/walkthrough-script.md` must be rewritten in his voice (see working-style commitment #6). Treat the plan's script as a *content outline*, not final prose.
> 2. **The demo medium needs confirming.** The plan assumes a working **n8n** workflow (drag-drop → three download links). But the assembler was DECIDED as a FastAPI endpoint (`/process-questionnaire`), not n8n, and Plan 9.5 added a second demo surface (the packaged skill / `process_isq.py`). Before writing the script, verify which surfaces actually run end-to-end (n8n workflow? the skill? `curl`?) and write the demo around what's real. Don't script a demo you can't run.

---

# ISQ Agent — Implementation Brief (Plan 10: Demo + Walkthrough)

You're continuing an in-progress AI engineering project for Tom Butler, in the repo at `~/Repos/isq-agent` (Claude Code, working-tree access). The build is essentially done (Plans 1–9.5). Plan 10 is the pivot from build to ship: it produces the **walkthrough script + Q&A prep + pre-meeting checklist** Tom will use on the RiverAI call, and the rehearsal plan. It is doc-and-rehearsal heavy, not code.

## What the project is

An **ISQ Agent** for fictional company Northstar Labs: an AI workflow that accepts a blank Information Security Questionnaire (PDF or XLSX), extracts the questions, grounds answers in Northstar Labs' policies + historical completed ISQs via RAG, generates evidence-backed answers with Claude, scores each answer's confidence and honestly flags low-confidence ones for review, then renders the filled response in DOCX, XLSX and JSON. Two-tier: an n8n workflow tier (5678) + a Python FastAPI `rag-service` (8000), both via `docker compose up`. The same engine is also packaged as an installable Claude Code skill.

## Why it exists

Technical assessment for **RiverAI** (Tom interviewing for AI Engineer). CEO Gav Winter + Senior AI Engineer Lee Jackson demo + walkthrough with Tom. **The walkthrough is half the deliverable** — architecture, design decisions, failure modes, and a "what I'd do with more time" list all matter. The repo is **public**, so commit history, CI status and tags are visible hiring signals. Plan 10 is what makes the walkthrough land.

## FIRST: verify the real state (don't trust the snapshot)

Run these and read the output before doing anything else:

```bash
git -C ~/Repos/isq-agent checkout main && git -C ~/Repos/isq-agent pull
git -C ~/Repos/isq-agent log --oneline -15
git -C ~/Repos/isq-agent tag            # expect v0.1.0 .. v0.6.0
gh pr list --repo ThomasJButler/isq-agent --state open # expect none of #17/#18 still open
cd rag-service && source .venv/bin/activate && pytest -q   # expect a clean pass (~213 tests)
```

**Expected Plan-10-start state:** `main` has Plans 1–9.5; tags through `v0.6.0`; the renderers (`app/render/render_{docx,xlsx,json}.py` + `shared.py`), the assembler (`app/api/process.py`, `POST /process-questionnaire`), and the skill (`skill/isq-agent/`) all merged. If a PR is still open or a tag is missing, that work isn't merged yet — surface it to Tom and agree whether to proceed or finish the merge first. **Tom reviews + merges; you never merge.**

## Read first (in the repo)

1. `CLAUDE.md` — project guidance: architecture, commands, RAG config, invariants, TDD + git discipline, safety rules.
2. **`plans/plan-10-demo-walkthrough.md`** — **the active plan.** The verbatim script outline (§1), slide stance (§2, recommend NO slides), demo dataset order (§3 — Sunflowers, then Blackridge, then Simple Salvage if time), Q&A prep (§4), lean-into talking points (§5), traps to avoid (§6), rehearsal plan (§7), git execution (§ bottom). Read it all, but apply the two corrections in the accuracy note above.
3. `plans/plan-09.5-packaged-claude-code-skill.md` §8 — the 90-second "install the skill, trigger it in a fresh chat" demo beat. **Weave this into the walkthrough** (it's a distinguishing card no other candidate has).
4. `plans/plan-11-final-consolidation.md` — what comes after (README rewrite, attributions, `v1.0.0`). Don't do it yet; know it's next.
5. `plans/git-conventions.md` — branch naming, Conventional Commits, the milestone-tag table.
6. `plans/implementation-chat-prompt.md` — original brief (supplementary background).
7. (optional) `design/` + `plans/design-decision-locked.md` — the stretch Next.js dashboard is a *separate* surface; the navy/amber/Calibri compliance palette is for the rendered documents only. Useful only for the "what I'd do with more time" framing.

## Working-style commitments (NON-NEGOTIABLE — Tom's locked habits)

1. **TDD where there's code.** Plan 10 is mostly docs, so this is light — but if you touch any code (e.g. a tiny demo helper), test-first, watch it fail, implement, green; commit test and impl separately.
2. **Tom does NOT hand-type.** You write the docs in full; he studies and rehearses. The plan's "Manual Coding Exercise 9" (type the script + record yourself) is *Tom's* rehearsal activity — you produce `docs/walkthrough-script.md`; the recording/watch-back is his.
3. **Git discipline.** Short-lived branch (`docs/walkthrough-script`) → PR → **Tom squash-merges**. Conventional Commits (`docs(demo): ...`), imperative, lowercase, no trailing period, <72 chars. Stage explicitly with absolute paths (`git -C ~/Repos/isq-agent add <path>`), never `git add .`. Pre-commit + CI must pass; no `--no-verify`; no force-push to `main`.
4. **Review before merge.** Tom runs `/code-review:code-review` on the OPEN PR himself, then merges. You open the PR and stop. (For a docs-only PR the review is light, but the habit holds.)
5. **ZERO Matrix theming.** No Morpheus/Neo/Trinity/Zion/"the matrix"/red-or-blue-pill etc. — in any committed file, including the script. Enforced by `tests/test_isq_prompts_no_matrix_leakage.py`. Note: the *spoken* opener references "Morpheus" as the name of Tom's own RAG product (that's allowed in conversation), but keep it out of committed prose where it reads as theming, and never put Matrix-universe terms in the repo.
6. **Tom's voice for ALL prose (CRITICAL for Plan 10 — the script IS the artefact).** Direct, Northern English, slightly informal, contractions, confident-not-cocky. **Banned: "genuinely", "leverage", "cutting-edge", "proven track record", em dashes, "I'd welcome the opportunity".** Prefer "properly", "I'm after", "a chat". The plan's draft script breaks these (e.g. "genuinely", em dashes) — scrub them. Read the script aloud in your head; if it doesn't sound like a confident Northern engineer talking, rewrite it.
7. **Concept Primers on request** — offer 📘 analogies for dense ideas; Tom re-explains them in the walkthrough.
8. **No "Generated with Claude Code" footer** on any GitHub artefact (PR descriptions, review comments, commits). Saved preference.

## What's been built since Plan 8 (so the demo reflects reality)

- **Plan 9 renderers** (`app/render/`): `render_docx` (clean report: summary table, navy/amber compliance styling, `[⚠ REVIEW]` badges, review reasons, citations), `render_xlsx` (overlay onto the source workbook + a Summary sheet, flagged cells filled yellow), `render_json` (lossless canonical envelope). **PDF is deferred** (Audit 3) — it belongs on the "what I'd do with more time" list, not the demo.
- **The `/process-questionnaire` assembler** (`app/api/process.py`): loops the `/answer` pipeline over a whole questionnaire and folds the results into one canonical envelope (`questionnaire_meta` + `answers[]` + `summary_metrics`) that the renderers consume. Per-question failure is isolated (`confidence: null`, the run still completes); run-level banner is `all_flagged` / `all_failed` / `null`.
- **Plan 9.5 skill** (`skill/isq-agent/`): `SKILL.md` + `scripts/{check_health,process_isq,reindex_corpus}.py` + `references/service_contract.md`. `process_isq.py <file>` runs the whole pipeline against the local service and writes `outputs/`. This is the second demo surface.
- **Confidence** (Plan 8, `app/confidence/`): hybrid score (weighted self-score + retrieval sanity check); three flag triggers (aggregate < 0.6, `cites_policy` < 0.5, or the LLM raised a review reason).

## Plan 10 — what to produce

Per the plan's git block, the committed artefacts are **docs** on branch `docs/walkthrough-script`:

1. **`docs/walkthrough-script.md`** — the verbatim script, in Tom's voice, with timing. Adapt the plan's §1 outline to the *actual* shipped system: the three real output formats (DOCX/XLSX/JSON), honest flagging with the real triggers, the Blackridge OT scope-mismatch beat, the architecture story (n8n where it shines / Python where the RAG expertise already lives), cross-system observability via `X-Request-Id`, and the Plan 9.5 skill-install beat. Verify any live numbers you quote (question count, cost, latency) against a real run — don't ship "20 questions / 8 cents / 42 seconds" unless that's what a Sunflowers run actually produces.
   - Commit: `docs(demo): add verbatim walkthrough script with timing`.
2. **`docs/qa-prep.md`** — the Q&A bank (plan §4), in Tom's voice, scrubbed of banned words. Add any new likely questions raised by the assembler/skill (e.g. "why a FastAPI endpoint for the loop instead of n8n?", "what does the packaged skill add over the docker stack?").
   - Commit: `docs(demo): add Q&A prep with likely questions`.
3. **`docs/pre-meeting-checklist.md`** — plan §1 pre-meeting checklist + §7 rehearsal plan, as a printable checklist.
   - Commit: `docs(demo): add pre-meeting checklist`.

Then: `ruff` isn't relevant for markdown, but pre-commit's trailing-whitespace/eof hooks run. Push `docs/walkthrough-script`, `gh pr create`, **stop for Tom's review.**

**Optional tag after merge** (Tom's call): `v0.9.0` — "submission candidate, demo script locked". The real milestone is `v1.0.0` at the end of Plan 11.

## Open items / things to confirm with Tom

- **Demo surface** (the big one): is the n8n workflow built and demo-ready, or is the demo driven by the packaged skill / `curl` against `/process-questionnaire`? Confirm before scripting the live section.
- **Live numbers**: run Sunflowers (and Blackridge) once against the populated index, capture the real question count / flagged count / cost / latency, and use those in the script. (Index population is billable — Tom's action; needs `VOYAGE_API_KEY` + `PINECONE_API_KEY` in `.env`. The index was populated earlier at ~77 vectors / 9 docs; re-confirm.)
- **Slides**: plan recommends none (the artefacts are the demo). Confirm Tom agrees.
- **Plan 11** is the finale (README rewrite for the public front door, attributions doc, final polish, `v1.0.0`, submission email). Don't start it inside Plan 10.

## Acknowledge before proceeding

Respond with:
1. Which files you've read (`CLAUDE.md`, `plans/plan-10-demo-walkthrough.md`, `plans/plan-09.5-packaged-claude-code-skill.md`, `plans/git-conventions.md`).
2. The verified current state (paste the key lines from the FIRST-verify commands — tags present, no stray open PRs, test count).
3. The concrete first step (draft `docs/walkthrough-script.md` in Tom's voice, after confirming the demo surface).
4. Confirmation you've clocked the two corrections: (a) the draft script must be rewritten in Tom's voice (no "genuinely", no em dashes); (b) the demo medium (n8n vs the packaged skill vs curl) must be confirmed against what actually runs before you script it.

Don't just say "ready" — prove understanding by summarising back. Keep Tom's small-actionable-steps preference in mind (he has ADHD; confirm direction before going deep, and offer 📘 Concept Primers for dense ideas).

---

**End of brief. Paste everything from "# ISQ Agent — Implementation Brief (Plan 10: Demo + Walkthrough)" downward into the new chat.**
