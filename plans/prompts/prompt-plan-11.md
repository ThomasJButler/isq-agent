# Companion Prompt — Plan 11 (Final Consolidation + Submission)

**Use this prompt in Claude Code (VSCode) on Friday morning when you're ready to polish and submit.**

Paste everything below the `---` line as your first message.

---

You're helping me close out the ISQ Agent project and submit it to RiverAI.

## Read these first

In `plans/`:
- **plan-11-final-consolidation.md** (the plan you're executing)
- **plan-01-initial-sketch.md** Sections 7b + 7c (the convergence stories the README needs to land)
- **plan-10-demo-walkthrough.md** Section 1 (the walkthrough script — already in `docs/walkthrough-script.md`)

## Branch + workflow

```bash
cd ~/Repos/isq-agent
git checkout -b chore/v1-submission-polish
```

This branch contains all the final polish — README, attributions, architecture diagram embed, final repo checklist. Squash-merge to main when complete, then tag `v1.0.0` and push.

## What to do (in order)

### 1. README.md — write the front door

Plan 11 Section 1 has the full structure. Help me:
- Write the README to that exact structure
- Insert the architecture diagram (PNG export from `docs/architecture-diagram.png`)
- Add badges (CI status, test count, latest tag)
- Verify all links work (relative paths to /plans, /docs)
- Confirm the JobSearch2026 + portfolio convergence story lands in the first 30 seconds of reading

### 2. Architecture diagram export

- Open Plan 3 Section 1 (Mermaid diagram)
- Render in mermaid.live OR VSCode Mermaid extension
- Export PNG at 1200×900 minimum
- Save to `docs/architecture-diagram.png`
- Also save raw Mermaid to `docs/architecture-diagram.mmd`

### 3. `docs/attributions.md`

Plan 11 Section 3 has the full content. Type it out — explicit credit for every component reused from Morpheus, NewsPerspective, ReviewBot, SQL-Ball, Oracle, JobSearch2026.

### 4. Backfill the per-plan prompts for Plans 4-7

I deferred these from earlier turns. Now's the time:
- `plans/prompts/prompt-plan-04.md` (Knowledge Base + Retrieval)
- `plans/prompts/prompt-plan-05.md` (Branching Strategy + Git Workflow)
- `plans/prompts/prompt-plan-06.md` (Question Extraction)
- `plans/prompts/prompt-plan-07.md` (Answer Generation)

Use `prompts/prompt-plan-08.md` as the template. Same shape: read these first / branch / what to do first / what's locked / acceptance / smoke test / failure modes / acknowledge before proceeding.

### 5. Final repo polish checklist (Plan 11 Section 4)

Walk through every checkbox. Run the commands. Verify each item.

Critical ones:
- `gitleaks detect --source . --no-git` — no secrets in history
- `grep -irE '(morpheus|the matrix|neo[^a-z]|white rabbit|trinity)' app/ docs/ --include='*.py' --include='*.md'` — only attribution lines (in `docs/attributions.md`) should match
- Clone the repo to a fresh folder, follow README steps, verify it works end-to-end

### 6. Tag v1.0.0 and push

```bash
git tag -a v1.0.0 -m "v1.0.0 — submitted to RiverAI for AI Engineer technical challenge"
git push origin v1.0.0
git push origin main
```

### 7. Send the submission email (Plan 11 Section 6)

Use the template from `taskandemails/email-to-lee-submission.md`. Confirm:
- Repo URL works in incognito
- All links in the email resolve
- README renders correctly on GitHub
- Tag v1.0.0 visible on the GitHub Releases page

Then hit send.

### 8. Update Notion job tracker

Use the `job-tracker` skill: status → Submitted, date → today, repo URL in notes.

### 9. Close down for the weekend

Don't refresh email. Don't push another commit. The artefact is shipped.

## What's LOCKED (don't change)

- **README structure** (Plan 11 Section 1) — the order matters. JobSearch2026 reference within the first 30 seconds of reading.
- **No new features.** This branch is polish, not build. If something feels missing, add it to a "v1.1 backlog" markdown file. Don't ship it.
- **Tag v1.0.0** — the submission cut. After this, the next changes are post-submission.

## Failure modes to avoid

- Don't keep building. The "perfect" feature you want to add tomorrow is not worth pushing the submission to Monday.
- Don't tweak the walkthrough script during polish — it's locked from Plan 10.
- Don't second-guess the architecture. The 11 plans got you here.
- Don't forget to update the Notion tracker. The job-tracker skill exists for a reason.

## Acceptance

- [ ] README.md complete and renders correctly on GitHub
- [ ] Architecture diagram embedded as PNG
- [ ] `docs/attributions.md` complete
- [ ] Backfilled prompts for Plans 4-7 created
- [ ] Every box in Plan 11 Section 4 checklist ticked
- [ ] Tag `v1.0.0` pushed
- [ ] Submission email sent
- [ ] Notion updated
- [ ] Closed the laptop

## Acknowledge before proceeding

Reply with:
1. Confirmation you've read Plan 11
2. The exact next step (probably the README)
3. Any clarifying questions

Then ask me: "Ready to start with the README?"

---

## Post-submission

When the laptop is closed, you've done everything you can. The decision is now in their hands. You'll know early June.

In the meantime: properly switch off. You've planned 11 times, built across 4 days, and shipped a public repo with full provenance. That's a body of work. Be proud of it.

Whatever the outcome — the ISQ Agent is yours. The pattern is yours. The 11-plan discipline is yours. They travel with you to whatever you build next.
