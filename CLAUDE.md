# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Autonomous Ralph loop rules live in `ralph/RALPH.md`. Local dev-tooling reference: `.claude/INSTALLED-PLUGINS.md`.

## Project Overview

ISQ Agent is an AI-powered workflow that answers supplier **Information Security Questionnaires (ISQs)**, grounding every answer in Northstar Labs policies + historical ISQ responses, with honest confidence flagging. It is a **two-service system**:

- **n8n** (`:5678`) — workflow orchestration: ingests an inbound ISQ, calls the RAG service per question, renders the filled response document.
- **FastAPI RAG service** (`:8000`, in `rag-service/`) — the retrieval + answer engine. This is where almost all the code lives.

Status and sequencing live in `IMPLEMENTATION_PLAN.md` and `plans/` (12 iterative plans) — consult those rather than assuming a phase.

## Essential Commands

```bash
# Setup (Python 3.11)
cd rag-service && python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

# Dev server (:8000, auto-reload)
cd rag-service && source .venv/bin/activate && uvicorn app.main:app --reload

# Tests — MUST run from rag-service/ with the venv active
pytest -v                            # full suite
pytest tests/test_<module>.py -v     # single module

# Lint / format
ruff check . && ruff format .

# Full local stack (n8n + rag-service)
docker compose up

# Build the knowledge base (server must be running)
curl -X POST http://localhost:8000/index -d '{"force_reindex":true}' -H "Content-Type: application/json"
```

## Code Architecture

### Module organization (`rag-service/app/`)
- `core/` — `config.py` (pydantic-settings, loads repo-root `.env`), `pinecone_client.py` (Pinecone v5 wrapper)
- `voyage/` — `client.py` (Voyage embeddings + cost tracking)
- `utils/` — `chunking.py` (section-aware splitter), `document_processor.py` (PDF/DOCX/XLSX extraction)
- `rag/` — `query_rewriter.py` (ISQ → retrieval query), `retriever.py` (search + ranking)
- `api/` — `health.py`, `index.py`, `answer.py` (FastAPI routers)
- `confidence/`, `extraction/`, `render/` — reserved for later plans (currently empty)

### Indexing pipeline (`POST /index`)
corpus discovery → `document_processor` (PDF/DOCX) → `chunking` (500/50) → Voyage embed (single batched call) → Pinecone upsert with **deterministic vector IDs**

### Retrieval pipeline
question → `query_rewriter` (acronym + policy-vocabulary expansion) → Voyage embed → Pinecone query → **source weighting** → `min_score` floor → top-k

### Critical invariants
- **Pinecone v5 API only** — v6 has breaking changes (pinned in `requirements.txt`).
- **Vector IDs are deterministic** (derived from filename) so re-indexing is idempotent (upsert-replaces, no orphans).
- **Source weighting is applied in code, after retrieval** (not baked into embeddings), and **before** the `min_score` floor — so a down-weighted match that falls below threshold is honestly dropped.

## RAG Configuration

- **Chunk size** 500 chars / **overlap** 50 chars
- **Pinecone index**: 1024 dims, cosine, serverless. Metadata schema: `source, source_type, section_title, page, chunk_index, chunk_total, text, isq_question_text, indexed_at`
- **Source weighting**: policies ×1.0, historical_isqs ×0.95
- **min_score** 0.5 · **top_k** 5
- **Models**: `voyage-3-large` (embeddings), `claude-sonnet-4-5` (generation + query rewriting)

## TDD Discipline

- Write the test file **before** the implementation.
- Watch tests fail (`ModuleNotFoundError` / `AssertionError`) before implementing.
- Implement the minimum to make tests pass; run pytest to confirm green.
- Commit the test file and implementation file separately (one concern per commit).

## Working Agreements

- Conventional Commits: `<type>(<scope>): <subject>` (types: feat/fix/test/docs/refactor/chore; scopes: rag, api, retriever, chunking, voyage, pinecone, ci, etc.).
- Stage files explicitly — never `git add .`.
- Small, reversible edits over broad refactors. No placeholder implementations.
- Update docs when setup, commands, or runtime behaviour change.

## Safety Rules

- Never commit secrets, tokens, or a populated `.env`.
- No `--no-verify` on commits (pre-commit hooks enforced from Plan 5).
- No force-push to `main`; revert rather than reset.
