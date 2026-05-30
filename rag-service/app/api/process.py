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
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from app.confidence.aggregator import aggregate_confidence
from app.confidence.summary import ISQSummary, summarise
from app.core.config import resolve_generation_model, settings
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
    # Optional answer-generation model (the dashboard model picker). Validated against the
    # allowlist; an unknown/None value falls back to the configured default.
    model: str | None = None


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


def _answer_one(
    question: ProcessQuestion, index: int, total: int, model: str
) -> dict[str, Any]:
    """Answer a single question, mirroring the /answer pipeline. On failure, return an
    entry with confidence=None so the caller can keep going and summarise() flags it.
    Pure + self-contained (catches its own errors), so it's safe to run in a thread pool."""
    try:
        chunks = Retriever().retrieve(question.text)
        result = AnswerGenerator(model=model).generate(
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


def assemble_and_store_run(
    origin: str,
    filename: str,
    received_at: str | None,
    questions: list[ProcessQuestion],
    model: str | None = None,
) -> dict[str, Any]:
    """Answer every question, assemble the canonical envelope, and persist it under a new
    run_id. Shared by POST /process-questionnaire (questions supplied as JSON) and POST
    /runs (questions extracted from an uploaded file). Enforces the question cap first so
    a huge questionnaire can't fan out into thousands of LLM calls (v1.1 cost guard).

    `model` is the requested answer-generation model (validated against the allowlist; bad
    or absent falls back to the default). Questions are answered CONCURRENTLY up to
    settings.answer_concurrency — each _answer_one isolates its own failure, so a flaky
    question never breaks the pool, and ordering is preserved (v1.2 perf)."""
    if len(questions) > settings.max_questions:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Too many questions ({len(questions)}); the limit is "
                f"{settings.max_questions}. Split the questionnaire and retry."
            ),
        )

    total = len(questions)
    resolved_model = resolve_generation_model(model)

    def _work(item: tuple[int, ProcessQuestion]) -> dict[str, Any]:
        position, question = item
        return _answer_one(
            question,
            index=question.index if question.index is not None else position,
            total=total,
            model=resolved_model,
        )

    items = list(enumerate(questions, start=1))
    workers = min(settings.answer_concurrency, total) if total else 1
    started = time.monotonic()
    if workers <= 1:
        answers = [_work(item) for item in items]
    else:
        # ThreadPoolExecutor.map preserves input order, so answers line up with questions.
        with ThreadPoolExecutor(max_workers=workers) as pool:
            answers = list(pool.map(_work, items))
    wall_clock_ms = (time.monotonic() - started) * 1000.0

    summary = summarise(answers)
    summary_metrics = _to_summary_metrics(summary)
    # Report the real wall-clock answering time as the run duration. The per-question
    # latencies still sum to more than this (questions run concurrently), and they remain
    # in each answer's metrics — but the user-facing duration should be how long they
    # actually waited, not the summed compute time.
    summary_metrics["total_latency_ms"] = round(wall_clock_ms, 2)
    run_id = make_run_id(filename)
    envelope = {
        "questionnaire_meta": {
            "run_id": run_id,
            "origin": origin,
            "filename": filename,
            "received_at": received_at,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "total_questions": summary.total_questions,
        },
        "answers": answers,
        "summary_metrics": summary_metrics,
    }
    # Persist so the dashboard can fetch it back via GET /runs/{run_id} (v1.1 #18).
    run_store.save(run_id, envelope)
    return envelope


@router.post("/process-questionnaire", response_model=ProcessResponse)
@limiter.limit(lambda: settings.rate_limit_heavy)
def process_questionnaire(
    payload: ProcessRequest, request: Request, response: Response
) -> dict[str, Any]:
    """Answer every question and assemble the canonical envelope. See module docstring."""
    request_id = request.headers.get("x-request-id")
    if request_id:
        response.headers["X-Request-Id"] = request_id  # echo for n8n correlation
    return assemble_and_store_run(
        payload.origin,
        payload.filename,
        payload.received_at,
        payload.questions,
        model=payload.model,
    )
