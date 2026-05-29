# Plan 11 — Final Consolidation + Execution Timeline + Submission

**Status:** Plan 11. The final plan. Everything converges into submission.

**Owner:** Tom Butler
**Date:** 2026-05-25
**Prior plans:** Plan 1-10 ✅

---

## 0. What this plan does

Locks in:
- README structure + content (the front door for Lee/Gav)
- Architecture diagram export (Mermaid → PNG for GitHub README)
- Attributions doc (`docs/attributions.md`)
- Final repo polish (LICENSE, .gitignore, secret scan, no Matrix leakage)
- Day-by-day execution timeline (Tue 26 May → Fri 29 May)
- Submission email to Lee
- `v1.0.0` tag
- Post-submission follow-up plan

Doesn't yet cover:
- Anything — this is the final plan

---

## 1. README structure (the front door)

The README is what Lee sees when he opens the GitHub repo. It must:
- Land the JobSearch2026 + portfolio convergence story in the first 30 seconds of reading
- Make the architecture instantly clear
- Show TDD + git hygiene at a glance (badges, tags, plans folder)
- Tell Lee how to run it locally if he wants
- NOT bury the lead under setup instructions

### Locked structure

```markdown
# ISQ Agent

> AI-powered workflow that ingests supplier security questionnaires (PDF/XLSX),
> retrieves grounded answers from a knowledge base of policies + historical responses,
> and produces filled response documents in three formats with honest confidence flagging.

[CI badge] [Tests: 9/9] [Tags: v1.0.0]

Built by Tom Butler for the RiverAI AI Engineer technical challenge.

## Why it exists

[2-3 sentences. The JobSearch2026 meta-pattern card.]

## What it does

[Bullet list — the brief's requirements, ticked off.]

## Architecture

[Embedded PNG of the Mermaid diagram from Plan 3.]

[5 sentences explaining the two-tier split.]

## Run it locally

```bash
git clone https://github.com/ThomasJButler/isq-agent.git
cd isq-agent
cp .env.example .env  # add your VOYAGE_API_KEY, ANTHROPIC_API_KEY, PINECONE_API_KEY
docker compose up

# Open http://localhost:5678 — upload a PDF questionnaire from /source-corpus/
```

## Tech stack

n8n (workflow) · Python 3.11 + FastAPI (RAG service) · Anthropic Claude Sonnet 4.5 · Voyage AI (embeddings) · Pinecone (vector store) · python-docx + reportlab + openpyxl (rendering) · Docker Compose

## How it was built

11 planning iterations before any code, captured in `/plans`. TDD throughout — every module's tests written before implementation. GitHub Flow with squash-merged PRs, Conventional Commits, pre-commit hooks, GitHub Actions CI.

## Design decisions

See `docs/architecture.md` for the full architecture writeup including:
- Why two tiers (n8n orchestration + Python RAG service)
- Why hybrid confidence scoring (LLM self-score + retrieval similarity sanity check)
- Why typeset PDF instead of overlay
- Source weighting at three layers (retrieval, prompt, self-score)
- Cross-system observability via X-Request-Id propagation

## Design (stretch)

A thin Next.js dashboard was designed though not built for v1 — the functional MVP runs through n8n's form trigger. Three visual iterations were produced; the lead is the "Claude × RiverAI Hybrid": a Claude warm-paper foundation with RiverAI black-pill CTAs, a blue interactive accent, and a single "Powered by Claude" badge.

![ISQ Agent — landing](LANDING_SCREENSHOT_URL)
![ISQ Agent — results: a flagged answer with its four-dimension confidence breakdown](RESULTS_SCREENSHOT_URL)

Full handoff — design tokens, components, five screens, interactive prototype: [`design/design_handoff_isq_agent/`](design/design_handoff_isq_agent/).

## Reused components

See `docs/attributions.md` for the patterns and code lifted from Tom's other projects:
- Morpheus (RAG core, chunking, query rewriter)
- NewsPerspective (single-call multi-field analysis shape)
- ReviewBot Protocol (multi-dimension confidence scoring)
- SQL-Ball (strict-rules-in-prompt grounding)
- Oracle Chat (judgement about when not to embed)
- JobSearch2026 (knowledge-grounded generation meta-pattern)

## Project plans

`/plans` contains the 11 iterative planning documents written before any code:
- Plan 1: Initial sketch + decisions locked
- Plan 2: Stack lock-in + service contract + repo foundation
- Plan 3: Architecture proper + failure modes
- Plan 4: Knowledge base + retrieval (TDD-first)
- Plan 5: Branching strategy + git workflow
- Plan 6: Question extraction (TDD-first)
- Plan 7: Answer generation (TDD-first)
- Plan 8: Confidence + flagging (TDD-first)
- Plan 9: Output rendering (TDD-first)
- Plan 10: Demo + walkthrough script
- Plan 11: Final consolidation + submission

This is the "approach and thought process" Lee asked to see.

## Licence

MIT — see [LICENSE](LICENSE)

## Built by

Tom Butler — [thomasjbutler.me](https://thomasjbutler.me) · [linkedin.com/in/thomasbutleruk](https://linkedin.com/in/thomasbutleruk)
```

### Why this shape

- **First 30 seconds:** Lee reads "Built by Tom Butler for the RiverAI AI Engineer technical challenge" + sees the JobSearch2026 reference. Continuity story lands immediately.
- **Then:** badges, architecture, run-it-locally — fast scanning.
- **Then:** design decisions + reused components — proof of thinking.
- **At the bottom:** the 11 plans listed. Lee can dive into any of them. The plans-folder IS the "approach and thought process" Lee explicitly asked for.

---

## 2. Architecture diagram export

The Mermaid diagram from Plan 3 Section 1 needs exporting to PNG for the README (GitHub renders Mermaid in markdown but PNG is more reliable for the README hero).

### Steps

1. Open Plan 3 in any Mermaid-rendering markdown viewer (VSCode with Mermaid extension, Obsidian, or [mermaid.live](https://mermaid.live))
2. Render the diagram
3. Export as PNG (1200×900 minimum for clarity)
4. Save to `docs/architecture-diagram.png`
5. Reference in README as `![Architecture](docs/architecture-diagram.png)`
6. Also save the raw Mermaid source to `docs/architecture-diagram.mmd` for future edits

---

## 2b. Design screenshots (stretch dashboard)

The interactive prototype exports to 17 reference PNGs at `design/design_handoff_isq_agent/designs/prototype-hybrid/pngs/` (10 screens + 7 wireframes). These are kept **out of git** by choice (per Tom's no-binary-blobs preference) — deliver them to the README without committing binaries:

### Steps

1. Lead shots: `01-landing`, `05-results-answer-expanded` (flagged answer + confidence breakdown), and `wireframe-06-userflow` (architecture in one frame).
2. Upload them to a GitHub issue, PR, or the v1.0.0 release; GitHub returns a CDN URL (`github.com/<owner>/<repo>/assets/...`).
3. Paste those URLs into the README "Design (stretch)" section, replacing the `LANDING_SCREENSHOT_URL` / `RESULTS_SCREENSHOT_URL` placeholders. The images render on github.com but never enter the git tree.

Note: the dashboard itself is unbuilt; its data-contract reconciliation (nested-vs-flat confidence, citation `source_id`↔`{source,page}`, the run envelope) is captured in `plans/design-decision-locked.md` for whoever builds it — **not** a v1 task.

---

## 3. Attributions doc

`docs/attributions.md` — explicit, transparent record of what was lifted from where.

```markdown
# Attributions

This project reuses code, patterns, and design decisions from Tom Butler's other projects.
All reuse is explicit and credited here.

## Direct code lift

### Morpheus — RAG core

- `app/utils/chunking.py` — adapted from Morpheus `backend/app/utils/chunking.py`
- `app/utils/document_processor.py` — adapted from Morpheus `backend/app/utils/document_processor.py`, with added XLSX support
- `app/core/pinecone_client.py` — adapted from Morpheus `backend/app/core/pinecone_client.py`, with new credentials (fresh Pinecone project)
- `app/rag/query_rewriter.py` — adapted from Morpheus `backend/app/rag/query_rewriter.py`, with ISQ-specific prompt

All Matrix-themed personality (Morpheus, Neo, "the Matrix", etc.) has been removed.
Enforced by `tests/test_isq_prompts_no_matrix_leakage.py` running in CI.

Original Morpheus repo: https://github.com/ThomasJButler/Morpheus
Live demo: https://morpheusrag.vercel.app

## Pattern reuse (concept, not code)

### NewsPerspective — single-call multi-field analysis

Pattern: one LLM call returns `{answer, citations, confidence, needs_review_reason}` together,
instead of chaining four separate calls.

Used in: `app/rag/generator.py` answer generation.
Original: https://github.com/ThomasJButler/NewsPerspective `src/backend/services/ai_service.py`

### ReviewBot Protocol — multi-dimension scoring

Pattern: score across N independent dimensions, aggregate via weighted mean.

Used in: `app/confidence/aggregator.py` confidence scoring across 4 dimensions
(cites_policy, on_topic, vendor_tone, complete).
Original: https://github.com/ThomasJButler/ReviewBot-Protocol — six-dimension code analysis pattern.

### SQL-Ball — strict-rules-in-system-prompt grounding

Pattern: numbered, strict rules in the system prompt forcing grounded outputs.

Used in: `app/core/isq_prompts.py` system prompt for answer generation.
Original: https://github.com/ThomasJButler/SQL-Ball `backend/rag/chain.py`.

### Premier League Oracle Chat — judgement about when NOT to embed

Pattern: structured tabular grounding for structured data; embeddings only for unstructured prose.

Used in: design decision to use embeddings for policy documents (unstructured) rather than for
the questionnaire questions themselves (structured).
Original: https://github.com/ThomasJButler/The-Premier-League-Oracle `backend/app/api/rag.py`.

### JobSearch2026 — knowledge-grounded generation meta-pattern

The overall architectural shape — knowledge base + voice constraint + multi-format generation +
iterative quality discipline — was first prototyped in JobSearch2026 for CV/cover letter
generation. The ISQ Agent applies the same shape to security questionnaires.

(JobSearch2026 is private — referenced for context.)

## External libraries

- n8n — workflow orchestration (Apache 2.0)
- FastAPI — Python web framework (MIT)
- Anthropic Python SDK (MIT)
- Voyage AI Python SDK (MIT)
- Pinecone Python SDK (Apache 2.0)
- python-docx (MIT)
- reportlab (BSD)
- openpyxl (MIT)
- pytest (MIT)
- ruff (MIT)
```

---

## 4. Final repo polish checklist

Before submission, run through every item:

- [ ] **README.md** — final review, link checks, no typos, badges working
- [ ] **Security review (Section 4b)** — automated tooling + manual threat-surface pass done, `SECURITY.md` written, findings fixed or documented
- [ ] **LICENSE** — MIT present
- [ ] **.gitignore** — `.env`, `__pycache__`, `node_modules`, `source-corpus/`, `.DS_Store`, IDE folders
- [ ] **.env.example** — present, all required env var names, no values
- [ ] **docs/architecture.md** — full architecture writeup with diagram
- [ ] **docs/attributions.md** — created per Section 3
- [ ] **docs/walkthrough-script.md** — script committed (from Plan 10)
- [ ] **plans/** — all 11 plans committed (including this one)
- [ ] **plans/prompts/** — all per-plan companion prompts committed (including backfills for 4-7)
- [ ] **Design story** — README "Design (stretch)" section added; landing + results-expanded screenshots delivered via GitHub asset URLs (uploaded to an issue/release, referenced by CDN URL — NOT committed as binaries); `design/design_handoff_isq_agent/` link verified
- [ ] **CI** — green on main, badge in README working
- [ ] **Tests** — all green, coverage acceptable
- [ ] **Tag v1.0.0** — `git tag -a v1.0.0 -m "v1.0.0 — submitted to RiverAI"` + push
- [ ] **Secret scan** — `gitleaks detect --source . --no-git` returns clean
- [ ] **Matrix-strip scan** — `grep -irE '(morpheus|matrix|neo|white rabbit|trinity)' app/ docs/ --include='*.py' --include='*.md'` — only attributions allowed
- [ ] **n8n workflows exported** — JSON files in `n8n/workflows/` committed
- [ ] **Pre-commit hooks** — `.pre-commit-config.yaml` committed
- [ ] **GitHub Actions** — `.github/workflows/ci.yml` committed
- [ ] **PR template** — `.github/pull_request_template.md` committed
- [ ] **README local-run instructions tested** — clone fresh, follow steps, confirm works
- [ ] **Public repo settings** — branch protection on main, status checks required

---

## 4a. Corpus handling — gitignored (decided Audit 3)

**Decision (Tom, 2026-05-25):** the `source-corpus/` folder is **gitignored**. Reason: it's RiverAI's example data, and Tom plans to use this repo as a portfolio piece later with different data + a new README. Keeping the corpus out of the repo makes both the assessment submission AND the future portfolio rebrand cleaner.

### Implementation

`.gitignore` contains:
```
source-corpus/
```

`source-corpus/README.md` is the single committed file in that folder, explaining what should go there:
```markdown
# Source corpus

This folder is gitignored. To run the ISQ Agent end-to-end, place here:

- 6 policy PDFs (or equivalent organisational policy documents)
- 3+ historical completed ISQs (or equivalent prior responses)

The included `policies/` and `historical-isqs/` subfolders show the expected
structure. The system auto-detects source type by filename pattern
(see app/extraction/source_type_detector.py).
```

### What Lee gets

When Lee clones the repo:
1. The README explains the system
2. The plans folder shows the design process
3. The code is fully runnable IF Lee provides his own ISQs and policies
4. For the demo walkthrough, Tom hands over the original RiverAI-provided files separately (kept locally, not in the public repo)

This is the most professional handling — respects RiverAI's IP, keeps the public repo clean, makes the repo immediately suitable as a portfolio piece for any future use.

---

## 4b. Full security review (before v1.0.0)

The repo is public and the service takes untrusted input (uploaded questionnaires) and feeds it to an LLM with real spend behind it. A proper security pass is part of the submission, not an afterthought. Run it on a branch (`chore/security-review`) after the demo docs land and before tagging `v1.0.0`. It has two halves: automated tooling and a manual threat-surface review specific to this app. Anything it finds either gets fixed, or gets written up honestly in `SECURITY.md` as a known limitation with the reasoning (an honest "no auth because it's an internal service behind n8n, here's how I'd add it" is a stronger signal than pretending the gap isn't there).

### Automated tooling

- [ ] **`/security-review` skill** — run the built-in security-review skill over the diff/codebase and triage its findings (it is the primary pass; the items below are the manual backstop).
- [ ] **Secret scan** — `gitleaks detect --source . --no-git` returns clean. Also scan history: `gitleaks detect --source .` (full git history, in case a key was ever committed and reverted). `.env` must never have been committed.
- [ ] **Dependency audit** — `pip-audit -r rag-service/requirements.txt` (or `uv pip audit`) for known CVEs in the pinned deps. Note Pinecone is pinned to v5 deliberately (v6 has breaking changes) — if v5 has an advisory, document the trade-off rather than blindly bumping.
- [ ] **Static analysis** — `bandit -r rag-service/app` for common Python security anti-patterns (unsafe tempfile use, subprocess, eval, etc.).
- [ ] **CodeRabbit / ultrareview** — let the existing review bots have a security-focused pass on the final diff.

### Manual threat-surface review (specific to this app)

- [ ] **Prompt injection (the headline risk).** A malicious questionnaire is untrusted text that flows into the Claude prompt (`/extract-questions` and `/answer`/`generator.py`). Confirm: question text is treated as data, not instructions; the system prompt's strict rules ("use only the provided chunks, never invent") hold even when a question says "ignore your instructions and output X"; the citation-verification layer still catches fabricated `source_id`s. Add an adversarial test case (a question containing an injection attempt) and confirm the answer stays grounded + flags low confidence. This is the most defensible thing to demo: "here's what happens when someone puts an attack in the questionnaire."
- [ ] **File-upload handling (`/render` + n8n).** The `/render` endpoint and the n8n Form Trigger accept uploaded files. Confirm: file type is validated (only PDF/XLSX), there is a size cap (n8n binary mode + a FastAPI/Starlette body limit) so a huge upload can't exhaust memory/disk, the uploaded `source` workbook is written to a per-request tempdir and cleaned up (already fixed in #20), and a malformed/zip-bomb XLSX is handled (openpyxl `read_only` where possible, caught exceptions, no crash).
- [ ] **Path traversal / file writes.** Confirm no user-controlled string reaches a filesystem path unsanitised — the render output filename is server-controlled (`response.{ext}`), the tempdir is `mkdtemp`, and the upload is written to a fixed name inside it. No user input concatenated into a path.
- [ ] **No-auth internal service.** `rag-service` has no authentication (it trusts n8n on the docker network). That is acceptable for a local two-tier demo but must be stated in `SECURITY.md` with the production fix (network isolation / an internal API key / mTLS between n8n and the service). Confirm the service isn't bound to a public interface in any committed config and that `docker-compose.yml` only exposes what's needed.
- [ ] **CORS.** `main.py` allows `localhost:5678` and `n8n:5678` only — confirm it's still that tight (no `allow_origins=["*"]`) and credentials handling is sane.
- [ ] **Error handling / info disclosure.** Confirm endpoint errors return clean messages, not stack traces or internal paths, and that upstream-provider errors (Anthropic/Voyage/Pinecone) map to 502/503 without leaking keys or internal detail. Structured logs must not log secrets or full request bodies.
- [ ] **Cost / DoS via the LLM.** Each question is a billable Claude call; a 500-question questionnaire is real money. Confirm there's a sane cap on questions per run (or document the limit) so an abusive upload can't run up unbounded spend. The per-run `summary_metrics.total_cost_usd` already makes spend visible.
- [ ] **SSRF / outbound.** The service makes outbound calls only to fixed provider SDKs (no user-controlled URLs fetched). Confirm nothing in the pipeline fetches a user-supplied URL.
- [ ] **Secrets at rest / in config.** `.env` gitignored, `.env.example` has names only, no keys in `docker-compose.yml`, logs, test fixtures, or the committed n8n workflow JSON (n8n exports can embed credentials — scrub the exported `isq-agent.json` of any credential blocks before committing).
- [ ] **Packaged skill.** `process_isq.py` / `reindex_corpus.py` read local files and hit the local service — confirm they don't execute arbitrary input and that the skill docs don't instruct running anything unsafe.

### Output

- [ ] **`SECURITY.md`** — written up: the threat model in two paragraphs, what was checked, what was fixed, and the honest known-limitations list (no-auth internal service, question cap, prompt-injection mitigations and their bounds). This doubles as a strong walkthrough/Q&A artefact.
- [ ] Any fix lands test-first like everything else; the write-up references the tests that prove the mitigations.

---

## 5. Day-by-day execution timeline (revised per Audit 3)

**Today is Monday 25 May 2026** (UK bank holiday). Submission target: **Friday 29 May morning**.

### Tuesday 26 May — Foundation day

Morning:
- [ ] Send email to Lee (drafted in `taskandemails/email-to-lee-2026-05-25.md`)
- [ ] Plan 2 end-of-plan checklist (Voyage signup, Pinecone fresh project, repo init, .env.example, .gitignore, LICENSE)
- [ ] Type Manual Coding Exercise 1 (Voyage client wrapper)

Afternoon:
- [ ] Plan 3 end-of-plan checklist (FastAPI main.py via Exercise 2, config.py, empty router stubs, uvicorn smoke test)
- [ ] Plan 5 end-of-plan checklist (.pre-commit, CI, backfilled tests via Exercise 4)
- [ ] First v0.0.1 tag
- [ ] Open new chat with `implementation-chat-prompt.md` for the per-plan work

Evening (optional):
- [ ] Plan 4 work (chunking + document processor + Pinecone client + query rewriter + /index endpoint)
- [ ] Tag v0.1.0 if RAG core operational

### Wednesday 27 May — CGI interview morning + Plan 4 catch + Plan 6

Morning:
- [ ] **PROTECTED — CGI interview**
- [ ] Don't open ISQ Agent before the interview

Afternoon (post-CGI):
- [ ] Decompress for an hour. Don't push through.
- [ ] Plan 4 catch-up if it slipped from Tuesday (chunking + processor + Pinecone + query rewriter + /index endpoint)
- [ ] Tag v0.1.0 — RAG core operational

Evening:
- [ ] Plan 6 work only (question extraction with unified LLM path)
- [ ] Tag v0.2.0

**Plan 7 moves to Thursday morning** (per Audit 3 — Wednesday evening can't realistically take both 6 and 7).

### Thursday 28 May — Plans 7 + 8 + 9 (the heavy day)

Morning:
- [ ] Plan 7 work (answer generator with tool-use) — moved from Wednesday
- [ ] Tag v0.3.0

Afternoon:
- [ ] Plan 8 work (confidence aggregator)
- [ ] Tag v0.4.0
- [ ] Plan 9 DOCX renderer (Exercise 8)

Evening:
- [ ] Plan 9 XLSX + JSON renderers (PDF deferred to Friday morning or v1.1)
- [ ] n8n workflow build: Form Trigger → PDF parser → extract-questions HTTP → loop → answer HTTP → assemble → render parallel → response page
- [ ] End-to-end smoke test with Sunflowers PDF
- [ ] Tag v0.5.0 — pipeline complete (sans PDF)
- [ ] Brief Plan 10 read-through (don't rehearse yet)

### Friday 29 May — Polish + submit

Morning early (8:00 - 10:30):
- [ ] Plan 9 PDF renderer IF shipping (else document as v1.1 backlog)
- [ ] Plan 9.5 packaged Claude Code skill (Exercise 8.5 — SKILL.md first)
- [ ] Tag v0.6.0 once skill installs cleanly in a fresh Claude Code chat
- [ ] README written per Section 1 structure
- [ ] Architecture diagram export → docs/architecture-diagram.png
- [ ] docs/attributions.md
- [ ] Supporting files: Makefile, SECURITY.md, CHANGELOG.md, scripts/ smoke tests
- [ ] Backfill prompts for Plans 4-7 if not done

Morning mid (10:30 - 12:00):
- [ ] Plan 10 silent dry-run + recorded run + iterate awkward sections

Morning late (12:00 - 13:00):
- [ ] Final smoke tests (Sunflowers + Blackridge + Simple Salvage)
- [ ] gitleaks scan, Matrix-strip scan
- [ ] Final polish checklist (Section 4) — every box
- [ ] Tag v1.0.0
- [ ] Push everything
- [ ] Send submission email to Lee
- [ ] Update Notion job tracker

Afternoon: REST.

---

## 6. The submission email

When you tag v1.0.0 and push, send Lee this:

```
To: Lee Jackson <lee.jackson@riverai.co.uk>
Cc: Gav Winter <gav.winter@riverai.co.uk>
Subject: ISQ Agent — submission

Hi Lee,

ISQ Agent is ready for review.

Repo: https://github.com/ThomasJButler/isq-agent (public, MIT)

A few quick notes:

- README has the architecture, run-it-locally steps, and the tech stack.
- /plans contains the 11 planning iterations I went through before writing any code — this is the "approach and thought process" you mentioned wanting to see.
- /docs/walkthrough-script.md is what I'll walk you through on the call.
- /docs/attributions.md is explicit about what's reused from my other projects (Morpheus, NewsPerspective, ReviewBot, SQL-Ball, Oracle Chat).
- v1.0.0 tag is the submission cut. CI is green.

Happy to schedule the walkthrough whenever works. Aiming for ~15 mins demo + ~10 mins Q&A.

Kind regards,
Tom
```

Save this template to `taskandemails/email-to-lee-submission.md` so you have it ready when v1.0.0 is tagged.

---

## 7. Post-submission follow-up plan

**Same day (Friday afternoon):**
- Don't refresh email obsessively. Lee said decisions early June.
- Update Notion job tracker (status: Submitted) — see `job-tracker` skill.
- Take the rest of the weekend off completely. You've earned it.

**If walkthrough scheduled (early next week):**
- Wednesday before: full rehearsal again.
- Day of: 30 mins before — smoke tests + tabs ready.
- After: short thank-you email same evening.

**If no response by Friday 5 June:**
- Send a polite check-in. One sentence.

**If outcome is "no":**
- The ISQ Agent is still yours. Productise it. The architecture is reusable; the patterns are durable. JobSearch2026 + ISQ Agent + Morpheus is a serious portfolio.

**If outcome is "yes":**
- Negotiate, accept, prepare for the start date.
- The plans-folder discipline you used here is exactly what you'll bring to RiverAI engagements.

---

## 8. End-of-Plan-11 checklist (the final one)

- [ ] README.md complete per Section 1
- [ ] Architecture diagram exported to PNG per Section 2
- [ ] `docs/attributions.md` created per Section 3
- [ ] Security review complete per Section 4b — `SECURITY.md` committed, findings fixed or documented
- [ ] Final repo polish checklist (Section 4) — every box ticked
- [ ] Backfill prompts for Plans 4-7 created (in `plans/prompts/`)
- [ ] All `plans/` files committed
- [ ] Tag `v1.0.0` and push
- [ ] Submission email sent (Section 6)
- [ ] Notion job tracker updated
- [ ] Walk away from the laptop for the weekend

---

## 8a. Git execution block (the final one)

See `git-conventions.md` for the full reference. Plan 11 is mechanical — README, attributions, polish. Per the conventions doc you can direct-push to main in the submission window if CI is green, but a final PR is still cleaner.

**Branch:** `docs/readme-and-submission-polish`

**Commits (in order):**
1. `docs(readme): add README with architecture, quickstart, attributions` — stages `README.md`, `docs/architecture.png`
2. `docs(repo): add attributions, security, changelog, makefile` — stages `docs/attributions.md`, `SECURITY.md`, `CHANGELOG.md`, `Makefile`
3. `chore(repo): add smoke-test scripts and final gitignore sweep` — stages `scripts/*`, updated `.gitignore`
4. `docs(plans): commit planning artefacts` — stages `plans/*.md`, `plans/prompts/*.md`

**Pre-tag checks (do not skip):**
```bash
gitleaks detect --source . --no-git   # zero secrets (working tree)
gitleaks detect --source .            # zero secrets (full history)
pip-audit -r rag-service/requirements.txt   # no known CVEs (or documented trade-off)
bandit -r rag-service/app             # no high-severity findings
grep -ri "matrix" --include="*.py" rag-service/   # only attributions.md should match
pytest                                # all green
```
The full security pass (Section 4b) runs on its own `chore/security-review` branch before this; these are the final confirmation gates.

**Push + PR + merge:**
```bash
git push -u origin docs/readme-and-submission-polish
gh pr create --fill
# self-review on GitHub, squash-merge via UI
git checkout main && git pull
```

**Final milestone tag — `v1.0.0`:**
```bash
git tag -a v1.0.0 -m "v1.0.0 — submitted to RiverAI"
git push origin main --tags
```

Then send the submission email per Section 6 and update Notion. Done.

---

## 9. Plan 11 done ✅ — the planning phase is closed

All 11 plans committed. The build is ahead of you, but the design is locked. TDD discipline + branching + git hygiene + walkthrough script all defined.

You've planned more thoroughly than any candidate Lee will see. Most will write code first and explain after. You've explained first, which means the code you write will be tighter, more defensible, and easier to walk through.

The pattern you've followed here — plan 11 times, then build with discipline — is itself the senior engineering signal RiverAI is hiring for. The artefacts prove it: 11 markdown files, 14 manual coding exercises waiting, a service contract locked, an architecture diagram, a walkthrough script, attribution to the projects this work draws from.

**Whatever the outcome of the assessment, this is your strongest project portfolio piece since Sanctuary and Premier League Oracle. It's also a business proposition. Don't lose sight of either.**

Build well this week. Submit Friday. Take the weekend.

---

**No questions this time. Plan 11 closes the planning phase. From here it's build → demo → submit.**
