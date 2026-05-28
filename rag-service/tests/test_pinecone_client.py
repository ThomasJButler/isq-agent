"""
Tests for the Pinecone client wrapper (Plan 4, Branch B).
Written FIRST per TDD discipline. Implementation in app/core/pinecone_client.py follows.

All tests mock the Pinecone SDK — no live calls, no network, no real index.
"""

from unittest.mock import patch

import pytest


# Helpers


def _mock_pc_with_index(mock_pinecone, index_names):
    """Wire a patched Pinecone class so list_indexes().names() returns index_names."""
    mock_pc = mock_pinecone.return_value
    mock_pc.list_indexes.return_value.names.return_value = index_names
    return mock_pc


# Tests


@patch("app.core.pinecone_client.Pinecone")
def test_pinecone_client_initialises(mock_pinecone):
    """Client creates without error given API key + an existing index name."""
    from app.core.pinecone_client import PineconeClient

    _mock_pc_with_index(mock_pinecone, ["isq-agent-knowledge"])

    client = PineconeClient(api_key="test-key", index_name="isq-agent-knowledge")

    assert client.index_name == "isq-agent-knowledge"
    mock_pinecone.assert_called_once_with(api_key="test-key")
    # Connected to the named index
    mock_pinecone.return_value.Index.assert_called_once_with("isq-agent-knowledge")


@patch("app.core.pinecone_client.Pinecone")
def test_pinecone_client_handles_missing_index(mock_pinecone):
    """Helpful error when the requested index doesn't exist."""
    from app.core.pinecone_client import PineconeClient, PineconeIndexError

    _mock_pc_with_index(mock_pinecone, ["some-other-index"])

    with pytest.raises(PineconeIndexError, match="not found"):
        PineconeClient(api_key="test-key", index_name="missing-index")


@patch("app.core.pinecone_client.Pinecone")
def test_upsert_chunks_succeeds(mock_pinecone):
    """Mocked: upsert_chunks(chunks) calls index.upsert with correctly-shaped vectors."""
    from app.core.pinecone_client import PineconeClient

    mock_pc = _mock_pc_with_index(mock_pinecone, ["isq-agent-knowledge"])
    mock_index = mock_pc.Index.return_value

    client = PineconeClient(api_key="k", index_name="isq-agent-knowledge")

    chunks = [
        {
            "id": "isp-s1-c0",
            "values": [0.1] * 1024,
            "metadata": {"source": "policy.pdf", "source_type": "policy", "text": "MFA is mandatory."},
        }
    ]
    result = client.upsert_chunks(chunks)

    mock_index.upsert.assert_called_once()
    # Pinecone v5 takes vectors=[...] keyword
    _, kwargs = mock_index.upsert.call_args
    assert kwargs["vectors"] == chunks
    assert result["upserted_count"] == 1


@patch("app.core.pinecone_client.Pinecone")
def test_upsert_chunks_batches_over_100(mock_pinecone):
    """Upserts >100 vectors are split into batches of at most 100 per call (locked limit)."""
    from app.core.pinecone_client import PineconeClient

    mock_pc = _mock_pc_with_index(mock_pinecone, ["isq-agent-knowledge"])
    mock_index = mock_pc.Index.return_value

    client = PineconeClient(api_key="k", index_name="isq-agent-knowledge")

    chunks = [
        {"id": f"v{i}", "values": [0.0] * 4, "metadata": {"text": str(i)}}
        for i in range(250)
    ]
    result = client.upsert_chunks(chunks)

    # 250 vectors → batches of 100, 100, 50 → 3 calls
    assert mock_index.upsert.call_count == 3
    for call in mock_index.upsert.call_args_list:
        assert len(call.kwargs["vectors"]) <= 100
    assert result["upserted_count"] == 250


@patch("app.core.pinecone_client.Pinecone")
def test_query_returns_matches(mock_pinecone):
    """Mocked: query(vector, top_k) returns matches with metadata as plain dicts."""
    from app.core.pinecone_client import PineconeClient

    mock_pc = _mock_pc_with_index(mock_pinecone, ["isq-agent-knowledge"])
    mock_index = mock_pc.Index.return_value
    mock_index.query.return_value = {
        "matches": [
            {"id": "isp-s1-c0", "score": 0.91, "metadata": {"source": "policy.pdf", "text": "MFA..."}},
        ]
    }

    client = PineconeClient(api_key="k", index_name="isq-agent-knowledge")
    matches = client.query(vector=[0.1] * 1024, top_k=5)

    assert isinstance(matches, list)
    assert len(matches) == 1
    assert matches[0]["id"] == "isp-s1-c0"
    assert matches[0]["score"] == 0.91
    assert matches[0]["metadata"]["source"] == "policy.pdf"

    # top_k and metadata flags forwarded to the SDK
    _, kwargs = mock_index.query.call_args
    assert kwargs["top_k"] == 5
    assert kwargs["include_metadata"] is True


@patch("app.core.pinecone_client.Pinecone")
def test_query_filters_by_min_score(mock_pinecone):
    """Matches below min_score (default 0.5) are filtered out."""
    from app.core.pinecone_client import PineconeClient

    mock_pc = _mock_pc_with_index(mock_pinecone, ["isq-agent-knowledge"])
    mock_index = mock_pc.Index.return_value
    mock_index.query.return_value = {
        "matches": [
            {"id": "a", "score": 0.90, "metadata": {}},
            {"id": "b", "score": 0.30, "metadata": {}},  # below threshold
            {"id": "c", "score": 0.55, "metadata": {}},
        ]
    }

    client = PineconeClient(api_key="k", index_name="isq-agent-knowledge")
    matches = client.query(vector=[0.1] * 1024, top_k=5, min_score=0.5)

    ids = [m["id"] for m in matches]
    assert ids == ["a", "c"]
    assert all(m["score"] >= 0.5 for m in matches)
