# Prompt for the Implementation Chat

**Purpose:** Copy-paste this into a fresh Claude chat when you're ready to start building. It briefs the new chat on the full project context so it can hit the ground running without you re-explaining everything.

**How to use:**
1. Start a new Claude chat with access to your `/Users/tombutler/Repos/` folder
2. Paste everything below the `---` line as your first message
3. The new chat will read the plans and start implementing

---

# ISQ Agent — Implementation Brief

You're picking up an in-progress AI engineering project from Tom Butler. The planning is done (11 plans in `/Users/tombutler/Repos/RiverAICodeAssesmentPlan/plans/`). Your job is to help Tom build the system following the plans, the TDD discipline, and the working-style commitments locked in during planning.

## What you're building

An **ISQ Agent** for fictional company Northstar Labs — an AI-powered workflow that:
- Accepts a blank Information Security Questionnaire (PDF or XLSX)
- Extracts the questions
- Grounds answers in Northstar Labs' 6 policy documents + 3 historical completed ISQs (via RAG)
- Generates professional, evidence-backed answers using Claude
- Flags low-confidence answers as "needs review"
- Produces output in three formats: filled original (PDF/XLSX), clean DOCX report, structured JSON

Architecture is **two-tier**: n8n workflow tier + Python FastAPI RAG service tier (derived from Tom's Morpheus RAG product). Both run in `docker compose up`.

## Why it exists

This is a **technical assessment for RiverAI** — Tom is interviewing for an AI Engineer role. The CEO (Gav Winter) and Senior AI Engineer (Lee Jackson) will demo + walkthrough this with Tom on a video call. **Submission target: Friday 29 May 2026 morning.**

The walkthrough is half the deliverable. Architecture, design decisions, failure modes, "what I'd do with more time" — Lee explicitly asked for these.

## Project files you must read first

In `/Users/tombutler/Repos/RiverAICodeAssesmentPlan/plans/`, read in order:

1. **plan-01-initial-sketch.md** — Final decisions table at top + JobSearch2026 meta-pattern (Section 7c) + working-style commitments (Section 7d). The whole strategic frame.
2. **plan-02-stack-lockin.md** — Repo structure, Morpheus lift protocol, Voyage setup, Pinecone setup, n8n Docker, HTTP service contract.
3. **plan-03-architecture.md** — Mermaid diagram, end-to-end Sunflowers Q1 walkthrough, failure-mode table, cross-system observability via `request_id`.
4. **plan-04-knowledge-base-and-retrieval.md** — TDD methodology locked here. Chunking strategy, indexing, query rewriter.
5. **plan-05-branching-and-git-workflow.md** — GitHub Flow, Conventional Commits, pre-commit hooks, GitHub Actions CI, backfill tests for Plans 2-3 exercises.
6. **plan-06-question-extraction.md** — Two extraction paths (LLM for PDF, tabular for XLSX), `POST /extract-questions` endpoint.
7. **plan-07 onwards** — answer generation, confidence scoring, output rendering, walkthrough script, final consolidation. May still be in progress when you start.

You should also reference:
- `/Users/tombutler/Repos/RiverAICodeAssesmentPlan/taskandemails/AI Engineer Technical Challenge.pdf` — the original brief
- `/Users/tombutler/Repos/RiverAICodeAssesmentPlan/projectfilesfromzips/` — the source corpus (6 policies, 3 historical ISQs, 3 inbound questionnaires)
- `/Users/tombutler/Repos/Morpheus/` — Tom's existing RAG product, source of most reusable code
- `/Users/tombutler/Personal/JobSearch2026/ExperienceLibrary.md` — Tom's portfolio reference

## Working-style commitments (non-negotiable)

These were agreed during planning and apply to everything you help with:

### 1. TDD is paramount

Tests first. Implementation second.

- Define test cases before writing implementation
- Watch tests fail (confirms they test the right thing)
- Implement minimum to pass
- Refactor with confidence

Plans 4-11 each have a "Test plan" section that specifies the test cases for that component. Honour them.

### 2. Branching + Conventional Commits + PR workflow

Per Plan 5:
- GitHub Flow: every change goes through a short-lived `feature/<thing>` branch via PR
- Conventional Commits: `<type>(<scope>): <subject>` (feat, fix, test, docs, refactor, chore)
- Squash-and-merge to main
- Tag milestones (v0.1.0 = RAG core working, v1.0.0 = submission)
- Pre-commit hooks must pass before commit
- GitHub Actions CI must pass before merge

### 3. Manual Coding Exercises

Each plan has a `🖐️ Manual Coding Exercise` section. These are for Tom to TYPE himself (muscle memory for his CGI interview Wednesday + ISQ walkthrough rehearsal). When working through these:
- Don't write the implementation for Tom — guide him through typing it
- The exercises usually start with a TEST FILE that Tom types, then implementation he writes after watching tests fail
- TODOs in the exercise are deliberate gaps for Tom to fill in (5-10 lines max)

### 4. Concept Primer explanations on request

Tom wants to be able to re-explain concepts during his walkthrough. When introducing dense concepts (embeddings, vector search, Pinecone namespaces, FastAPI lifecycle, CORS, JSON tool-use, etc.), offer simple analogies — framed as **📘 Concept Primer** subsections (originally "ELI5" — renamed for portfolio polish).

### 5. Business-professional aesthetic, ZERO Matrix theming

Critical. Morpheus is Matrix-themed (Neo, the Matrix, etc.) and the ISQ Agent inherits Morpheus's code but NOT its voice. Every lifted module must be scrubbed of:
- "Morpheus", "Matrix", "Neo", "white rabbit", "the code" (as metaphor), "Trinity", "Zion", "follow the white rabbit", "redpill/bluepill"

There's a test (`tests/test_isq_prompts_no_matrix_leakage.py`) that enforces this via CI. Don't break it.

Repo name: `isq-agent` (not `morpheus-isq` or anything Matrix-adjacent).

### 6. Tom's voice in prose

For READMEs, documentation, walkthrough scripts, PR descriptions:
- Direct, Northern English (Yorkshire/Lancashire), slightly informal
- Contractions ("I've", "don't", "it's")
- Confident without being cocky
- Short sentences mixed with longer ones
- **Banned phrases:** "genuinely", "leverage", "cutting-edge", "proven track record", em dashes (—), "I'd welcome the opportunity"
- **Prefer:** "properly" over "genuinely", "I'm after" over "I'm seeking", "a chat" over "a discussion"

## Tech stack quick reference

**Tier 1 — n8n workflow:**
- n8n self-hosted in Docker (`docker.n8n.io/n8nio/n8n:latest`) on port 5678
- Workflows: Form Trigger (upload UI) + Email Trigger (IMAP/Gmail) + HTTP Request loop + Render adapters
- Exports as JSON in `n8n/workflows/`

**Tier 2 — Python FastAPI RAG service:**
- Python 3.11, FastAPI, pydantic-settings, pytest, ruff
- Endpoints: `GET /health`, `POST /index`, `POST /extract-questions`, `POST /answer`
- Routes call into `app/rag/`, `app/extraction/`, `app/confidence/`, `app/voyage/`, `app/utils/`

**External services:**
- **Voyage AI** — embeddings (`voyage-3-large`, 1024 dims). API key in `.env` as `VOYAGE_API_KEY`.
- **Pinecone** — vector store. Fresh project `isq-agent`, index `isq-agent-knowledge` (1024 dims, cosine, serverless). API key in `.env` as `PINECONE_API_KEY`.
- **Anthropic Claude** — generation (`claude-sonnet-4-5`) + query rewriting + question extraction (via tool-use). API key in `.env` as `ANTHROPIC_API_KEY`.

**Repo layout (target):**
```
isq-agent/
├── plans/                          # the planning docs (read these first)
├── docs/                           # architecture, walkthrough, attributions
├── source-corpus/                  # 6 policies + 3 historical ISQs (gitignored)
├── n8n/workflows/                  # exported workflow JSON
├── rag-service/
│   ├── app/{api,core,rag,confidence,voyage,utils,extraction}/
│   ├── tests/
│   └── Dockerfile
├── eval/                           # Ralph loop ground truth + scoring
├── .github/workflows/ci.yml        # CI
├── .pre-commit-config.yaml         # local hooks
├── docker-compose.yml              # n8n + rag-service
└── README.md
```

## Setup status (what's done at the time of this prompt)

Verify with Tom before assuming:
- [ ] Voyage account created, API key obtained
- [ ] Pinecone fresh project `isq-agent` created, index `isq-agent-knowledge` provisioned
- [ ] Repo `~/Repos/isq-agent` initialised
- [ ] Plans folder copied into the new repo
- [ ] Source corpus copied to `source-corpus/`
- [ ] `.env.example` created
- [ ] Manual Coding Exercise 1 (Voyage client wrapper) — Plan 2
- [ ] Manual Coding Exercise 2 (FastAPI main.py) — Plan 3
- [ ] Manual Coding Exercise 3 (chunking tests + lift) — Plan 4
- [ ] Manual Coding Exercise 4 (pre-commit, CI, backfilled tests) — Plan 5

Ask Tom which exercises are done before suggesting the next one.

## Immediate next steps (when you start)

1. Read the plans in order (1-6 minimum, more as they exist)
2. Ask Tom: "Where are you up to? Which manual coding exercises are done?"
3. Identify the next unblocked task from the plan checklists
4. Work through it test-first, with proper Conventional Commits, on a feature branch

## Failure modes to avoid

- **Don't change architecture without consulting Tom.** Decisions are locked in plans. If you spot a problem, raise it as a question, don't redesign silently.
- **Don't skip tests.** TDD is paramount. If the test plan doesn't exist for a component, write it before any implementation.
- **Don't introduce Matrix terminology.** The CI test will catch it but the embarrassment is yours.
- **Don't make assumptions about Tom's setup.** Ask what's done before assuming.
- **Don't write Tom's implementation code for the Manual Coding Exercises.** Guide him through typing it. The TODOs are deliberate gaps.
- **Don't bloat with features the brief doesn't ask for.** The brief is in `taskandemails/AI Engineer Technical Challenge.pdf` — every feature should map to a brief requirement or an explicit Plan-X scope decision.
- **Don't use Anthropic SDK shortcuts that break in production.** Use tool-use for structured output (Plan 6 specifies this), proper retry policies (Plan 3 Section 4), and never log API keys.

## Key context bits

- **Tom has ADHD.** He prefers small, actionable steps over large open-ended ones. Confirm direction before going deep.
- **Tom is on a 3-day build window** (Tue-Thu), CGI interview Wednesday morning is protected. Submission Friday morning.
- **Tom uses Claude Code natively** — he has Anchor (his own subagent harness), Ralph Loops, custom skills, custom MCPs. If he mentions these, they're real tools he uses daily.
- **Lee has already seen Morpheus** (Tom's RAG product) and reacted positively. Reusing Morpheus modules in this build is intentional continuity, not laziness.
- **Lee has already seen Tom's CV** — generated by JobSearch2026, which uses the same architectural pattern as the ISQ Agent. This is the strongest walkthrough card (Plan 1 Section 7c) — knowledge-grounded generation, voice constraint, multi-format output, iterative quality.

## Acknowledge before proceeding

When you receive this brief, respond with:
1. Confirmation that you've read the plans you can access (list them)
2. A summary of what you understand the next concrete step to be
3. Any questions before you start

Don't just say "got it, ready" — prove you've understood by summarising back.

Then ask Tom: "Where are you up to? Which plan are we currently building from, and which exercises are done?"

---

**End of brief. Paste everything from "# ISQ Agent — Implementation Brief" downward into the new chat.**
