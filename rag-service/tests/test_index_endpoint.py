"""
Tests for the POST /index endpoint (Plan 4, Branch B).
Written FIRST per TDD discipline. Implementation in app/api/index.py follows.

The endpoint is an orchestrator: corpus discovery -> document_processor ->
chunking -> Voyage embeddings -> Pinecone upsert. Every external dependency is
mocked here, so these tests touch no filesystem corpus, no network, no real
index. They pin down endpoint *behaviour*: status codes, idempotency,
force_reindex, and the metrics payload.
"""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# Fixtures


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def fake_corpus_files():
    """Two files mirroring the real corpus shape: one policy PDF, one ISQ DOCX."""
    return [
        Path("Northstar Labs Policies/Northstar_Labs_Information_Security_Policy.pdf"),
        Path(
            "Northstar Labs Completed ISQs/Northstar_Labs_Previous_ISQ_Completed_02.docx"
        ),
    ]


def _fake_process(path):
    """Canned document_processor output keyed by file type."""
    name = str(path)
    if name.endswith(".pdf"):
        return {
            "text": "MFA is mandatory for all cloud platforms and VPN access.",
            "page_count": 1,
            "pages": [
                {
                    "page_number": 1,
                    "text": "MFA is mandatory for all cloud platforms and VPN access.",
                }
            ],
        }
    # .docx (historical ISQ) — no pages, just text
    return {"text": "Question: Do you use MFA? Answer: Yes, it is enforced."}


def _make_pinecone_mock(mock_pinecone_cls, vector_count=0):
    """Configure the patched PineconeClient class and return the instance mock."""
    instance = mock_pinecone_cls.return_value
    instance.describe_stats.return_value = {"total_vector_count": vector_count}
    instance.delete_all = MagicMock()
    instance.upsert_chunks.side_effect = lambda vectors: {
        "upserted_count": len(vectors)
    }
    return instance


def _make_voyage_mock(mock_voyage_cls):
    """Configure the patched VoyageClient class and return the instance mock."""
    instance = mock_voyage_cls.return_value
    # One 4-dim vector per text, aligned by index
    instance.embed_documents.side_effect = lambda texts: [
        [0.1, 0.2, 0.3, 0.4] for _ in texts
    ]
    instance.tokens_used = 1280
    instance.get_cost_estimate.return_value = 0.00023
    return instance


# Tests


@patch("app.api.index.VoyageClient")
@patch("app.api.index.process_document", side_effect=_fake_process)
@patch("app.api.index.discover_corpus_files")
@patch("app.api.index.PineconeClient")
def test_index_endpoint_returns_200(
    mock_pinecone, mock_discover, mock_process, mock_voyage, client, fake_corpus_files
):
    """POST /index returns 200 with a summary JSON payload."""
    _make_pinecone_mock(mock_pinecone, vector_count=0)
    _make_voyage_mock(mock_voyage)
    mock_discover.return_value = fake_corpus_files

    response = client.post("/index", json={"force_reindex": False})

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "indexed"


@patch("app.api.index.VoyageClient")
@patch("app.api.index.process_document", side_effect=_fake_process)
@patch("app.api.index.discover_corpus_files")
@patch("app.api.index.PineconeClient")
def test_index_endpoint_chunks_corpus(
    mock_pinecone, mock_discover, mock_process, mock_voyage, client, fake_corpus_files
):
    """Indexes every discovered file: each is processed, embedded, and upserted."""
    pinecone = _make_pinecone_mock(mock_pinecone, vector_count=0)
    voyage = _make_voyage_mock(mock_voyage)
    mock_discover.return_value = fake_corpus_files

    response = client.post("/index", json={"force_reindex": False})

    assert response.status_code == 200
    data = response.json()
    # Both corpus files were processed.
    assert mock_process.call_count == 2
    assert data["documents_indexed"] == 2

    # Embeddings requested for the same number of texts that were upserted.
    embedded_texts = voyage.embed_documents.call_args.args[0]
    assert len(embedded_texts) >= 2  # at least one chunk per document

    upserted_vectors = pinecone.upsert_chunks.call_args.args[0]
    assert len(upserted_vectors) == len(embedded_texts)
    # Each vector carries the locked metadata schema fields.
    sample = upserted_vectors[0]
    assert set(sample.keys()) == {"id", "values", "metadata"}
    for field in (
        "source",
        "source_type",
        "section_title",
        "page",
        "chunk_index",
        "chunk_total",
        "text",
        "isq_question_text",
        "indexed_at",
    ):
        assert field in sample["metadata"]
    # Source types are detected from filenames.
    source_types = {v["metadata"]["source_type"] for v in upserted_vectors}
    assert source_types == {"policy", "historical_isq"}


@patch("app.api.index.VoyageClient")
@patch("app.api.index.process_document", side_effect=_fake_process)
@patch("app.api.index.discover_corpus_files")
@patch("app.api.index.PineconeClient")
def test_index_endpoint_is_idempotent(
    mock_pinecone, mock_discover, mock_process, mock_voyage, client, fake_corpus_files
):
    """A populated index + force_reindex=false short-circuits to 'already_indexed'."""
    _make_pinecone_mock(mock_pinecone, vector_count=70)
    _make_voyage_mock(mock_voyage)
    mock_discover.return_value = fake_corpus_files

    response = client.post("/index", json={"force_reindex": False})

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "already_indexed"
    assert data["vector_count"] == 70
    # No re-embedding, no re-processing when already indexed.
    mock_voyage.return_value.embed_documents.assert_not_called()
    mock_process.assert_not_called()


@patch("app.api.index.VoyageClient")
@patch("app.api.index.process_document", side_effect=_fake_process)
@patch("app.api.index.discover_corpus_files")
@patch("app.api.index.PineconeClient")
def test_index_endpoint_force_reindex(
    mock_pinecone, mock_discover, mock_process, mock_voyage, client, fake_corpus_files
):
    """force_reindex=true wipes a populated index, then re-indexes the corpus."""
    pinecone = _make_pinecone_mock(mock_pinecone, vector_count=70)
    _make_voyage_mock(mock_voyage)
    mock_discover.return_value = fake_corpus_files

    response = client.post("/index", json={"force_reindex": True})

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "indexed"
    pinecone.delete_all.assert_called_once()
    pinecone.upsert_chunks.assert_called_once()


@patch("app.api.index.VoyageClient")
@patch("app.api.index.process_document", side_effect=_fake_process)
@patch("app.api.index.discover_corpus_files")
@patch("app.api.index.PineconeClient")
def test_index_endpoint_reports_metrics(
    mock_pinecone, mock_discover, mock_process, mock_voyage, client, fake_corpus_files
):
    """Response includes chunk/document counts, tokens, cost, and latency."""
    _make_pinecone_mock(mock_pinecone, vector_count=0)
    _make_voyage_mock(mock_voyage)
    mock_discover.return_value = fake_corpus_files

    response = client.post("/index", json={"force_reindex": False})

    assert response.status_code == 200
    data = response.json()
    assert data["chunks_indexed"] >= 2
    assert data["documents_indexed"] == 2
    assert data["embedding_tokens_used"] == 1280
    assert data["estimated_cost_usd"] == 0.00023
    assert isinstance(data["indexing_time_ms"], (int, float))
    assert data["indexing_time_ms"] >= 0


# Corpus discovery


def test_discover_corpus_files_scopes_to_knowledge_base(tmp_path):
    """Only the policy + historical-ISQ folders are indexed.

    Inbound questionnaires (inputs, not knowledge) and stray root files (the
    assessment brief, README) must be excluded — otherwise detect_source_type
    can't classify them and the whole /index run aborts with a 422.
    """
    from app.api.index import discover_corpus_files

    policies = tmp_path / "Northstar Labs Policies"
    completed = tmp_path / "Northstar Labs Completed ISQs"
    questionnaires = tmp_path / "Northstar Labs Questionnaires"
    for directory in (policies, completed, questionnaires):
        directory.mkdir()

    (policies / "Northstar_Labs_Information_Security_Policy.pdf").touch()
    (completed / "Northstar_Labs_Previous_ISQ_Completed_01.pdf").touch()
    # Excluded: an inbound questionnaire, the challenge brief, a README.
    (questionnaires / "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf").touch()
    (tmp_path / "AI Engineer Technical Challenge.pdf").touch()
    (tmp_path / "README.md").touch()

    found = discover_corpus_files(tmp_path)
    names = {p.name for p in found}

    assert names == {
        "Northstar_Labs_Information_Security_Policy.pdf",
        "Northstar_Labs_Previous_ISQ_Completed_01.pdf",
    }
    assert "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf" not in names
    assert "AI Engineer Technical Challenge.pdf" not in names


def test_discover_corpus_files_warns_on_missing_kb_folder(tmp_path, caplog):
    """A missing knowledge-base folder is logged, not silently dropped.

    Silent skipping is dangerous: force_reindex deletes the index first, so a
    renamed folder could otherwise replace a good index with nothing.
    """
    from app.api.index import discover_corpus_files

    policies = tmp_path / "Northstar Labs Policies"
    policies.mkdir()
    (policies / "Northstar_Labs_Information_Security_Policy.pdf").touch()
    # "Northstar Labs Completed ISQs" is intentionally absent.

    with caplog.at_level("WARNING"):
        found = discover_corpus_files(tmp_path)

    assert [p.name for p in found] == ["Northstar_Labs_Information_Security_Policy.pdf"]
    assert "Completed ISQs" in caplog.text
