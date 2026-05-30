"""
Tests for the v1.1 cost-protection layer — the app-side guards that sit in front
of the Anthropic workspace rate limits + monthly spend cap on the free hosted deploy.

Written FIRST per TDD discipline. Three concerns:
  - a question cap on /process-questionnaire (the expensive endpoint — one LLM
    generation per question), rejected BEFORE any retrieval/generation runs;
  - an upload-size cap on /render's optional source workbook;
  - per-IP rate limiting (slowapi) returning a clean 429 — added in Phase B.

The question-cap tests build a local app from process.router (the
test_process_questionnaire_endpoint precedent) so they stay independent of main.py.
The upload-size test goes through app.main, where /render lives.
"""

import json
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import settings

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@pytest.fixture
def process_client():
    from app.api.process import router

    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as c:
        yield c


def _questions(n):
    return [
        {"question_id": f"q{i:02d}", "text": f"Question {i}?", "index": i}
        for i in range(1, n + 1)
    ]


def _request(questions):
    return {
        "origin": "Test Co",
        "filename": "test.pdf",
        "received_at": None,
        "questions": questions,
    }


def _ok_result():
    return {
        "answer": "Yes, we do.",
        "citations": [],
        "self_score": {
            "cites_policy": 1.0,
            "on_topic": 1.0,
            "vendor_tone": 1.0,
            "complete": 1.0,
        },
        "needs_review_reason": None,
        "metrics": {
            "tokens_in": 10,
            "tokens_out": 5,
            "cost_usd": 0.001,
            "latency_ms": 100.0,
        },
    }


class TestQuestionCap:
    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_rejects_more_than_max_questions(
        self, mock_retriever, mock_generator, process_client, monkeypatch
    ):
        monkeypatch.setattr(settings, "max_questions", 2)
        resp = process_client.post(
            "/process-questionnaire", json=_request(_questions(3))
        )
        assert resp.status_code == 413
        # The cap must fire BEFORE any expensive retrieval/generation runs.
        mock_retriever.return_value.retrieve.assert_not_called()
        mock_generator.return_value.generate.assert_not_called()

    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_allows_up_to_max_questions(
        self, mock_retriever, mock_generator, process_client, monkeypatch
    ):
        monkeypatch.setattr(settings, "max_questions", 2)
        mock_retriever.return_value.retrieve.return_value = [
            {"id": "c0", "score": 0.9, "metadata": {"text": "x"}}
        ]
        mock_generator.return_value.generate.return_value = _ok_result()
        resp = process_client.post(
            "/process-questionnaire", json=_request(_questions(2))
        )
        assert resp.status_code == 200


def _min_envelope():
    return {
        "questionnaire_meta": {
            "origin": "X",
            "filename": "x.pdf",
            "received_at": None,
            "completed_at": "2026-01-01T00:00:00Z",
            "total_questions": 0,
        },
        "answers": [],
        "summary_metrics": {
            "total_cost_usd": 0,
            "total_tokens": 0,
            "total_latency_ms": 0,
            "questions_flagged_for_review": 0,
            "average_confidence": 0,
            "flagged_question_indices": [],
            "banner": None,
        },
    }


class TestUploadSize:
    def test_rejects_oversized_source(self, monkeypatch):
        from app.main import app

        monkeypatch.setattr(settings, "max_upload_mb", 1)
        client = TestClient(app)
        big = b"x" * (2 * 1024 * 1024)  # 2 MB, over the 1 MB cap
        resp = client.post(
            "/render",
            data={"format": "xlsx", "envelope": json.dumps(_min_envelope())},
            files={"source": ("big.xlsx", big, XLSX_MIME)},
        )
        assert resp.status_code == 413


class TestRateLimit:
    def test_returns_429_when_per_ip_limit_exceeded(self, monkeypatch):
        from app.core.rate_limit import limiter
        from app.main import app

        # Re-enable the limiter (the autouse conftest fixture disables it), tighten the
        # limit, and clear the window so earlier calls don't count against this test.
        limiter.enabled = True
        limiter.reset()
        monkeypatch.setattr(settings, "rate_limit_default", "2/minute")

        client = TestClient(app)
        with (
            patch("app.api.answer.Retriever") as mock_retriever,
            patch("app.api.answer.AnswerGenerator") as mock_generator,
        ):
            mock_retriever.return_value.retrieve.return_value = [
                {"id": "c0", "score": 0.9, "metadata": {"text": "x"}}
            ]
            mock_generator.return_value.generate.return_value = _ok_result()
            statuses = [
                client.post(
                    "/answer", json={"question": "Do you encrypt data at rest?"}
                ).status_code
                for _ in range(3)
            ]

        assert statuses[0] == 200  # under the 2/minute limit
        assert statuses[-1] == 429  # third call is throttled with a clean 429
