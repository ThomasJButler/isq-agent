# Plan 4 — Knowledge Base + Retrieval Design (TDD-first)

**Status:** Plan 4. TDD methodology is now paramount for this and every following plan.

**Owner:** Tom Butler
**Date:** 2026-05-25
**Prior plans:** Plan 1 ✅, Plan 2 ✅, Plan 3 ✅
**New constraint (locked Plan 4 onwards):** Tests are designed FIRST. Implementation makes the tests pass. Manual Coding Exercises now lean toward typing test files, not implementation files.

---

## 0. TDD-first principle (locked in for Plans 4-10)

Every component built from this plan forward follows this discipline:

1. **Define the behaviour** — what does success look like? Failure?
2. **Write the test cases** — specific, runnable, fail loudly when behaviour wrong
3. **Watch tests fail** — confirms tests test what we think they test
4. **Implement the minimum to pass** — no gold-plating
5. **Refactor with confidence** — tests catch regressions

**Why this matters for RiverAI:**
- Walkthrough talking point: "I built this TDD. Every module has tests written before implementation. Lee, you can run `pytest` and see them pass."
- CGI Wednesday: typing tests is more observable than typing implementation. You'll have muscle memory.
- Code review survival: TDD codebases survive code review because every behaviour is documented as a test.
- Future Tom: if this becomes a real product, the test suite is the safety net.

**Pragmatic ceiling:**
- Unit tests: yes for every module
- Integration tests: yes for /answer and /index endpoints (with mocked Voyage/Pinecone/Anthropic)
- End-to-end tests: ONE happy-path test (Sunflowers Q1) using real APIs
- Performance / load tests: NOT in scope for this assessment

---

## 1. What this plan does and doesn't do

**Locks in:**
- Chunking strategy for policies (section-level, ~500 char targets)
- Chunking strategy for historical ISQs (per-Q&A unit)
- Pinecone metadata schema
- The `POST /index` workflow detail (test-first)
- Query rewriter prompt — ISQ-specific (test-first)
- Retrieval tuning approach (top-k, score thresholds, source weighting)
- Test plan for chunking, indexing, query rewriting, retrieval

**Doesn't yet cover:**
- Question extraction from inbound ISQ (Plan 5)
- Answer generation prompt + few-shot (Plan 6)
- Confidence scoring weights + thresholds (Plan 7)
- Output rendering (Plan 8)
- Demo script (Plan 9)
- Final execution timeline (Plan 10)

---

## 2. Test plan (defined FIRST — implementation follows)

Before any code is written, here's what behaviours we test.

### Tests for chunking (`tests/test_chunking.py`)

| Test name | What it verifies |
|---|---|
| `test_chunk_text_returns_chunks` | Empty text → empty list. Non-empty text → at least one chunk. |
| `test_chunk_size_respects_max` | No chunk exceeds `max_chunk_size` (locked at 500 chars). |
| `test_chunk_overlap_preserves_context` | Adjacent chunks share `chunk_overlap` chars (locked at 50). |
| `test_chunks_preserve_metadata` | Each chunk carries the parent doc's metadata. |
| `test_chunking_respects_section_boundaries` | When `separators=["\n\n", "\n", ". "]`, splits prefer paragraph boundaries. |
| `test_chunking_handles_very_short_text` | Text shorter than max_chunk_size → single chunk, no error. |
| `test_chunking_handles_very_long_text` | 50KB text → many chunks, all within max size. |
| `test_chunking_assigns_chunk_index` | Each chunk has `chunk_index` (0, 1, 2, ...) and `total_chunks`. |

### Tests for document processing (`tests/test_document_processor.py`)

| Test name | What it verifies |
|---|---|
| `test_process_pdf_extracts_text` | PDF file → returns dict with `text`, `page_count`, `pages[]`. |
| `test_process_docx_extracts_text` | DOCX file → returns dict with `text`. |
| `test_process_xlsx_extracts_rows` | XLSX file → returns dict with `rows[]`, each row having `question_text` if column matches. |
| `test_process_rejects_unsupported_type` | `.txt` or `.png` raises `ValueError`. |
| `test_process_handles_corrupted_pdf` | Malformed PDF → raises `DocumentProcessingError` with clear message. |
| `test_process_preserves_page_numbers` | Multi-page PDF → each page recorded with page number. |

### Tests for Pinecone client wrapper (`tests/test_pinecone_client.py`)

| Test name | What it verifies |
|---|---|
| `test_pinecone_client_initialises` | Client creates without error given API key + index name. |
| `test_pinecone_client_handles_missing_index` | Helpful error when index doesn't exist. |
| `test_upsert_chunks_succeeds` | Mocked: `upsert_chunks(chunks)` calls index.upsert correctly. |
| `test_query_returns_matches` | Mocked: `query(vector, top_k)` returns matches with metadata. |
| `test_query_filters_by_min_score` | Matches below `min_score` are filtered out. |

### Tests for query rewriter (`tests/test_query_rewriter.py`)

| Test name | What it verifies |
|---|---|
| `test_rewriter_expands_acronyms` | "MFA" → expanded to "multi-factor authentication" in output. |
| `test_rewriter_preserves_intent` | Original meaning is preserved. |
| `test_rewriter_adds_policy_vocabulary` | Output includes terms likely in policy docs ("policy", "framework"). |
| `test_rewriter_handles_empty_query` | Empty string → empty string, no LLM call. |
| `test_rewriter_uses_isq_specific_prompt` | System prompt mentions "security questionnaire" or similar. |

### Tests for retriever (`tests/test_retriever.py`)

| Test name | What it verifies |
|---|---|
| `test_retriever_uses_rewritten_query` | Calls query_rewriter before embed. |
| `test_retriever_returns_top_k_chunks` | Returns at most `top_k` chunks. |
| `test_retriever_prefers_policies_over_isqs` | When same score, policy chunks ranked first. |
| `test_retriever_includes_source_metadata` | Each result has source, page, type fields. |
| `test_retriever_handles_no_matches` | Returns empty list, doesn't crash. |

### Tests for /index endpoint (`tests/test_index_endpoint.py`)

| Test name | What it verifies |
|---|---|
| `test_index_endpoint_returns_200` | `POST /index` returns 200 + summary JSON. |
| `test_index_endpoint_chunks_corpus` | Indexes all files from `/source-corpus`. |
| `test_index_endpoint_is_idempotent` | Second call with `force_reindex=false` returns "already_indexed". |
| `test_index_endpoint_force_reindex` | Second call with `force_reindex=true` reindexes. |
| `test_index_endpoint_reports_metrics` | Response includes tokens used, cost, latency. |

**Test count for Plan 4 scope:** ~35 tests across 6 modules. Estimated test-writing time: 2 hours. Worth every minute.

---

## 3. Chunking strategy (locked)

### Policies

Each Northstar policy is ~2 pages, ~400-600 words, with numbered sections (1. Security Responsibilities, 2. Access Control, etc.).

**Strategy: section-aware character chunking, max 500 chars, overlap 50.**

- Use `RecursiveCharacterTextSplitter` from langchain-text-splitters (already in Morpheus chunking.py)
- Separators in order: `["\n\n", "\n", ". ", " ", ""]`
- This means: prefer paragraph breaks, then line breaks, then sentence breaks, then word breaks
- Max chunk size 500 chars ≈ 100 words ≈ 2-3 sentences (one tight idea per chunk)
- Overlap 50 chars (~10 words) preserves context across chunk boundaries

**Why 500 char target:**
- Voyage embeddings work best on focused passages (100-300 tokens)
- 500 chars ≈ 100-150 tokens — sweet spot
- Small enough that retrieval is precise; big enough to carry meaning

**Why section-aware:**
- Each section answers a specific compliance question
- Splitting mid-section would orphan context
- The `\n\n` separator catches policy section breaks naturally

### Historical ISQs

Each ISQ is structured as Q&A pairs. Each Q&A is a natural semantic unit.

**Strategy: one chunk per Q&A pair, no further splitting.**

- Parse the PDF/DOCX to identify Q&A boundaries
- Each chunk's text = "Question: ... Answer: ..."
- Metadata includes the original question text separately so the retriever can match on either question similarity or answer content

### Sizes for our corpus

| Source | Doc count | Approx chunks | Approx tokens |
|---|---|---|---|
| 6 policy PDFs | 6 | ~30-40 | ~6,000 |
| 3 historical ISQs (12 Q&A + 10 Q&A + 12 Q&A) | 3 | ~34 (one per Q&A) | ~3,000 |
| **Total** | **9** | **~70 chunks** | **~9,000 tokens** |

**Cost to embed once:** 9,000 tokens × $0.18/M = $0.0016. Free tier headroom: infinite.

---

## 4. Pinecone metadata schema (locked)

Each vector upserted to Pinecone carries this metadata:

```json
{
  "source": "Northstar_Labs_Information_Security_Policy.pdf",
  "source_type": "policy",                  // "policy" | "historical_isq"
  "section_title": "3. Multi-Factor Authentication (MFA)",
  "page": 1,
  "chunk_index": 0,
  "chunk_total": 1,
  "text": "Multi-factor authentication (MFA) is mandatory for all cloud platforms...",
  "isq_question_text": null,                // populated only for historical_isq chunks
  "indexed_at": "2026-05-26T10:00:00Z"
}
```

**Why each field:**
- `source` → walks back to the document during citation
- `source_type` → enables source weighting (policies preferred)
- `section_title` → improves citation readability ("from MFA section")
- `page` → exact PDF location for filled-PDF rendering
- `chunk_index` + `chunk_total` → reconstructable order if needed
- `text` → embedded back in the response (no extra round-trip to fetch chunk content)
- `isq_question_text` → for historical_isq chunks only; lets us match on question similarity separately from answer content
- `indexed_at` → if the corpus changes, we know which chunks are stale

**Pinecone metadata limits:** 40KB per vector. Our chunks are ~500 chars + metadata fields = well under.

### Vector ID convention

```
Policy: {policy_short_code}-s{section_number}-c{chunk_index}
   e.g. "isp-s3-c0" → Information Security Policy, section 3, chunk 0

Historical ISQ: hist{isq_number}-q{question_number}
   e.g. "hist01-q1" → ISQ 01, question 1
```

Stable IDs mean re-indexing replaces existing vectors cleanly (no orphans).

---

## 5. /index workflow detail

### Flow

```
POST /index { force_reindex: false }
  ↓
1. Check Pinecone index stats (vector count)
  ↓
2. If count > 0 and not force_reindex → return "already_indexed"
  ↓
3. Read /source-corpus folder, list all .pdf and .docx files
  ↓
4. For each file:
   a. Process via document_processor → text + pages
   b. Identify source_type (policy or historical_isq) from filename pattern
   c. Chunk via chunking strategy (policy vs ISQ)
   d. Build metadata for each chunk
  ↓
5. Embed all chunks via Voyage (batched, embed_documents)
  ↓
6. Upsert all vectors to Pinecone
  ↓
7. Return: { chunks_indexed, documents_indexed, indexing_time_ms,
            embedding_tokens_used, estimated_cost_usd }
```

### Source type detection

By filename pattern:

```python
def detect_source_type(filename: str) -> str:
    if "Previous_ISQ_Completed" in filename:
        return "historical_isq"
    elif "Policy" in filename:
        return "policy"
    else:
        return "unknown"  # fail loudly, don't silently guess
```

### Idempotency

- Re-running `POST /index { force_reindex: false }` is a no-op (returns immediately with current vector count).
- `force_reindex: true` deletes ALL vectors in the index first, then re-runs the indexing pipeline.
- Stable IDs (Section 4) mean even without `force_reindex`, re-running with the same corpus produces the same vectors (Pinecone treats matching IDs as upserts, not inserts).

---

## 6. Query rewriter — ISQ-specific prompt

### Goal

Transform a security questionnaire question into a richer retrieval query that includes vocabulary likely to appear in policy documents.

### System prompt (draft, refined in eval)

```
You expand supplier security questionnaire questions into richer retrieval queries.

Your job is to take a question and rewrite it to include vocabulary likely to appear in the underlying security policy documents that contain the answer. Do not answer the question. Do not invent claims. Just expand the search terms.

Rules:
1. Preserve the original intent — the rewritten query must still ask about the same topic
2. Expand acronyms (MFA → multi-factor authentication, ISP → information security policy, RPO/RTO → recovery point objective / recovery time objective)
3. Add synonyms and related concepts (authentication → access control, authentication, identity verification)
4. Include policy-document vocabulary (governance, framework, mandatory, approved, documented)
5. Output ONLY the rewritten query, no explanation

Examples:
Q: "Do you use MFA?"
→ "multi-factor authentication MFA enforcement mandatory cloud platforms VPN administrative accounts authenticator applications"

Q: "Where is customer data stored?"
→ "customer data storage location geographic region cloud provider data residency UK EEA GDPR cross-border transfer"

Q: "Are backups tested?"
→ "backup restoration testing recovery validation disaster recovery business continuity periodic testing tabletop exercises"

Now rewrite this question:
```

### Tests (already in Section 2)

- `test_rewriter_expands_acronyms` (MFA → multi-factor authentication)
- `test_rewriter_preserves_intent`
- `test_rewriter_adds_policy_vocabulary`
- `test_rewriter_handles_empty_query`
- `test_rewriter_uses_isq_specific_prompt`

### Iteration approach (Plan 6 + Plan 9)

The system prompt is v0 here. The Ralph loop in Plan 9 will:
1. Run all 20 Sunflowers questions through v0
2. Measure retrieval quality (does the right chunk come back top-5?)
3. Refine prompt where retrieval missed
4. Lock in v1 before submission

---

## 7. Retrieval tuning approach

### Initial settings (locked, tunable in eval)

| Parameter | Value | Why |
|---|---|---|
| `top_k` (Pinecone) | 5 | Enough context for Claude, not so much it dilutes |
| `min_score` | 0.5 | Filter clear non-matches |
| Source weighting | policies × 1.0, historical_isqs × 0.95 | Slight preference for policies (per brief: "prefer official Northstar Labs policy documents") |

### Source weighting implementation

When two chunks have similar Pinecone scores, the policy chunk ranks first because we multiply the historical_isq score by 0.95 after retrieval (not at the embedding level).

```python
def apply_source_weighting(matches: list) -> list:
    for m in matches:
        if m.metadata["source_type"] == "historical_isq":
            m.score *= 0.95
    return sorted(matches, key=lambda m: m.score, reverse=True)
```

**Why this approach (not at embedding level):**
- Pinecone doesn't natively support multi-vector ranking with bias
- Post-retrieval adjustment is transparent and tunable
- Walkthrough talking point: "I made source preference explicit in code rather than hidden in embeddings. Lee can see exactly how policies are preferred over historical answers."

### Reranking (Plan 7 stretch)

If retrieval quality is poor, we add Pinecone's cross-encoder reranker as a second pass. Morpheus's `rag/reranker.py` is ready to lift. Plan 7 will decide whether to ship it.

---

## 8. 🖐️ Manual Coding Exercise 3 — TEST FILE FIRST

**Purpose:** TDD in practice. You type the test file, see it fail, then implement chunking to make it pass. ~50 lines (test file) + ~30 lines (implementation). Total ~30 minutes.

### Part A — type the test file FIRST

**File:** `rag-service/tests/test_chunking.py`

```python
"""
Tests for the chunking module.
Written FIRST. Implementation in app/utils/chunking.py follows.
"""

import pytest
from app.utils.chunking import DocumentChunker, chunk_text


# Fixtures — reusable test data

@pytest.fixture
def short_text():
    return "This is a short policy paragraph that fits in one chunk."


@pytest.fixture
def long_text():
    """Mimics a real policy: multiple paragraphs separated by blank lines."""
    return (
        "1. Security Responsibilities\n\n"
        "All employees, contractors, and third parties working on behalf of Northstar Labs "
        "are responsible for protecting company information and complying with security policies.\n\n"
        "2. Access Control\n\n"
        "Access to company systems must follow the principle of least privilege. "
        "User accounts must be uniquely assigned to individuals.\n\n"
        "3. Multi-Factor Authentication\n\n"
        "MFA is mandatory for all cloud platforms, administrative accounts, and VPN access."
    )


@pytest.fixture
def sample_metadata():
    return {
        "source": "Northstar_Labs_Information_Security_Policy.pdf",
        "source_type": "policy",
        "page": 1,
    }


# Tests

class TestChunkText:
    def test_returns_list_of_dicts(self, short_text):
        chunks = chunk_text(short_text)
        assert isinstance(chunks, list)
        assert all(isinstance(c, dict) for c in chunks)

    def test_empty_text_returns_empty_list(self):
        assert chunk_text("") == []
        assert chunk_text("   ") == []

    def test_short_text_returns_single_chunk(self, short_text):
        chunks = chunk_text(short_text, chunk_size=500, chunk_overlap=50)
        assert len(chunks) == 1
        assert chunks[0]["text"] == short_text

    def test_long_text_returns_multiple_chunks(self, long_text):
        # TODO ① — Tom: assert that long_text produces >1 chunk when chunk_size=200.
        # Hint: chunks = chunk_text(long_text, chunk_size=200, chunk_overlap=50)
        # Then assert len(chunks) > 1.
        # ~3 lines.
        pass

    def test_no_chunk_exceeds_max_size(self, long_text):
        chunks = chunk_text(long_text, chunk_size=200, chunk_overlap=50)
        for c in chunks:
            assert len(c["text"]) <= 200, f"Chunk exceeded max size: {len(c['text'])}"

    def test_chunks_preserve_metadata(self, short_text, sample_metadata):
        # TODO ② — Tom: assert that when metadata is passed to chunk_text,
        # every returned chunk includes those metadata fields.
        # Hint: chunks = chunk_text(short_text, metadata=sample_metadata)
        # for c in chunks: assert c["source"] == sample_metadata["source"]
        # ~4 lines.
        pass

    def test_chunks_have_index_fields(self, long_text):
        chunks = chunk_text(long_text, chunk_size=200, chunk_overlap=50)
        for i, c in enumerate(chunks):
            assert c["chunk_index"] == i
            assert c["total_chunks"] == len(chunks)


class TestDocumentChunker:
    def test_initialises_with_defaults(self):
        chunker = DocumentChunker()
        assert chunker.chunk_size > 0
        assert chunker.chunk_overlap >= 0

    def test_chunks_documents_batch(self, sample_metadata):
        docs = [
            {"text": "First doc content.", **sample_metadata},
            {"text": "Second doc content.", **sample_metadata, "source": "second.pdf"},
        ]
        chunker = DocumentChunker(chunk_size=500)
        chunks = chunker.chunk_documents(docs)
        assert len(chunks) >= 2  # at least one chunk per doc
        sources = {c["source"] for c in chunks}
        assert sources == {"Northstar_Labs_Information_Security_Policy.pdf", "second.pdf"}
```

### Part B — run the tests, watch them fail

```bash
cd rag-service
pytest tests/test_chunking.py -v
```

Expected: most tests fail (ModuleNotFoundError, or NameError if imports work but classes don't exist yet). That's the goal.

### Part C — implement to make tests pass

Lift `rag-service/app/utils/chunking.py` from Morpheus. The Morpheus implementation already passes most of these tests. The ones it doesn't pass directly will tell you what to adapt.

**Smoke commands:**
```bash
pytest tests/test_chunking.py -v
# Expected: all green
```

If a test fails, the failure is informative — it tells you exactly what behaviour is missing. That's TDD working.

### Acceptance criteria for your two TODOs

**TODO ①** should:
- Call `chunk_text(long_text, chunk_size=200, chunk_overlap=50)`
- Assert `len(chunks) > 1`
- 3 lines total

**TODO ②** should:
- Call `chunk_text(short_text, metadata=sample_metadata)`
- Loop through `chunks`
- For each, assert that `c["source"]`, `c["source_type"]`, and `c["page"]` match `sample_metadata`
- 4-5 lines total

---

## 9. 📘 Concept Primer

### Chunking strategy

A policy document is a few pages long. The AI's "vision" is limited — if we hand it the whole policy for every question, it gets distracted by irrelevant sections and produces vague answers.

**Solution:** break each policy into small focused passages (chunks), embed each chunk separately, store them in Pinecone. When a question arrives, find the 5 most-relevant chunks and hand only those to the AI.

**Why ~500 characters per chunk:**
- Big enough to carry a coherent idea (a policy section)
- Small enough that the AI sees ONLY the relevant idea
- 50 char overlap means context doesn't get split awkwardly at chunk boundaries

Think of it like cutting a book into index cards. Each card has one idea. When you need to answer something, you pull the 5 most relevant cards — not the whole book.

### Pinecone metadata

Pinecone stores two things per vector: the embedding (the meaning coordinates) AND a metadata blob (anything you want).

The vector is what Pinecone uses to find "similar" things. The metadata travels back with the result so you can do useful things with it — show citations, weight by source type, filter by date, etc.

We store source filename, type, section title, page, and the original text alongside each vector. When Pinecone says "here's the 5 most relevant chunks," we don't have to make a second trip to fetch their content — it's already in the metadata.

### top-k vs threshold

When you ask Pinecone to find similar vectors, you can ask in two ways:
- **top-k** = "give me the 5 most similar ones, full stop"
- **threshold** = "give me everything with similarity above 0.8"

Top-k is predictable (always returns N or fewer). Threshold is variable (might return 0 or 50).

We use BOTH:
- top-k = 5 (we always want about 5)
- min_score = 0.5 (but filter out junk, even if it means returning fewer than 5)

This gives us "the best up-to-5 matches that are at least vaguely relevant." If nothing scores above 0.5, we return zero matches and flag the question for review — which is more honest than returning irrelevant chunks.

---

## 10. End-of-Plan-4 checklist

Pre-Plan-5 setup. Tick when done. Done order matters (tests first, then implementation).

- [ ] Create `rag-service/tests/test_chunking.py` and type out Manual Coding Exercise 3 Part A
- [ ] Run `pytest tests/test_chunking.py -v` and confirm tests fail (you should see ModuleNotFoundError or similar)
- [ ] Lift `app/utils/chunking.py` from Morpheus (run Matrix-strip checklist from Plan 2)
- [ ] Re-run pytest, watch tests go green
- [ ] Commit: "test: chunking tests + lifted chunking implementation from Morpheus"
- [ ] Repeat the pattern for `app/utils/document_processor.py`:
  - [ ] Write `tests/test_document_processor.py` (test cases from Section 2)
  - [ ] Lift document_processor.py from Morpheus
  - [ ] Add XLSX support (new method `_process_xlsx` using openpyxl)
  - [ ] Run tests until green
  - [ ] Commit: "test+feat: document processor with XLSX support"
- [ ] Repeat for `app/core/pinecone_client.py`:
  - [ ] Write `tests/test_pinecone_client.py`
  - [ ] Lift pinecone_client.py from Morpheus, update env vars
  - [ ] Run tests until green
  - [ ] Commit: "test+feat: pinecone client wrapper"
- [ ] Repeat for `app/rag/query_rewriter.py`:
  - [ ] Write `tests/test_query_rewriter.py` (with mocked Anthropic responses)
  - [ ] Lift query_rewriter.py from Morpheus, swap prompt for ISQ-specific (Section 6)
  - [ ] Run tests until green
  - [ ] Commit: "test+feat: ISQ-specific query rewriter"
- [ ] Implement `app/api/index.py` route:
  - [ ] Write `tests/test_index_endpoint.py` (with TestClient + mocked Pinecone)
  - [ ] Implement the route per Section 5 flow
  - [ ] Run tests until green
  - [ ] Commit: "test+feat: /index endpoint with idempotency"
- [ ] Run the real indexing once: `curl -X POST http://localhost:8000/index -d '{"force_reindex":true}'`
- [ ] Verify in Pinecone dashboard that vectors appear (~70 vectors expected)
- [ ] Commit: "docs: indexing verified against real corpus"

Optional stretch:
- [ ] Add `app/rag/retriever.py` with its tests (Section 2 has the test list)

---

## 10b. Ralph loop opportunity (overnight chunking + prompt evaluation)

A natural stretch — even if you don't run it, mention as "what I'd do for v2":

After the initial chunking + indexing works, you can run a **Ralph loop overnight** that:

1. Pulls each of the 20 Sunflowers questions
2. For each, varies the chunking strategy (chunk sizes 300/500/700, overlaps 25/50/100)
3. Re-indexes the corpus with each variation
4. Runs the question, measures retrieval quality (does the right chunk come back top-5?)
5. Records the best-performing chunking config per question
6. Aggregates to find the global optimum

The same loop can vary the query rewriter prompt — different rewriting strategies tested against retrieval quality on the 20 Sunflowers questions as the eval corpus.

This is the kind of overnight iteration that Anchor + Ralph were built for. Even if you don't run it for the assessment (time pressure), **mention it in the walkthrough as "the next iteration cycle I'd run."**

**Walkthrough talking point:**
> "The chunking constants are v1 — 500 chars, 50 overlap. For v2 I'd run an overnight Ralph loop varying chunking strategy against the historical ISQs as eval corpus, find the optimum, lock it in. Same loop pattern would tune the query rewriter prompt."

This is engineering signal at Claude-expert level — most candidates would never think to do an autonomous overnight tuning pass.

---

## 11. What Plan 5 will tackle (changed 2026-05-25)

**Plan order shifted** — Plan 5 is now **Branching Strategy + Git Workflow** (inserted at Tom's request). What was originally Plan 5 (Question Extraction) becomes Plan 6.

Plan 5 — **Branching Strategy + Git Workflow (TDD-aware)**:

- GitHub Flow branching model (main + feature branches with PRs)
- Conventional Commits convention (feat/fix/test/docs/refactor/chore)
- PR template + self-review discipline
- Tagging strategy (v0.1.0 → v1.0.0 milestone path)
- Pre-commit hooks (pytest, ruff/black, matrix-strip check)
- GitHub Actions CI workflow (tests + lint on every push and PR)
- Public-repo hygiene (LICENSE, README, .gitignore, no secrets ever)
- Backfill of tests for Voyage client (Exercise 1) and FastAPI main (Exercise 2)
- 🖐️ **Manual Coding Exercise 4** — typing `.pre-commit-config.yaml` + `.github/workflows/ci.yml` (devops fluency for CGI Wednesday + clean repo signal for Lee)
- 📘 Concept Primer sections: pre-commit hooks, GitHub Flow vs GitFlow, Conventional Commits

Then Plan 6 = Question Extraction (as previously planned).

---

## Git execution block

See `git-conventions.md` for the full reference. Plan 4 is the biggest chunk of work — split into **three** branches so each PR is reviewable.

**Branch A — Chunking + document processor:** `feature/chunking-and-processor`
1. `test(chunking): add tests for chunker (size, overlap, section boundaries)` — stages `rag-service/tests/test_chunker.py`
2. `feat(chunking): add chunker with 500/50 sliding window respecting sections` — stages `rag-service/app/rag/chunker.py`
3. `test(processor): add tests for document processor (pdf, docx, md, xlsx)` — stages `rag-service/tests/test_processor.py`
4. `feat(processor): add document processor lifting morpheus parsers` — stages `rag-service/app/rag/document_processor.py`
5. Push, PR, squash-merge.

**Branch B — Pinecone client + indexing:** `feature/pinecone-indexer`
1. `test(pinecone): add tests for upsert and query wrappers` — stages `rag-service/tests/test_pinecone_client.py`
2. `feat(pinecone): add pinecone client with batched upsert and metadata schema` — stages `rag-service/app/rag/pinecone_client.py`
3. `feat(api): add POST /index endpoint with force_reindex flag` — stages `rag-service/app/api/index.py`
4. Push, PR, squash-merge.

**Branch C — Query rewriter + retriever:** `feature/query-rewriter-and-retriever`
1. `test(rag): add tests for ISQ query rewriter` — stages `rag-service/tests/test_query_rewriter.py`
2. `feat(rag): add ISQ-specific query rewriter (acronym expansion, vendor tone)` — stages `rag-service/app/rag/query_rewriter.py`
3. `test(rag): add tests for retriever (top-k, threshold, source weighting)` — stages `rag-service/tests/test_retriever.py`
4. `feat(rag): add retriever with source weighting and score threshold` — stages `rag-service/app/rag/retriever.py`
5. Push, PR, squash-merge.

**After all three merge — run real indexing once and tag the milestone:**
```bash
curl -X POST http://localhost:8000/index -d '{"force_reindex":true}'
# verify ~70 vectors in Pinecone dashboard
git checkout main && git pull
git tag -a v0.1.0 -m "v0.1.0 — RAG core operational"
git push origin v0.1.0
```

---

## Plan 4 done ✅

Knowledge base + retrieval design locked. Test plan defined first. Chunking, indexing, query rewriting, retrieval tuning all specified. Manual Coding Exercise 3 is your first proper TDD cycle.

**Tom's reaction needed before Plan 5:**

1. Chunking strategy (500 chars, 50 overlap, section-aware) — happy or want to tune?
2. Source weighting (policies × 1.0, historical_isqs × 0.95) — too gentle, about right, or stronger preference for policies?
3. ISQ-specific query rewriter prompt (Section 6) — anything to add to the rules / examples?
4. The TDD discipline (test file first, implementation second) — does Manual Coding Exercise 3 feel right shape, or want a different mix?
5. Anything in the Plan 5 outline you want to swap in/out?

Say "go" if happy and I'll write Plan 5.
