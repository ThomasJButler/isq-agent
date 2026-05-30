# Security Review

This is an honest review of the ISQ Agent's threat surface. I read the code before writing it, so everything below is something I checked in the source, not a wish-list. Where a control isn't there, I say so plainly.

## 1. Threat model

The RAG service (`rag-service/`, FastAPI on `:8000`) is an internal service. It sits behind n8n on a private network and has no authentication of its own. The trust boundary is the network: n8n is the only thing meant to call it, and the deployment assumption is that nothing untrusted can reach `:8000` directly. That assumption is doing a lot of work, so it's called out again under known limitations.

The untrusted inputs are the questionnaire content and the question text. A supplier ISQ arrives as a file (PDF / DOCX / XLSX), gets turned into text, and that text plus each extracted question flows into a Claude prompt. So the realistic attack vectors are: prompt injection via question or document text, malformed or oversized files, and anything that drives up cost or knocks the service over. The API keys (Anthropic, Voyage, Pinecone) are the main secrets worth protecting.

## 2. What was checked, and what I found

### Prompt injection

Question text is treated as **data, not instructions**. In `app/core/isq_prompts.py`, `build_answer_user_prompt` drops the question into a `QUESTION:` line in the user turn, and the rules live in a separate, constant system block (`ANSWER_SYSTEM_PROMPT`). The system prompt is strict: use only the provided SOURCES, don't invent claims, set a review reason if nothing supports the answer. Same shape for extraction (`EXTRACTION_SYSTEM_PROMPT`).

Both the extractor and the generator force a tool call (`tool_choice` pins `extract_questions` / `submit_answer`), so the model has to return schema-valid JSON. There's no free-text parsing to trick, and a refusal or missing tool block is handled (flagged for review) rather than crashing or fabricating.

The **citation lint does catch fabricated source_ids**. In `app/rag/generator.py`, after the model returns, the code builds the set of IDs it actually provided and checks every citation against it:

```python
provided_ids = {c["id"] for c in chunks}
hallucinated = [c.get("source_id") for c in citations if c.get("source_id") not in provided_ids]
if hallucinated:
    logger.warning("Citations not in provided chunks: %s", hallucinated)
    self_score["cites_policy"] = max(0.0, self_score.get("cites_policy", 0.0) - 0.2)
```

So a made-up citation gets logged and docks the confidence score. It's a soft penalty, not a hard reject, but it does flag the dishonest answer rather than passing it through clean.

Worth being honest about: these mitigations are bounded. A crafted question can't escape the tool schema or invent a citation that survives the lint, but it could still steer the *wording* of an answer within the rules. The defence is the human review gate (low-confidence answers get flagged), not a guarantee the model can never be nudged.

### File-upload handling

The knowledge-base side is tightly scoped. `app/api/index.py` only walks two named subdirectories (`KB_SUBDIRS`) and only accepts `.pdf` / `.docx` (`SUPPORTED_SUFFIXES`). `app/utils/document_processor.py` validates the suffix and raises `ValueError` on anything else. A file it can't classify as policy or historical_isq fails the run loudly (422) instead of being guessed at. Extraction errors are wrapped in `DocumentProcessingError`, not leaked raw.

The upload path is `POST /render` in `app/api/render.py`, which accepts an optional source XLSX. Two gaps here:

- **No file-size limit.** The handler does `fh.write(await source.read())`, which reads the whole upload into memory. A large file would be read in full before anything pushes back. On an internal service that's a lower-severity issue, but it's a real gap and it's listed in the limitations.
- **No upload content-type / suffix check** on that source file before it's handed to the XLSX renderer. It trusts the caller to send a workbook.

Cleanup is handled properly: each render writes to a fresh `tempfile.mkdtemp` dir, and the temp dir is removed by a `BackgroundTask(shutil.rmtree, ...)` after the `FileResponse` has streamed. So temp files don't pile up.

### No-auth internal service and CORS

Confirmed: `app/main.py` restricts CORS origins to exactly `http://localhost:5678` and `http://n8n:5678`. It is **not** `"*"`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5678", "http://n8n:5678"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=True,
)
```

Methods are limited to GET/POST. `allow_headers` is `"*"`, which is broad but isn't an origin control. There's no auth layer (no API key, no token check) on any route, which is by design for an internal service but is the single biggest assumption here.

### Error handling

No stack traces or internal paths leak to clients on the main pipeline. `app/api/answer.py`, `extract.py` and `process.py` catch upstream failures and return fixed, generic messages ("temporarily unavailable", "failed due to an upstream error") while logging the real exception server-side with `exc_info=True`. Transient failures (Anthropic / Voyage / Pinecone outages) map to 503 so n8n retries; permanent ones map to 502 so n8n doesn't retry-storm. There's no global exception handler, so any *uncaught* error falls back to FastAPI's default 500 with a generic body (no traceback in the response).

Two smaller leaks of internal detail, both low severity because the caller is internal:

- `render.py` puts the raw `JSONDecodeError` string into the 400 detail (`f"Malformed envelope JSON: {exc}"`). That's parser internals, not a secret, but it's the most detailed thing returned to a caller.
- `index.py` echoes the offending filename in a 422 detail. Filenames aren't sensitive here, but it is internal info.

Nothing logs the question text, request bodies, or API keys. Startup logging in `main.py` prints model and index names only, no secrets.

### Cost and DoS

Per-question metrics are tracked everywhere (tokens in/out, cost_usd, latency_ms in both the generator and extractor), so a run's cost is visible rather than a black box. Prompt caching on the static system block keeps questions 2..N of a run cheap.

Failure isolation is properly built in `app/api/process.py`: `_answer_one` wraps each question in a try/except, and a question that blows up gets a `confidence=None` entry while the rest of the questionnaire finishes. A flaky question becomes a visible "needs review" line, not a crashed run, and the failure is logged via `logger.exception`, never swallowed.

The gap: there's **no hard cap** on how many questions `/process-questionnaire` will loop over. The extractor's `large_questionnaire` is only a *warning* baked into the prompt (`isq_prompts.py`), not an enforced limit. So a 5,000-question payload would just run 5,000 LLM calls and rack up cost. Combined with no auth and no upload size limit, the cost ceiling depends entirely on n8n being the only caller.

### Secrets at rest

- `.env` is gitignored (`.gitignore` lines 2-4) and is **not** tracked (`git ls-files` shows only `.env.example`).
- `.env.example` carries variable **names and placeholder formats only** (`sk-ant-...`, `pcsk-...`, `pa-...`), no real keys.
- Keys are loaded via pydantic-settings in `app/core/config.py` and read from the environment. No key is hard-coded in source, and none is written to logs.

## 3. Automated tooling

These three were run as part of the v1.0 pre-tag gate. The results below are from the actual runs, not placeholders.

- **gitleaks** (working tree: `gitleaks detect --source . --no-git`, **and** full history: `gitleaks detect --source .`) - catches any secret in the tree or anywhere in git history, in case a key was ever committed and reverted.
  - Result: **full history clean** (141 commits scanned, no secrets). The working-tree scan flags 3, and all three are in the local `.env` (generic API keys on lines 8 and 19, the Anthropic key on line 13). `.env` is gitignored and has never been committed, which the clean history scan confirms, so nothing secret ships in the repo.
- **pip-audit** (`pip-audit -r rag-service/requirements.txt`) - known CVEs in the pinned dependencies. Note Pinecone is pinned to v5 deliberately (v6 has breaking changes); if v5 carries an advisory, the trade-off gets documented rather than blindly bumped.
  - Result: **27 known CVEs across 4 packages**: pypdf 4.3.1 (22, all fixed in the 6.x line), langchain-text-splitters 0.3.11 (fix 1.1.2), starlette 0.46.2 (3, pulled in transitively by FastAPI), and pytest 8.4.2 (1, dev-only). Every fix needs a major-version bump that crosses our pinned ranges and would need the full suite re-validated, so for the v1.0 cut they're documented and scheduled for v1.1 (see `v1.1-backlog.md`) rather than bumped blind hours before submission. The exposure is bounded: the service is internal and behind n8n, and the riskiest surface (pypdf parsing) handles semi-trusted supplier documents, not open-internet input.
- **bandit** (`bandit -r rag-service/app`) - common Python security anti-patterns (unsafe tempfile use, subprocess, eval, and the like).
  - Result: **clean** - 0 issues at every severity (low, medium, high) across `rag-service/app`.

## 4. Known limitations

Being straight about what this does not do:

- **No authentication.** Any route is open to anything that can reach `:8000`. The whole security posture rests on the service being network-isolated behind n8n. If that boundary is wrong, everything else is moot.
- **Prompt-injection mitigations are bounded.** Question text is data, the schema is forced, and fabricated citations are flagged, but a crafted question can still influence answer wording within the rules. The human review gate is the real backstop.
- **Question cap (added in v1.1 — §5).** `/process-questionnaire` rejects more than `MAX_QUESTIONS` (default 50) with a 413 before any retrieval or generation. (Was unlimited in v1.0; `large_questionnaire` was only a prompt warning.)
- **Upload-size cap (added in v1.1 — §5).** `POST /render` rejects a source workbook over `MAX_UPLOAD_MB` (default 10) with a 413 before reading it. The source's content-type is still trusted.
- **Minor internal detail in two error paths** (the render JSON parse error, the index filename). Low risk for an internal caller, not zero.
- **CORS `allow_headers` is `"*"`.** Origins and methods are locked down; headers aren't. Not an origin bypass, but broader than it needs to be.
- **Dependency CVEs (pip-audit).** 27 known advisories sit in pinned deps, mostly pypdf 4.3.1 (22, parsing/DoS-style bugs). The fixes are major-version bumps deferred to v1.1 (see the backlog), bounded by the internal, single-caller deployment.

None of these were show-stoppers for the internal, single-caller v1.0 deployment. v1.1 changes the picture — the service is now hosted and public — so the most pressing of them (no question cap, no upload limit, no rate limiting) are addressed below.

## 5. v1.1 update — cost controls for the hosted, public deploy

v1.0's posture assumed an internal service behind n8n. v1.1 puts it on a **public** footing: the Next.js dashboard (Vercel) calls the FastAPI backend (Render) directly from the browser, and the hosted instance is **free to use with no per-user key** — the operator's keys live in the backend environment. That relaxes the "only n8n can reach it" assumption, so the no-auth gap is now fenced by app-side cost controls plus a provider-side backstop:

- **Per-IP rate limiting (slowapi).** Every public POST is limited per client IP and returns a clean `429`: `/process-questionnaire` at 5/min (it fans out into many LLM calls), `/answer`, `/extract-questions` and `/render` at 30/min. Tunable via `RATE_LIMIT_DEFAULT` / `RATE_LIMIT_HEAVY`.
- **Question cap.** `/process-questionnaire` rejects more than `MAX_QUESTIONS` (default 50) with a `413` before any LLM call — one upload can't fan out into thousands of generations.
- **Upload-size cap.** `/render` rejects a source workbook over `MAX_UPLOAD_MB` (default 10) with a `413`.
- **CORS** is env-driven (`ALLOWED_ORIGINS`) so only the deployed dashboard origin is allowed, never `*`.
- **Provider backstop.** The Anthropic key runs in a dedicated workspace with its own rate limits (the default Sonnet tier generous, Opus fenced tight, web search disabled) and a hard **monthly spend cap** — the ceiling that bounds total cost no matter what gets past the app layer.

These layer up: the app caps + rate limit stop abuse cheaply with friendly errors; the workspace rate limits cap burst throughput; the monthly spend cap is the hard wallet ceiling.

**Residual, by design (free public demo):** runs are addressable by `run_id` with no per-user auth, so anyone holding a run's id can fetch it. The ids are unguessable (a slug plus a random suffix) and runs are ephemeral in memory, and the corpus is a fictional company, so this is an accepted trade-off for an open demo — not a model for handling real customer data, which would need authentication.
