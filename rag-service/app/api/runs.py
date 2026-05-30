"""Run endpoints (v1.1).

- POST /runs        — ingest an uploaded questionnaire file (the dashboard upload path):
                      extract its text, extract the questions, answer them, store the run.
- GET  /runs/{id}   — fetch a stored run by id (the results screen reads this).

POST /runs is the browser-driven equivalent of the n8n flow: the dashboard posts the raw
PDF (or DOCX/XLSX) straight here, and the service reuses the same document_processor +
QuestionExtractor + answer assembler the rest of the pipeline uses. The envelope returned
is the canonical shape every renderer + the dashboard consume.
"""

import asyncio
import logging
import shutil
import tempfile
from pathlib import Path
from typing import Any

from anthropic import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
)
from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile

from app.api.process import ProcessQuestion, assemble_and_store_run
from app.core.config import settings
from app.core.rate_limit import limiter
from app.extraction.extractor import QuestionExtractor, flatten_xlsx_to_text
from app.runs.store import run_store
from app.utils.document_processor import DocumentProcessingError, process_document

router = APIRouter()
logger = logging.getLogger(__name__)

# Files the document_processor can read. PDF is the challenge's stated input; DOCX/XLSX
# round it out for the historical-ISQ formats.
_SUPPORTED_SUFFIXES = {".pdf", ".docx", ".xlsx"}

# Stream uploads to disk in 64 KB chunks so the size cap is enforced as we read, rather
# than buffering the whole (untrusted) body into memory first.
_CHUNK_BYTES = 64 * 1024

# Transient Anthropic failures worth a retry (mirrors /extract-questions): map to 503.
_TRANSIENT_LLM = (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
)


@router.post("/runs")
@limiter.limit(lambda: settings.rate_limit_heavy)
async def create_run_from_file(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    origin: str = Form("Uploaded questionnaire"),
    model: str | None = Form(None),
) -> dict[str, Any]:
    """Ingest an uploaded questionnaire end to end: extract text -> extract questions ->
    answer -> store. Returns the canonical envelope (with run_id) for the dashboard to
    navigate to. Cost-guarded by the upload-size cap (here) and the question cap (in the
    shared assembler)."""
    request_id = request.headers.get("x-request-id")
    if request_id:
        response.headers["X-Request-Id"] = request_id

    # The upload-size cost guard lives in MaxBodySizeMiddleware (app.core.body_limit), which
    # caps the body on the raw ASGI stream before Starlette buffers the file part to disk.
    # By the time this handler runs the body is already bounded, so we just stream it out.
    filename = file.filename or "questionnaire"
    suffix = Path(filename).suffix.lower()
    if suffix not in _SUPPORTED_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Upload a PDF, DOCX or XLSX questionnaire.",
        )

    tmp_dir = Path(tempfile.mkdtemp(prefix="isq-ingest-"))
    try:
        tmp_path = tmp_dir / f"upload{suffix}"
        # Copy to disk in chunks so a large-but-allowed file is streamed, not read whole
        # into memory.
        with open(tmp_path, "wb") as fh:
            while chunk := await file.read(_CHUNK_BYTES):
                fh.write(chunk)

        try:
            # process_document parses the PDF/DOCX/XLSX synchronously; offload it so the
            # blocking read doesn't stall the event loop (and every other request on it).
            processed = await asyncio.to_thread(process_document, tmp_path)
        except (ValueError, DocumentProcessingError) as exc:
            # Log the underlying parser error server-side; return a generic message so raw
            # pypdf/docx/openpyxl exception text isn't leaked to this public endpoint.
            logger.error("Failed to read uploaded document", exc_info=True)
            raise HTTPException(
                status_code=422,
                detail="Couldn't read the document. Make sure it's a valid PDF, DOCX or XLSX.",
            ) from exc

        # PDF/DOCX yield text directly; XLSX yields rows we flatten to text for extraction.
        if processed.get("text"):
            source_text = processed["text"]
        elif processed.get("rows"):
            source_text = flatten_xlsx_to_text(processed["rows"], filename)
        else:
            source_text = ""
        if not source_text.strip():
            raise HTTPException(
                status_code=422,
                detail="No text could be extracted from the document.",
            )

        try:
            # The extractor makes a blocking Anthropic call; offload it off the event loop.
            extractor = QuestionExtractor()
            extracted = await asyncio.to_thread(
                extractor.extract, source_text, filename
            )
        except _TRANSIENT_LLM as exc:
            logger.error("Anthropic unavailable during extraction", exc_info=True)
            raise HTTPException(
                status_code=503,
                detail="Question extraction temporarily unavailable. Retry shortly.",
            ) from exc
        except APIError as exc:
            logger.error("Anthropic request failed during extraction", exc_info=True)
            raise HTTPException(
                status_code=502,
                detail="Question extraction failed due to an upstream error.",
            ) from exc

        questions = [
            ProcessQuestion(
                question_id=q["question_id"], text=q["text"], index=q.get("index")
            )
            for q in extracted.get("questions", [])
        ]
        if not questions:
            raise HTTPException(
                status_code=422,
                detail="No questions were found in the document.",
            )

        # assemble_and_store_run runs the full per-question Retriever -> AnswerGenerator
        # loop (many blocking LLM calls); offload the whole thing off the event loop.
        return await asyncio.to_thread(
            assemble_and_store_run,
            origin=origin,
            filename=filename,
            received_at=None,
            questions=questions,
            model=model,
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@router.get("/runs/{run_id}")
@limiter.limit(lambda: settings.rate_limit_default)
def get_run(run_id: str, request: Request) -> dict[str, Any]:
    """Return the stored canonical envelope for run_id, or 404 if unknown/expired."""
    envelope = run_store.get(run_id)
    if envelope is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No run found for id '{run_id}'. Runs are kept in memory and "
                "don't survive a service restart."
            ),
        )
    return envelope
