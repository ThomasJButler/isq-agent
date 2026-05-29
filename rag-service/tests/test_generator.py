"""
Tests for the answer generator (Plan 7).
Written FIRST per TDD discipline. Implementation in app/rag/generator.py and the
prompts in app/core/isq_prompts.py follow.

The generator takes one question + the retriever's top-k chunks and has Claude draft
a grounded, vendor-appropriate answer via a forced `submit_answer` tool call, which
also carries citations and a four-dimension self-score. Every test mocks the
Anthropic SDK — no live calls. These pin the plumbing: forced tool-use, the cached
system block, chunk formatting (policies first), citation verification, the
no-chunks short-circuit, and honest metrics.
"""

from unittest.mock import MagicMock, patch

import anthropic
import httpx
import pytest


# Helpers


def _chunk(
    source_id="nlisp-p3-c0",
    source_type="policy",
    text="Multi-factor authentication is mandatory for all cloud platforms.",
    score=0.9,
    source="Northstar_Labs_Information_Security_Policy.pdf",
    page=3,
):
    """A retriever match dict (the shape Retriever.retrieve returns)."""
    return {
        "id": source_id,
        "score": score,
        "metadata": {
            "source": source,
            "source_type": source_type,
            "text": text,
            "page": page,
        },
    }


def _mock_anthropic_submit_answer(
    mock_anthropic,
    *,
    answer="Yes. Multi-factor authentication is mandatory across our systems.",
    citations=None,
    self_score=None,
    needs_review_reason=None,
    tokens_in=1850,
    tokens_out=180,
    cache_read=0,
    cache_creation=0,
):
    """Wire a patched Anthropic class to return a forced submit_answer tool call."""
    client = mock_anthropic.return_value
    block = MagicMock()
    block.type = "tool_use"
    block.name = "submit_answer"
    block.input = {
        "answer": answer,
        "citations": citations
        if citations is not None
        else [{"source_id": "nlisp-p3-c0", "text_snippet": "MFA is mandatory"}],
        "self_score": self_score
        or {"cites_policy": 1.0, "on_topic": 1.0, "vendor_tone": 0.95, "complete": 1.0},
        "needs_review_reason": needs_review_reason,
    }
    response = MagicMock()
    response.content = [block]
    response.usage.input_tokens = tokens_in
    response.usage.output_tokens = tokens_out
    response.usage.cache_read_input_tokens = cache_read
    response.usage.cache_creation_input_tokens = cache_creation
    client.messages.create.return_value = response
    return client


# Tests


@patch("app.rag.generator.Anthropic")
def test_generate_returns_answer_result(mock_anthropic):
    """Returns a dict with answer, citations, self_score, needs_review_reason, metrics."""
    from app.rag.generator import AnswerGenerator

    _mock_anthropic_submit_answer(mock_anthropic)

    result = AnswerGenerator(api_key="test-key").generate(
        "Do you enforce MFA?", [_chunk()]
    )

    assert set(result) >= {
        "answer",
        "citations",
        "self_score",
        "needs_review_reason",
        "metrics",
    }
    assert isinstance(result["answer"], str) and result["answer"]


@patch("app.rag.generator.Anthropic")
def test_generate_calls_claude_with_tool_use(mock_anthropic):
    """The call forces the submit_answer tool via tool_choice."""
    from app.rag.generator import AnswerGenerator

    client = _mock_anthropic_submit_answer(mock_anthropic)

    AnswerGenerator(api_key="test-key").generate("Do you enforce MFA?", [_chunk()])

    _, kwargs = client.messages.create.call_args
    assert kwargs["tool_choice"] == {"type": "tool", "name": "submit_answer"}
    assert any(t["name"] == "submit_answer" for t in kwargs["tools"])


@patch("app.rag.generator.Anthropic")
def test_generate_includes_few_shot_examples(mock_anthropic):
    """The system block carries worked few-shot examples."""
    from app.rag.generator import AnswerGenerator

    client = _mock_anthropic_submit_answer(mock_anthropic)

    AnswerGenerator(api_key="test-key").generate("Do you enforce MFA?", [_chunk()])

    _, kwargs = client.messages.create.call_args
    system_text = kwargs["system"][0]["text"]
    assert "EXAMPLE" in system_text.upper()


@patch("app.rag.generator.Anthropic")
def test_generate_formats_chunks_with_source_ids(mock_anthropic):
    """Each chunk is rendered with a [source_id|type|score=] prefix."""
    from app.rag.generator import AnswerGenerator

    client = _mock_anthropic_submit_answer(mock_anthropic)

    AnswerGenerator(api_key="test-key").generate(
        "Q?", [_chunk(source_id="nlisp-p3-c0")]
    )

    _, kwargs = client.messages.create.call_args
    user_content = kwargs["messages"][0]["content"]
    assert "[nlisp-p3-c0|policy|score=" in user_content


@patch("app.rag.generator.Anthropic")
def test_generate_returns_citations(mock_anthropic):
    """Citations from the tool output are passed through."""
    from app.rag.generator import AnswerGenerator

    cites = [{"source_id": "nlisp-p3-c0", "text_snippet": "MFA is mandatory"}]
    _mock_anthropic_submit_answer(mock_anthropic, citations=cites)

    result = AnswerGenerator(api_key="test-key").generate(
        "Q?", [_chunk(source_id="nlisp-p3-c0")]
    )

    assert result["citations"] == cites


@patch("app.rag.generator.Anthropic")
def test_generate_self_scores_all_four_dimensions(mock_anthropic):
    """All four self-score dimensions are present and within [0, 1]."""
    from app.rag.generator import AnswerGenerator

    _mock_anthropic_submit_answer(mock_anthropic)

    result = AnswerGenerator(api_key="test-key").generate("Q?", [_chunk()])

    score = result["self_score"]
    for dim in ("cites_policy", "on_topic", "vendor_tone", "complete"):
        assert dim in score
        assert 0.0 <= score[dim] <= 1.0


@patch("app.rag.generator.Anthropic")
def test_generate_no_chunks_returns_needs_review(mock_anthropic):
    """Empty chunks → deterministic needs_review result, NO Claude call."""
    from app.rag.generator import AnswerGenerator

    client = mock_anthropic.return_value

    result = AnswerGenerator(api_key="test-key").generate("Q?", [])

    assert result["needs_review_reason"]
    assert result["citations"] == []
    client.messages.create.assert_not_called()


@patch("app.rag.generator.Anthropic")
def test_generate_caches_system_block(mock_anthropic):
    """The static system block is marked for ephemeral prompt caching."""
    from app.rag.generator import AnswerGenerator

    client = _mock_anthropic_submit_answer(mock_anthropic)

    AnswerGenerator(api_key="test-key").generate("Q?", [_chunk()])

    _, kwargs = client.messages.create.call_args
    assert isinstance(kwargs["system"], list)
    assert kwargs["system"][0]["cache_control"] == {"type": "ephemeral"}


@patch("app.rag.generator.Anthropic")
def test_generate_prefers_policy_in_prompt(mock_anthropic):
    """Policy chunks are listed before historical_isq chunks, regardless of score."""
    from app.rag.generator import AnswerGenerator

    client = _mock_anthropic_submit_answer(mock_anthropic)
    chunks = [
        _chunk(
            source_id="hist01-q2",
            source_type="historical_isq",
            score=0.95,  # higher score, but still listed after policy
            source="Northstar_Labs_Previous_ISQ_Completed_01.pdf",
            page=None,
            text="Q: Is MFA enforced? A: Yes.",
        ),
        _chunk(source_id="nlisp-p3-c0", source_type="policy", score=0.80),
    ]

    AnswerGenerator(api_key="test-key").generate("Q?", chunks)

    _, kwargs = client.messages.create.call_args
    content = kwargs["messages"][0]["content"]
    assert content.index("nlisp-p3-c0") < content.index("hist01-q2")


@patch("app.rag.generator.Anthropic")
def test_generate_penalises_hallucinated_citation(mock_anthropic):
    """A cited source_id absent from the provided chunks docks cites_policy by 0.2."""
    from app.rag.generator import AnswerGenerator

    _mock_anthropic_submit_answer(
        mock_anthropic,
        citations=[{"source_id": "ghost-id", "text_snippet": "not in any chunk"}],
        self_score={
            "cites_policy": 1.0,
            "on_topic": 1.0,
            "vendor_tone": 0.9,
            "complete": 1.0,
        },
    )

    result = AnswerGenerator(api_key="test-key").generate(
        "Q?", [_chunk(source_id="nlisp-p3-c0")]
    )

    assert result["self_score"]["cites_policy"] == 0.8


@patch("app.rag.generator.Anthropic")
def test_generate_refusal_no_tool_block_returns_needs_review(mock_anthropic):
    """A response with no tool_use block (refusal) → needs_review result, no crash."""
    from app.rag.generator import AnswerGenerator

    client = mock_anthropic.return_value
    text_block = MagicMock()
    text_block.type = "text"
    response = MagicMock()
    response.content = [text_block]
    response.usage.input_tokens = 100
    response.usage.output_tokens = 5
    response.usage.cache_read_input_tokens = 0
    response.usage.cache_creation_input_tokens = 0
    client.messages.create.return_value = response

    result = AnswerGenerator(api_key="test-key").generate("Q?", [_chunk()])

    assert result["needs_review_reason"]
    assert result["citations"] == []


@patch("app.rag.generator.Anthropic")
def test_generate_propagates_anthropic_error(mock_anthropic):
    """An Anthropic API error propagates (the endpoint maps it); never swallowed."""
    from app.rag.generator import AnswerGenerator

    client = mock_anthropic.return_value
    client.messages.create.side_effect = anthropic.APIConnectionError(
        request=httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    )

    with pytest.raises(anthropic.APIError):
        AnswerGenerator(api_key="test-key").generate("Q?", [_chunk()])


@patch("app.rag.generator.Anthropic")
def test_generate_includes_question_index_in_prompt(mock_anthropic):
    """When given, the question's position surfaces in the user prompt."""
    from app.rag.generator import AnswerGenerator

    client = _mock_anthropic_submit_answer(mock_anthropic)

    AnswerGenerator(api_key="test-key").generate("Q?", [_chunk()], index=2, total=20)

    _, kwargs = client.messages.create.call_args
    assert "2 of 20" in kwargs["messages"][0]["content"]


@patch("app.rag.generator.Anthropic")
def test_generate_reports_metrics(mock_anthropic):
    """Metrics carry token counts, cost, and latency; tokens come from usage."""
    from app.rag.generator import AnswerGenerator

    _mock_anthropic_submit_answer(mock_anthropic, tokens_in=1850, tokens_out=180)

    result = AnswerGenerator(api_key="test-key").generate("Q?", [_chunk()])

    metrics = result["metrics"]
    assert set(metrics) >= {"tokens_in", "tokens_out", "cost_usd", "latency_ms"}
    assert metrics["tokens_in"] == 1850
    assert metrics["tokens_out"] == 180


@patch("app.rag.generator.Anthropic")
def test_generate_cost_discounts_cached_tokens(mock_anthropic):
    """Cached input tokens are counted but billed at the cheaper cache-read rate."""
    from app.rag.generator import AnswerGenerator

    _mock_anthropic_submit_answer(
        mock_anthropic, tokens_in=200, tokens_out=180, cache_read=4000
    )

    result = AnswerGenerator(api_key="test-key").generate("Q?", [_chunk()])
    metrics = result["metrics"]

    # All input is counted (200 uncached + 4000 from cache)...
    assert metrics["tokens_in"] == 4200
    # ...but the 4000 cached tokens are billed at 0.1x the input rate.
    expected = (
        200 / 1_000_000 * 3.0 + 4000 / 1_000_000 * 3.0 * 0.10 + 180 / 1_000_000 * 15.0
    )
    assert metrics["cost_usd"] == round(expected, 6)
    # Cheaper than billing all 4200 input tokens at the full rate.
    naive = round(4200 / 1_000_000 * 3.0 + 180 / 1_000_000 * 15.0, 6)
    assert metrics["cost_usd"] < naive
