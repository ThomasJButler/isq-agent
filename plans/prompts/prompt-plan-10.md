# Companion Prompt — Plan 10 (Demo + Walkthrough Script)

**Use this prompt in Claude Code (VSCode) when you're ready to rehearse the walkthrough.**

This plan is different from the build plans — there's no TDD cycle here. The "exercise" is internalising the script and rehearsing the demo.

Paste everything below the `---` line as your first message.

---

You're helping me rehearse the demo + walkthrough for the ISQ Agent project — RiverAI assessment.

## Read these first

In `plans/`:
- **plan-10-demo-walkthrough.md** (the plan you're executing)
- **plan-01-initial-sketch.md** Sections 7b (portfolio convergence) + 7c (JobSearch2026 meta-pattern) — the strongest talking points
- **plan-03-architecture.md** Section 2 (end-to-end Sunflowers walkthrough) — the demo storyline

## What this plan is (and isn't)

- **IS:** rehearsing the walkthrough, time-checking the script, catching awkward phrasing, prepping Q&A
- **IS NOT:** writing code, building features, debugging the system

The build is done. This plan is the pivot from "ship it" to "show it."

## Branch + workflow

```bash
cd ~/Repos/isq-agent
git checkout -b docs/walkthrough-script
```

## What to do FIRST

Guide me through:

1. **Creating `docs/walkthrough-script.md`** with the full script from Plan 10 Section 1. I type it character-by-character (it's how I'll remember it).

2. **A silent dry-run of the demo** — I'll go through Section 1's script with the real system running but not speaking aloud. Confirm every step technically works.

3. **A timed read-through** — read the script aloud, time it. Target: ≤12 minutes for the walkthrough, leaving 10+ mins for Q&A.

4. **Identifying any sections that feel forced or rambly** — flag them, rewrite in my voice (direct, Northern, no AI-isms, no "genuinely" or em dashes).

5. **Recording myself once** — QuickTime / OBS / Loom. End-to-end with screen-share. Watch back ONCE, then delete.

## Pre-rehearsal smoke tests

Before any rehearsal:
- `docker compose up -d` — verify both n8n and rag-service are running
- `curl http://localhost:8000/health` — verify dependencies green
- Open n8n at `http://localhost:5678` — confirm workflows imported
- Run Sunflowers PDF through the Form Trigger — confirm 3 outputs produced
- Run Blackridge PDF — confirm at least one flagged answer with OT scope reason
- Smoke test the public GitHub repo loads with README + tags visible

## What's LOCKED (don't change without consulting me)

- **Demo dataset order:** Sunflowers (happy path) → Blackridge (edge case, flagging). Simple Salvage as backup only.
- **No slides** (Plan 10 Section 2) — artefacts ARE the demo.
- **Section 1 opener** — JobSearch2026 meta-pattern + portfolio convergence are the strongest cards. Don't water them down.
- **Section 6 "what I'd do with more time"** — Lee explicitly asked for this. Don't skip.
- **Voice rules** (Plan 1 Section 7d) — no "genuinely", no em dashes, contractions everywhere, Northern English.

## Likely Q&A (Plan 10 Section 4 has full list — 9 prepped)

Help me drill the 3 hardest ones:
1. "Why two tiers instead of all in n8n?"
2. "How do you stop the LLM hallucinating citations?"
3. "What's the biggest weakness?"

For each: I'll attempt the answer, you tell me where I'm rambling / apologising / oversimplifying, I redo it.

## Traps to AVOID during rehearsal

- Don't apologise — "this is just a v1" before showing things
- Don't oversell — "production-ready" is eye-roll territory
- Don't recap Morpheus — Lee saw it Monday, one sentence is enough
- Don't read code aloud — talk to the design decisions
- Don't argue with feedback — "I considered that, went Y because Z"
- Don't ramble in Q&A — answer, then stop

## Acceptance for Plan 10

- [ ] `docs/walkthrough-script.md` created with full script
- [ ] Silent dry-run completed, all demo steps work
- [ ] Timed read-through ≤12 minutes
- [ ] Awkward sections identified and rewritten
- [ ] One recorded run completed and watched back
- [ ] Dress rehearsal with a friend (Thursday)
- [ ] Pre-meeting checklist printed/saved as sticky note
- [ ] Tag `v0.9.0` — submission candidate
- [ ] Commit: `docs(walkthrough): add demo script v1`

## Rehearsal schedule (Plan 10 Section 7)

- **Wednesday evening (post-CGI):** silent dry-run + opener × 3 + full read-through + record/watch
- **Thursday morning:** dress rehearsal with a friend (10 mins feedback)
- **Friday morning (day-of):** 30 mins before — smoke tests + tabs ready. 10 mins before — opener once more. Then walk in confident.

## Acknowledge before proceeding

Reply with:
1. Confirmation you've read Plan 10 + Plan 1 Sections 7b/7c
2. The exact next step (which sub-task we start with)
3. Any clarifying questions

Then ask me: "Ready to start with `docs/walkthrough-script.md`?"
