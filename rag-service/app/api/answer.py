"""
POST /answer — answer one ISQ question, grounded in the knowledge base (Plan 7).

Thin orchestrator: validate, retrieve the top-k chunks (Retriever: query_rewriter ->
Voyage -> Pinecone), then have the AnswerGenerator draft a grounded, self-scored
answer. Upstream failures map to HTTP status so n8n retries sensibly: a transient
outage (Anthropic/Voyage/Pinecone) -> 503; a permanent Anthropic error (bad key,
malformed request) -> 502. Plan 8 will fold the four self-scores into one confidence
scalar; this endpoint stops at the per-question result.
"""

import logging
from typing import Any

from anthropic import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
)
from fastapi import APIRouter, HTTPException, Request, Response
from pinecone.exceptions import PineconeException
from pydantic import BaseModel
from voyageai.error import VoyageError

from app.core.pinecone_client import PineconeIndexError
from app.rag.generator import AnswerGenerator
from app.rag.retriever import Retriever

router = APIRouter()
logger = logging.getLogger(__name__)

# Transient LLM failures worth a retry (n8n backs off on 503). Listed before the
# APIError base so permanent Anthropic errors fall through to the 502 branch.
_TRANSIENT_LLM = (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
)
# Retrieval-layer failures (Voyage embed / Pinecone query) — also transient → 503.
_RETRIEVAL_ERRORS = (VoyageError, PineconeException, PineconeIndexError)


class AnswerRequest(BaseModel):
    """Body for POST /answer. question is required; the rest are optional context."""

    question: str
    question_id: str | None = None
    index: int | None = None
    total: int | None = None


@router.post("/answer")
def answer_question(
    payload: AnswerRequest, request: Request, response: Response
) -> dict[str, Any]:
    """Retrieve grounded chunks and draft an answer. See module docstring."""
    request_id = request.headers.get("x-request-id")
    if request_id:
        response.headers["X-Request-Id"] = request_id  # echo for n8n correlation

    if not payload.question.strip():
        raise HTTPException(status_code=422, detail="question must not be blank")

    try:
        chunks = Retriever().retrieve(payload.question)
        result = AnswerGenerator().generate(
            payload.question, chunks, index=payload.index, total=payload.total
        )
    except _TRANSIENT_LLM as exc:
        logger.error("Anthropic temporarily unavailable during answer", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Answer generation temporarily unavailable. Retry shortly.",
        ) from exc
    except APIError as exc:
        logger.error(
            "Anthropic request failed (non-retryable) during answer", exc_info=True
        )
        raise HTTPException(
            status_code=502, detail="Answer generation failed due to an upstream error."
        ) from exc
    except _RETRIEVAL_ERRORS as exc:
        logger.error("Retrieval (Voyage/Pinecone) failed during answer", exc_info=True)
        raise HTTPException(
            status_code=503, detail="Retrieval temporarily unavailable. Retry shortly."
        ) from exc

    return {"question_id": payload.question_id, **result}
