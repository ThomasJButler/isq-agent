"""
POST /process-questionnaire — answer a whole ISQ and assemble the canonical envelope (Plan 9).

The integration capstone. /answer handles one question; this loops that same logic
(Retriever -> AnswerGenerator -> aggregate_confidence) over a questionnaire's extracted
questions, then folds the per-question results into the single canonical envelope
(questionnaire_meta + answers[] + summary_metrics) that every renderer — DOCX, XLSX, JSON —
consumes.

Per-question generation failure is isolated, not fatal: a question whose generation raises
gets an answer entry with confidence=null and the rest of the questionnaire still completes.
summarise() is built for exactly this — it counts a null-confidence answer as failed and
flagged, and leaves it out of the average — so a flaky question becomes a visible
"needs review" line rather than a crashed run. The failure is logged (not swallowed) and
surfaced in the output, never silently dropped.

The ISQSummary the confidence layer produces uses split token counts and a flagged_count;
the canonical contract uses a single total_tokens and questions_flagged_for_review. The
mapping between the two lives here (see _to_summary_metrics).
"""

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from app.confidence.aggregator import aggregate_confidence
from app.confidence.summary import ISQSummary, summarise
from app.core.config import settings
from app.core.rate_limit import limiter
from app.rag.generator import AnswerGenerator
from app.rag.retriever import Retriever
from app.runs.store import make_run_id, run_store

router = APIRouter()
logger = logging.getLogger(__name__)

# Metrics recorded for a question whose generation gave up — a real failure has no cost.
_FAILED_METRICS = {"tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0, "latency_ms": 0.0}


class ProcessQuestion(BaseModel):
    """One extracted question to answer. Mirrors /extract-questions output (text + id)."""

    question_id: str
    text: str
    index: int | None = None


class ProcessRequest(BaseModel):
    """Body for POST /process-questionnaire: the questionnaire metadata + its questions."""

    origin: str
    filename: str
    received_at: str | None = None
    questions: list[ProcessQuestion]


class CanonicalConfidence(BaseModel):
    """Per-answer confidence (Plan 8). Null on a question whose generation failed."""

    score: float
    dimensions: dict[str, float]
    needs_review: bool
    review_reason: str | None


class CanonicalAnswer(BaseModel):
    """One answered question in the canonical envelope."""

    question_id: str | None
    question_text: str
    answer: str
    citations: list[dict[str, Any]]
    confidence: CanonicalConfidence | None
    metrics: dict[str, Any]


class QuestionnaireMeta(BaseModel):
    """Run-level provenance for the rendered outputs."""

    run_id: str
    origin: str
    filename: str
    received_at: str | None
    completed_at: str
    total_questions: int


class SummaryMetrics(BaseModel):
    """Run-level roll-up consumed by the renderers (and downstream systems via JSON)."""

    total_cost_usd: float
    total_tokens: int
    total_latency_ms: float
    questions_flagged_for_review: int
    average_confidence: float
    flagged_question_indices: list[int]
    banner: str | None


class ProcessResponse(BaseModel):
    """The canonical envelope every renderer consumes."""

    questionnaire_meta: QuestionnaireMeta
    answers: list[CanonicalAnswer]
    summary_metrics: SummaryMetrics


def _answer_one(question: ProcessQuestion, index: int, total: int) -> dict[str, Any]:
    """Answer a single question, mirroring the /answer pipeline. On failure, return an
    entry with confidence=None so the caller can keep going and summarise() flags it."""
    try:
        chunks = Retriever().retrieve(question.text)
        result = AnswerGenerator().generate(
            question.text, chunks, index=index, total=total
        )
        confidence = aggregate_confidence(
            self_score=result["self_score"],
            top_chunk_score=chunks[0]["score"] if chunks else 0.0,
            llm_review_reason=result["needs_review_reason"],
        )
        return {
            "question_id": question.question_id,
            "question_text": question.text,
            "answer": result["answer"],
            "citations": result["citations"],
            "confidence": {
                "score": confidence.score,
                "dimensions": confidence.dimensions,
                "needs_review": confidence.needs_review,
                "review_reason": confidence.review_reason,
            },
            "metrics": result["metrics"],
        }
    except Exception:
        # Isolate the failure: log it, flag the question, let the run continue.
        logger.exception(
            "Question %s failed to generate; flagging for review", question.question_id
        )
        return {
            "question_id": question.question_id,
            "question_text": question.text,
            "answer": "",
            "citations": [],
            "confidence": None,
            "metrics": dict(_FAILED_METRICS),
        }


def _to_summary_metrics(summary: ISQSummary) -> dict[str, Any]:
    """Map the confidence layer's ISQSummary onto the canonical summary_metrics shape."""
    return {
        "total_cost_usd": summary.total_cost_usd,
        "total_tokens": summary.total_tokens_in + summary.total_tokens_out,
        "total_latency_ms": summary.total_latency_ms,
        "questions_flagged_for_review": summary.flagged_count,
        "average_confidence": summary.average_confidence,
        "flagged_question_indices": summary.flagged_question_indices,
        "banner": summary.banner,
    }


@router.post("/process-questionnaire", response_model=ProcessResponse)
@limiter.limit(lambda: settings.rate_limit_heavy)
def process_questionnaire(
    payload: ProcessRequest, request: Request, response: Response
) -> dict[str, Any]:
    """Answer every question and assemble the canonical envelope. See module docstring."""
    request_id = request.headers.get("x-request-id")
    if request_id:
        response.headers["X-Request-Id"] = request_id  # echo for n8n correlation

    # Cost guard: cap the number of questions before any retrieval/generation, so a
    # huge questionnaire can't fan out into thousands of LLM calls (v1.1).
    if len(payload.questions) > settings.max_questions:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Too many questions ({len(payload.questions)}); the limit is "
                f"{settings.max_questions}. Split the questionnaire and retry."
            ),
        )

    total = len(payload.questions)
    answers = [
        _answer_one(
            question,
            index=question.index if question.index is not None else position,
            total=total,
        )
        for position, question in enumerate(payload.questions, start=1)
    ]

    summary = summarise(answers)
    run_id = make_run_id(payload.filename)
    envelope = {
        "questionnaire_meta": {
            "run_id": run_id,
            "origin": payload.origin,
            "filename": payload.filename,
            "received_at": payload.received_at,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "total_questions": summary.total_questions,
        },
        "answers": answers,
        "summary_metrics": _to_summary_metrics(summary),
    }
    # Persist so the dashboard can fetch it back via GET /runs/{run_id} (v1.1 #18).
    run_store.save(run_id, envelope)
    return envelope
