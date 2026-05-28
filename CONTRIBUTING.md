# Contributing to ISQ Agent

Even as a solo project, this repo follows a professional workflow. See `CLAUDE.md`
for architecture + commands and `RALPH.md` for the autonomous-loop rules.

## Setup

```bash
cd rag-service && python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pre-commit install        # from the repo root
```

Python is pinned to **3.11** (see `rag-service/.python-version`).

## Workflow (GitHub Flow)

1. Branch off `main`: `git checkout -b <type>/<short-kebab>` (`feature/`, `fix/`, `test/`, `docs/`, `refactor/`, `chore/`).
2. **Write tests first** (TDD — locked from Plan 4 onward): watch them fail, then implement.
3. Commit in [Conventional Commits](https://www.conventionalcommits.org/) format: `<type>(<scope>): <subject>` (imperative, lowercase, no trailing period). One concern per commit; stage files explicitly (no `git add .`).
4. Push and open a PR (yes, even solo) — fill in the template, self-review the diff.
5. Squash-and-merge; delete the branch.

## Before you push

```bash
cd rag-service && source .venv/bin/activate
pytest -v                       # all green
ruff check . && ruff format --check .
pre-commit run --all-files      # mirrors CI
```

CI (GitHub Actions) runs ruff lint + format check, the full test suite, and the
matrix-strip leakage guard on every push and PR to `main`.

## Safety

- Never commit secrets or a populated `.env` (use `.env.example` as the template).
- No `--no-verify` on commits. No force-push to `main` — revert instead.
