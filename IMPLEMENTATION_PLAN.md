# IMPLEMENTATION_PLAN.md — Plan 4 Knowledge Base + Retrieval

## Current status summary and code review

**Git status:**
- Current branch: `main`
- Latest commit: `03dd5aa` — feat: FastAPI scaffold with CORS and structured logging (#2)
- Working tree: Clean
- Recent PRs: #1 (Voyage client), #2 (FastAPI scaffold)

**Runtime state:**
- FastAPI app operational (GET /, GET /health, router stubs for /answer and /index)
- Voyage client ready (embed_query, embed_documents with cost tracking)
- Pinecone index `isq-agent-knowledge` created but empty (0 vectors)
- Source corpus ready: 6 policy PDFs + 3 historical ISQ files in `source-corpus/` (gitignored)

**Test coverage:**
- 4 smoke tests for FastAPI scaffold (passing)
- Zero tests for Plan 4 modules (chunking, doc processor, pinecone, query rewriter, retriever)

**Latest validations:**
- `pytest tests/test_main_smoke.py -v` — 4/4 passing
- `uvicorn app.main:app` — server starts, structured JSON logging works, no secrets logged
- `curl http://localhost:8000/` — returns service metadata
- `curl http://localhost:8000/health` — returns {"status": "ok"}

**Highest-risk open findings:**
- Plan 4 work not started — 6 modules + 6 test files to write
- TDD discipline shift — tests must be written BEFORE implementation (new for this plan)
- Three feature branches to manage (chunking, pinecone, retrieval)

## Active phase

Branch A — Chunking + Document Processor (TDD-first)

## Ordered checklist

### Branch A (feature/chunking-and-processor)

- [ ] Checkout branch: `git checkout -b feature/chunking-and-processor`
- [ ] Write `rag-service/tests/test_chunking.py` (8 test cases from plan-04 Section 2)
  - test_chunk_text_returns_chunks
  - test_chunk_size_respects_max
  - test_chunk_overlap_preserves_context
  - test_chunks_preserve_metadata
  - test_chunking_respects_section_boundaries
  - test_chunking_handles_very_short_text
  - test_chunking_handles_very_long_text
  - test_chunking_assigns_chunk_index
- [ ] Run `cd rag-service && pytest tests/test_chunking.py -v` — confirm ModuleNotFoundError
- [ ] Implement `rag-service/app/utils/chunking.py`
  - Use RecursiveCharacterTextSplitter from langchain-text-splitters
  - chunk_size=500, chunk_overlap=50
  - separators=["\n\n", "\n", ". ", " ", ""]
  - Return list of dicts with {text, chunk_index, total_chunks, **metadata}
- [ ] Run pytest again — confirm all 8 tests pass
- [ ] Commit: `git add tests/test_chunking.py app/utils/chunking.py && git commit -m "test+feat(chunking): add chunker with 500/50 sliding window respecting sections"`
- [ ] Write `rag-service/tests/test_document_processor.py` (6 test cases from plan-04 Section 2)
  - test_process_pdf_extracts_text
  - test_process_docx_extracts_text
  - test_process_xlsx_extracts_rows
  - test_process_rejects_unsupported_type
  - test_process_handles_corrupted_pdf
  - test_process_preserves_page_numbers
- [ ] Run pytest — confirm failures
- [ ] Implement `rag-service/app/utils/document_processor.py`
  - PDF: PyPDF2 or pymupdf
  - DOCX: python-docx
  - XLSX: openpyxl
  - Return dict with {text, page_count, pages[]} for PDF/DOCX
  - Return dict with {rows[]} for XLSX
- [ ] Run pytest — confirm all 6 tests pass
- [ ] Commit: `git add tests/test_document_processor.py app/utils/document_processor.py && git commit -m "test+feat(processor): add document processor with pdf/docx/xlsx support"`
- [ ] Push: `git push -u origin feature/chunking-and-processor`
- [ ] Create PR: `gh pr create --title "feat: chunking and document processor with TDD" --body "..." --base main`
- [ ] Squash-merge via GitHub UI
- [ ] Cleanup: `git checkout main && git pull && git branch -d feature/chunking-and-processor`

### Branch B (feature/pinecone-indexer)

- [ ] Checkout: `git checkout -b feature/pinecone-indexer`
- [ ] Write `rag-service/tests/test_pinecone_client.py` (5 tests)
  - test_pinecone_client_initialises
  - test_pinecone_client_handles_missing_index
  - test_upsert_chunks_succeeds (mocked)
  - test_query_returns_matches (mocked)
  - test_query_filters_by_min_score
- [ ] Implement `rag-service/app/core/pinecone_client.py`
  - PineconeClient class with upsert_chunks(), query() methods
  - Metadata schema from plan-04 Section 4
  - Batched upsert (limit 100 vectors per call)
- [ ] Commit: `git add tests/test_pinecone_client.py app/core/pinecone_client.py && git commit -m "test+feat(pinecone): add pinecone client with batched upsert and metadata schema"`
- [ ] Write `rag-service/tests/test_index_endpoint.py` (5 tests with TestClient + mocked Pinecone)
  - test_index_endpoint_returns_200
  - test_index_endpoint_chunks_corpus
  - test_index_endpoint_is_idempotent
  - test_index_endpoint_force_reindex
  - test_index_endpoint_reports_metrics
- [ ] Implement `POST /index` in `rag-service/app/api/index.py`
  - Check Pinecone stats (vector count)
  - If count > 0 and not force_reindex → return "already_indexed"
  - Read source-corpus/, process via document_processor
  - Chunk via chunking.py
  - Embed via Voyage client
  - Upsert to Pinecone
  - Return metrics: chunks_indexed, documents_indexed, indexing_time_ms, embedding_tokens_used, estimated_cost_usd
- [ ] Run smoke test: `curl -X POST http://localhost:8000/index -d '{"force_reindex":true}' -H "Content-Type: application/json"`
- [ ] Verify Pinecone dashboard: ~70 vectors appear
- [ ] Commit: `git add tests/test_index_endpoint.py app/api/index.py && git commit -m "test+feat(api): implement /index endpoint with force_reindex flag"`
- [ ] Push, PR, squash-merge, cleanup

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

**TDD discipline:**
- Test files written BEFORE implementation (new pattern)
- Each test file should fail with ModuleNotFoundError initially
- Implementation makes tests pass

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

Write `rag-service/tests/test_chunking.py` with 8 test cases from plan-04-knowledge-base-and-retrieval.md Section 2. Test cases:
1. test_chunk_text_returns_chunks — Empty text → empty list, non-empty → at least one chunk
2. test_chunk_size_respects_max — No chunk exceeds 500 chars
3. test_chunk_overlap_preserves_context — Adjacent chunks share 50 chars
4. test_chunks_preserve_metadata — Each chunk carries parent doc metadata
5. test_chunking_respects_section_boundaries — Splits prefer paragraph boundaries (\n\n separator)
6. test_chunking_handles_very_short_text — Text shorter than max → single chunk
7. test_chunking_handles_very_long_text — 50KB text → many chunks, all within max
8. test_chunking_assigns_chunk_index — Each chunk has chunk_index (0,1,2...) and total_chunks

After writing, run `cd rag-service && pytest tests/test_chunking.py -v` and confirm ModuleNotFoundError (expected TDD red phase).

