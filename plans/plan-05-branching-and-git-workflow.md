# Plan 5 — Branching Strategy + Git Workflow (TDD-aware)

**Status:** Plan 5. Inserted at Tom's request (2026-05-25). What was originally Plan 5 (Question Extraction) is now Plan 6, and everything shifts down by one.

**Owner:** Tom Butler
**Date:** 2026-05-25
**Prior plans:** Plan 1 ✅, Plan 2 ✅, Plan 3 ✅, Plan 4 ✅
**TDD lock:** Plan 4 onwards. This plan also retrofits tests for Plans 2 + 3 Manual Coding Exercises.

---

## 0. Why this plan is here (and why before the build heats up)

The repo will be **public**. Lee and Gav will see the commit history. They might filter by commits to spot how you actually work. They might open the repo on the day of the walkthrough and click through three random commits to gauge engineering hygiene.

Git hygiene = engineering hygiene. A clean commit history is a real, observable signal. A messy one (1-line commit messages, mixed-concern commits, "WIP" everywhere, no PRs, no tags) suggests a developer who doesn't think about future-maintainers — including their future self.

This plan locks in:
- Branching model (GitHub Flow — simple, demoable)
- Commit message convention (Conventional Commits — industry standard, signals fluency)
- PR workflow (yes, even solo)
- Tagging strategy (milestone tags align with plans)
- Pre-commit hooks (pytest + ruff + matrix-strip enforcement)
- GitHub Actions CI (tests + lint on every push and PR)
- Public-repo hygiene (LICENSE, README, .gitignore, secret-scanning)
- Test backfill for Exercises 1 + 2 (so the CI passes from day one)

---

## 1. What this plan does and doesn't do

**Locks in:**
- Branching model
- Commit message conventions
- PR template + self-review checklist
- Tagging strategy with milestone alignment
- `.pre-commit-config.yaml`
- `.github/workflows/ci.yml`
- Test backfill for Voyage client (Exercise 1) and FastAPI main (Exercise 2)
- Public-repo hygiene checklist

**Doesn't yet cover:**
- Question extraction (Plan 6)
- Answer generation (Plan 7)
- Confidence + flagging (Plan 8)
- Output rendering (Plan 9)
- Demo + walkthrough script (Plan 10)
- Final consolidation (Plan 11)

---

## 2. Branching model — GitHub Flow (locked)

### Why GitHub Flow (not GitFlow, not trunk-only)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Trunk-only** (commit straight to main) | Simplest | No review, no isolation, demo-day surprises | ❌ Looks careless in a public repo |
| **GitFlow** (main + develop + feature + release + hotfix branches) | Powerful for teams shipping releases | Massive overkill for solo assessment | ❌ Performative complexity |
| **GitHub Flow** ✅ (main + short-lived feature branches via PRs) | Simple, demoable, supports review, industry standard | None for our scope | ✅ Locked |

### The model

```
main  ●────●────●────●────●────●────●────●────●  (always shippable)
       \   /     \   /     \   /     \   /
        ●─●       ●─●       ●─●       ●─●
        feature/  feature/  feature/  feature/
        voyage    chunking  retriever generator
        -client   -tdd      -ranking  -single-call
```

**Rules:**
- `main` is always green (CI passes, tests pass)
- Every change goes through a feature branch
- Feature branches are short-lived (hours to a couple of days max)
- Merge via squash-and-merge (one feature = one commit on main)
- Delete feature branches after merge
- Tag milestones on main

### Branch naming convention

```
feature/<short-kebab-case-description>     # new functionality
fix/<short-description>                     # bug fixes
test/<short-description>                    # tests only
docs/<short-description>                    # docs only
refactor/<short-description>                # restructure without behaviour change
chore/<short-description>                   # tooling, deps, CI, etc.
```

**Examples:**
- `feature/voyage-client-wrapper`
- `feature/chunking-with-tests`
- `test/backfill-voyage-tests`
- `docs/readme-architecture-section`
- `fix/pinecone-empty-result-handling`
- `chore/pre-commit-hooks`
- `chore/github-actions-ci`

---

## 3. Conventional Commits (locked)

### Format

```
<type>(<scope>): <subject>

<optional body>

<optional footer>
```

### Types we'll use

| Type | When | Example |
|---|---|---|
| `feat` | New feature | `feat(rag): add ISQ-specific query rewriter` |
| `fix` | Bug fix | `fix(retriever): handle empty Pinecone results without crashing` |
| `test` | Adding/updating tests only | `test(chunking): add tests for section boundary respect` |
| `docs` | Documentation only | `docs(readme): add architecture diagram` |
| `refactor` | Code restructure, no behaviour change | `refactor(api): extract route handlers to separate modules` |
| `chore` | Tooling, deps, config | `chore(ci): add pre-commit hooks` |
| `style` | Formatting only (rare — let ruff handle it) | `style: apply ruff formatting` |
| `perf` | Performance improvements | `perf(retriever): batch embedding calls` |

### Scopes (project-specific)

`rag`, `api`, `retriever`, `generator`, `chunking`, `voyage`, `pinecone`, `confidence`, `n8n`, `docs`, `ci`, `infra`, `tests`

### Subject rules

- Imperative mood ("add" not "added" or "adds")
- Lowercase first letter
- No trailing period
- Under 72 characters

### Why Conventional Commits

- Tells Lee at a glance what each commit does (he can scan main's history in 30 seconds)
- Compatible with auto-generated CHANGELOGs (`git-cliff`, semantic-release, etc.)
- Industry standard — signals fluency
- Forces you to think about WHAT each commit really does (one concern per commit)

---

## 4. PR workflow (yes, even solo)

### Why PRs solo

- Forces a self-review pause before merging
- Creates a documentation trail (Lee can read PRs to understand intent)
- Demonstrates professional discipline in the public repo
- Makes it easy to revert one PR if something breaks

### PR template

Create `.github/pull_request_template.md`:

```markdown
## What this PR does
<!-- One-sentence summary -->

## Why
<!-- Context / problem being solved -->

## How
<!-- Implementation approach. Reference design decisions from /plans if relevant -->

## Testing
<!-- What tests were added? What scenarios did you check manually? -->

## Checklist
- [ ] Tests added (TDD discipline — written before implementation)
- [ ] Tests pass locally (`pytest`)
- [ ] Ruff passes locally (`ruff check .`)
- [ ] No Matrix-themed terminology leaked (covered by `test_isq_prompts_no_matrix_leakage.py`)
- [ ] No secrets in commit
- [ ] Linked to plan if relevant: Plan #
- [ ] Conventional Commits format used in commit messages
```

### Self-review discipline

Before clicking "merge":
1. Read your own PR diff as if a stranger wrote it
2. Run tests one more time
3. Squash commits if there are intermediate WIPs
4. Update commit message to follow Conventional Commits
5. Then merge

### Merge strategy: squash-and-merge

GitHub UI → "Squash and merge" for every PR. This means:
- `main` history = one commit per feature
- Clean to read, clean to revert
- Feature-branch noise (intermediate WIPs, ruff fixes, oops typo fixes) stays out of main

---

## 5. Tagging strategy (milestone-aligned)

Tags align with plan milestones so the git history reads like a development diary.

| Tag | Triggered after | What it means |
|---|---|---|
| `v0.1.0` | Plan 4 done (chunking + indexing + retrieval working end-to-end on real corpus) | RAG core operational |
| `v0.2.0` | Plan 6 done (question extraction working) | Can parse inbound ISQs |
| `v0.3.0` | Plan 7 done (answer generation working end-to-end) | Can answer a question grounded in policy |
| `v0.4.0` | Plan 8 done (confidence + flagging) | Can flag low-confidence answers honestly |
| `v0.5.0` | Plan 9 done (all three output formats working) | Full pipeline complete |
| `v0.9.0` | Plan 10 done (walkthrough rehearsed, demo runs clean) | Submission candidate |
| **`v1.0.0`** | Plan 11 done (consolidation, README polish, final review) | **Submitted to RiverAI** |

### Tagging command

```bash
git tag -a v0.1.0 -m "v0.1.0 — RAG core operational (chunking + indexing + retrieval)"
git push origin v0.1.0
```

### Why tags matter for Lee

If Lee opens the public repo and sees a clean tag list, he immediately understands the project's maturity progression. A repo with `v0.1.0 ... v1.0.0` tags reads as a real product. A repo with no tags reads as a half-baked side project.

---

## 6. Pre-commit hooks (locked)

### Purpose

Catch problems BEFORE they reach the remote. Faster feedback loop than CI. Enforces discipline automatically.

### `.pre-commit-config.yaml`

```yaml
# Pre-commit hooks for isq-agent
# Install: pip install pre-commit && pre-commit install
# Run manually: pre-commit run --all-files

repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: ['--maxkb=1000']  # block accidentally committing the corpus
      - id: check-merge-conflict
      - id: detect-private-key

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: local
    hooks:
      - id: pytest-changed
        name: pytest on changed files
        entry: bash -c 'cd rag-service && pytest -x --tb=short'
        language: system
        types: [python]
        pass_filenames: false

      - id: matrix-strip-check
        name: matrix-strip enforcement
        entry: bash -c 'cd rag-service && pytest tests/test_isq_prompts_no_matrix_leakage.py'
        language: system
        files: ^rag-service/app/.*\.py$
        pass_filenames: false
```

### What this enforces on every commit

1. **Whitespace + EOF cleanliness** — no scruffy diffs
2. **YAML validity** — catches broken workflow files
3. **No large files** — blocks accidentally committing source-corpus
4. **No merge conflict markers** — catches forgotten `<<<<<<<`
5. **No private keys** — catches accidentally pasting `sk-ant-...` into a file
6. **Ruff linting + formatting** — Python code is clean
7. **Tests pass** — fast subset; full suite runs in CI
8. **No Matrix terminology leaks** — the lint test we defined in Plan 2 actually runs

### Install command (for your terminal tonight or tomorrow)

```bash
cd ~/Repos/isq-agent
pip install pre-commit
pre-commit install
pre-commit run --all-files  # smoke test
```

---

## 7. GitHub Actions CI (locked)

### Purpose

Server-side enforcement. Even if someone bypasses pre-commit (`git commit --no-verify`), CI catches it. Required to merge.

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-rag-service:
    name: Test RAG Service
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: rag-service

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-asyncio ruff

      - name: Lint with ruff
        run: ruff check .

      - name: Format check with ruff
        run: ruff format --check .

      - name: Run tests
        env:
          # Mock API keys for tests — real ones never in CI
          VOYAGE_API_KEY: test-key
          ANTHROPIC_API_KEY: test-key
          PINECONE_API_KEY: test-key
          PINECONE_INDEX: test-index
        run: pytest -v --tb=short

      - name: Matrix-strip check
        run: pytest tests/test_isq_prompts_no_matrix_leakage.py -v

  lint-yaml-and-docs:
    name: Lint config + docs
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check YAML validity
        run: |
          pip install yamllint
          yamllint -d relaxed .

      - name: Check markdown links
        uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          use-quiet-mode: 'yes'
          folder-path: 'docs,plans'
```

### Branch protection (set in GitHub UI after first push)

Settings → Branches → Add rule for `main`:
- ✅ Require status checks before merging
- ✅ Required: `Test RAG Service`, `Lint config + docs`
- ✅ Require pull request before merging
- ✅ Dismiss stale reviews when new commits push
- ❌ Don't require approvals (solo project, but PRs still happen)

### Why CI in a public repo

When Lee opens the repo and sees a green CI badge in the README, he sees professional discipline. When he opens a PR and sees green status checks, he sees that you treat your own work with the rigour you'd treat a team's.

---

## 8. Public-repo hygiene checklist

Things every public repo should have, in priority order:

| Item | Why | Where |
|---|---|---|
| `README.md` with project description, architecture, quickstart | First impression | Repo root |
| `LICENSE` (MIT, matching Morpheus) | Legal clarity for anyone forking | Repo root |
| `.gitignore` excluding secrets, caches, source-corpus | Prevents accidental commits | Repo root |
| `.env.example` with required env var names (no values) | Onboarding signal | Repo root |
| `CONTRIBUTING.md` (light version) | "Here's how to contribute" — even if solo, signals care | Repo root |
| GitHub Actions CI badge in README | Visible quality signal | README header |
| Coverage badge in README (later — once we have coverage reporting) | Visible quality signal | README header |
| Tagged releases (v0.1.0 → v1.0.0) | Maturity signal | GitHub Releases page |
| Clean commit history (squash merges, Conventional Commits) | Professional engineering signal | git log |
| No secrets anywhere in history | Security baseline | `gitleaks` scan |

### Secret-scanning safety net

Before pushing the first commit:
```bash
pip install gitleaks  # or use the binary
gitleaks detect --source . --no-git
```

GitHub also has built-in secret scanning on public repos — it'll email you if a real API key gets committed. Belt + braces.

---

## 9. 🖐️ Manual Coding Exercise 4 — TYPE TWO CONFIG FILES + BACKFILL TESTS

**Purpose:** Real devops fluency. You type out the pre-commit config AND the CI workflow AND backfill tests for the previous exercises. Total time: ~40 minutes across three files.

### Part A — `.pre-commit-config.yaml`

Type the full file from Section 6 above. ~30 lines. No TODOs for this one — it's a copy from the plan, but you type each line so the structure sinks in.

**Verification:**
```bash
cd ~/Repos/isq-agent
pip install pre-commit
pre-commit install
pre-commit run --all-files
# Expected: some hooks pass, ruff might fix a couple of files. No errors that aren't actionable.
```

### Part B — `.github/workflows/ci.yml`

Type the full file from Section 7 above. ~50 lines.

**Verification:**
- Commit to a feature branch
- Push to GitHub
- Watch the Actions tab — workflow should run and pass

### Part C — Backfill tests for Voyage client (Plan 2 Exercise 1)

**File:** `rag-service/tests/test_voyage_client.py`

```python
"""
Tests for the Voyage embedding client wrapper.
Backfilled in Plan 5 to align Exercise 1 with TDD discipline.
"""

import pytest
from unittest.mock import MagicMock, patch
from app.voyage.client import VoyageClient


@pytest.fixture
def mock_voyage_response():
    """Mock the voyageai.Client().embed() response shape."""
    response = MagicMock()
    response.embeddings = [[0.1] * 1024]
    response.total_tokens = 50
    return response


class TestVoyageClient:
    def test_initialises_with_default_model(self, monkeypatch):
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        client = VoyageClient()
        assert client.model == "voyage-3-large"
        assert client.tokens_used == 0

    def test_initialises_with_custom_model(self, monkeypatch):
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        client = VoyageClient(model="voyage-3-lite")
        assert client.model == "voyage-3-lite"

    @patch("app.voyage.client.voyageai.Client")
    def test_embed_query_returns_vector(self, mock_client_class, mock_voyage_response, monkeypatch):
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        mock_client_class.return_value.embed.return_value = mock_voyage_response

        client = VoyageClient()
        vector = client.embed_query("Do you use MFA?")

        assert len(vector) == 1024
        assert client.tokens_used == 50
        # TODO ① — Tom: assert that the call to embed used input_type="query"
        # Hint: mock_client_class.return_value.embed.assert_called_with(...)
        # ~2 lines.

    @patch("app.voyage.client.voyageai.Client")
    def test_embed_documents_handles_batching(self, mock_client_class, monkeypatch):
        """1500 texts should trigger 2 batches (1000 + 500)."""
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        mock_client_class.return_value.embed.return_value = MagicMock(
            embeddings=[[0.1] * 1024] * 1000,
            total_tokens=1000,
        )

        client = VoyageClient()
        texts = ["text"] * 1500
        vectors = client.embed_documents(texts)

        # TODO ② — Tom: assert that voyageai.Client.embed was called exactly 2 times
        # Hint: assert mock_client_class.return_value.embed.call_count == 2
        # ~1 line.

    def test_cost_estimate_calculation(self, monkeypatch):
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        client = VoyageClient()
        client.tokens_used = 1_000_000  # 1 million tokens
        # voyage-3-large pricing: $0.18 per million
        assert client.get_cost_estimate() == pytest.approx(0.18, rel=0.01)
```

### Part D — Backfill tests for FastAPI main (Plan 3 Exercise 2)

**File:** `rag-service/tests/test_main.py`

```python
"""
Tests for the FastAPI app setup.
Backfilled in Plan 5 to align Exercise 2 with TDD discipline.
"""

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_root_returns_service_info():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "ISQ Agent RAG Service"
    assert data["health"] == "/health"
    assert data["version"] == "0.1.0"


def test_docs_endpoint_available():
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger" in response.text.lower()


def test_cors_allows_n8n_origin():
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:5678",
            "Access-Control-Request-Method": "POST",
        },
    )
    # FastAPI returns 200 for preflight when origin is allowed
    assert response.status_code == 200
    assert "access-control-allow-origin" in {h.lower() for h in response.headers}


def test_cors_blocks_unknown_origin():
    """Origins not in our whitelist should not get CORS headers."""
    response = client.options(
        "/",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    # The response itself might be 200, but the ACAO header shouldn't echo the bad origin
    assert response.headers.get("access-control-allow-origin") != "http://evil.example.com"
```

**Acceptance for TODOs:**
- **TODO ①** in Part C: assert `mock_client_class.return_value.embed.assert_called_with(texts=["Do you use MFA?"], model="voyage-3-large", input_type="query")` — 1 line
- **TODO ②** in Part C: assert `mock_client_class.return_value.embed.call_count == 2` — 1 line

### Smoke commands

```bash
cd rag-service
pytest tests/test_voyage_client.py tests/test_main.py -v
# Expected: all green
```

---

## 10. 📘 Concept Primer

### Pre-commit hooks

Imagine the world's smallest reviewer sitting on your shoulder, watching every commit you make. Before the commit hits the repo, the reviewer checks: "Is the code formatted? Do the tests pass? Are there any merge conflict markers left? Is there an API key in here?" If anything is wrong, the reviewer blocks the commit and tells you what to fix.

That's what pre-commit hooks do. They run automatically when you type `git commit`. They live in `.pre-commit-config.yaml`. You install them once per machine, and they protect every future commit you ever make.

The big win: instead of pushing broken code and finding out 5 minutes later when CI fails, you find out instantly when committing. Faster feedback = less context-switching = less frustration.

### GitHub Flow vs GitFlow

Two ways to organise branches:

**GitFlow** (the complicated one): there's `main` for production, `develop` for the next release, `feature/*` branches that go into develop, `release/*` branches that prep a release, and `hotfix/*` branches that go straight to main when something's on fire. Lots of moving pieces, useful when you ship versioned releases to multiple customers.

**GitHub Flow** (the simple one): there's `main` and `feature/*` branches. Features go into PRs, get reviewed, get merged to main. Main is always shippable. No develop branch, no release branches.

For us, GitHub Flow is right because:
- We're solo
- We don't have versioned releases for customers (yet)
- Simpler = faster iteration = better for assessment week
- It's what most modern teams use

### Conventional Commits

Conventional Commits is a rule for how commit messages should be written. The format is:

```
<type>(<scope>): <subject>
```

Why? Because commit messages have value:
- Future-you reading `git log` understands what you did
- Tools can auto-generate CHANGELOGs by reading commit types
- It forces ONE concern per commit (you can't write "feat" for something that's actually a "fix")
- Reviewers can scan history at a glance

The types tell you the SHAPE of the change:
- `feat` — new behaviour
- `fix` — broken behaviour now works
- `test` — only tests changed
- `docs` — only docs changed
- `refactor` — code moved around, behaviour unchanged
- `chore` — tooling/deps/CI

When you do this for every commit, your git history becomes a readable diary instead of "WIP" 200 times.

---

## 11. End-of-Plan-5 checklist

Tonight or tomorrow morning (before any further build):

- [ ] Create `.gitignore` (Python + Node + JetBrains + macOS + `source-corpus/` + `.env`)
- [ ] Create `.env.example` with var names only, no values
- [ ] Create `LICENSE` (MIT, copy from Morpheus)
- [ ] Create `.github/pull_request_template.md` (Section 4 content)
- [ ] Create `.pre-commit-config.yaml` (Manual Coding Exercise 4 Part A)
- [ ] Create `.github/workflows/ci.yml` (Manual Coding Exercise 4 Part B)
- [ ] Install pre-commit: `pip install pre-commit && pre-commit install`
- [ ] Run pre-commit once: `pre-commit run --all-files`
- [ ] Write backfill tests (Manual Coding Exercise 4 Parts C + D)
- [ ] Run all tests: `pytest -v`
- [ ] Commit with proper Conventional Commits format:
  - `chore(ci): add pre-commit hooks and github actions ci`
  - `test(voyage): backfill tests for voyage client wrapper`
  - `test(api): backfill tests for fastapi main`
- [ ] Push to GitHub
- [ ] Verify CI runs and passes
- [ ] Enable branch protection on `main` (Section 7)
- [ ] Tag `v0.0.1`: `git tag -a v0.0.1 -m "v0.0.1 — initial scaffolding, CI, tests"`
- [ ] `git push origin v0.0.1`

After this, every subsequent piece of work follows the pattern:
1. `git checkout -b feature/<thing>`
2. Write tests first
3. Implement
4. Commit with Conventional Commits format
5. Push, open PR (even solo)
6. Self-review
7. Squash-merge to main
8. Delete feature branch

---

## 12. What Plan 6 will tackle

Plan 6 — **Question Extraction Strategy (TDD-first)** — was previously Plan 5 before this insertion:

- Test plan for question extraction from PDF + XLSX
- The Claude prompt that extracts numbered questions
- The XLSX parser that handles "Question / Response" two-column tables
- Output schema for extracted questions
- Edge cases: 0 questions detected, >100 questions, malformed numbering
- 🖐️ **Manual Coding Exercise 5** — typing `tests/test_question_extractor.py` first, then the extraction logic
- 📘 Concept Primer sections: structured output via JSON mode, n8n Code nodes, edge case handling

---

## Git execution block

See `git-conventions.md` for the full reference. Plan 5 is the meta-plan — these commits set up the discipline used by every plan after.

**Branch A — Pre-commit + CI:** `chore/pre-commit-and-ci`
1. `chore(ci): add pre-commit config with ruff, black, detect-private-key, matrix-strip` — stages `.pre-commit-config.yaml`
2. `chore(ci): add github actions workflow (tests + lint on push and PR)` — stages `.github/workflows/ci.yml`
3. `docs(repo): add pull request template` — stages `.github/pull_request_template.md`
4. Install hooks locally: `pre-commit install`, then run all hooks once: `pre-commit run --all-files`. Fix anything that fails before pushing.
5. Push, PR, squash-merge. Verify CI passes on the PR. Enable branch protection on `main` after merge.

**Branch B — Backfill tests for Plans 2 + 3 exercises:** `test/backfill-voyage-and-fastapi`
1. `test(voyage): backfill tests for voyage client wrapper` — stages `rag-service/tests/test_voyage_client.py` (if not already added in Plan 2)
2. `test(api): backfill smoke tests for fastapi main` — stages `rag-service/tests/test_main_smoke.py` (if not already added in Plan 3)
3. Push, PR, squash-merge.

**Milestone tag — `v0.0.1`:**
```bash
git checkout main && git pull
git tag -a v0.0.1 -m "v0.0.1 — initial scaffolding, CI, tests"
git push origin v0.0.1
```

---

## Plan 5 done ✅

Branching strategy, commit conventions, PR workflow, tagging strategy, pre-commit hooks, GitHub Actions CI, public-repo hygiene checklist, backfilled tests for Exercises 1 + 2 — all locked.

The repo will now have professional engineering hygiene from the first push, which is non-negotiable for a public repo Lee and Gav will scrutinise.

**Tom's reaction needed before Plan 6:**

1. GitHub Flow vs trunk-only — any reason to prefer trunk-only for simplicity?
2. Conventional Commits scope list (Section 3) — anything missing?
3. PR template (Section 4) — too much, right size, too little?
4. Tagging milestones (Section 5) — happy with the v0.1 → v1.0 alignment to plan numbers?
5. Pre-commit hooks list (Section 6) — anything to add (e.g. mypy, bandit)?
6. CI workflow (Section 7) — happy with the matrix of test jobs, or want more (e.g. Docker build check)?
7. Anything in the Plan 6 outline you want to swap in/out?

Say "go" if happy and I'll write Plan 6.
