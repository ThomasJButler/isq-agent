# source-corpus/

This folder holds Northstar Labs' documents: the knowledge base the RAG service answers from, plus the blank questionnaires we feed in during demos. It's gitignored on purpose. This README is the one file in here that's tracked.

## Why it's gitignored

The documents are RiverAI's assessment material, so they stay out of the public repo. Two reasons:

1. We respect RiverAI's IP. The docs ship separately, local to the demo.
2. The repo stays portable. Drop a different corpus in here and the same pipeline works, no code changes.

`.gitignore` does this with two lines:

```
source-corpus/
!source-corpus/README.md
```

Everything under the folder is ignored, except this README.

## What lives here

Three subfolders. The first two are the knowledge base (what we ground answers in). The third is demo input (blank ISQs to fill in).

```
source-corpus/
  Northstar Labs Policies/          # 6 policy docs -> source_type "policy"
  Northstar Labs Completed ISQs/    # 3 historical answered ISQs -> source_type "historical_isq"
  Northstar Labs Questionnaires/    # inbound blank ISQs for demos (NOT indexed)
```

- **Policies** (6 PDFs): Information Security, Secure Software Development, Acceptable Use, Business Continuity and Disaster Recovery, Incident Response, Data Protection and Retention.
- **Completed ISQs** (3 files): questionnaires Northstar has already answered. These give us real prior answers to retrieve, not just policy prose. Filenames contain `Previous_ISQ_Completed`.
- **Questionnaires**: the blank inbound ISQs a customer sends us. These are inputs, not knowledge. They never go into the index.

## How POST /index uses it

`POST /index` builds the Pinecone knowledge base from this folder. It only looks at the two KB subfolders (`Northstar Labs Policies` and `Northstar Labs Completed ISQs`). The Questionnaires folder, the assessment brief PDF, and this README are all skipped, so nothing leaks into retrieval that shouldn't.

The pipeline, per file:

1. **Discover** supported files (`.pdf` and `.docx`) in the two KB subfolders, sorted so vector IDs come out deterministic.
2. **Classify** by filename: `Previous_ISQ_Completed` -> `historical_isq`, `Policy` -> `policy`. Anything it can't place fails the run loudly rather than guessing.
3. **Extract** text (PDF/DOCX), **chunk** it (500 chars, 50 overlap), **embed** the lot in one batched Voyage call, then **upsert** to Pinecone with stable IDs.

Because the IDs are derived from the filename, re-indexing replaces cleanly. No orphans, no duplicates. Run it like this (server must be up):

```bash
curl -X POST http://localhost:8000/index \
  -H "Content-Type: application/json" \
  -d '{"force_reindex": true}'
```

`force_reindex: true` wipes the index first, then rebuilds. Leave it `false` and a populated index is a no-op.

## Running end-to-end with your own data

Drop your files into the two KB subfolders using the same naming convention (the word `Policy` in policy filenames, `Previous_ISQ_Completed` in historical ones), reindex, and you're away. Detection rules live in `rag-service/app/api/index.py`.
