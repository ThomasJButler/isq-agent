"""Tests for GET /runs/{id} and the process -> store -> fetch round-trip (v1.1 #18).

/process-questionnaire now stamps a run_id into questionnaire_meta and saves the
envelope; the dashboard fetches it back via GET /runs/{id} to render real answers.
Written FIRST (TDD).
"""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.runs.store import run_store

client = TestClient(app)


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


class TestGetRun:
    def test_returns_stored_envelope(self):
        env = {
            "questionnaire_meta": {
                "run_id": "abc-123",
                "origin": "Sunflowers",
                "filename": "sun.pdf",
                "received_at": None,
                "completed_at": "2026-01-01T00:00:00Z",
                "total_questions": 0,
            },
            "answers": [],
            "summary_metrics": {"banner": None},
        }
        run_store.save("abc-123", env)
        resp = client.get("/runs/abc-123")
        assert resp.status_code == 200
        assert resp.json()["questionnaire_meta"]["origin"] == "Sunflowers"

    def test_unknown_run_id_404(self):
        resp = client.get("/runs/does-not-exist-xyz")
        assert resp.status_code == 404


class TestProcessStoresRun:
    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    def test_process_returns_run_id_and_is_retrievable(
        self, mock_retriever, mock_generator
    ):
        mock_retriever.return_value.retrieve.return_value = [
            {"id": "c0", "score": 0.9, "metadata": {"text": "x"}}
        ]
        mock_generator.return_value.generate.return_value = _ok_result()
        payload = {
            "origin": "Sunflowers",
            "filename": "sun.pdf",
            "received_at": None,
            "questions": [{"question_id": "q1", "text": "Q?", "index": 1}],
        }
        resp = client.post("/process-questionnaire", json=payload)
        assert resp.status_code == 200
        run_id = resp.json()["questionnaire_meta"]["run_id"]
        assert run_id

        got = client.get(f"/runs/{run_id}")
        assert got.status_code == 200
        assert got.json()["questionnaire_meta"]["run_id"] == run_id
        assert got.json()["answers"][0]["answer"] == "Yes, we do."
