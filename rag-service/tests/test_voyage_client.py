"""
Tests for the Voyage embedding client wrapper.
Backfilled in Plan 5 to align Exercise 1 (Plan 2) with TDD discipline.

All tests mock the voyageai SDK — no live calls, no network. We verify the
wrapper contract: correct input_type per mode, cumulative token tracking,
automatic batching at MAX_BATCH_SIZE, and cost estimation.
"""

from unittest.mock import MagicMock, patch

import pytest

from app.voyage.client import VoyageClient


@pytest.fixture
def mock_voyage_response():
    """Mock the voyageai.Client().embed() response shape."""
    response = MagicMock()
    response.embeddings = [[0.1] * 1024]
    response.total_tokens = 50
    return response


class TestVoyageClient:
    def test_initialises_with_default_model(self, monkeypatch):
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        client = VoyageClient()
        assert client.model == "voyage-3-large"
        assert client.tokens_used == 0

    def test_initialises_with_custom_model(self, monkeypatch):
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        client = VoyageClient(model="voyage-3-lite")
        assert client.model == "voyage-3-lite"

    @patch("app.voyage.client.voyageai.Client")
    def test_embed_query_returns_vector(
        self, mock_client_class, mock_voyage_response, monkeypatch
    ):
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        mock_client_class.return_value.embed.return_value = mock_voyage_response

        client = VoyageClient()
        vector = client.embed_query("Do you use MFA?")

        assert len(vector) == 1024
        assert client.tokens_used == 50
        # A query must be embedded with input_type="query" (not "document") so
        # Voyage applies the query-side of its asymmetric embedding.
        mock_client_class.return_value.embed.assert_called_with(
            texts=["Do you use MFA?"],
            model="voyage-3-large",
            input_type="query",
        )

    @patch("app.voyage.client.voyageai.Client")
    def test_embed_documents_handles_batching(self, mock_client_class, monkeypatch):
        """1500 texts should trigger 2 batches (1000 + 500)."""
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        mock_client_class.return_value.embed.return_value = MagicMock(
            embeddings=[[0.1] * 1024] * 1000,
            total_tokens=1000,
        )

        client = VoyageClient()
        texts = ["text"] * 1500
        client.embed_documents(texts)

        # MAX_BATCH_SIZE is 1000, so 1500 texts → exactly 2 embed() calls.
        assert mock_client_class.return_value.embed.call_count == 2

    @patch("app.voyage.client.voyageai.Client")
    def test_embed_documents_uses_document_input_type(
        self, mock_client_class, monkeypatch
    ):
        """Corpus chunks must be embedded with input_type="document"."""
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        mock_client_class.return_value.embed.return_value = MagicMock(
            embeddings=[[0.1] * 1024],
            total_tokens=10,
        )

        client = VoyageClient()
        client.embed_documents(["a chunk of policy text"])

        _, kwargs = mock_client_class.return_value.embed.call_args
        assert kwargs["input_type"] == "document"

    def test_cost_estimate_calculation(self, monkeypatch):
        monkeypatch.setenv("VOYAGE_API_KEY", "test-key")
        client = VoyageClient()
        client.tokens_used = 1_000_000  # 1 million tokens
        # voyage-3-large pricing: $0.18 per million
        assert client.get_cost_estimate() == pytest.approx(0.18, rel=0.01)
