"""
Tests for POST /process-questionnaire (Plan 9 assembler).

Written FIRST per TDD discipline. The assembler is the integration capstone: it loops the
/answer logic (Retriever -> AnswerGenerator -> aggregate_confidence) over a whole
questionnaire and folds the per-question results into the single canonical envelope every
renderer consumes. Only the I/O seams (Retriever, AnswerGenerator) are mocked — the real
aggregate_confidence and summarise run, so these pin the actual contract end to end:
per-answer shape, the ISQSummary -> summary_metrics field mapping, per-question failure
isolation (confidence=null, the run still completes), and the run-level banner.

The client fixture builds a local FastAPI app from process.router rather than importing
app.main. That keeps the test-only TDD commit green under the pre-commit pytest hook (the
brand-new process.py is untracked-but-present; main.py's router registration is not needed
for these tests and is exercised by the live service).
"""

from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.api.process import router

    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as c:
        yield c


# Helpers

_STRONG = {"cites_policy": 1.0, "on_topic": 1.0, "vendor_tone": 0.95, "complete": 1.0}
_WEAK = {"cites_policy": 0.3, "on_topic": 0.3, "vendor_tone": 0.3, "complete": 0.3}


def _result(
    answer="Yes, we maintain that control.",
    self_score=None,
    *,
    cost=0.004,
    tin=1000,
    tout=80,
    latency=1500.0,
    review_reason=None,
):
    """An AnswerGenerator.generate() return value for the assembler to consume."""
    return {
        "answer": answer,
        "citations": [{"source_id": "isp-s0", "text_snippet": "Northstar Labs..."}],
        "self_score": dict(self_score) if self_score is not None else dict(_STRONG),
        "needs_review_reason": review_reason,
        "metrics": {
            "tokens_in": tin,
            "tokens_out": tout,
            "cost_usd": cost,
            "latency_ms": latency,
        },
    }


def _chunk(score=0.9):
    return [
        {
            "id": "c0",
            "score": score,
            "metadata": {"text": "MFA is mandatory.", "page": 3},
        }
    ]


def _setup(mock_retriever, mock_generator, *, results, chunk_score=0.9):
    """Wire the patched Retriever + AnswerGenerator. results is one item per question;
    a result that is an Exception is raised by generate() to simulate a failed question."""
    mock_retriever.return_value.retrieve.return_value = _chunk(chunk_score)
    mock_generator.return_value.generate.side_effect = results


def _questions(n):
    return [
        {"question_id": f"sun-q{i:02d}", "text": f"Question {i}?", "index": i}
        for i in range(1, n + 1)
    ]


def _request(questions):
    return {
        "origin": "Sunflowers Charity",
        "filename": "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf",
        "received_at": "2026-05-29T10:00:00Z",
        "questions": questions,
    }


# Tests


class TestProcessQuestionnaire:
    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_processes_all_questions_in_order(
        self, mock_retriever, mock_generator, client
    ):
        _setup(
            mock_retriever,
            mock_generator,
            results=[_result(answer="A1"), _result(answer="A2"), _result(answer="A3")],
        )
        resp = client.post("/process-questionnaire", json=_request(_questions(3)))
        assert resp.status_code == 200
        answers = resp.json()["answers"]
        assert [a["question_id"] for a in answers] == ["sun-q01", "sun-q02", "sun-q03"]
        assert [a["answer"] for a in answers] == ["A1", "A2", "A3"]
        assert [a["question_text"] for a in answers] == [
            "Question 1?",
            "Question 2?",
            "Question 3?",
        ]

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_builds_questionnaire_meta(self, mock_retriever, mock_generator, client):
        _setup(mock_retriever, mock_generator, results=[_result(), _result()])
        resp = client.post("/process-questionnaire", json=_request(_questions(2)))
        meta = resp.json()["questionnaire_meta"]
        assert meta["origin"] == "Sunflowers Charity"
        assert meta["filename"] == "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf"
        assert meta["received_at"] == "2026-05-29T10:00:00Z"
        assert meta["total_questions"] == 2
        assert meta["completed_at"]  # an ISO timestamp is stamped at completion

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_per_answer_canonical_shape(self, mock_retriever, mock_generator, client):
        _setup(mock_retriever, mock_generator, results=[_result()])
        resp = client.post("/process-questionnaire", json=_request(_questions(1)))
        answer = resp.json()["answers"][0]
        assert set(answer) == {
            "question_id",
            "question_text",
            "answer",
            "citations",
            "confidence",
            "metrics",
        }
        assert set(answer["confidence"]) == {
            "score",
            "dimensions",
            "needs_review",
            "review_reason",
        }
        assert answer["confidence"]["needs_review"] is False
        assert {"tokens_in", "tokens_out", "cost_usd", "latency_ms"} <= set(
            answer["metrics"]
        )

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_maps_summary_metrics(self, mock_retriever, mock_generator, client):
        _setup(
            mock_retriever,
            mock_generator,
            results=[
                _result(cost=0.004, tin=1000, tout=80, latency=1500.0),
                _result(cost=0.002, tin=500, tout=40, latency=900.0),
            ],
        )
        resp = client.post("/process-questionnaire", json=_request(_questions(2)))
        sm = resp.json()["summary_metrics"]
        assert sm["total_cost_usd"] == pytest.approx(0.006)
        # total_tokens is the sum of in + out across all questions
        assert sm["total_tokens"] == 1000 + 80 + 500 + 40
        assert sm["total_latency_ms"] == pytest.approx(2400.0)
        assert sm["questions_flagged_for_review"] == 0
        assert sm["banner"] is None
        assert "average_confidence" in sm
        assert sm["flagged_question_indices"] == []

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_flags_low_confidence_question(
        self, mock_retriever, mock_generator, client
    ):
        _setup(
            mock_retriever,
            mock_generator,
            results=[
                _result(self_score=_STRONG),
                _result(self_score=_WEAK),
                _result(self_score=_STRONG),
            ],
        )
        resp = client.post("/process-questionnaire", json=_request(_questions(3)))
        body = resp.json()
        assert body["answers"][1]["confidence"]["needs_review"] is True
        sm = body["summary_metrics"]
        assert sm["questions_flagged_for_review"] == 1
        assert sm["flagged_question_indices"] == [2]  # 1-based question number
        assert sm["banner"] is None

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_all_flagged_sets_banner(self, mock_retriever, mock_generator, client):
        _setup(
            mock_retriever,
            mock_generator,
            results=[_result(self_score=_WEAK), _result(self_score=_WEAK)],
        )
        resp = client.post("/process-questionnaire", json=_request(_questions(2)))
        assert resp.json()["summary_metrics"]["banner"] == "all_flagged"

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_per_question_failure_isolated(
        self, mock_retriever, mock_generator, client
    ):
        # Q2's generation raises; Q1 and Q3 still complete and the run returns 200.
        _setup(
            mock_retriever,
            mock_generator,
            results=[
                _result(answer="A1"),
                RuntimeError("anthropic exploded"),
                _result(answer="A3"),
            ],
        )
        resp = client.post("/process-questionnaire", json=_request(_questions(3)))
        assert resp.status_code == 200
        answers = resp.json()["answers"]
        assert answers[0]["answer"] == "A1"
        assert answers[2]["answer"] == "A3"
        assert (
            answers[1]["confidence"] is None
        )  # failed question carries null confidence
        assert answers[0]["confidence"]["needs_review"] is False
        assert answers[2]["confidence"]["needs_review"] is False
        sm = resp.json()["summary_metrics"]
        assert sm["questions_flagged_for_review"] == 1
        assert 2 in sm["flagged_question_indices"]

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_all_failed_sets_banner(self, mock_retriever, mock_generator, client):
        _setup(
            mock_retriever,
            mock_generator,
            results=[RuntimeError("boom"), RuntimeError("boom")],
        )
        resp = client.post("/process-questionnaire", json=_request(_questions(2)))
        body = resp.json()
        assert all(a["confidence"] is None for a in body["answers"])
        assert body["summary_metrics"]["banner"] == "all_failed"

    def test_empty_questionnaire(self, client):
        resp = client.post("/process-questionnaire", json=_request([]))
        assert resp.status_code == 200
        body = resp.json()
        assert body["answers"] == []
        assert body["questionnaire_meta"]["total_questions"] == 0
        assert body["summary_metrics"]["questions_flagged_for_review"] == 0
        assert body["summary_metrics"]["banner"] is None

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_passes_question_index_to_generator(
        self, mock_retriever, mock_generator, client
    ):
        # The question's own index is honoured, not just the list position.
        _setup(mock_retriever, mock_generator, results=[_result(), _result()])
        questions = [
            {"question_id": "sun-q05", "text": "Q five?", "index": 5},
            {"question_id": "sun-q06", "text": "Q six?", "index": 6},
        ]
        client.post("/process-questionnaire", json=_request(questions))
        indices = [
            call.kwargs["index"]
            for call in mock_generator.return_value.generate.call_args_list
        ]
        assert indices == [5, 6]

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_echoes_request_id(self, mock_retriever, mock_generator, client):
        # An inbound X-Request-Id is echoed back for n8n correlation (like /answer).
        _setup(mock_retriever, mock_generator, results=[_result()])
        resp = client.post(
            "/process-questionnaire",
            json=_request(_questions(1)),
            headers={"X-Request-Id": "isq-run-42"},
        )
        assert resp.status_code == 200
        assert resp.headers.get("x-request-id") == "isq-run-42"
