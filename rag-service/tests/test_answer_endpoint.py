"""
Tests for POST /answer (Plan 7).

Written FIRST per TDD discipline; committed alongside the endpoint (the route must
be wired into app.main to go green, and --no-verify is banned). The endpoint
orchestrates Retriever + AnswerGenerator, both mocked here — no live calls. These
pin the contract: 200 + canonical body, 422 on a missing/blank question, the
X-Request-Id echo, question_id echo, and the transient-503 / permanent-502 mapping.
"""

from unittest.mock import patch

import anthropic
import httpx
import pinecone.exceptions
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


def _canned():
    """An AnswerGenerator.generate() return value for the endpoint to pass through."""
    return {
        "answer": "Yes. Multi-factor authentication is mandatory across our systems.",
        "citations": [{"source_id": "nlisp-p3-c0", "text_snippet": "MFA is mandatory"}],
        "self_score": {
            "cites_policy": 1.0,
            "on_topic": 1.0,
            "vendor_tone": 0.95,
            "complete": 1.0,
        },
        "needs_review_reason": None,
        "metrics": {
            "tokens_in": 1850,
            "tokens_out": 180,
            "cost_usd": 0.0083,
            "latency_ms": 2400,
        },
    }


def _setup(
    mock_retriever,
    mock_generator,
    *,
    chunks=None,
    result=None,
    retrieve_error=None,
    generate_error=None,
):
    """Wire the patched Retriever + AnswerGenerator for the endpoint."""
    retriever = mock_retriever.return_value
    if retrieve_error is not None:
        retriever.retrieve.side_effect = retrieve_error
    else:
        retriever.retrieve.return_value = (
            chunks
            if chunks is not None
            else [
                {
                    "id": "nlisp-p3-c0",
                    "score": 0.9,
                    "metadata": {
                        "source": "Northstar_Labs_Information_Security_Policy.pdf",
                        "source_type": "policy",
                        "text": "MFA is mandatory.",
                        "page": 3,
                    },
                }
            ]
        )
    generator = mock_generator.return_value
    if generate_error is not None:
        generator.generate.side_effect = generate_error
    else:
        generator.generate.return_value = result if result is not None else _canned()
    return retriever, generator


@patch("app.api.answer.AnswerGenerator")
@patch("app.api.answer.Retriever")
def test_answer_endpoint_returns_200(mock_retriever, mock_generator, client):
    """Valid request → 200 with the canonical answer body."""
    _setup(mock_retriever, mock_generator)

    response = client.post("/answer", json={"question": "Do you enforce MFA?"})

    assert response.status_code == 200
    body = response.json()
    assert body["answer"]
    # Plan 8: response_model folds the four self-scores into a confidence object and
    # filters the now-internal top-level self_score / needs_review_reason out.
    assert "citations" in body and "confidence" in body and "metrics" in body
    assert "self_score" not in body
    assert {"score", "dimensions", "needs_review", "review_reason"} <= set(
        body["confidence"]
    )


@patch("app.api.answer.AnswerGenerator")
@patch("app.api.answer.Retriever")
def test_answer_endpoint_confidence_not_flagged_on_strong_answer(
    mock_retriever, mock_generator, client
):
    """A strong, grounded answer (canned fixture) is not flagged for review."""
    _setup(mock_retriever, mock_generator)

    response = client.post("/answer", json={"question": "Do you enforce MFA?"})

    confidence = response.json()["confidence"]
    assert confidence["needs_review"] is False
    assert confidence["review_reason"] is None
    assert set(confidence["dimensions"]) == {
        "cites_policy",
        "on_topic",
        "vendor_tone",
        "complete",
    }


@patch("app.api.answer.AnswerGenerator")
@patch("app.api.answer.Retriever")
def test_answer_endpoint_flags_low_confidence_answer(
    mock_retriever, mock_generator, client
):
    """A weak self-score aggregates below threshold → confidence flags for review."""
    weak = _canned()
    weak["self_score"] = {
        "cites_policy": 0.3,
        "on_topic": 0.3,
        "vendor_tone": 0.3,
        "complete": 0.3,
    }
    _setup(mock_retriever, mock_generator, result=weak)

    response = client.post("/answer", json={"question": "Do you enforce MFA?"})

    confidence = response.json()["confidence"]
    assert confidence["needs_review"] is True
    assert confidence["review_reason"]


@patch("app.api.answer.AnswerGenerator")
@patch("app.api.answer.Retriever")
def test_answer_endpoint_applies_retrieval_sanity_check(
    mock_retriever, mock_generator, client
):
    """A weak top chunk + an over-confident cites_policy → cites_policy is downgraded."""
    weak_chunk = [{"id": "c0", "score": 0.6, "metadata": {"text": "x", "page": 1}}]
    _setup(
        mock_retriever, mock_generator, chunks=weak_chunk
    )  # canned cites_policy = 1.0

    response = client.post("/answer", json={"question": "Do you enforce MFA?"})

    dimensions = response.json()["confidence"]["dimensions"]
    assert dimensions["cites_policy"] == pytest.approx(0.8)


def test_answer_endpoint_returns_422_for_missing_question(client):
    """A body with no question is rejected by request validation."""
    response = client.post("/answer", json={})

    assert response.status_code == 422


def test_answer_endpoint_returns_422_for_blank_question(client):
    """A whitespace-only question is rejected at the boundary."""
    response = client.post("/answer", json={"question": "   "})

    assert response.status_code == 422


@patch("app.api.answer.AnswerGenerator")
@patch("app.api.answer.Retriever")
def test_answer_endpoint_propagates_request_id(mock_retriever, mock_generator, client):
    """An inbound X-Request-Id is echoed back for n8n correlation."""
    _setup(mock_retriever, mock_generator)

    response = client.post(
        "/answer", json={"question": "Q?"}, headers={"X-Request-Id": "abc-123"}
    )

    assert response.status_code == 200
    assert response.headers.get("x-request-id") == "abc-123"


@patch("app.api.answer.AnswerGenerator")
@patch("app.api.answer.Retriever")
def test_answer_endpoint_echoes_question_id(mock_retriever, mock_generator, client):
    """The question_id from the request is echoed in the response."""
    _setup(mock_retriever, mock_generator)

    response = client.post("/answer", json={"question": "Q?", "question_id": "sun-q02"})

    assert response.status_code == 200
    assert response.json()["question_id"] == "sun-q02"


@patch("app.api.answer.AnswerGenerator")
@patch("app.api.answer.Retriever")
def test_answer_endpoint_handles_anthropic_failure(
    mock_retriever, mock_generator, client
):
    """A transient Anthropic outage maps to 503 so n8n retries."""
    _setup(
        mock_retriever,
        mock_generator,
        generate_error=anthropic.APIConnectionError(
            request=httpx.Request("POST", "https://api.anthropic.com/v1/messages")
        ),
    )

    response = client.post("/answer", json={"question": "Q?"})

    assert response.status_code == 503


@patch("app.api.answer.AnswerGenerator")
@patch("app.api.answer.Retriever")
def test_answer_endpoint_maps_permanent_anthropic_error_to_502(
    mock_retriever, mock_generator, client
):
    """A permanent Anthropic error (bad key) maps to 502, not a retryable 503."""
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    _setup(
        mock_retriever,
        mock_generator,
        generate_error=anthropic.AuthenticationError(
            "invalid x-api-key",
            response=httpx.Response(401, request=request),
            body=None,
        ),
    )

    response = client.post("/answer", json={"question": "Q?"})

    assert response.status_code == 502


@patch("app.api.answer.AnswerGenerator")
@patch("app.api.answer.Retriever")
def test_answer_endpoint_handles_retrieval_failure(
    mock_retriever, mock_generator, client
):
    """A Pinecone/Voyage outage during retrieval maps to 503."""
    _setup(
        mock_retriever,
        mock_generator,
        retrieve_error=pinecone.exceptions.PineconeException("pinecone unavailable"),
    )

    response = client.post("/answer", json={"question": "Q?"})

    assert response.status_code == 503


@patch("app.api.answer.AnswerGenerator")
@patch("app.api.answer.Retriever")
def test_answer_endpoint_handles_voyage_failure(mock_retriever, mock_generator, client):
    """A Voyage embedding outage during retrieval maps to 503."""
    import voyageai.error

    _setup(
        mock_retriever,
        mock_generator,
        retrieve_error=voyageai.error.VoyageError("voyage unavailable"),
    )

    response = client.post("/answer", json={"question": "Q?"})

    assert response.status_code == 503
