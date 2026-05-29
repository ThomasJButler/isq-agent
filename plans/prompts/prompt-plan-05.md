# Companion Prompt — Plan 5 (Branching Strategy + Git Workflow)

**Use this prompt in Claude Code (VSCode) when setting up the git + CI infrastructure.**

Paste everything below the `---` line as your first message.

---

You're helping me build **Plan 5 — Branching Strategy + Git Workflow (TDD-aware)** of the ISQ Agent project.

This plan establishes the discipline every subsequent plan inherits — GitHub Flow, Conventional Commits, pre-commit hooks, GitHub Actions CI.

## Read these first

In `plans/`:
- **plan-05-branching-and-git-workflow.md** (the plan you're executing)
- **plan-02-stack-lockin.md** (Voyage client wrapper from Exercise 1 — needs backfill tests)
- **plan-03-architecture.md** (FastAPI main.py from Exercise 2 — needs backfill tests)

## Branch + workflow

```bash
cd ~/Repos/isq-agent
git checkout -b chore/branching-and-ci
```

## What to do FIRST

Guide me through typing the four parts of **Plan 5 Section 9 Manual Coding Exercise 4**:

- **Part A**: `.pre-commit-config.yaml` (~30 lines)
- **Part B**: `.github/workflows/ci.yml` (~50 lines)
- **Part C**: `rag-service/tests/test_voyage_client.py` (backfill — ~50 lines)
- **Part D**: `rag-service/tests/test_main.py` (backfill — ~30 lines)

Plus the supporting files:
- `.github/pull_request_template.md` (Plan 5 Section 4)

## What's LOCKED

- **GitHub Flow** (not trunk-only, not GitFlow)
- **Conventional Commits** format on every commit
- **Squash-and-merge** to main via PR (even solo)
- **Pre-commit hooks**: trailing-whitespace, end-of-file-fixer, check-yaml, check-added-large-files, detect-private-key, ruff, ruff-format, pytest, matrix-strip-check
- **GitHub Actions CI**: ruff check, ruff format check, pytest, matrix-strip test, yamllint, markdown link check
- **Branch protection** on main: require status checks + PR before merge
- **Tagging milestones**: v0.0.1 (scaffolding), v0.1.0 (RAG core), ... v1.0.0 (submission)

## Acceptance

- [ ] `.pre-commit-config.yaml` committed and `pre-commit install` succeeds
- [ ] `.github/workflows/ci.yml` committed
- [ ] `.github/pull_request_template.md` committed
- [ ] Backfill tests for Voyage client + FastAPI main both pass
- [ ] All pre-commit hooks pass on `pre-commit run --all-files`
- [ ] Pushed to GitHub
- [ ] CI runs on push and passes
- [ ] Branch protection enabled on `main`
- [ ] First tag: `v0.0.1` pushed

## Smoke test once merged

```bash
# Local
pre-commit run --all-files  # all green
pytest -v                    # all green
ruff check .                 # no issues
ruff format --check .        # no formatting drift

# Then push and verify CI on GitHub Actions tab
```

## Failure modes to avoid

- Don't disable pre-commit on commits ("--no-verify" defeats the purpose)
- Don't use a different commit message format than Conventional Commits
- Don't merge to main without a PR (even solo — the discipline matters)
- Don't commit `.env` (pre-commit's `detect-private-key` should catch but stay alert)
- Don't write code for the TODOs in the backfill tests — those are mine

## Acknowledge before proceeding

Reply with:
1. Confirmation you've read Plan 5 + Plan 2 Exercise 1 + Plan 3 Exercise 2
2. The exact next step (first file, first commit)
3. Any clarifying questions

Then ask me: "Ready to start with `.pre-commit-config.yaml`?"
