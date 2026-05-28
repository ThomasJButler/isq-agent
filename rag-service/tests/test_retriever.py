"""
Tests for the retriever (Plan 4, Branch C — the final RAG-core module).
Written FIRST per TDD discipline. Implementation in app/rag/retriever.py follows.

The retriever wires three already-tested collaborators together:
    QueryRewriter.rewrite()  ->  VoyageClient.embed_query()  ->  PineconeClient.query()
then applies source weighting (policies ×1.0, historical_isqs ×0.95), filters by
min_score, sorts descending, and caps at top_k.

All collaborators are injected as mocks — no live Anthropic / Voyage / Pinecone.
We verify the orchestration contract, not the quality of any individual model.

Key invariant under test: weighting is applied BEFORE the min_score floor, so a
borderline historical_isq chunk that ×0.95 pushes under 0.5 is honestly dropped
(plan-04 Section 7; IMPLEMENTATION_PLAN.md "Decision to make in that slice").
"""

from unittest.mock import MagicMock

import pytest

from app.rag.retriever import Retriever


# Helpers


def _match(score, source_type="policy", source="doc.pdf", page=1, text="chunk text"):
    """Build a normalised Pinecone match dict as PineconeClient.query returns."""
    return {
        "id": f"{source}-p{page}",
        "score": score,
        "metadata": {
            "source": source,
            "source_type": source_type,
            "section_title": "Some Section",
            "page": page,
            "text": text,
        },
    }


def _build_retriever(matches, rewritten="rewritten query"):
    """
    Wire a Retriever with mocked collaborators.

    The Pinecone mock returns `matches` UNFILTERED (min_score=0) so the retriever
    owns the post-weighting 0.5 floor. Returns (retriever, mocks-dict) so tests
    can assert on call args.
    """
    rewriter = MagicMock()
    rewriter.rewrite.return_value = rewritten

    voyage = MagicMock()
    voyage.embed_query.return_value = [0.1] * 1024

    pinecone = MagicMock()
    pinecone.query.return_value = matches

    retriever = Retriever(
        query_rewriter=rewriter, voyage_client=voyage, pinecone_client=pinecone
    )
    return retriever, {"rewriter": rewriter, "voyage": voyage, "pinecone": pinecone}


# Tests


def test_retriever_uses_rewritten_query():
    """The rewriter runs first and its output (not the raw query) is embedded."""
    retriever, mocks = _build_retriever([_match(0.9)], rewritten="expanded MFA query")

    retriever.retrieve("Do you use MFA?")

    mocks["rewriter"].rewrite.assert_called_once_with("Do you use MFA?")
    mocks["voyage"].embed_query.assert_called_once_with("expanded MFA query")


def test_retriever_returns_top_k_chunks():
    """Returns at most top_k (5) chunks even when Pinecone yields more."""
    matches = [_match(0.9 - i * 0.01, page=i) for i in range(7)]
    retriever, _ = _build_retriever(matches)

    results = retriever.retrieve("a question")

    assert len(results) <= 5


def test_retriever_prefers_policies_over_isqs():
    """Equal raw scores: the policy chunk ranks above the historical_isq (×0.95)."""
    matches = [
        _match(0.80, source_type="historical_isq", source="Previous_ISQ.pdf"),
        _match(0.80, source_type="policy", source="Security_Policy.pdf"),
    ]
    retriever, _ = _build_retriever(matches)

    results = retriever.retrieve("a question")

    assert results[0]["metadata"]["source_type"] == "policy"


def test_retriever_includes_source_metadata():
    """Each result carries the citation metadata (source, page, source_type, text)."""
    retriever, _ = _build_retriever([_match(0.9, source="Security_Policy.pdf", page=3)])

    results = retriever.retrieve("a question")

    meta = results[0]["metadata"]
    assert meta["source"] == "Security_Policy.pdf"
    assert meta["page"] == 3
    assert meta["source_type"] == "policy"
    assert "text" in meta


def test_retriever_handles_no_matches():
    """Empty Pinecone result → empty list, no crash."""
    retriever, _ = _build_retriever([])

    results = retriever.retrieve("a question with no relevant chunks")

    assert results == []


def test_retriever_applies_weighting_before_min_score_floor():
    """A historical_isq at 0.51 raw drops below the 0.5 floor after ×0.95."""
    matches = [_match(0.51, source_type="historical_isq", source="Previous_ISQ.pdf")]
    retriever, _ = _build_retriever(matches)

    results = retriever.retrieve("a question")

    # 0.51 × 0.95 = 0.4845 < 0.5 → honestly filtered out.
    assert results == []


def test_retriever_skips_embedding_on_empty_rewritten_query():
    """Rewriter returns '' (empty/whitespace input) → [] with no embed/query calls."""
    retriever, mocks = _build_retriever([_match(0.9)], rewritten="")

    results = retriever.retrieve("   ")

    assert results == []
    mocks["voyage"].embed_query.assert_not_called()
    mocks["pinecone"].query.assert_not_called()
