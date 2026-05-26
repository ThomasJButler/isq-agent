# Plan Review — Claude-Native Maximisation + Submission Readiness Audit

**Audit date:** 2026-05-25 (post-Plan-11)
**Purpose:** Review all 11 plans through the lens of:
1. **Claude-native maximisation** — Tom is a Claude expert. The more Claude features (skills, plugins, MCPs, Anchor, Ralph loops, extended thinking, Agent SDK) we leverage, the stronger the walkthrough story for RiverAI (a Claude partner).
2. **Submission readiness** — Plans folder will be committed to the public submission repo. They need to read as portfolio artefacts, not personal notes.
3. **Warmer-lead positioning** — Tom has met Gav twice + the team in office. The repo and walkthrough should compound on existing rapport, not introduce a fresh persona.

---

## Cross-cutting observations

### Strength 1 — the planning artefact itself

The 11-plan discipline is your strongest meta-signal. No other candidate will hand Lee a public repo that contains the design discussion before any code. This is the "approach and thought process" Lee explicitly asked for, in its purest form. The plans are the differentiator.

**Action:** keep this prominent in the README. Plan 11 Section 1 already does — verify the README executes against that structure.

### Strength 2 — Morpheus reuse story

Already strong (Plans 1 Section 7c, 2, 7). Lee has seen Morpheus. The reuse + Matrix-strip protocol is honest, credited, and demonstrates judgement.

**Action:** no change needed — but ensure `docs/attributions.md` (Plan 11 Section 3) actually ships with the repo.

### Gap 1 — Claude-native dev process is mentioned but not surfaced enough

Plan 1 Section 6 mentions Anchor, Ralph loops, custom skills, MCPs, plugins — but as bullet points buried in the moat section. Plans 4-10 don't actively use them in the build process descriptions.

If you're going to claim "I'm a Claude expert" in the walkthrough, the artefacts should prove it. Right now the artefacts prove "I'm a strong RAG engineer who uses Claude as an API." That's good but it's not "Claude expert."

**The differentiation gap:** between "uses Claude" and "leverages Claude beyond the typical API call." Most candidates use Claude as an API. Few use Claude Code skills as packaged deliverables, custom MCPs as composable infrastructure, Anchor-style scaffolding as a dev multiplier, or Ralph loops for autonomous overnight iteration.

**Action:** add a dedicated "Claude-native dev process" thread that runs through the plans. See recommendations below.

### Gap 2 — no packaged Claude Code skill as a deliverable

The ISQ Agent runs as docker-compose. But you have JobSearch2026 packaged as skills (cv-generator, cs-apply, etc.). The ISQ Agent could similarly ship as a packaged Claude Code skill that Lee could install locally with `claude skill install isq-agent.skill`.

**This is a strong walkthrough card.** "Here's the docker-compose version, but I've also packaged the entire agent as a Claude Code skill — install it, and it triggers automatically when you mention an ISQ in any Claude Code chat. Same engine, two delivery surfaces."

**Action:** add a Plan 9.5 or extend Plan 9 to include a `.skill` build step.

### Gap 3 — no MCP for the corpus or for the running service

You could expose the indexed Northstar knowledge as an MCP that Claude Code can query. Or expose the running `/answer` endpoint as an MCP. Either gives you a credible "I built a custom MCP for this project" walkthrough beat.

**Action:** add an MCP layer as a stretch goal. Even a minimal MCP exposing `query_northstar_knowledge` would land the point.

### Gap 4 — ELI5 sections are personal learning notes

Plans 3-11 include "🧒 Explain Like I'm 5" sections. Tom said his own learning docs aren't in the submission. These need a decision:

**Option A:** Strip ELI5 sections before submission (clean professional plans)
**Option B:** Keep them, reframe as "Annotations for future maintainers" (honest, useful)
**Option C:** Move them to a separate `docs/learning-notes.md` and exclude from repo (Tom's call)

**Recommendation:** Option B. The ELI5 boxes are good documentation — anyone joining the project benefits. Lee will read them as "this person writes clear docs." Reframe the section headers from "🧒 Explain Like I'm 5" to "📘 Concept Primer" or similar — same content, less juvenile framing.

### Gap 5 — backfilled prompts for Plans 4-7 still pending

Plan 11's checklist defers these to Friday morning. If the repo is shipped Friday and the per-plan prompts are missing for 4-7, the prompts folder looks incomplete. Either:

**Option A:** Write the backfills before submission (next turn, ~30 mins my side)
**Option B:** Ship only the prompts that exist (with a note explaining why)

**Recommendation:** Option A. Consistency matters in a submission piece. Write the backfills now.

### Gap 6 — the walkthrough opener could lean harder on Claude

Plan 10 Section 1 opener mentions JobSearch2026 and portfolio convergence (strong). But doesn't lead with "I'm a Claude expert who built this using Claude-native tooling."

**Current opener strength:** strategic positioning, meta-pattern.
**Missing beat:** "I built this in 4 days using my own Claude Code harness (Anchor) and overnight Ralph loops. The runtime uses Claude tool-use for structured output, Claude Sonnet 4.5 for generation, and an MCP layer exposing the Northstar corpus. Every layer is Claude-native by design."

**Recommendation:** add a 30-second "Claude-native dev process" beat after the JobSearch2026 mention, before the live demo.

### Gap 7 — submission email could mention the Claude angle

Plan 11 Section 6 email is professional and clean but doesn't preview the Claude-native angle. A one-line teaser would prime Lee to look for it.

**Suggested addition:** add a line "Built using Claude Code, Claude Sonnet 4.5, and a small set of custom skills + MCP — all visible in the repo and the walkthrough script."

---

## Plan-by-plan audit

### Plan 1 — Initial Sketch ✅ + minor

**Strengths:**
- Decisions table at top is crisp
- JobSearch2026 meta-pattern (7c) is the strongest walkthrough card
- Portfolio convergence (7b) gives senior thinking signal
- Working-style commitments (7d) lock TDD + branching + ELI5

**Gaps:**
- Section 6 "Claude-Native Moat" lists Anchor/Ralph/MCP/plugin/skill but as optional
- No explicit Plan-1-level commitment to ship a packaged `.skill` file

**Recommendation:** Promote "ship as a packaged Claude Code skill" from optional to must-have in scope (Section 3). Adds 1-2 hours but lands "Claude expert" credibly.

### Plan 2 — Stack Lock-In ✅ + add skill packaging

**Strengths:**
- Repo structure complete and demoable
- Morpheus lift protocol with Matrix-strip enforcement
- Voyage + Pinecone setup unambiguous
- Service contract locked

**Gaps:**
- No mention of building a `.skill` file as part of the deliverable
- The `/n8n/workflows/` folder is mentioned but no `.skill/` folder

**Recommendation:** add a `/skill/` folder to repo structure (Section 1) containing the packaged Claude Code skill manifest + scripts. Update Plan 2's repo tree.

### Plan 3 — Architecture ✅ + add Claude Code as dev tier

**Strengths:**
- Mermaid diagram is clear
- End-to-end Sunflowers walkthrough is the demo script in seed form
- Failure-mode table is honest and senior-thinking

**Gaps:**
- Architecture diagram shows n8n (Tier 1) and rag-service (Tier 2) but not Claude Code as the dev-time orchestrator
- No mention of MCPs in the architecture

**Recommendation:** add a "Tier 0 — Dev-time Claude Code harness" annotation to the architecture. It's not runtime, but it's the orchestrator that BUILT the runtime. Plus mention MCP layer as optional but planned.

### Plan 4 — Knowledge Base + Retrieval ✅ + add Ralph loop callout

**Strengths:**
- TDD-first methodology locked here (cascades to all later plans)
- Chunking strategy reasoned
- Voyage embedding setup
- Retrieval tuning approach documented

**Gaps:**
- No mention of running Ralph loops overnight to refine the chunking sweet spot
- No mention of using Claude Code skills during the indexing phase

**Recommendation:** add a "Ralph loop opportunity" callout — overnight chunking-strategy evaluation against eval corpus. Even if you don't do it, mention it as "the eval discipline I'd run for v2."

### Plan 5 — Branching + Git Workflow ✅ + no changes needed

**Strengths:**
- GitHub Flow chosen with clear reasoning
- Conventional Commits locked
- Pre-commit + CI configured
- Backfilled tests for Plans 2 + 3 exercises

**Gaps:**
- None significant

**Recommendation:** no changes. This plan is portfolio-quality as-is.

### Plan 6 — Question Extraction ✅ + claude-native angle stronger

**Strengths:**
- Unified LLM extraction (Tom's call) is the right architectural simplification
- Tool-use for guaranteed schema
- Edge case mapping complete

**Gaps:**
- The tool-use rationale (`Section 5 "Why JSON mode"`) is buried — could be more prominent
- No mention of whether the extraction could be wrapped as an MCP for reuse

**Recommendation:** promote the tool-use design decision to the top of Section 5. Add a stretch goal: "wrap /extract-questions as a callable MCP tool — enables any Claude Code chat to extract questions from any uploaded document."

### Plan 7 — Answer Generation ✅ + extended thinking opportunity

**Strengths:**
- System prompt + few-shot strategy locked
- Source weighting at three layers
- Citation tracking + hallucination penalty
- Edge cases mapped

**Gaps:**
- No use of Claude's extended thinking feature for complex questions
- No mention of streaming response (could improve perceived latency in demo)

**Recommendation:** add optional Claude extended thinking for questions where the LLM flagged `needs_review` — a second pass with more reasoning budget. Adds latency but improves quality on the hard cases. Worth mentioning as "what I'd do with more time" if not implemented.

### Plan 8 — Confidence + Flagging ✅ + minor

**Strengths:**
- Weighted-mean formula with locked weights documented publicly
- Three-trigger flag logic
- Retrieval sanity check protects against LLM over-claiming
- Propagation contract for renderers

**Gaps:**
- None significant

**Recommendation:** no changes. Plan 8 is well-scoped.

### Plan 9 — Output Rendering ✅ + claude generated styling decisions

**Strengths:**
- Three renderer strategy locked (typeset DOCX/PDF + overlay XLSX)
- Visual style constants
- needs_review propagation per format
- No-Matrix-terminology defence-in-depth tests per renderer

**Gaps:**
- No mention that the DOCX styling decisions (Calibri, navy, amber) could themselves be generated/iterated via Claude

**Recommendation:** add a brief note that the visual style was iterated through a Claude design-prompt cycle (truth: it was, by us in planning). Mention in walkthrough as "I iterated the visual style via Claude — here's the design prompt I used."

### Plan 10 — Demo + Walkthrough Script ⚠️ needs Claude-native beat

**Strengths:**
- Verbatim script with timing
- Q&A prep with 9 likely questions
- Talking points + traps named
- Rehearsal plan respects CGI Wednesday

**Gaps:**
- Section 1 opener doesn't include a "Claude-native dev process" beat
- "What I'd do with more time" (Section 6) doesn't include Claude-native extensions (MCP, agent SDK, hosted skill)

**Recommendation:** add a 30-second beat between the JobSearch2026 mention and the live demo — explicit Claude-native framing. Also add 2-3 Claude-native extensions to the Section 6 "what I'd do with more time" list.

### Plan 11 — Final Consolidation ✅ + ship skill + ship MCP

**Strengths:**
- README structure locked
- Attributions doc
- Final polish checklist
- Calendar with submission email + post-submission plan

**Gaps:**
- README structure doesn't mention the packaged `.skill` file
- Attributions doc doesn't credit Claude features as a distinct category
- Final polish checklist doesn't include "test the packaged skill installs cleanly"

**Recommendation:** update README Section 1 to mention the packaged skill + MCP layer. Update attributions to credit Claude Code + Claude Agent SDK as platform tools.

---

## Priority-ordered amendments

### MUST DO (high value, low effort)

1. **Reframe "🧒 Explain Like I'm 5" → "📘 Concept Primer"** across Plans 3-10
   - Single find-and-replace per plan
   - Same content, professional framing
   - ~5 minutes total

2. **Add "Claude-native dev process" beat to Plan 10 walkthrough opener**
   - 30-second addition between JobSearch2026 mention and live demo
   - Mentions Anchor, Ralph loops, custom skills used during build
   - Locks Claude-expert framing

3. **Add MCP + packaged skill to Plan 6 "what I'd do with more time"**
   - 2-3 line additions to Plan 10 Section 6
   - Frames Claude-native extensions as next-step roadmap

4. **Backfill per-plan prompts for Plans 4-7**
   - Promised in Plan 11, deliver now for repo consistency
   - 4 files, ~100 lines each, ~30 mins my side

### SHOULD DO (high value, moderate effort)

5. **Add Plan 9.5 — Claude Code Skill Packaging (TDD-first)**
   - New plan inserting between 9 and 10
   - Defines the `.skill` manifest, scripts folder, install flow
   - Tom can ship "here's also the packaged skill version" alongside the docker-compose version
   - Strong "Claude expert" walkthrough card
   - ~3 hours build time, ~1 hour planning

6. **Update Plan 2 repo structure to include `/skill/` folder**
   - Reflects the packaged-skill deliverable
   - ~5 minutes

7. **Update Plan 3 architecture diagram with Tier 0 dev-time annotation**
   - Adds Anchor harness + Claude Code as the dev orchestrator above the runtime tiers
   - Visible in the README's embedded diagram
   - ~10 minutes

8. **Update Plan 11 README structure to mention `.skill` + MCP**
   - 2-3 line additions to Section 1 README template
   - ~5 minutes

### NICE TO HAVE (lower priority, can defer)

9. **Add stretch MCP layer** (Plan 6 or new Plan 9.6)
   - Wraps `/answer` endpoint as an MCP tool
   - Lets any Claude Code chat query the running service
   - ~2 hours build time

10. **Add Ralph loop callout to Plan 4**
    - 1 paragraph about overnight chunking-strategy evaluation
    - Even if not run, mentioned as "what I'd do for v2"
    - ~10 minutes

11. **Add Claude extended thinking to Plan 7 stretch goals**
    - Second-pass reasoning for needs_review questions
    - ~15 minutes plan update

### DEFER UNTIL POST-SUBMISSION

- Hosted deployment guides
- Cost-optimisation passes
- Multi-tenant variants
- More sophisticated MCPs

---

## Submission readiness checklist

What needs to be true before the plans folder ships in the public repo:

- [ ] ELI5 sections reframed as "Concept Primer" (Must-do #1)
- [ ] All 11 plans + this audit + backfilled prompts present
- [ ] No personal notes that aren't valuable for future maintainers
- [ ] No actual API keys or secrets in any plan content
- [ ] All links work (internal references between plans, external repo URLs)
- [ ] Plan numbering consistent (11 plans + audit doc + implementation chat prompt)
- [ ] `plans/` folder has its own README explaining what each plan covers
- [ ] Walkthrough script (in `docs/`, separate from plans) is locked
- [ ] No "TODO" or "FIXME" or "draft" markers visible in shipping content

---

## Open questions for Tom

Before I execute any amendments:

1. **Must-do items (1-4):** approve all four, or any to skip?

2. **Should-do item 5 — Plan 9.5 for packaged Claude Code skill:** worth the 4 hours of build time for the walkthrough story? Strong "Claude expert" signal but adds scope.

3. **Should-do item 6-8:** repo structure + diagram + README updates — agreed to execute all?

4. **Nice-to-haves (9-11):** any you want pulled into must/should?

5. **ELI5 strategy:** Option A (strip), B (reframe as Concept Primer), or C (move to separate file)? My recommendation: **B**.

6. **Plans folder README:** should I create a `plans/README.md` that gives Lee a guided tour of which plan covers what? Recommended.

---

## What this audit confirms

You've planned thoroughly. Most amendments are about *surfacing* what's already there rather than redesigning anything. The Claude-native angle is the only substantive gap, and even that is about emphasis more than missing capability — you ARE using Claude tool-use, Claude Sonnet 4.5, Claude Code in VSCode as the dev environment. The amendments are about making it visible as a deliberate Claude-expert design choice, not a default.

Single biggest impact amendment: **Plan 9.5 — packaged Claude Code skill.** Adds 4 hours, gives you a unique walkthrough card no other candidate will have: "here it is as docker-compose, AND here it is as a Claude Code skill — install it and it Just Works in any Claude Code chat."

If you only have time for ONE additional amendment, do that one.
