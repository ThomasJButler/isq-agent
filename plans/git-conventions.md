# Git Conventions — quick reference

**Open this whenever you need to remember "what was that git pattern again."**

Per-plan git execution blocks reference back to this doc for the boilerplate.

---

## Branch naming

```
feature/<short-kebab>     # new functionality
fix/<short-kebab>          # bug fix
test/<short-kebab>         # tests only
docs/<short-kebab>         # docs only
refactor/<short-kebab>     # code restructure, no behaviour change
chore/<short-kebab>        # tooling, deps, CI, config
```

Examples: `feature/voyage-client`, `feature/chunking-and-retrieval`, `chore/pre-commit-hooks`, `docs/walkthrough-script`.

---

## Conventional Commits format

```
<type>(<scope>): <subject in imperative mood, lowercase, no trailing period, under 72 chars>
```

**Types** (use these — nothing else):
`feat` `fix` `test` `docs` `refactor` `chore` `style` `perf`

**Scopes** (project-specific — use these):
`rag` `api` `retriever` `generator` `chunking` `voyage` `pinecone` `confidence` `n8n` `extraction` `render` `skill` `docs` `ci` `infra` `tests`

**Good subjects:**
- `feat(rag): add ISQ-specific query rewriter`
- `test(chunking): add tests for section boundary respect`
- `fix(retriever): handle empty Pinecone results without crashing`
- `chore(ci): add pre-commit hooks`
- `docs(readme): add architecture diagram`

**Bad subjects:**
- `WIP` ❌
- `fix things` ❌
- `Added the new feature.` ❌ (past tense + period)
- `feat: did a bunch of stuff` ❌ (too vague)

---

## Standard execution sequence (TDD discipline)

For any feature plan:

```bash
# 0. Sync with main
git checkout main && git pull

# 1. Create feature branch
git checkout -b feature/<short-kebab>

# 2. Write tests FIRST
git add tests/test_*.py
git commit -m "test(<scope>): add failing tests for <feature>"

# 3. Run tests — confirm they fail for the right reason
pytest tests/test_*.py -v

# 4. Implement
git add app/<path>
git commit -m "feat(<scope>): <subject>"

# 5. Pre-commit must pass (auto-runs on git commit)
# 6. Push
git push -u origin feature/<short-kebab>

# 7. Open PR
gh pr create --fill   # uses commit message + PR template
# OR via GitHub UI

# 8. Self-review on GitHub
# 9. Squash-and-merge via GitHub UI
# 10. After merge, cleanup
git checkout main && git pull
git branch -d feature/<short-kebab>

# 11. Tag if milestone (see Plan 5 Section 5 for milestone tags)
git tag -a vX.Y.Z -m "vX.Y.Z — what shipped"
git push origin vX.Y.Z
```

---

## Milestone tags (from Plan 5 Section 5)

| Tag | After | Status |
|---|---|---|
| `v0.0.1` | Plan 5 (Tue PM) | scaffolding + CI + first commits |
| `v0.1.0` | Plan 4 (Wed PM) | RAG core operational |
| `v0.2.0` | Plan 6 (Wed PM) | question extraction live |
| `v0.3.0` | Plan 7 (Thu AM) | answer generation live |
| `v0.4.0` | Plan 8 (Thu PM) | confidence + flagging live |
| `v0.5.0` | Plan 9 (Thu PM) | DOCX + XLSX + JSON renderers (PDF optional) |
| `v0.6.0` | Plan 9.5 (Fri AM) | packaged Claude Code skill |
| `v1.0.0` | Plan 11 (Fri AM) | submitted to RiverAI |

Tag command pattern:
```bash
git tag -a vX.Y.Z -m "vX.Y.Z — <description matching status column>"
git push origin vX.Y.Z
```

---

## Files to stage — anti-patterns to avoid

- **Don't `git add .` blindly.** Use explicit paths. Prevents accidental commit of `.env`, output files, temp scratch.
- **Don't mix concerns in one commit.** One commit = one concern. If tests + implementation + a docs fix all need committing, that's three commits.
- **Don't commit `pytest-cache/`, `__pycache__/`, `.ruff_cache/`** — should be gitignored. If they appear in `git status`, fix the .gitignore first.
- **Don't commit secrets.** Pre-commit's `detect-private-key` hook catches them. Don't override with `--no-verify`.
- **Don't commit `outputs/`** — rendered DOCX/PDF/XLSX outputs. Gitignored.

---

## PR title format

Use the same Conventional Commits format as the squash-merge commit:

```
feat(scope): subject
```

Squash-and-merge will use this as the merged commit message on main. Keep main's history clean and Conventional Commits-compliant.

---

## When to skip the PR

You don't need a PR for:

- Plan 11 final-day mechanical commits (README polish, CHANGELOG, attributions) — direct push to main is fine in the submission window if CI is green
- Tag-only operations (no code change)

You DO need a PR for everything else, even solo. The discipline matters.

---

## Emergency rollback

If something gets merged that breaks main:

```bash
# Find the bad commit
git log --oneline

# Revert (creates a new commit, doesn't rewrite history)
git revert <commit-sha>
git push origin main
```

Don't `git reset --hard` on main. Don't force-push to main. Always revert.

---

## See also

- `plan-05-branching-and-git-workflow.md` — full discipline + reasoning
- `.github/pull_request_template.md` — PR template content
- `.pre-commit-config.yaml` — what pre-commit checks before allowing a commit
- `.github/workflows/ci.yml` — what CI checks before allowing a merge
