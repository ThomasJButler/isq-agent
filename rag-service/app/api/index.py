"""
POST /index — build the Pinecone knowledge base from the source corpus (Plan 4).

This route is an orchestrator. It composes already-tested modules:
  corpus discovery -> document_processor -> chunking -> Voyage embeddings ->
  Pinecone upsert.

The locked metadata schema (plan-04 Section 4) and stable vector IDs are built
HERE — the Pinecone client upserts pre-built {id, values, metadata} vectors and
stays deliberately dumb.

Idempotency (plan-04 Section 5):
  - force_reindex=false on a populated index -> no-op ("already_indexed")
  - force_reindex=true -> delete every vector, then re-run the pipeline
"""

import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.pinecone_client import PineconeClient
from app.utils.chunking import chunk_text
from app.utils.document_processor import process_document
from app.voyage.client import VoyageClient

router = APIRouter()
logger = logging.getLogger(__name__)

# Repo-root/source-corpus. index.py lives at rag-service/app/api/index.py, so
# parents[3] is the repository root (matches app/core/config.py's ENV_FILE).
CORPUS_DIR = Path(__file__).resolve().parents[3] / "source-corpus"

# Plan-04 chunking constants (locked).
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# plan-04 Section 5 says index .pdf and .docx files only.
SUPPORTED_SUFFIXES = (".pdf", ".docx")

# The knowledge base is only the policy + historical-ISQ folders. Inbound
# questionnaires (they're inputs to /extract-questions, not knowledge) and stray
# root files (the assessment brief, README) also live under source-corpus and must
# NOT be indexed — they don't classify as policy/historical_isq, so sweeping them
# in would abort the whole run via detect_source_type's loud-fail guard.
KB_SUBDIRS = ("Northstar Labs Policies", "Northstar Labs Completed ISQs")


class IndexRequest(BaseModel):
    """Body for POST /index. force_reindex wipes the index before re-indexing."""

    force_reindex: bool = False


def detect_source_type(filename: str) -> str:
    """
    Classify a corpus file by filename pattern (plan-04 Section 5).

    Returns "policy", "historical_isq", or "unknown". The caller fails loudly on
    "unknown" rather than silently guessing.
    """
    if "Previous_ISQ_Completed" in filename:
        return "historical_isq"
    if "Policy" in filename:
        return "policy"
    return "unknown"


def discover_corpus_files(corpus_dir: Path = CORPUS_DIR) -> list[Path]:
    """List supported knowledge-base files (policies + historical ISQs), sorted.

    Only KB_SUBDIRS are searched, so inbound questionnaires and non-corpus files
    (the assessment brief, README) are excluded. Sorted for deterministic IDs.
    """
    files: list[Path] = []
    for subdir in KB_SUBDIRS:
        kb_dir = corpus_dir / subdir
        if kb_dir.is_dir():
            files.extend(
                p
                for p in kb_dir.rglob("*")
                if p.is_file() and p.suffix.lower() in SUPPORTED_SUFFIXES
            )
    return sorted(files)


def _short_code(filename: str) -> str:
    """
    Derive a short, stable vector-ID prefix from a filename.

    Each alphanumeric token contributes its first character, except pure-digit
    tokens which are kept whole (so ISQ numbers survive). Deterministic, so
    re-indexing the same corpus regenerates identical IDs (clean upsert replace).

        Northstar_Labs_Information_Security_Policy.pdf -> "nlisp"
        Northstar_Labs_Previous_ISQ_Completed_02.docx  -> "nlpic02"
    """
    stem = Path(filename).stem
    tokens = [t for t in stem.replace("-", "_").split("_") if t]
    parts = [t if t.isdigit() else t[0] for t in tokens]
    return "".join(parts).lower()


def _chunk_units(processed: dict[str, Any]) -> list[tuple[str, int | None]]:
    """
    Flatten a processed document into (text, page) units ready for chunking.

    PDFs carry per-page text (accurate page metadata for citations); DOCX carry
    a single text blob (page is None).
    """
    pages = processed.get("pages")
    if pages:
        return [(page.get("text", ""), page.get("page_number")) for page in pages]
    return [(processed.get("text", ""), None)]


def _build_vectors_for_document(
    filename: str, source_type: str, processed: dict[str, Any], indexed_at: str
) -> list[dict[str, Any]]:
    """
    Chunk one document and build {id, text, metadata} dicts (no embeddings yet).

    Embeddings are added in a single batched Voyage call upstream; this keeps the
    embedding round-trip to one call for the whole corpus.
    """
    code = _short_code(filename)
    vectors: list[dict[str, Any]] = []

    for text, page in _chunk_units(processed):
        chunks = chunk_text(
            text,
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
        )
        page_tag = f"p{page}-" if page is not None else ""
        for ch in chunks:
            idx = ch["chunk_index"]
            vectors.append(
                {
                    "id": f"{code}-{page_tag}c{idx}",
                    "text": ch["text"],
                    "metadata": {
                        "source": filename,
                        "source_type": source_type,
                        "section_title": None,
                        "page": page,
                        "chunk_index": idx,
                        "chunk_total": ch["total_chunks"],
                        "text": ch["text"],
                        "isq_question_text": None,
                        "indexed_at": indexed_at,
                    },
                }
            )
    return vectors


@router.post("/index")
def index_corpus(request: IndexRequest) -> dict[str, Any]:
    """Index (or re-index) the source corpus into Pinecone. See module docstring."""
    start = time.perf_counter()

    pinecone = PineconeClient()
    current_count = pinecone.describe_stats().get("total_vector_count", 0)

    if current_count > 0 and not request.force_reindex:
        logger.info("Index already populated (%d vectors) — skipping", current_count)
        return {"status": "already_indexed", "vector_count": current_count}

    if request.force_reindex and current_count > 0:
        logger.info("force_reindex — deleting %d existing vectors", current_count)
        pinecone.delete_all()

    files = discover_corpus_files()
    indexed_at = datetime.now(timezone.utc).isoformat()

    prepared: list[dict[str, Any]] = []
    documents_indexed = 0
    for path in files:
        source_type = detect_source_type(path.name)
        if source_type == "unknown":
            raise HTTPException(
                status_code=422,
                detail=f"Cannot determine source type for '{path.name}'",
            )
        processed = process_document(path)
        prepared.extend(
            _build_vectors_for_document(path.name, source_type, processed, indexed_at)
        )
        documents_indexed += 1

    voyage = VoyageClient()
    texts = [v["text"] for v in prepared]
    embeddings = voyage.embed_documents(texts) if texts else []

    vectors = [
        {"id": v["id"], "values": emb, "metadata": v["metadata"]}
        for v, emb in zip(prepared, embeddings)
    ]
    upsert_result = (
        pinecone.upsert_chunks(vectors) if vectors else {"upserted_count": 0}
    )

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "Indexed %d chunks from %d documents in %.0fms",
        upsert_result["upserted_count"],
        documents_indexed,
        elapsed_ms,
    )

    return {
        "status": "indexed",
        "chunks_indexed": upsert_result["upserted_count"],
        "documents_indexed": documents_indexed,
        "indexing_time_ms": round(elapsed_ms, 2),
        "embedding_tokens_used": voyage.tokens_used,
        "estimated_cost_usd": voyage.get_cost_estimate(),
    }
