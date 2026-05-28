# IMPLEMENTATION_PLAN.md — Plan 4 Knowledge Base + Retrieval

## Current status summary and code review

**Git status:**
- Current branch: `feature/chunking-and-processor`
- Latest commit on branch: `8746fad` — test+feat(processor): add document processor with pdf/docx/xlsx support
- Working tree: clean for slice files (document processor committed)
- Recent PRs: #1 (Voyage client), #2 (FastAPI scaffold)

**Runtime state:**
- FastAPI app operational (GET /, GET /health, router stubs for /answer and /index)
- Voyage client ready (embed_query, embed_documents with cost tracking)
- Pinecone index `isq-agent-knowledge` created but empty (0 vectors)
- Source corpus ready: 6 policy PDFs + 3 historical ISQ files in `source-corpus/` (gitignored)

**Test coverage:**
- 4 smoke tests for FastAPI scaffold (passing)
- 8 tests for chunking module (written, committed)
- 6 tests for document processor (written, committed, **6/6 passing**)
- 8 tests for Pinecone client (6 original + 2 for describe_stats/delete_all, **8/8 passing**)
- 5 tests for /index endpoint (written, **5/5 passing**)
- **Full suite: 31/31 passing**

**Latest validations:**
- `pytest tests/test_index_endpoint.py -v` — 5/5 passing (TDD red→green confirmed)
- `pytest tests/test_pinecone_client.py -v` — 8/8 passing (added describe_stats + delete_all)
- `pytest -v` (full suite) — 31/31 passing, no regressions
- `pytest tests/test_document_processor.py -v` — 6/6 passing (ran in `.venv`, Python 3.14)
- `pytest tests/test_main_smoke.py -v` — 4/4 passing
- `uvicorn app.main:app` — server starts, structured JSON logging works, no secrets logged
- `curl http://localhost:8000/` — returns service metadata
- `curl http://localhost:8000/health` — returns {"status": "ok"}

**Highest-risk open findings:**
- EPERM Bash permission blocker no longer reproduces (resolved 2026-05-28); pytest runs cleanly inside `.venv`
- Branch A implementation complete: chunking ✅, document processor ✅ (both committed + validated)
- Branch A remaining steps are manual git ops (push, PR, squash-merge) — out of scope for the auto-loop
- Branches B and C still pending

## Active phase

Branch B — Pinecone Indexer (TDD-first). Pinecone client ✅ and `/index` endpoint ✅ complete + validated. Branch B code is done; remaining Branch B steps are the live smoke test (needs API keys) + manual git ops. Next code slice is **Branch C** (query rewriter + retriever).

## Ordered checklist

### Branch A (feature/chunking-and-processor)

- [x] Checkout branch: `git checkout -b feature/chunking-and-processor`
- [x] Write `rag-service/tests/test_chunking.py` (8 test cases from plan-04 Section 2)
  - test_chunk_text_returns_chunks
  - test_chunk_size_respects_max
  - test_chunk_overlap_preserves_context
  - test_chunks_preserve_metadata
  - test_chunking_respects_section_boundaries
  - test_chunking_handles_very_short_text
  - test_chunking_handles_very_long_text
  - test_chunking_assigns_chunk_index
- [x] Run `cd rag-service && pytest tests/test_chunking.py -v` — confirm ModuleNotFoundError (completed in prior loop)
- [x] Implement `rag-service/app/utils/chunking.py`
  - Use RecursiveCharacterTextSplitter from langchain-text-splitters
  - chunk_size=500, chunk_overlap=50
  - separators=["\n\n", "\n", ". ", " ", ""]
  - Return list of dicts with {text, chunk_index, total_chunks, **metadata}
- [x] Run pytest again — confirm all 8 tests pass (completed in prior loop)
- [x] Commit: `git add tests/test_chunking.py app/utils/chunking.py && git commit -m "test+feat(chunking): add chunker with 500/50 sliding window respecting sections"`
- [x] Write `rag-service/tests/test_document_processor.py` (6 test cases from plan-04 Section 2)
  - test_process_pdf_extracts_text
  - test_process_docx_extracts_text
  - test_process_xlsx_extracts_rows
  - test_process_rejects_unsupported_type
  - test_process_handles_corrupted_pdf
  - test_process_preserves_page_numbers
- [x] Run pytest to confirm failures — superseded: implementation already present from prior loop; validation deferred to the pass check below
- [x] Implement `rag-service/app/utils/document_processor.py`
  - PDF: pypdf (PdfReader)
  - DOCX: python-docx (Document)
  - XLSX: openpyxl (load_workbook)
  - Return dict with {text, page_count, pages[]} for PDF
  - Return dict with {text} for DOCX
  - Return dict with {rows[]} for XLSX with question_text/answer_text detection
- [x] Run pytest to confirm all 6 tests pass — **6/6 passing** (EPERM blocker resolved; ran in `.venv`)
- [x] Commit: `test+feat(processor): add document processor with pdf/docx/xlsx support` (commit `8746fad`)
- [ ] Push: `git push -u origin feature/chunking-and-processor`
- [ ] Create PR: `gh pr create --title "feat: chunking and document processor with TDD" --body "..." --base main`
- [ ] Squash-merge via GitHub UI
- [ ] Cleanup: `git checkout main && git pull && git branch -d feature/chunking-and-processor`

### Branch B (feature/pinecone-indexer)

- [ ] Checkout: `git checkout -b feature/pinecone-indexer` — **deferred**: Branch A is not yet merged to main (push/PR/merge are manual, pending), so the Pinecone client slice was committed on `feature/chunking-and-processor` to avoid carrying unmerged Branch A commits into a B branch. Re-establish proper branch separation once Branch A merges.
- [x] Write `rag-service/tests/test_pinecone_client.py` (6 tests — 5 from plan + 1 added for the locked ≤100 batching constraint)
  - test_pinecone_client_initialises
  - test_pinecone_client_handles_missing_index
  - test_upsert_chunks_succeeds (mocked)
  - test_upsert_chunks_batches_over_100 (mocked — guards the 100-vector batch limit)
  - test_query_returns_matches (mocked)
  - test_query_filters_by_min_score
- [x] Run `pytest tests/test_pinecone_client.py -v` — confirmed TDD red phase (AttributeError: `app.core` has no attribute `pinecone_client`)
- [x] Implement `rag-service/app/core/pinecone_client.py`
  - PineconeClient class with upsert_chunks(), query() methods
  - Connects to a named v5 index; raises `PineconeIndexError` if absent
  - Batched upsert (limit 100 vectors per call)
  - `query()` normalises SDK/dict responses to plain dicts and filters by min_score (default 0.5)
  - Note: metadata schema (plan-04 Section 4) + vector IDs are built upstream by `/index` (next slice); the client upserts pre-built `{id, values, metadata}` vectors. Source weighting stays in the retriever (Branch C).
- [x] Run `pytest tests/test_pinecone_client.py -v` — **6/6 passing**; full suite **24/24 passing**
- [x] Commit: `test+feat(pinecone): add pinecone client with batched upsert and min_score filtering`
- [x] Add `describe_stats()` + `delete_all()` to `PineconeClient` (idempotency prereq) with 2 mocked tests — **8/8 passing**
- [x] Write `rag-service/tests/test_index_endpoint.py` (5 tests with TestClient + mocked Pinecone/Voyage/document_processor)
  - test_index_endpoint_returns_200
  - test_index_endpoint_chunks_corpus
  - test_index_endpoint_is_idempotent
  - test_index_endpoint_force_reindex
  - test_index_endpoint_reports_metrics
- [x] Run pytest — confirmed TDD red phase (AttributeError on patch targets / missing client methods)
- [x] Implement `POST /index` in `rag-service/app/api/index.py` — **5/5 passing**
  - Checks Pinecone stats; count > 0 and not force_reindex → "already_indexed"
  - `detect_source_type()` (fails loudly on "unknown"); `discover_corpus_files()` recurses, .pdf/.docx only
  - Per-page chunking for PDFs (accurate page metadata), single-blob for DOCX
  - Builds plan-04 Section 4 metadata schema + stable vector IDs HERE
  - Single batched Voyage embed call; batched Pinecone upsert
  - Returns metrics: status, chunks_indexed, documents_indexed, indexing_time_ms, embedding_tokens_used, estimated_cost_usd
- [x] Run pytest again — **5/5 passing**; full suite **31/31 passing**
- [ ] Run smoke test: `curl -X POST http://localhost:8000/index -d '{"force_reindex":true}' -H "Content-Type: application/json"` — **deferred**: needs live Voyage + Pinecone API keys (out of scope for auto-loop)
- [ ] Verify Pinecone dashboard: ~70 vectors appear — **deferred** (depends on live smoke test)
- [x] Commit: `test+feat(api): implement /index endpoint with force_reindex flag`
- [ ] Push, PR, squash-merge, cleanup — manual git ops

**Deviations recorded during this slice (read before Branch C / live indexing):**
- **Vector IDs:** plan-04 Section 4 specified section-number IDs (`isp-s3-c0`). Section numbers aren't reliably extractable from chunk text, so IDs are page/chunk-based instead: `{short_code}-p{page}-c{idx}` for PDFs, `{short_code}-c{idx}` for DOCX. Still **stable + deterministic** (re-indexing the same corpus regenerates identical IDs → clean upsert replace), which is the property that mattered.
- **`isq_question_text` is always `None`:** the real historical ISQs are PDF/DOCX free text, not Q&A-structured rows. Per-Q&A splitting + populating `isq_question_text` needs a real Q&A parser. For now ISQ docs use the same text/page chunking as policies, tagged `source_type="historical_isq"` (which is what source weighting actually keys on). **Follow-up:** add a Q&A parser to populate `isq_question_text` if retrieval quality on ISQs proves weak (Plan 6/9 eval).

### Branch C (feature/query-rewriter-and-retriever)

- [ ] Checkout: `git checkout -b feature/query-rewriter-and-retriever`
- [ ] Write `rag-service/tests/test_query_rewriter.py` (5 tests with mocked Anthropic)
  - test_rewriter_expands_acronyms
  - test_rewriter_preserves_intent
  - test_rewriter_adds_policy_vocabulary
  - test_rewriter_handles_empty_query
  - test_rewriter_uses_isq_specific_prompt
- [ ] Implement `rag-service/app/rag/query_rewriter.py`
  - System prompt from plan-04 Section 6
  - Use Anthropic client (claude-sonnet-4-5)
  - Return rewritten query string
- [ ] Commit files
- [ ] Write `rag-service/tests/test_retriever.py` (5 tests)
  - test_retriever_uses_rewritten_query
  - test_retriever_returns_top_k_chunks
  - test_retriever_prefers_policies_over_isqs
  - test_retriever_includes_source_metadata
  - test_retriever_handles_no_matches
- [ ] Implement `rag-service/app/rag/retriever.py`
  - Calls query_rewriter → embed via Voyage → query Pinecone → source weighting → filter by min_score
  - Source weighting: policies × 1.0, historical_isqs × 0.95
  - min_score = 0.5
  - top_k = 5
- [ ] Run smoke test in Python shell
- [ ] Commit files
- [ ] Push, PR, squash-merge, cleanup

### Post-merge (v0.1.0 milestone)

- [ ] Checkout main, pull latest
- [ ] Run full test suite: `cd rag-service && pytest -v` (expect ~35 tests passing)
- [ ] Run real indexing: `curl POST /index` (expect ~70 chunks)
- [ ] Verify Pinecone dashboard
- [ ] Tag: `git tag -a v0.1.0 -m "v0.1.0 — RAG core operational (chunking, indexing, retrieval)"`
- [ ] Push tag: `git push origin v0.1.0`

## Notes / discoveries that matter for the next loop

**RESOLVED BLOCKER (2026-05-28):**
- Prior `EPERM: mkdir session-env` Bash permission error no longer reproduces.
- Root cause was environmental (sandbox), not code. pytest runs cleanly with `cd rag-service && source .venv/bin/activate && pytest ...`.
- Document processor validated (6/6) and committed (`8746fad`).

**TDD discipline:**
- Test files written BEFORE implementation (new pattern)
- Each test file should fail with ModuleNotFoundError initially
- Implementation makes tests pass
- Chunking module followed this discipline successfully in prior loop

**Plan 4 constraints:**
- Chunk size: 500 chars (locked, from plan-04 Section 3)
- Chunk overlap: 50 chars
- Metadata schema: see plan-04 Section 4 for full JSON structure
- Source weighting: policies 1.0, historical_isqs 0.95 (plan-04 Section 7)
- min_score: 0.5
- top_k: 5

**Environment:**
- pytest runs from `rag-service/` directory
- Tests use mocks for external APIs (Pinecone, Anthropic, Voyage where needed)
- Source corpus in `source-corpus/` (gitignored, not committed)

**Dependencies to verify:**
- langchain-text-splitters (chunking)
- PyPDF2 or pymupdf (PDF parsing)
- python-docx (DOCX parsing)
- openpyxl (XLSX parsing)
- pinecone-client (vector DB)
- anthropic (query rewriter)

## Next recommended build slice

**Branch B code is complete** (`/index` endpoint 5/5, Pinecone client 8/8, full suite 31/31). Remaining Branch B items are the live smoke test (needs API keys) + manual git ops — both out of scope for the auto-loop. The next code slice is **Branch C — query rewriter** (TDD-first).

Write `rag-service/tests/test_query_rewriter.py` with 5 test cases (mocked Anthropic client — no live calls):
1. test_rewriter_expands_acronyms — "MFA" → "multi-factor authentication" in output
2. test_rewriter_preserves_intent — original topic preserved
3. test_rewriter_adds_policy_vocabulary — output includes policy-doc terms
4. test_rewriter_handles_empty_query — empty string → empty string, NO LLM call
5. test_rewriter_uses_isq_specific_prompt — system prompt mentions "security questionnaire" or similar

After writing, run `source .venv/bin/activate && pytest tests/test_query_rewriter.py -v` and confirm the TDD red phase (no `app/rag/query_rewriter.py` yet). Then implement per plan-04 Section 6:
- `QueryRewriter` class using the Anthropic client (model `claude-sonnet-4-5` from `settings.anthropic_model`)
- System prompt verbatim from plan-04 Section 6 (acronym expansion, policy vocabulary, output-only-the-query rule)
- Short-circuit empty/whitespace queries → return "" without any LLM call
- Return the rewritten query string

Then the retriever slice (`test_retriever.py` + `app/rag/retriever.py`) wires query_rewriter → Voyage embed → Pinecone query → source weighting (policies ×1.0, historical_isqs ×0.95) → min_score 0.5, top_k 5.

**Note for live indexing later:** the `/index` endpoint constructs `PineconeClient()` and `VoyageClient()` at request time — both need valid API keys in the repo-root `.env`. The Pinecone index `isq-agent-knowledge` must exist (it does) before the first real `curl POST /index`.

