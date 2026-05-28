"""
Tests for POST /extract-questions (Plan 6).

Written FIRST per TDD discipline (in the working tree). They are committed
alongside the endpoint itself because the full-suite pre-commit pytest gate needs
the route wired into app.main to go green — a separate red test commit isn't
possible without --no-verify.

The endpoint is a thin orchestrator over QuestionExtractor: validate the request,
flatten XLSX rows to text when needed, call the extractor, and map an Anthropic
outage to 503 so the n8n workflow can retry. QuestionExtractor is mocked here —
no live calls, no network.
"""

from unittest.mock import patch

import anthropic
import httpx
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


def _canned(questions=None, warnings=None):
    """A QuestionExtractor.extract() return value for the endpoint to pass through."""
    qs = (
        questions
        if questions is not None
        else [
            {"question_id": "sun-q01", "index": 1, "text": "Do you use MFA?", "page": 1}
        ]
    )
    return {
        "questions": qs,
        "total": len(qs),
        "extraction_method": "llm",
        "warnings": warnings or [],
        "metrics": {
            "tokens_in": 100,
            "tokens_out": 50,
            "cost_usd": 0.001,
            "latency_ms": 1200.0,
        },
    }


PDF_BODY = {
    "source_format": "pdf",
    "source_text": "1. Do you use MFA?",
    "filename": "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf",
}
XLSX_BODY = {
    "source_format": "xlsx_rows",
    "source_rows": [{"Question": "Do you use MFA?", "Response": ""}],
    "filename": "Simple_Salvage_Basic_ISQ.xlsx",
}


@patch("app.api.extract.QuestionExtractor")
def test_extract_endpoint_returns_200_for_pdf(mock_extractor, client):
    """Valid PDF body → 200 with the extractor's payload passed through."""
    mock_extractor.return_value.extract.return_value = _canned()

    response = client.post("/extract-questions", json=PDF_BODY)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["questions"][0]["question_id"] == "sun-q01"
    assert body["extraction_method"] == "llm"


@patch("app.api.extract.QuestionExtractor")
def test_extract_endpoint_returns_200_for_xlsx(mock_extractor, client):
    """Valid XLSX body → 200; the extractor is fed flattened text, not raw rows."""
    mock_extractor.return_value.extract.return_value = _canned()

    response = client.post("/extract-questions", json=XLSX_BODY)

    assert response.status_code == 200
    called_text = mock_extractor.return_value.extract.call_args.args[0]
    assert isinstance(called_text, str)
    assert "Do you use MFA?" in called_text


def test_extract_endpoint_returns_422_for_invalid_format(client):
    """An unsupported source_format is rejected by request validation."""
    response = client.post(
        "/extract-questions",
        json={"source_format": "txt", "source_text": "x", "filename": "x.txt"},
    )

    assert response.status_code == 422


def test_extract_endpoint_returns_422_for_missing_source_text(client):
    """pdf format without source_text is rejected (the body is incomplete)."""
    response = client.post(
        "/extract-questions",
        json={"source_format": "pdf", "filename": "x.pdf"},
    )

    assert response.status_code == 422


@patch("app.api.extract.QuestionExtractor")
def test_extract_endpoint_includes_warnings(mock_extractor, client):
    """Warnings from the extractor surface in the response body."""
    mock_extractor.return_value.extract.return_value = _canned(
        questions=[], warnings=["no_questions_detected"]
    )

    response = client.post("/extract-questions", json=PDF_BODY)

    assert response.status_code == 200
    assert "no_questions_detected" in response.json()["warnings"]


@patch("app.api.extract.QuestionExtractor")
def test_extract_endpoint_propagates_request_id(mock_extractor, client):
    """An inbound X-Request-Id is echoed back for n8n correlation."""
    mock_extractor.return_value.extract.return_value = _canned()

    response = client.post(
        "/extract-questions", json=PDF_BODY, headers={"X-Request-Id": "abc-123"}
    )

    assert response.status_code == 200
    assert response.headers.get("x-request-id") == "abc-123"


@patch("app.api.extract.QuestionExtractor")
def test_extract_endpoint_handles_anthropic_failure(mock_extractor, client):
    """An Anthropic API outage maps to 503 so n8n retries with backoff."""
    mock_extractor.return_value.extract.side_effect = anthropic.APIConnectionError(
        request=httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    )

    response = client.post("/extract-questions", json=PDF_BODY)

    assert response.status_code == 503
