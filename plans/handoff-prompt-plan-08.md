# Handoff Prompt — Continue ISQ Agent from Plan 8

**Purpose:** Copy-paste everything below the `---` into a fresh Claude Code chat (opened in `/Users/tombutler/Repos/isq-agent`) to continue the project from Plan 8 without re-explaining context. Supersedes the earlier `plans/handoff-prompt-plan-06-onwards.md` (which was written at Plan 6).

**Snapshot when written:** 2026-05-29. Plans 1–7 complete and merged to `main`. Tag `v0.3.0`. CI green (112 tests). Next: Plan 8 (confidence scalar + flagging).

> **Accuracy note:** This handoff was cross-checked against the *actual shipped code* (not just the plan doc) by a multi-agent verification pass on 2026-05-29. Plan 7 shipped house-style: `AnswerGenerator.generate()` returns a plain dict and `/answer` currently has **no** response model (the plan doc's hand-constructed `AnswerResponse` with attribute access never landed). **Plan 8 deliberately introduces a Pydantic `response_model` for `/answer`** (Tom's call — see the wiring section below). Trust this doc's "Current state" and "wiring" sections over the plan doc where they differ.

---

# ISQ Agent — Implementation Brief (Plan 8 onward)

You're continuing an in-progress AI engineering project for Tom Butler, in the repo at `/Users/tombutler/Repos/isq-agent` (Claude Code, working tree access). Planning is done; Plans 1–7 are built and merged. Your job: build Plan 8 onward, following the locked TDD + git discipline and Tom's working style.

## What you're building

An **ISQ Agent** for fictional company Northstar Labs — an AI workflow that accepts a blank Information Security Questionnaire (PDF or XLSX), extracts the questions, grounds answers in Northstar Labs' 6 policies + 3 historical completed ISQs via RAG, generates evidence-backed answers with Claude, flags low-confidence answers for review, and renders output in three formats (filled original, DOCX, JSON).

**Two-tier architecture:** n8n workflow tier (port 5678) + Python FastAPI `rag-service` tier (port 8000). Both run via `docker compose up`. Most `rag-service` code was lifted from Tom's existing "Morpheus" RAG product and scrubbed of its Matrix theming.

## Why it exists

Technical assessment for **RiverAI** (Tom interviewing for AI Engineer). CEO Gav Winter + Senior AI Engineer Lee Jackson will demo + walkthrough with Tom. The walkthrough is half the deliverable — architecture, design decisions, failure modes, "what I'd do with more time" all matter. The repo is **public**, so commit history and CI status are visible hiring signals.

## Current state (verified at handoff)

- **Branch:** `main`, clean. Latest: `eb554c7 feat: Plan 7 — answer generation (POST /answer, TDD) (#11)`.
- **Tags:** `v0.1.0` (RAG core operational), `v0.2.0` (question extraction), `v0.3.0` (answer generation). All three exist — verified (an earlier note worried `v0.2.0` was skipped; that's stale, it's present).
- **Tests:** 112 passing on **Python 3.11** (`cd rag-service && source .venv/bin/activate && pytest -v`). Per-file: test_answer_endpoint 9, test_generator 15, test_question_extractor 14, test_isq_prompts_no_matrix_leakage 14, test_extract_questions_endpoint 8, test_pinecone_client 8, test_chunking 8, test_document_processor 7, test_retriever 7, test_index_endpoint 6, test_query_rewriter 6, test_voyage_client 6, test_main_smoke 4.
- **CI:** GitHub Actions green on `main` (ruff check + ruff format --check + pytest + matrix-strip guard). Pre-commit hooks live.
- **Built so far:**
  - Plan 2 — Voyage embedding client (`app/voyage/client.py`) + backfilled tests
  - Plan 3 — FastAPI scaffold (`app/main.py`, CORS, structured logging, `GET /`, `GET /health`) + smoke tests
  - Plan 4 — RAG core: `app/utils/chunking.py`, `app/utils/document_processor.py` (PDF/DOCX/XLSX), `app/core/pinecone_client.py` (v5), `app/rag/query_rewriter.py`, `app/rag/retriever.py`, `POST /index` — all TDD
  - Plan 5 — GitHub Flow, Conventional Commits, `.pre-commit-config.yaml`, `.github/workflows/ci.yml` (Python 3.11), PR template, `CONTRIBUTING.md`, matrix-strip leakage guard, ruff pinned `0.15.15`
  - Plan 6 — `POST /extract-questions` (unified LLM question extraction via Claude tool-use) — PR #9
  - Plan 7 — `POST /answer` (grounded answer generation with prompt caching, four-dimension self-scoring, citation verification) — PR #11
- **Reserved dirs:** `app/confidence/` and `app/render/` each already contain an empty `__init__.py` (created 2026-05-26). So Plan 8's only *new* files are `app/confidence/aggregator.py`, a summary module (see below), and the two test files — you're not starting from nothing, but you don't need to create the package `__init__.py`.
- **Pinecone:** index `isq-agent-knowledge` (1024 dims, cosine, serverless). **NOT YET POPULATED** — the live `POST /index` has not been run. Requires `VOYAGE_API_KEY` + `PINECONE_API_KEY` in `.env`. (Tom hit a "No API key provided" error for `VOYAGE_API_KEY` on his last `/index` attempt — that env var needs setting before the live run.) This does NOT block Plan 8 TDD — everything is mocked.

## Read first (in the repo)

1. `CLAUDE.md` — project guidance: architecture, essential commands, RAG config (chunk 500/overlap 50, source weighting policies×1.0/historical_isqs×0.95, min_score 0.5, top_k 5), models (`voyage-3-large`, `claude-sonnet-4-5`), critical invariants (Pinecone v5 only, deterministic vector IDs, weighting-before-min_score).
2. **`plans/plan-08-confidence-and-flagging.md`** — **the active plan** (full spec, locked weights, test plan). Read it all, but note the two corrections this handoff makes: (a) the `/answer` wiring is dict-based, not `AnswerResponse`-based (see below); (b) the plan contradicts itself on the branch name — use `feature/confidence-and-flagging`.
3. `plans/git-conventions.md` — branch naming, Conventional Commits, milestone tags.
4. `plans/implementation-chat-prompt.md` — original implementation brief (supplementary background).
5. `IMPLEMENTATION_PLAN.md` — **NOTE: this is stale.** It's still titled/pinned at Plan 4 and predates Plans 5–7 and `v0.3.0`. Treat *this handoff's* "Current state" section as authoritative. If you drive Plan 8 via the Ralph loop, refresh `IMPLEMENTATION_PLAN.md` to a Plan 8 checklist first.
6. `RALPH.md` — autonomous build/plan loop rules (TDD discipline, one-slice-per-iteration, **never auto-push / auto-tag / auto-commit-before-validation**, explicit staging, no `--no-verify`). `CLAUDE.md`'s header points to it. If building via `./loop.sh build`, the loop reads `RALPH.md` + `CLAUDE.md` + `IMPLEMENTATION_PLAN.md` each iteration.
7. `plans/plan-09-output-rendering.md` … `plan-11` — what comes after.

## Working-style commitments (NON-NEGOTIABLE)

### 1. TDD is paramount (locked Plans 4–10)
Tests FIRST. Write the test file, run it, watch it fail (ModuleNotFoundError / AssertionError), then implement the minimum to pass, then confirm green. Each plan has a "Test plan" section — honour it. Commit the test file and implementation separately (one concern per commit).

### 2. Tom does NOT hand-type code anymore
**Important:** Earlier plans had "🖐️ Manual Coding Exercises" for Tom to type himself. Tom now wants **you to write the code** (test-first), and he studies it after. Do NOT make him type implementations or leave TODO gaps for him. The exercise sections in the plans are still useful as *specs* (they contain the test cases and structure) — implement them fully, including the two TODO assertions in the plan's test file.

### 3. Git discipline (Plan 5, locked)
- **GitHub Flow:** every change on a short-lived branch (`feature/`, `fix/`, `test/`, `docs/`, `chore/`), via PR, squash-merge, delete branch.
- **Conventional Commits:** `<type>(<scope>): <subject>` — imperative, lowercase, no trailing period, <72 chars. Stage files explicitly (never `git add .`).
- **Pre-commit + CI must pass.** Python 3.11; ruff pinned `0.15.15` (local + pre-commit + CI must agree). No `--no-verify`. No force-push to `main`.
- **Milestone tags:** next is `v0.4.0` after Plan 8 (confidence scalar + flagging live).

### 4. Review every PR with `/code-review:code-review` BEFORE merging
Tom is building foolproof habits and **deliberately slowing iteration**. From Plan 6 on: open the PR, run the `/code-review:code-review` skill on the **open** PR (it gates on closed PRs, so review before merging), address real findings, then squash-merge. Don't merge unreviewed.

### 5. ZERO Matrix theming
The lifted code must never contain Matrix-universe terms (Morpheus, Neo, Trinity, Zion, "the matrix", agent smith, red/blue pill, etc.). Enforced by `rag-service/tests/test_isq_prompts_no_matrix_leakage.py` (in CI + pre-commit). Don't break it.

### 6. Tom's voice for prose (READMEs, PRs, docs, walkthrough)
Direct, Northern English, slightly informal, contractions, confident-not-cocky. **Banned:** "genuinely", "leverage", "cutting-edge", "proven track record", em dashes, "I'd welcome the opportunity". **Prefer:** "properly", "I'm after", "a chat".

### 7. Concept Primers on request
When introducing dense concepts, offer simple analogies as **📘 Concept Primer** notes — Tom re-explains these in his walkthrough.

### 8. No "Generated with Claude Code" footer
**(added 2026-05-29):** Never add "🤖 Generated with [Claude Code](https://claude.ai/code)" or similar attribution footers to GitHub PR descriptions or code review comments. These are professional artifacts in a public assessment repo.

## Tooling available
- **Ralph loop:** `./loop.sh build 1 coach` runs one narrated TDD slice from `IMPLEMENTATION_PLAN.md`; `RALPH_ALLOW_UNSAFE_PERMISSIONS=1 ./loop.sh build 5 coach` runs autonomous, commit-capable iterations. Logs in `.claude-run/` (gitignored). Reads `RALPH.md` + `CLAUDE.md` + `IMPLEMENTATION_PLAN.md` per iteration; git safety rules apply (no auto-push/tag, explicit staging). Refresh `IMPLEMENTATION_PLAN.md` to the Plan 8 checklist before a loop run.
- **Dev plugins** (reference, local-only `.claude/INSTALLED-PLUGINS.md`): pinecone (MCP — inspect the live index), github (MCP/PRs), commit-commands, pr-review-toolkit, code-review, coderabbit, pyright-lsp, claude-api, etc.
- **External services** (keys in repo-root `.env`, never commit): Voyage (`VOYAGE_API_KEY`, `voyage-3-large`), Anthropic (`ANTHROPIC_API_KEY`, `claude-sonnet-4-5`), Pinecone (`PINECONE_API_KEY`, index `isq-agent-knowledge`).

## Plan 8 — what to build next (summary; read the full plan)

**Goal:** Turn the four-dimension `self_score` from Plan 7 into a single confidence scalar (0.0–1.0), apply a review threshold, wire it into the `/answer` response, and add an ISQ-level summary aggregator. This is the hybrid confidence design (LLM self-score + retrieval similarity sanity check).

### The hybrid design (recap)
- **Signal A — LLM self-score (from Plan 7):** 4 dimensions (`cites_policy`, `on_topic`, `vendor_tone`, `complete`), each 0.0–1.0. Returned by the answer generator.
- **Signal B — Retrieval similarity sanity check:** the score of the top chunk returned by the retriever (0.0–1.0).
- **Why both:** LLM provides nuance but can over-claim; retrieval is objective but flat. Combining: LLM provides dimension, retrieval provides honesty.

### Locked constants (Plan 8 §3, §4)
```python
WEIGHTS = {
    "cites_policy": 0.40,  # most important — is it grounded?
    "on_topic":     0.25,  # second — does it answer the question asked?
    "vendor_tone":  0.20,  # third — does it sound professional?
    "complete":     0.15,  # fourth — partial-but-correct beats complete-but-wrong
}
# Sum: 1.00

AGGREGATE_THRESHOLD = 0.6        # below this, flag
CITES_POLICY_FLOOR = 0.5         # cites_policy below this, flag (even if aggregate high)
TOP_CHUNK_SCORE_THRESHOLD = 0.7  # retrieval sanity check fires when top chunk < this AND cites_policy >= 0.9
OVER_CLAIM_PENALTY = 0.2         # downgrade cites_policy by this amount when sanity check fires
```
> The `WEIGHTS` keys **must** be exactly `cites_policy / on_topic / vendor_tone / complete` — these are the dimension names the existing generator and test fixtures already produce (`_canned()` in `test_answer_endpoint.py`, `_mock_anthropic_submit_answer` in `test_generator.py`). Renaming any dimension breaks both fixtures.

### Three flag triggers (any one → `needs_review = True`)
1. `aggregate < 0.6` — generally weak answers
2. `self_score["cites_policy"] < 0.5` — specifically ungrounded answers (even if otherwise strong)
3. `llm_review_reason is not None` — LLM flagged it in Plan 7 (scope mismatches, contradictions, ambiguity)

### Retrieval sanity check (Plan 8 §5)
If `top_chunk_score < 0.7` AND `self_score["cites_policy"] >= 0.9`, downgrade `cites_policy` by 0.2 (floor 0.0). Protects against LLM over-claiming relative to retrieval.

> **Caveat worth knowing:** `chunks[0]["score"]` from the retriever is the **weighted** top-chunk score (historical_isq matches are scaled ×0.95 in `Retriever._apply_weight`), not the raw cosine. So the 0.7 threshold compares against the weighted value — which is the intended behaviour, but note it in your walkthrough.

### Test plan (write FIRST — Plan 8 §2)

`tests/test_confidence.py` (~22 tests):
- Weights sum to 1.0; `cites_policy` heaviest, `complete` lightest
- Weighted mean formula produces expected aggregates (all-ones → 1.0, all-zeros → 0.0, a worked mixed case)
- Input validation (reject out-of-range >1.0 / <0.0, reject missing dimension → `InvalidScoreError`)
- Retrieval sanity check (downgrades when over-claiming; no-op when top score high; no-op when cites_policy already low)
- Flagging triggers (aggregate below threshold; cites_policy floor even if aggregate high; LLM reason set)
- Combined review reasons mention all fired triggers
- Service contract shape (`score`, `dimensions`, `needs_review`, `review_reason`, `triggers_fired`)
- **Plus** the extreme-over-claim interaction worth an explicit test (plan §8): a downgrade that pushes `cites_policy` from 1.0 to 0.4 then fires the `cites_policy_below_floor` trigger.

**Two TODO assertions in the plan's test file (§9 Part A) — fill them in, don't leave them:**
- **TODO ①** (≈ line 482): `assert result.needs_review is False` — edge case: aggregate exactly at threshold (strict `<`, so 0.6 is NOT flagged)
- **TODO ②** (≈ line 492): `assert result.needs_review is True` — cites_policy floor trigger

`tests/test_summary.py` (~6 tests — Plan 8 §2 + §7):
- `test_count_flagged_questions`, `test_all_flagged_emits_banner`, `test_some_flagged_no_banner`, `test_zero_flagged_no_banner`, `test_summary_includes_total_cost`, `test_summary_includes_total_tokens`

### Module structure

**`app/confidence/aggregator.py`** — the core scalar:
- Constants: `WEIGHTS`, `AGGREGATE_THRESHOLD`, `CITES_POLICY_FLOOR`, `TOP_CHUNK_SCORE_THRESHOLD`, `OVER_CLAIM_PENALTY`
- `InvalidScoreError` exception
- `AggregatedConfidence` dataclass: `score`, `dimensions`, `needs_review`, `review_reason`, `triggers_fired`
- `aggregate_confidence(self_score, top_chunk_score, llm_review_reason)` — entry point (returns `AggregatedConfidence`; this IS an object, so `confidence.score` etc. is correct)
- Helpers: `_validate_self_score`, `_apply_retrieval_sanity_check`, `_compute_weighted_mean`, `_determine_flags`, `_build_review_reason`

**`app/confidence/summary.py`** — the ISQ-level roll-up (the plan defines this in §7 but names no module; put it here, beside the aggregator):
- `ISQSummary` dataclass: `total_questions`, `flagged_count`, `flagged_question_indices`, `average_confidence`, `total_cost_usd`, `total_tokens_in`, `total_tokens_out`, `total_latency_ms`, `banner`
  - **`average_confidence`** (added): `float` — mean of the per-question `AggregatedConfidence.score` values; exclude failed questions (`confidence=null`) from the mean. Feeds the rendered summary sheet / canonical JSON, and the stretch dashboard's "avg conf" stat.
  - **Field name + dashboard forward-ref:** `flagged_question_indices` is the canonical producer name and holds **1-based** question numbers. The stretch dashboard mock (`design/design_handoff_isq_agent/designs/prototype-hybrid/data.js`) reads the same field as `flagged_indices` and expects a nested `confidence.{score, dimensions, needs_review, review_reason}` per answer — reconcile that naming + flat-vs-nested shape in the **future Next.js dashboard plan** (a thin adapter), **not** in Plan 8 code. Plan 8's nested `response_model` shape stays as specified below.
- `determine_banner(...)` → `"all_flagged" | "all_failed" | None`
  - **Design gap to resolve (plan §8):** the plan's §7 `determine_banner(flagged_count, total)` signature **cannot emit `all_failed`** — it has no failed-count input. The plan §8 edge-case table requires a SECOND banner `"all_failed"` (fired when every question failed generation, distinct from `"all_flagged"`). Decide the cleanest fix — e.g. `determine_banner(flagged_count, failed_count, total)` — and write a test for both banner types.

### `app/api/answer.py` — wire confidence in + introduce a Pydantic response model (DECIDED: Pydantic)

**Today** (`app/api/answer.py:91`) the endpoint returns a PLAIN DICT — `return {"question_id": payload.question_id, **result}`, typed `-> dict[str, Any]` — where `result` is the dict from `AnswerGenerator.generate()` (keys: `answer`, `citations`, `self_score`, `needs_review_reason`, `metrics`). There is **no response model** and **no `confidence` key** yet; the live contract is flat.

**Plan 8 decision (Tom, 2026-05-29):** introduce a typed Pydantic **`response_model`** for `/answer`. This makes the nested `confidence` object a real type, gives FastAPI auto-generated OpenAPI/Swagger docs at `/docs`, and validates the output shape at the boundary — killing exactly the implicit-dict drift this handoff had to correct. The request model `AnswerRequest` already lives inline in this file; put the response models alongside it.

**The trick — keep the dict, add the model:** set `response_model=` on the decorator but **still `return` a plain dict** from the handler. FastAPI coerces + validates the dict against the model, so you keep the ergonomic dict return *and* get the typed contract + docs, without constructing the model by hand or touching the generator.

```python
from typing import Any
from pydantic import BaseModel
from app.confidence.aggregator import aggregate_confidence


class ConfidenceModel(BaseModel):
    score: float
    dimensions: dict[str, float]
    needs_review: bool
    review_reason: str | None


class AnswerResponse(BaseModel):
    question_id: str | None
    answer: str
    citations: list[dict[str, Any]]
    confidence: ConfidenceModel
    metrics: dict[str, Any]


@router.post("/answer", response_model=AnswerResponse)
def answer_question(payload: AnswerRequest, request: Request, response: Response) -> AnswerResponse:
    ...
    # after `result = AnswerGenerator().generate(...)` returns its dict, and you have `chunks`:
    confidence = aggregate_confidence(
        self_score=result["self_score"],                       # DICT subscript — generate() returns a dict
        top_chunk_score=chunks[0]["score"] if chunks else 0.0, # top-level "score" key on chunk dicts
        llm_review_reason=result["needs_review_reason"],
    )
    # Return a plain dict — FastAPI validates + filters it against AnswerResponse:
    return {
        "question_id": payload.question_id,                    # kept top-level (echo test depends on it)
        "answer": result["answer"],
        "citations": result["citations"],
        "confidence": {
            "score": confidence.score,                         # AggregatedConfidence is an object — attr access OK
            "dimensions": confidence.dimensions,
            "needs_review": confidence.needs_review,
            "review_reason": confidence.review_reason,
        },
        "metrics": result["metrics"],
    }
```

Notes:
- **`response_model` filters the output** to exactly the model's fields, so the now-redundant top-level `self_score` / `needs_review_reason` are dropped automatically (matching plan §6's canonical JSON) — no manual stripping. This is the deliberate, documented breaking change to Plan 7's flat contract.
- **Output validation is real:** if the handler returns a dict missing a required field (or with a wrong type), FastAPI raises `ResponseValidationError` (HTTP 500) at the boundary instead of shipping a malformed body. That's the safety upgrade over `dict[str, Any]`.
- `result` is still a **dict** — read its fields as `result["answer"]`, NOT `result.answer`. Only the aggregator's own `AggregatedConfidence` return is an object (so `confidence.score` is right).
- **Consistency call:** `/extract-questions` still returns a plain dict. Recommend backfilling a `response_model` there in the **same PR** (it's a few lines) so the service is uniformly typed — a nicer hiring signal than one endpoint being the odd one out. If you'd rather keep Plan 8 tight, leave a one-line follow-up note so it reads as a deliberate staged choice, not an oversight.

### `tests/test_answer_endpoint.py` — what BREAKS and must be updated (same commit)

Adding the `response_model` doesn't change the JSON the client sees beyond folding scores into `confidence`, so the existing TestClient mocks (`_setup`, `_canned`) still work — but two assertions gate the change:
1. **Line 98** — `assert "citations" in body and "self_score" in body and "metrics" in body`. The `response_model` filters `self_score` out of the body, so `"self_score" in body` becomes False. Change to e.g.:
   ```python
   assert "citations" in body and "confidence" in body and "metrics" in body
   assert {"score", "dimensions", "needs_review", "review_reason"} <= set(body["confidence"])
   ```
2. **Line 138** — `test_answer_endpoint_echoes_question_id` asserts `body["question_id"] == "sun-q02"`. `question_id` stays top-level in `AnswerResponse` (the snippet keeps it) so this passes — just confirm it.
3. Add at least one new endpoint test asserting the `confidence` sub-shape, matching the house pattern.
4. The `_canned()` happy-path fixture (self_score all ~1.0, top chunk score 0.9) yields `needs_review=False` — so the 200 test can also assert `body["confidence"]["needs_review"] is False`.

### House test conventions (mirror these in the new files)
- **No `conftest.py`** exists — fixtures are per-file. The only fixture is `client` (a function-scoped `TestClient` with `from app.main import app` imported *inside* the fixture).
- **Imports-under-test go inside each test function** (e.g. `from app.confidence.aggregator import aggregate_confidence`) — so a missing module fails as `ModuleNotFoundError` at that test's collection: the deliberate red-phase signal.
- **Patch at the consumer import site:** `@patch("app.api.answer.AnswerGenerator")` / `@patch("app.api.answer.Retriever")` (decorators apply bottom-up, so the signature is `(mock_retriever, mock_generator, client)`).
- **Module-level builder helpers** with keyword-only overrides (`_canned`, `_setup`, `_chunk`, `_mock_anthropic_submit_answer`) returning plain dicts. `test_confidence.py` is pure-unit — needs **no** client fixture. `test_summary.py` should build a list of `_canned()`-style per-question result dicts.
- One-line contract docstring per test; plain `assert`; `set(x) >= {...}` for superset checks; `pytest.raises(InvalidScoreError)` for validation.
- Default fixtures already supply the four dimension keys (`_canned()` self_score = `{cites_policy:1.0, on_topic:1.0, vendor_tone:0.95, complete:1.0}`, `needs_review_reason:None`) and a top-level chunk `"score": 0.9` (≥ 0.7, so the sanity check is a no-op on the happy path). To exercise the over-claim downgrade in an endpoint test, pass `chunks=[{..., "score": 0.6}]` via `_setup`'s `chunks=` kwarg with a result whose `cites_policy >= 0.9`.

### Plan 8 git execution (CORRECTED)

**Branch: `feature/confidence-and-flagging`.** (The plan contradicts itself — §9/§11 say `feature/confidence-aggregator`, the bottom "Git execution block" says `feature/confidence-and-flagging`. Use the latter: it matches the plan title, the canonical execution block, and the scope now includes the summary work, not just the aggregator.)

Commits in order (test-then-impl separation per TDD; stage explicitly):
1. `test(confidence): add failing tests for hybrid confidence aggregator` — `tests/test_confidence.py` (red). Verify: `pytest tests/test_confidence.py -v` → `ModuleNotFoundError`.
2. `feat(confidence): add weighted-mean aggregator with retrieval sanity check` — `app/confidence/aggregator.py` (aggregator tests green).
3. `test(confidence): add failing tests for ISQ-level summary` — `tests/test_summary.py` (red).
4. `feat(confidence): add ISQSummary and banner determination` — `app/confidence/summary.py` (summary tests green).
5. `feat(api): wire confidence into /answer with a typed response model` — `app/api/answer.py` (adds `ConfidenceModel` + `AnswerResponse` + `response_model=`, calls the aggregator) + `tests/test_answer_endpoint.py` updates (line-98 assertion + new confidence-shape test land here). If backfilling `/extract-questions` for consistency, do it as a separate `refactor(api): add response model to /extract-questions` commit in the same PR.

Then `ruff check . && ruff format .` → push → open PR → **run `/code-review:code-review` on the OPEN PR** → address findings → squash-merge + delete branch. After merge: tag `v0.4.0`.

### Verification
- **Tests:** `cd rag-service && source .venv/bin/activate && pytest -v` — baseline is **112**; expect ~28 new across `test_confidence.py` (~22) + `test_summary.py` (~6), so roughly **~140** green (approximate).
- **Lint:** `ruff check . && ruff format --check .`.
- **Matrix guard:** `pytest tests/test_isq_prompts_no_matrix_leakage.py -v` green.
- **Live smoke (needs the index populated — see below):**
  ```bash
  curl -X POST localhost:8000/answer -H "X-Request-Id: smoke-conf-q01" \
    -H "Content-Type: application/json" \
    -d '{"question":"Do you maintain a formal Information Security Policy?","index":1,"total":20}'
  # expect: confidence.{score, dimensions, needs_review: false, review_reason: null}

  curl -X POST localhost:8000/answer -H "X-Request-Id: smoke-conf-ot" \
    -H "Content-Type: application/json" \
    -d '{"question":"How is privileged access to operational technology (OT) controlled?"}'
  # expect: needs_review: true, review_reason mentions OT scope mismatch
  ```

### Edge cases to honour (Plan 8 §8)
- **Aggregate exactly 0.6 / cites_policy exactly 0.5** → NOT flagged (strict `<`). (These are the two test TODOs.)
- **All four dimensions 0.0** → aggregate 0.0, flagged on all three triggers, review_reason mentions all.
- **LLM set a review reason AND aggregate is high (0.9)** → still flagged (LLM's judgement wins).
- **Single-question generation failure** (Anthropic 503 after retries): that one question gets `confidence=null`, `needs_review=true`, `review_reason="generation failed"` — the other questions proceed. (Don't abort the whole run.)
- **All questions fail generation** → `ISQSummary.banner = "all_failed"` — a SECOND banner type, distinct from `"all_flagged"`. This is the design gap noted above: `determine_banner` needs a way to know how many *failed* (not just how many flagged).

### Propagation contract for Plan 9 (locked, §6)
`AggregatedConfidence` (`score`, `dimensions`, `needs_review`, `review_reason`, `triggers_fired`) is the handoff point for Plan 9's renderers. Each per-question result dict gets enriched with this confidence object before being passed to the DOCX / PDF / XLSX / JSON renderers.

## What you (Tom) need to do — the index prerequisite

Plan 8 builds and unit-tests **without** a populated index (everything's mocked). The index is only needed for the **live** smoke test/demo. When you want to run live, populate Pinecone (~70 vectors). This is your action — it's billable (Voyage embeddings) and writes to your Pinecone.

**Before you run `POST /index`**, set `VOYAGE_API_KEY` in the repo-root `.env` (you hit "No API key provided" for it on the last attempt). Then:

```bash
cd rag-service && source .venv/bin/activate
uvicorn app.main:app --reload          # terminal 1
# terminal 2:
curl -X POST http://localhost:8000/index -H "Content-Type: application/json" -d '{"force_reindex":true}'
# expect: {"status":"indexed","chunks_indexed":~70,"documents_indexed":9,...}
```
(Indexes the 6 policies + 3 historical ISQs; the inbound questionnaires are inputs, not indexed.) Run it any time before the live smoke test — it doesn't block building Plan 8.

## What's NOT done / open decisions

- **Pinecone not yet populated** (see above; needs `VOYAGE_API_KEY`).
- **`all_failed` banner design** — `determine_banner` needs a failed-count signal (decide the signature during Plan 8).
- **Output rendering** (Plan 9): DOCX, filled PDF/XLSX, JSON. The `AggregatedConfidence` dataclass is the handoff point.
- **Demo script** (Plan 10): end-to-end orchestrated flow.
- **Submission** (Plan 11): README polish, final walkthrough prep.
- **`IMPLEMENTATION_PLAN.md` is stale** (pinned at Plan 4) — refresh if you run the Ralph loop.

## Acknowledge before proceeding

Respond with:
1. Confirmation of which files you've read (`CLAUDE.md`, `plans/plan-08-confidence-and-flagging.md`, `plans/git-conventions.md`, `plans/implementation-chat-prompt.md`).
2. A summary of the concrete next step (the first Plan 8 TDD slice — `tests/test_confidence.py`).
3. Confirmation that you've clocked the two gotchas: (a) `AnswerGenerator.generate()` returns a **plain dict** — read its fields as `result["self_score"]`, NOT `result.self_score` (only the aggregator's `AggregatedConfidence` return is an object); (b) Plan 8 introduces a Pydantic `response_model=AnswerResponse` on `/answer` — set it on the decorator but still return a dict; the model filters out top-level `self_score` (so update `test_answer_endpoint.py` line 98) and `question_id` stays top-level.

Don't just say "ready" — prove understanding by summarising back. Keep Tom's small-actionable-steps preference in mind (he has ADHD; confirm direction before going deep).

---

**End of brief. Paste everything from "# ISQ Agent — Implementation Brief (Plan 8 onward)" downward into the new chat.**
