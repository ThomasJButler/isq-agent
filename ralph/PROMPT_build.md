You are running the Ralph build loop for the **ISQ Agent** repository in Claude Code.

Your job is to execute one scoped implementation slice from `IMPLEMENTATION_PLAN.md`, validate it, and then update the plan so the next fresh loop can continue cleanly.

The active phase and slice come from `IMPLEMENTATION_PLAN.md`; the matching `plans/plan-NN-*.md` holds the full spec (test definitions, schemas, prompts).

## Read first
1. Read `ralph/RALPH.md` (loop operating rules + TDD discipline) and `CLAUDE.md` (project guidance, architecture, RAG config).
2. Read `IMPLEMENTATION_PLAN.md` (ordered checklist of unchecked tasks + the active phase).
3. Read the `plans/plan-NN-*.md` spec for the active slice (test definitions, metadata schema, prompts).
4. Read `plans/git-conventions.md` (Conventional Commits format, branching strategy).
5. Read only the source files needed for that slice.

## Task selection rules
- Choose the highest-priority unchecked item from `IMPLEMENTATION_PLAN.md`.
- If that item is too large, execute one coherent sub-slice and record the remainder in the plan.
- Confirm the target behavior is not already implemented before editing.
- Do not drift into unrelated refactors.

## Implementation rules
- **TDD discipline (Plan 4 onwards):** Write test files BEFORE implementation. Watch tests fail with ModuleNotFoundError or AssertionError. Then implement to make them pass.
- Keep edits minimal but complete.
- Preserve existing architecture unless the plan explicitly calls for a change.
- Avoid placeholders, dead branches, and speculative abstractions.
- If you discover a new blocker, record it immediately in `IMPLEMENTATION_PLAN.md`.
- Follow Conventional Commits: `<type>(<scope>): <subject>` (see git-conventions.md).
- Repository structure: `rag-service/app/` for source, `rag-service/tests/` for tests.

## Validation rules
- Run the smallest meaningful validation from `CLAUDE.md`.
- Prefer targeted checks first, then broader manual checks if the slice warrants them.
- If validation fails, fix the failure or record the blocker in `IMPLEMENTATION_PLAN.md`.

## After coding
- Update `IMPLEMENTATION_PLAN.md`:
  - mark finished work with `[x]`
  - keep the next recommended slice explicit
  - add follow-up tasks discovered during implementation
- Summarize:
  - what changed
  - what was validated
  - what remains next

## Git rules
Do not push automatically.
Do not create tags automatically.
For every completed build slice, after validation passes, stage and commit only the files for that slice before stopping.
Do not include unrelated pre-existing worktree changes.
If validation is incomplete or failing, do not commit; record the blocker in `IMPLEMENTATION_PLAN.md` instead.
Use a concise commit message that describes the completed slice.
Do not amend existing commits.

## Stop condition
Stop after one completed slice with validation and plan updates.
