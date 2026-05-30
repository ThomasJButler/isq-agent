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


class TestCreateRunFromFile:
    @patch("app.api.process.AnswerGenerator")
    @patch("app.api.process.Retriever")
    @patch("app.api.runs.QuestionExtractor")
    @patch("app.api.runs.process_document")
    def test_pdf_upload_runs_end_to_end(
        self, mock_process_document, mock_extractor, mock_retriever, mock_generator
    ):
        # Mock the I/O seams: PDF text extraction, question extraction, retrieval, generation.
        mock_process_document.return_value = {
            "text": "1. Do you encrypt data at rest?",
            "page_count": 1,
            "pages": [],
        }
        mock_extractor.return_value.extract.return_value = {
            "questions": [
                {
                    "question_id": "q1",
                    "index": 1,
                    "text": "Do you encrypt data at rest?",
                }
            ]
        }
        mock_retriever.return_value.retrieve.return_value = [
            {"id": "c0", "score": 0.9, "metadata": {"text": "x"}}
        ]
        mock_generator.return_value.generate.return_value = _ok_result()

        resp = client.post(
            "/runs",
            files={"file": ("sunflowers.pdf", b"%PDF-1.4 fake", "application/pdf")},
        )
        assert resp.status_code == 200
        run_id = resp.json()["questionnaire_meta"]["run_id"]
        assert run_id
        assert resp.json()["answers"][0]["answer"] == "Yes, we do."

        # The freshly created run is fetchable.
        got = client.get(f"/runs/{run_id}")
        assert got.status_code == 200
        assert got.json()["questionnaire_meta"]["run_id"] == run_id

    def test_rejects_unsupported_file_type(self):
        resp = client.post(
            "/runs", files={"file": ("notes.txt", b"hello", "text/plain")}
        )
        assert resp.status_code == 415

    @patch("app.api.runs.QuestionExtractor")
    @patch("app.api.runs.process_document")
    def test_returns_422_when_no_questions_found(
        self, mock_process_document, mock_extractor
    ):
        mock_process_document.return_value = {
            "text": "some text",
            "page_count": 1,
            "pages": [],
        }
        mock_extractor.return_value.extract.return_value = {"questions": []}
        resp = client.post(
            "/runs", files={"file": ("empty.pdf", b"%PDF", "application/pdf")}
        )
        assert resp.status_code == 422
