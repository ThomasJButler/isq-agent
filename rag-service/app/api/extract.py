"""
POST /extract-questions — turn an inbound questionnaire into a structured list of
questions (Plan 6).

Thin orchestrator: validate the request, flatten XLSX rows to text when needed,
delegate to the unified QuestionExtractor, and map an Anthropic outage to 503 so
the n8n workflow can retry with backoff. The response shape and deterministic
question_ids are the contract every downstream plan (answer generation, rendering)
depends on.
"""

import logging
from typing import Any, Literal

import anthropic
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from app.extraction.extractor import QuestionExtractor, flatten_xlsx_to_text

router = APIRouter()
logger = logging.getLogger(__name__)


class ExtractRequest(BaseModel):
    """
    Body for POST /extract-questions.

    source_format picks the input: a PDF's extracted text (source_text) or an
    XLSX's rows (source_rows, as supplied by n8n). The relevant field is required
    for the chosen format — enforced in the handler, not the model, so the error
    message is specific.
    """

    source_format: Literal["pdf", "xlsx_rows"]
    source_text: str | None = None
    source_rows: list[dict] | None = None
    filename: str


@router.post("/extract-questions")
def extract_questions(
    payload: ExtractRequest, request: Request, response: Response
) -> dict[str, Any]:
    """Extract questions from a PDF's text or an XLSX's rows. See module docstring."""
    request_id = request.headers.get("x-request-id")
    if request_id:
        response.headers["X-Request-Id"] = request_id  # echo for n8n correlation

    if payload.source_format == "pdf":
        if not payload.source_text:
            raise HTTPException(
                status_code=422, detail="source_text is required for pdf"
            )
        text = payload.source_text
    else:  # xlsx_rows — the Literal guarantees one of the two formats
        if not payload.source_rows:
            raise HTTPException(
                status_code=422, detail="source_rows is required for xlsx_rows"
            )
        text = flatten_xlsx_to_text(payload.source_rows, payload.filename)

    try:
        return QuestionExtractor().extract(text, payload.filename)
    except anthropic.APIError as exc:
        logger.error("Anthropic unavailable during question extraction", exc_info=True)
        raise HTTPException(
            status_code=503, detail="Question extraction unavailable. Retry shortly."
        ) from exc
