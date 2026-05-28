# CLAUDE.md — ISQ Agent Ralph Loop Configuration

## Ralph operating rules
- Read `IMPLEMENTATION_PLAN.md` before changing code.
- In plan mode, update the plan only. Do not implement.
- In build mode, execute exactly one highest-priority unchecked task or one tightly related sub-slice of that task.
- Keep this file operational and compact. Status, discoveries, and sequencing belong in `IMPLEMENTATION_PLAN.md`.
- Prefer small, reversible edits over broad refactors.
- Confirm a feature is actually missing before building it.

## Plan 4 TDD Discipline (locked for Plans 4-10)
- **Write tests BEFORE implementation** — every module starts with its test file
- Watch tests fail (ModuleNotFoundError or AssertionError) before implementing
- Implement minimum code to make tests pass
- Run pytest after implementation to confirm all green
- Commit test file and implementation file separately (one concern per commit)

## Working agreements
- Keep changes scoped to the active plan item.
- Do not introduce placeholder implementations.
- Do not silently rewrite architecture when a local fix is sufficient.
- Do not auto-push, auto-tag, or auto-release from the loop.
- Update docs when setup, commands, or runtime behavior change.
- Follow Conventional Commits format: `<type>(<scope>): <subject>`
- Stage files explicitly (no `git add .`)

## Validation commands

### Test validation
```bash
cd rag-service && source .venv/bin/activate && pytest tests/test_<module>.py -v
```

### Smoke tests
```bash
# FastAPI server
cd rag-service && source .venv/bin/activate
uvicorn app.main:app --reload &
sleep 3
curl http://localhost:8000/health
pkill -f uvicorn

# Indexing endpoint (after Branch B complete)
curl -X POST http://localhost:8000/index -d '{"force_reindex":true}' -H "Content-Type: application/json"
```

### Full suite
```bash
cd rag-service && pytest -v
```

## Plan 4 constraints (from plan-04-knowledge-base-and-retrieval.md)
- **Chunk size:** 500 chars (locked)
- **Chunk overlap:** 50 chars (locked)
- **Pinecone metadata schema:** source, source_type, section_title, page, chunk_index, chunk_total, text, isq_question_text, indexed_at
- **Source weighting:** policies × 1.0, historical_isqs × 0.95
- **min_score threshold:** 0.5
- **top_k:** 5

## Documentation rules
- Update `IMPLEMENTATION_PLAN.md` whenever you discover a blocker, hidden dependency, or follow-up task.
- Mark completed tasks with `[x]` immediately after validation passes.
- Update "Next recommended slice" section after each commit.
- Update README.md when setup or architecture details change.
- Update this file only when the repo-wide loop rules change.

## Safety rules
- Never commit secrets, tokens, or populated `.env` files.
- Avoid destructive file moves until the relevant plan step is active.
- No `--no-verify` on git commits (pre-commit hooks enforced when added in Plan 5).
- No force-push to main branch.

