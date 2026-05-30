# Technical walkthrough

The seven points the brief asks you to demo and explain, in one place, with pointers to the code.
Companion to [`architecture.md`](architecture.md) (the diagram + the five core design decisions),
[`performance-optimisation.md`](performance-optimisation.md) (the perf case study), and
[`requirements-coverage.md`](requirements-coverage.md) (every requirement → evidence).

## 1. Workflow architecture and design decisions

**Two tiers.** An **n8n orchestration layer** drives the flow; a **FastAPI `rag-service`** is the
AI engine it calls over HTTP. n8n (or OneReach, or any workflow tool) handles "a file arrived →
answer it → return documents"; the service owns extraction, retrieval, grounded generation,
confidence scoring and rendering. The boundary is one HTTP contract, which keeps the workflow
simple and the engine independently testable (~280 tests). The deployed Next.js dashboard is the
shipped, fully-run front door over the same service; the n8n workflow ([`n8n/`](../n8n/)) is the
importable orchestration tier.

The five design decisions that matter most (detail in `architecture.md`): the two-tier split;
**hybrid confidence** (model self-score + a retrieval sanity check); **source weighting applied in
code, before the score floor**; **deterministic vector IDs** so re-indexing is idempotent; and an
`X-Request-Id` the service echoes on every response for traceability (the dashboard threads it end
to end; the n8n scaffold doesn't forward it yet).

## 2. How documents are processed and analysed

`app/utils/document_processor.py` extracts text by type: **PDF** via `pypdf` (all pages), **DOCX**
via `python-docx`, **XLSX** via `openpyxl` (rows flattened to text). The text is split by
`app/utils/chunking.py` into **~500-character chunks with 50-character overlap**, section-aware so a
chunk doesn't cut mid-heading. Each chunk is embedded by **Voyage `voyage-3-large` (1024-dim)** in a
single batched call, and upserted to **Pinecone** with **deterministic IDs derived from the
filename + chunk index** — so re-indexing the same corpus replaces in place with no orphans. Metadata
on each vector (`source`, `source_type`, `section_title`, `page`, …) is what later powers source
weighting and human-readable citations. This is the `POST /index` pipeline; it runs once over the
Northstar policies + historical ISQs.

## 3. How relevant information is identified

Per question (`app/rag/retriever.py`): the raw question is **rewritten** into a richer retrieval
query (acronym + policy-vocabulary expansion, on fast Haiku) so the right policy chunk surfaces;
that query is embedded by Voyage; Pinecone returns the nearest chunks **unfiltered**; then **source
weighting** is applied **in code** — policies ×1.0, historical ISQs ×0.95 — and only **after** that
is the **`min_score` 0.5 floor** applied, keeping the top **5**.

Two deliberate orderings: weighting **before** the floor means a down-weighted historical answer
that falls under threshold is honestly dropped rather than scraping in; and weighting **in code, not
in the embeddings** keeps the policy-first preference visible and tunable instead of hidden in
vector space.

## 4. How AI-generated answers are produced

`app/rag/generator.py`: **one Claude call per question**, with a forced `submit_answer` tool call so
the model must return schema-valid JSON — the answer, the citations it used, and an honest
four-dimension self-score. The system prompt is strict: **use only the chunks provided, prefer
policies over old answers, never invent, score yourself.** The static rules + worked examples are
marked for **prompt caching**, so questions 2..N of a run re-read them cheaply. A **citation lint**
then **docks the grounding score** (a fixed −0.2 on the `cites_policy` dimension) for any
`source_id` the model cited but wasn't actually handed — the citation still shows, but the answer is
pushed toward the review flag, a second line of defence against invented citations. The generation
model is **selectable** (Sonnet 4.5/4.6, Opus 4.7/4.8, Haiku 4.5); query rewriting always stays on
Haiku.

## 5. How unsupported or low-confidence answers are handled

The honest core of the product. Confidence (`app/confidence/`) is **hybrid**: the model's
self-score combined with a retrieval sanity check, across **four weighted dimensions** —
`cites_policy` (0.40), `on_topic` (0.25), `vendor_tone` (0.20), `complete` (0.15). An answer is
**flagged for review** on any of **three triggers**: aggregate < 0.6, `cites_policy` < 0.5, or the
model itself raising a review reason. Grounding is weighted heaviest because for an audit tool the
worst failure is a confident, ungrounded claim.

The failure paths are deliberate, not accidental: a question with **no chunks above the floor**
returns a deterministic "we can't answer this from our published policies, please contact us" —
never an invention — and is flagged. A question whose generation **throws** becomes a
null-confidence entry that still appears, flagged, so the run completes rather than crashing. Real
example: uploading an OT/SCADA questionnaire to a software-only company flags those questions
("Northstar doesn't operate OT environments") instead of bluffing. The weights and thresholds are
public in the code, so the bias is auditable.

## 6. Limitations and trade-offs

- **n8n is an importable scaffold, not a fully-run path.** Verified to import; the deployed
  dashboard is the fully-run front door over the same engine. (See `requirements-coverage.md`.)
- **Runs are in-memory.** The run store is a bounded in-process cache; a restart loses history.
  Fine for the demo; a real deploy would use a database.
- **No auth between tiers.** Security rests on network isolation + the cost guards (rate limit,
  question cap, ASGI body cap). A production deploy would add an internal API key.
- **The model picker is honest now but the cost tile is indicative.** It's priced at the per-model
  rate but labelled "indicative" during a run.
- **Prompt + few-shot examples are a first version** — a curated set would sharpen the rarer
  question types. **Pinned dependencies** carry CVEs that want a coordinated major-version bump.
- **Concurrency trade-off:** answering in parallel writes the prompt cache a few times on the first
  batch (a small one-off cost) for a large latency win.

## 7. Improvements given more time

- **Sub-10s answering** — raise concurrency, batch the retrieval embeds, stream per-question
  progress to the UI so the processing screen reflects real state. (See `performance-optimisation.md`.)
- **A reranker** so fewer, better chunks reach the prompt; **extended-thinking second pass** for the
  flagged questions only.
- **Finish + run the n8n flow end to end**, and add the email / webhook / cloud-folder triggers.
- **Citation → human-readable policy reference** mapping (chunk id → "ISP §4.2") for reviewers.
- **An eval harness** scoring against a known-good set, so retrieval + prompt changes are measured,
  not eyeballed. Full list in [`v1.1-backlog.md`](../v1.1-backlog.md).
