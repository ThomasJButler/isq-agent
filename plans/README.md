# Plans Folder

This folder contains the iterative planning documents written **before any code was committed**. This is the "approach and thought process" mentioned in the RiverAI technical challenge brief.

12 plans, 3 audits, and a Claude Design spec — all produced before keyboard touched implementation code.

---

## Reading order

If you have 30 minutes, read these in order:

1. **[plan-01-initial-sketch.md](plan-01-initial-sketch.md)** — Final decisions table at top, the JobSearch2026 meta-pattern (Section 7c), portfolio convergence (Section 7b), working-style commitments (Section 7d). The strategic frame.

2. **[plan-02-stack-lockin.md](plan-02-stack-lockin.md)** — Repo structure, Morpheus lift protocol with Matrix-strip checklist, Voyage + Pinecone setup, n8n Docker, HTTP service contract between the two tiers.

3. **[plan-03-architecture.md](plan-03-architecture.md)** — Mermaid architecture diagram, end-to-end walkthrough of one Sunflowers question, failure-mode mapping, cross-system observability via `X-Request-Id`.

4. **[plan-04-knowledge-base-and-retrieval.md](plan-04-knowledge-base-and-retrieval.md)** — TDD-first methodology locked here. Chunking strategy, indexing, ISQ-specific query rewriter.

5. **[plan-05-branching-and-git-workflow.md](plan-05-branching-and-git-workflow.md)** — GitHub Flow, Conventional Commits, pre-commit hooks, GitHub Actions CI, backfill tests for Plans 2-3 exercises.

6. **[plan-06-question-extraction.md](plan-06-question-extraction.md)** — Unified LLM extraction via Claude tool-use (one path for PDF and XLSX). `/extract-questions` endpoint.

7. **[plan-07-answer-generation.md](plan-07-answer-generation.md)** — Claude single-call generation with tool-use, few-shot from ISQ_01 gold standard, SQL-Ball-style strict rules, source weighting at three layers.

8. **[plan-08-confidence-and-flagging.md](plan-08-confidence-and-flagging.md)** — Hybrid confidence aggregator (LLM self-score + retrieval similarity sanity check), three flag triggers, propagation contract for renderers.

9. **[plan-09-output-rendering.md](plan-09-output-rendering.md)** — Three render adapters (DOCX, PDF, XLSX) + structured JSON. Typeset DOCX/PDF + overlay XLSX. Visual style locked.

10. **[plan-09.5-packaged-claude-code-skill.md](plan-09.5-packaged-claude-code-skill.md)** — The agent also ships as an installable Claude Code skill. Second delivery surface.

11. **[plan-10-demo-walkthrough.md](plan-10-demo-walkthrough.md)** — Verbatim demo script with timing, Q&A prep with 9 likely questions answered, rehearsal plan.

12. **[plan-11-final-consolidation.md](plan-11-final-consolidation.md)** — README structure, attributions, final polish checklist, day-by-day execution timeline, submission email template.

---

## Audit reviews

Three audit passes before execution started:

- **[plan-review-claude-native-audit.md](plan-review-claude-native-audit.md)** — Second pass: Claude-native maximisation, submission readiness, 11 prioritised amendments.
- **[plan-review-3-final-audit.md](plan-review-3-final-audit.md)** — Third and final pass: cross-plan coherence fixes, execution-time gotchas, time-budget reality check, explicit stop-auditing commitment.

(The first audit was within Plan 1's own evolution.)

---

## Companion prompts

The `prompts/` subfolder contains a focused prompt per plan. Each was used in Claude Code (VSCode) during build to ground the assistant in one plan's scope. The format is:

- What to read first
- Branch + workflow setup
- What to do FIRST (TDD discipline)
- What's locked (non-negotiable decisions)
- Acceptance criteria
- Failure modes to avoid

Plans 8-11 + 9.5 have companion prompts shipped. Plans 4-7 backfills are in `prompts/` too.

There's also a master `implementation-chat-prompt.md` that covers the whole project — used when starting a fresh implementation chat.

---

## Supporting documents

- **[claude-design-spec.md](claude-design-spec.md)** — Original visual + interaction spec handed to Claude Design overnight Monday → Tuesday. Superseded by the design-decision record below.
- **[design-decision-locked.md](design-decision-locked.md)** — Locked design choice (Iteration 3 — Claude × RiverAI Hybrid) with must-do tweaks and risk monitoring.
- **[EXECUTION-CHECKLIST.md](EXECUTION-CHECKLIST.md)** — The daily anchor for Tue-Fri execution. One-page "do this now" reference.
- **[implementation-chat-prompt.md](implementation-chat-prompt.md)** — Master prompt for a fresh Claude Code chat picking up the project.

## Design artefacts

The selected design (Iteration 3 — Claude × RiverAI Hybrid) lives at:

```
design/design_handoff_isq_agent/
├── README.md
└── designs/
    ├── Hi-Fi Designs (Hybrid).html
    ├── Interactive Prototype (Hybrid).html
    ├── Wireframes (Hybrid).html
    └── prototype-hybrid/
        ├── tokens.css           # hybrid theme overrides
        ├── claude-tokens.css    # Claude DS foundation
        ├── hifi.jsx             # 5-screen hi-fi designs
        ├── wireframes.jsx       # wireframe versions
        ├── components.jsx       # reusable components
        ├── pages.jsx            # page-level compositions
        ├── icons.jsx
        ├── app.jsx
        └── data.js              # mock data
```

---

## What this folder proves

The brief said RiverAI is "more interested in seeing your approach, thought process, and how far you get." This folder IS the approach and thought process — 12 plans iterated 3 times before any code, with explicit reasoning at every decision point.

The code is downstream of the thinking. The thinking is here.
