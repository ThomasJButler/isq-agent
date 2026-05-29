"""Smoke tests for the FastAPI main app (Plan 3 Manual Coding Exercise 2 companion)."""

import logging

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_root_returns_service_metadata(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "ISQ Agent RAG Service"
    assert data["version"] == "1.0.0"
    assert data["health"] == "/health"
    assert data["docs"] == "/docs"


def test_health_endpoint_registered(client):
    response = client.get("/health")
    assert 200 <= response.status_code < 300


def test_cors_allows_local_n8n_origin(client):
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:5678",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert (
        response.headers.get("access-control-allow-origin") == "http://localhost:5678"
    )


def test_lifespan_does_not_log_secrets(caplog):
    from app.core.config import settings
    from app.main import app

    secrets = [
        settings.voyage_api_key,
        settings.anthropic_api_key,
        settings.pinecone_api_key,
    ]

    with caplog.at_level(logging.INFO):
        with TestClient(app):
            pass

    captured = " ".join(record.getMessage() for record in caplog.records)
    for secret in secrets:
        if secret and len(secret) > 6:
            assert secret not in captured, "API key leaked in logs"
