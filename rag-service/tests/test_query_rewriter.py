"""
Tests for the ISQ-specific query rewriter (Plan 4, Branch C).
Written FIRST per TDD discipline. Implementation in app/rag/query_rewriter.py follows.

All tests mock the Anthropic SDK — no live calls, no network, no real model.
The rewriter's intelligence (does it *really* expand acronyms?) is tuned in
Plan 9's eval loop against real APIs; here we verify the plumbing contract:
the query is forwarded, the ISQ-specific system prompt is sent, the model's
text is returned, and an empty query short-circuits with NO LLM call.
"""

from unittest.mock import MagicMock, patch


# Helpers


def _mock_anthropic_with_reply(mock_anthropic, reply_text):
    """
    Wire a patched Anthropic class so messages.create() returns a reply whose
    single content block carries reply_text (mirrors the real SDK response shape).
    """
    mock_client = mock_anthropic.return_value
    block = MagicMock()
    block.text = reply_text
    mock_client.messages.create.return_value.content = [block]
    return mock_client


# Tests


@patch("app.rag.query_rewriter.Anthropic")
def test_rewriter_expands_acronyms(mock_anthropic):
    """The rewriter returns the model's expanded query (acronym → full term)."""
    from app.rag.query_rewriter import QueryRewriter

    _mock_anthropic_with_reply(
        mock_anthropic,
        "multi-factor authentication MFA enforcement mandatory cloud platforms",
    )

    rewriter = QueryRewriter(api_key="test-key")
    result = rewriter.rewrite("Do you use MFA?")

    assert "multi-factor authentication" in result


@patch("app.rag.query_rewriter.Anthropic")
def test_rewriter_preserves_intent(mock_anthropic):
    """The original question is forwarded to the model so intent is preserved."""
    from app.rag.query_rewriter import QueryRewriter

    mock_client = _mock_anthropic_with_reply(mock_anthropic, "rewritten query")

    rewriter = QueryRewriter(api_key="test-key")
    rewriter.rewrite("Where is customer data stored?")

    _, kwargs = mock_client.messages.create.call_args
    sent = kwargs["messages"][-1]["content"]
    assert "Where is customer data stored?" in sent


@patch("app.rag.query_rewriter.Anthropic")
def test_rewriter_adds_policy_vocabulary(mock_anthropic):
    """The rewriter passes through policy-document vocabulary from the model."""
    from app.rag.query_rewriter import QueryRewriter

    _mock_anthropic_with_reply(
        mock_anthropic,
        "backup restoration testing recovery validation policy framework documented",
    )

    rewriter = QueryRewriter(api_key="test-key")
    result = rewriter.rewrite("Are backups tested?")

    assert "policy" in result
    assert "framework" in result


@patch("app.rag.query_rewriter.Anthropic")
def test_rewriter_handles_empty_query(mock_anthropic):
    """Empty / whitespace query → empty string and NO LLM call."""
    from app.rag.query_rewriter import QueryRewriter

    mock_client = _mock_anthropic_with_reply(mock_anthropic, "should not be used")

    rewriter = QueryRewriter(api_key="test-key")

    assert rewriter.rewrite("") == ""
    assert rewriter.rewrite("   ") == ""
    mock_client.messages.create.assert_not_called()


@patch("app.rag.query_rewriter.Anthropic")
def test_rewriter_uses_isq_specific_prompt(mock_anthropic):
    """The system prompt is ISQ-specific (mentions security questionnaire)."""
    from app.rag.query_rewriter import QueryRewriter

    mock_client = _mock_anthropic_with_reply(mock_anthropic, "rewritten query")

    rewriter = QueryRewriter(api_key="test-key")
    rewriter.rewrite("Do you use MFA?")

    _, kwargs = mock_client.messages.create.call_args
    assert "security questionnaire" in kwargs["system"].lower()


@patch("app.rag.query_rewriter.Anthropic")
def test_rewriter_handles_empty_content_response(mock_anthropic):
    """Model returns no content blocks → rewrite() returns '' instead of IndexError."""
    from app.rag.query_rewriter import QueryRewriter

    mock_client = mock_anthropic.return_value
    mock_client.messages.create.return_value.content = []  # empty content list

    rewriter = QueryRewriter(api_key="test-key")

    assert rewriter.rewrite("Do you use MFA?") == ""
