# Companion Prompt — Plan 4 (Knowledge Base + Retrieval)

**Use this prompt in Claude Code (VSCode) when you're ready to build Plan 4.**

Paste everything below the `---` line as your first message.

---

You're helping me build **Plan 4 — Knowledge Base + Retrieval Design (TDD-first)** of the ISQ Agent project.

This is the first plan where TDD becomes paramount. Every component built from here on follows the discipline: tests first, watch them fail, implement to pass.

## Read these first

In `plans/`:
- **plan-04-knowledge-base-and-retrieval.md** (the plan you're executing)
- **plan-02-stack-lockin.md** (Morpheus lift protocol + Matrix-strip checklist)
- **plan-03-architecture.md** Section 2 (the data flow this plan implements)

## Branch + workflow

```bash
cd ~/Repos/isq-agent
git checkout -b feature/chunking-and-retrieval
```

Multiple commits expected (one per module). Squash-and-merge to main via PR.

## What to do FIRST (TDD discipline)

Guide me through typing `rag-service/tests/test_chunking.py` per **Plan 4 Section 8 Part A**.

Watch tests fail (`pytest tests/test_chunking.py -v`), then lift `app/utils/chunking.py` from Morpheus with the Matrix-strip checklist applied (Plan 2 Section 2).

After chunking is green, repeat the same TDD cycle for:
- `app/utils/document_processor.py` (lift + add XLSX support)
- `app/core/pinecone_client.py` (lift + update env vars for fresh project)
- `app/rag/query_rewriter.py` (lift + ISQ-specific prompt from Plan 4 Section 6)
- `app/api/index.py` (new — POST /index endpoint per Plan 4 Section 5)

## What's LOCKED

- Chunking: 500 char max, 50 overlap, RecursiveCharacterTextSplitter
- Pinecone metadata schema (Plan 4 Section 4)
- Vector ID convention: `{short_code}-p{page}-c{idx}` (PDF) / `{short_code}-c{idx}` (DOCX)
- top_k = 5, min_score = 0.5
- Source weighting: historical_isq × 0.95 (subtle preference for policies)
- Stable IDs (so re-indexing replaces, doesn't duplicate)

## Matrix-strip enforcement

Every lifted Morpheus file must pass:

```bash
grep -iE '(morpheus|the matrix|matrix of|neo[^a-z]|white rabbit|red ?pill|blue ?pill|trinity|zion|down the rabbit|wake up.*matrix|follow the white rabbit)' rag-service/app/path/to/file.py
```

Only attribution comments at the top of files are allowed exceptions.

## Acceptance

- [ ] All test files written FIRST (test_chunking, test_document_processor, test_pinecone_client, test_query_rewriter, test_index_endpoint)
- [ ] All Morpheus modules lifted with Matrix-strip applied
- [ ] Real `POST /index` against the source corpus produces ~70 vectors in Pinecone
- [ ] `tests/test_isq_prompts_no_matrix_leakage.py` passes
- [ ] Commits use Conventional Commits format
- [ ] PR opened, self-reviewed, squash-merged
- [ ] Tag `v0.1.0` — RAG core operational

## Smoke test once merged

```bash
curl -X POST http://localhost:8000/index \
  -H "Content-Type: application/json" \
  -d '{"force_reindex": true}'
# Expected: { "chunks_indexed": ~70, "indexing_time_ms": <30000, "estimated_cost_usd": <0.01 }
```

Verify in Pinecone dashboard: ~70 vectors visible in `isq-agent-knowledge` index.

## Failure modes to avoid

- Don't skip the Matrix-strip step — the CI test will catch leaks but easier to scrub during lift
- Don't change the locked chunking constants without consulting me
- Don't write code for the test TODOs — those are mine
- Don't index against the wrong Pinecone project (verify env vars point to `isq-agent-knowledge`)

## Acknowledge before proceeding

Reply with:
1. Confirmation you've read Plan 4 + Plan 2 (Morpheus lift protocol)
2. The exact next step (first test file, first lift)
3. Any clarifying questions

Then ask me: "Ready to start typing `test_chunking.py`?"
