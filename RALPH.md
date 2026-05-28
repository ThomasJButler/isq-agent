# RALPH.md — Ralph Loop Automation Rules

These rules govern the **autonomous Ralph build/plan loop** (`./loop.sh`). They are read by each fresh loop iteration alongside `CLAUDE.md`. For general project guidance (architecture, commands, RAG config), see `CLAUDE.md`.

## Operating rules
- Read `IMPLEMENTATION_PLAN.md` before changing code.
- In **plan mode**, update the plan only. Do not implement.
- In **build mode**, execute exactly one highest-priority unchecked task — or one tightly related sub-slice of that task — then stop.
- Confirm a feature is actually missing before building it.
- Prefer small, reversible edits over broad refactors.
- Keep changes scoped to the active plan item. Do not drift into unrelated refactors.

## TDD discipline (locked for Plans 4-10)
- Write the test file **before** the implementation.
- Run pytest and watch it fail (`ModuleNotFoundError` or `AssertionError`) before implementing.
- Implement the minimum code to make the tests pass.
- Run pytest again to confirm green.
- Commit the test file and the implementation file separately (one concern per commit).

## Documentation rules (per loop iteration)
- Update `IMPLEMENTATION_PLAN.md` whenever you discover a blocker, hidden dependency, or follow-up task.
- Mark completed tasks with `[x]` immediately after validation passes.
- Keep the "Next recommended slice" section current after each commit.

## Git rules (the loop must not surprise the human)
- Do **not** auto-push, auto-tag, or auto-release from the loop.
- Stage files explicitly — never `git add .`.
- Commit only **after** validation passes. If validation is incomplete or failing, do not commit — record the blocker in `IMPLEMENTATION_PLAN.md` instead.
- Do not amend existing commits. Do not include unrelated pre-existing worktree changes.
- No `--no-verify`. No force-push to `main`.

## Stop condition
Stop after one completed slice with validation and an updated `IMPLEMENTATION_PLAN.md`.

## Running the loop
```bash
# One narrated build iteration (recommended for review)
./loop.sh build 1 coach

# N build iterations, coach narration
./loop.sh build 5 coach

# Planning loop (refresh IMPLEMENTATION_PLAN.md only)
./loop.sh plan

# Headless run that can stage + commit (trusted local only):
# the nested `claude -p` cannot prompt for permissions, so it needs this
RALPH_ALLOW_UNSAFE_PERMISSIONS=1 ./loop.sh build 5 coach
```
- Run logs (jsonl / pretty / final) are written to `.claude-run/` — **gitignored**, kept for personal reference.
- The loop spawns a fresh headless Claude Code session per iteration; it reads `RALPH.md` + `CLAUDE.md` + `IMPLEMENTATION_PLAN.md` to pick up context with no memory beyond the repo files.
