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
- [ ] Tests pass locally (`cd rag-service && pytest`)
- [ ] Ruff passes locally (`ruff check . && ruff format --check .`)
- [ ] No Matrix/Morpheus terminology leaked (covered by `test_isq_prompts_no_matrix_leakage.py`)
- [ ] No secrets in the diff
- [ ] Conventional Commits format used in commit messages
- [ ] Linked to plan if relevant: Plan #
