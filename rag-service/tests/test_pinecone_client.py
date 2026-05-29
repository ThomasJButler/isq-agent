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
            "metadata": {
                "source": "policy.pdf",
                "source_type": "policy",
                "text": "MFA is mandatory.",
            },
        }
    ]
    result = client.upsert_chunks(chunks)

    mock_index.upsert.assert_called_once()
    # Pinecone v5 takes vectors=[...] keyword
    _, kwargs = mock_index.upsert.call_args
    assert kwargs["vectors"] == chunks
    assert result["upserted_count"] == 1


@patch("app.core.pinecone_client.Pinecone")
def test_upsert_chunks_strips_null_metadata(mock_pinecone):
    """Null metadata values are dropped before upsert — Pinecone rejects nulls.

    Policy chunks carry section_title/isq_question_text as None (those fields only
    apply to historical ISQs). Pinecone's metadata only accepts string/number/
    boolean/list-of-strings, so a None must be omitted, not sent as JSON null.
    """
    from app.core.pinecone_client import PineconeClient

    mock_pc = _mock_pc_with_index(mock_pinecone, ["isq-agent-knowledge"])
    mock_index = mock_pc.Index.return_value

    client = PineconeClient(api_key="k", index_name="isq-agent-knowledge")

    chunks = [
        {
            "id": "isp-p1-c0",
            "values": [0.1] * 1024,
            "metadata": {
                "source": "policy.pdf",
                "source_type": "policy",
                "section_title": None,  # only set for some sources
                "page": 1,
                "isq_question_text": None,  # only set for historical ISQs
                "text": "MFA is mandatory.",
            },
        }
    ]
    result = client.upsert_chunks(chunks)

    _, kwargs = mock_index.upsert.call_args
    sent_metadata = kwargs["vectors"][0]["metadata"]
    # Nulls dropped; non-null fields (including falsy-but-valid ones) preserved.
    assert "section_title" not in sent_metadata
    assert "isq_question_text" not in sent_metadata
    assert sent_metadata["source"] == "policy.pdf"
    assert sent_metadata["page"] == 1
    assert sent_metadata["text"] == "MFA is mandatory."
    # id and values pass through untouched.
    assert kwargs["vectors"][0]["id"] == "isp-p1-c0"
    assert kwargs["vectors"][0]["values"] == [0.1] * 1024
    assert result["upserted_count"] == 1


@patch("app.core.pinecone_client.Pinecone")
def test_upsert_chunks_preserves_falsy_non_null_metadata(mock_pinecone):
    """0, 0.0, False and "" are valid Pinecone values — only None is dropped."""
    from app.core.pinecone_client import PineconeClient

    mock_pc = _mock_pc_with_index(mock_pinecone, ["isq-agent-knowledge"])
    mock_index = mock_pc.Index.return_value

    client = PineconeClient(api_key="k", index_name="isq-agent-knowledge")

    chunks = [
        {
            "id": "v0",
            "values": [0.0] * 4,
            "metadata": {"page": 0, "chunk_index": 0, "dropped": None},
        }
    ]
    client.upsert_chunks(chunks)

    sent_metadata = mock_index.upsert.call_args.kwargs["vectors"][0]["metadata"]
    assert sent_metadata == {"page": 0, "chunk_index": 0}  # None gone, zeros kept


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
            {
                "id": "isp-s1-c0",
                "score": 0.91,
                "metadata": {"source": "policy.pdf", "text": "MFA..."},
            },
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


@patch("app.core.pinecone_client.Pinecone")
def test_describe_stats_returns_count(mock_pinecone):
    """describe_stats() normalises the SDK stats object to a plain vector count."""
    from app.core.pinecone_client import PineconeClient

    mock_pc = _mock_pc_with_index(mock_pinecone, ["isq-agent-knowledge"])
    mock_index = mock_pc.Index.return_value
    mock_index.describe_index_stats.return_value = {
        "total_vector_count": 42,
        "namespaces": {},
    }

    client = PineconeClient(api_key="k", index_name="isq-agent-knowledge")
    stats = client.describe_stats()

    assert stats["total_vector_count"] == 42
    mock_index.describe_index_stats.assert_called_once()


@patch("app.core.pinecone_client.Pinecone")
def test_delete_all_clears_index(mock_pinecone):
    """delete_all() wipes every vector — needed for force_reindex idempotency."""
    from app.core.pinecone_client import PineconeClient

    mock_pc = _mock_pc_with_index(mock_pinecone, ["isq-agent-knowledge"])
    mock_index = mock_pc.Index.return_value

    client = PineconeClient(api_key="k", index_name="isq-agent-knowledge")
    client.delete_all()

    mock_index.delete.assert_called_once_with(delete_all=True)
