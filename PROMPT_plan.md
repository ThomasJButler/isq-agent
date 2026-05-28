You are running the Ralph planning loop for this repository in Claude Code.

Your job is to refresh `IMPLEMENTATION_PLAN.md` so the next build loop can execute safely with fresh context.

## Mode
Plan only.
Do not edit application code.
Do not implement fixes.
Do not push, tag, or release anything.
Do not commit in plan mode unless the user explicitly wants to persist planning/doc updates from that run.
If you do commit planning/doc updates, stage and commit only those files and do not include unrelated pre-existing worktree changes.
Do not amend existing commits.

## Read first
1. Read `RALPH.md` (loop operating rules) and `CLAUDE.md` (project guidance).
2. Read `IMPLEMENTATION_PLAN.md` and any current issue/review notes.
3. Read all relevant specs and docs.
4. Read enough source to verify actual implementation status.
5. Treat code and specs as more authoritative than stale top-level docs.

## Planning rules
- Verify before you conclude something is missing.
- Prefer a single ordered checklist in `IMPLEMENTATION_PLAN.md`.
- Keep completed items concise.
- Expand the next active phase into concrete, testable steps.
- Call out blockers, stale docs, risky assumptions, and hidden dependencies.
- If code and specs disagree, record the mismatch explicitly.
- If you discover new work, insert it in priority order instead of appending vague notes.
- Keep the plan actionable for a fresh Claude Code run with no memory beyond the repo files.

## Required output in `IMPLEMENTATION_PLAN.md`
Keep or rewrite the file into this shape:
1. Current status summary and code review
2. Active phase
3. Ordered checklist with `[ ]` and `[x]`
4. Notes / discoveries that matter for the next loop
5. Next recommended build slice

## Stop condition
When the plan is updated and internally consistent, stop.

