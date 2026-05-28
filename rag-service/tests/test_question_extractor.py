"""
Tests for the unified LLM question extractor (Plan 6).
Written FIRST per TDD discipline. Implementation in app/extraction/extractor.py
and app/core/isq_prompts.py follows.

Both PDF and XLSX go through the SAME Claude tool-use call (extraction_method is
always "llm"); XLSX rows are flattened to text via flatten_xlsx_to_text first.
Every test mocks the Anthropic SDK — no live calls, no network, no real model.
These pin the plumbing contract: the forced tool's output is turned into the
{questions, total, extraction_method, warnings, metrics} structure, with stable
deterministic question_ids and honest warning pass-through.
"""

from unittest.mock import MagicMock, patch

# Real corpus filenames — the question_id prefix is the first 3 alpha chars.
PDF_FILENAME = "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf"  # -> "sun"
XLSX_FILENAME = "Simple_Salvage_Basic_ISQ.xlsx"  # -> "sim"


# Helpers


def _mock_anthropic_tool_use(
    mock_anthropic, questions, warnings=None, tokens_in=3200, tokens_out=1850
):
    """
    Wire a patched Anthropic class so messages.create() returns a forced
    tool_use response. anthropic >=0.34 parses tool arguments into block.input
    as a dict (not a JSON string), so we mirror that exact shape here.
    """
    client = mock_anthropic.return_value
    block = MagicMock()
    block.type = "tool_use"
    block.name = "extract_questions"
    block.input = {"questions": questions, "warnings": warnings or []}
    response = MagicMock()
    response.content = [block]
    response.usage.input_tokens = tokens_in
    response.usage.output_tokens = tokens_out
    client.messages.create.return_value = response
    return client


def _q(index, text=None, page=1):
    """A single tool-output question dict (model-side shape)."""
    return {
        "index": index,
        "text": text or f"Do you enforce control {index}?",
        "page": page,
    }


# Tests


@patch("app.extraction.extractor.Anthropic")
def test_extract_from_pdf_text_returns_questions(mock_anthropic):
    """20 questions in → 20 out, with sequential 1-based indices and the contract keys."""
    from app.extraction.extractor import QuestionExtractor

    _mock_anthropic_tool_use(mock_anthropic, [_q(i) for i in range(1, 21)])

    result = QuestionExtractor(api_key="test-key").extract("source text", PDF_FILENAME)

    assert result["total"] == 20
    assert len(result["questions"]) == 20
    assert [q["index"] for q in result["questions"]] == list(range(1, 21))
    assert result["questions"][0]["question_id"] == "sun-q01"
    assert result["questions"][19]["question_id"] == "sun-q20"
    assert set(result) >= {
        "questions",
        "total",
        "extraction_method",
        "warnings",
        "metrics",
    }


@patch("app.extraction.extractor.Anthropic")
def test_extract_from_pdf_text_preserves_text(mock_anthropic):
    """Question wording is passed through unchanged from the tool output."""
    from app.extraction.extractor import QuestionExtractor

    texts = [
        "Do you maintain a formal Information Security Policy?",
        "Is multi-factor authentication enforced for staff access to business systems?",
    ]
    qs = [_q(i + 1, text=t) for i, t in enumerate(texts)]
    _mock_anthropic_tool_use(mock_anthropic, qs)

    result = QuestionExtractor(api_key="test-key").extract("source", PDF_FILENAME)

    assert [q["text"] for q in result["questions"]] == texts


@patch("app.extraction.extractor.Anthropic")
def test_extract_from_pdf_text_includes_page_numbers(mock_anthropic):
    """Each question carries its source page from the tool output."""
    from app.extraction.extractor import QuestionExtractor

    qs = [_q(1, page=1), _q(2, page=2), _q(3, page=2)]
    _mock_anthropic_tool_use(mock_anthropic, qs)

    result = QuestionExtractor(api_key="test-key").extract("source", PDF_FILENAME)

    assert [q["page"] for q in result["questions"]] == [1, 2, 2]


@patch("app.extraction.extractor.Anthropic")
def test_extract_from_pdf_ignores_response_placeholders(mock_anthropic):
    """Response placeholders ('Supplier Response:') never become questions."""
    from app.extraction.extractor import QuestionExtractor

    qs = [_q(1, text="Do you use MFA?"), _q(2, text="Are company laptops encrypted?")]
    _mock_anthropic_tool_use(mock_anthropic, qs)

    source = (
        "1. Do you use MFA?\nSupplier Response: ______\n"
        "2. Are company laptops encrypted?\nResponse: ______\n"
    )
    result = QuestionExtractor(api_key="test-key").extract(source, PDF_FILENAME)

    joined = " ".join(q["text"] for q in result["questions"])
    assert "Supplier Response" not in joined
    assert "Response:" not in joined
    assert result["total"] == 2


@patch("app.extraction.extractor.Anthropic")
def test_extract_from_pdf_ignores_instructions(mock_anthropic):
    """Cover-page instructions are not extracted as questions."""
    from app.extraction.extractor import QuestionExtractor

    qs = [_q(1, text="Do you encrypt data at rest?")]
    _mock_anthropic_tool_use(mock_anthropic, qs)

    source = (
        "Please complete the questionnaire below and return it within 14 days.\n"
        "1. Do you encrypt data at rest?\n"
    )
    result = QuestionExtractor(api_key="test-key").extract(source, PDF_FILENAME)

    joined = " ".join(q["text"] for q in result["questions"])
    assert "Please complete" not in joined
    assert result["total"] == 1


@patch("app.extraction.extractor.Anthropic")
def test_extract_from_xlsx_rows_returns_questions(mock_anthropic):
    """Flattened XLSX rows go through the same extractor and return questions."""
    from app.extraction.extractor import QuestionExtractor, flatten_xlsx_to_text

    rows = [{"Question": f"Do you do thing {i}?", "Response": ""} for i in range(1, 11)]
    _mock_anthropic_tool_use(mock_anthropic, [_q(i) for i in range(1, 11)])

    text = flatten_xlsx_to_text(rows, XLSX_FILENAME)
    result = QuestionExtractor(api_key="test-key").extract(text, XLSX_FILENAME)

    assert result["total"] == 10
    assert result["questions"][0]["question_id"] == "sim-q01"


@patch("app.extraction.extractor.Anthropic")
def test_extract_from_xlsx_uses_llm_method(mock_anthropic):
    """XLSX is extracted via the unified LLM path (not a tabular parser)."""
    from app.extraction.extractor import QuestionExtractor, flatten_xlsx_to_text

    rows = [{"Question": "Do you use MFA for staff accounts?", "Response": ""}]
    _mock_anthropic_tool_use(mock_anthropic, [_q(1)])

    text = flatten_xlsx_to_text(rows, XLSX_FILENAME)
    result = QuestionExtractor(api_key="test-key").extract(text, XLSX_FILENAME)

    assert result["extraction_method"] == "llm"


@patch("app.extraction.extractor.Anthropic")
def test_extract_from_pdf_uses_llm_method(mock_anthropic):
    """PDF text is extracted via the LLM path."""
    from app.extraction.extractor import QuestionExtractor

    _mock_anthropic_tool_use(mock_anthropic, [_q(1)])

    result = QuestionExtractor(api_key="test-key").extract(
        "1. Do you use MFA?", PDF_FILENAME
    )

    assert result["extraction_method"] == "llm"


@patch("app.extraction.extractor.Anthropic")
def test_extract_handles_zero_questions(mock_anthropic):
    """Non-questionnaire input → empty list and a server-injected warning."""
    from app.extraction.extractor import QuestionExtractor

    _mock_anthropic_tool_use(mock_anthropic, [], warnings=[])

    result = QuestionExtractor(api_key="test-key").extract(
        "This is a marketing brochure, not a questionnaire.", PDF_FILENAME
    )

    assert result["questions"] == []
    assert result["total"] == 0
    assert "no_questions_detected" in result["warnings"]


@patch("app.extraction.extractor.Anthropic")
def test_extract_handles_more_than_100_questions(mock_anthropic):
    """>100 questions are all returned; the model's large_questionnaire warning passes through."""
    from app.extraction.extractor import QuestionExtractor

    qs = [_q(i) for i in range(1, 102)]
    _mock_anthropic_tool_use(mock_anthropic, qs, warnings=["large_questionnaire"])

    result = QuestionExtractor(api_key="test-key").extract("source", PDF_FILENAME)

    assert result["total"] == 101
    assert "large_questionnaire" in result["warnings"]


@patch("app.extraction.extractor.Anthropic")
def test_extract_handles_malformed_numbering(mock_anthropic):
    """Skipped source numbering (1,2,4,5) → no crash; output indices are sequential ordinals."""
    from app.extraction.extractor import QuestionExtractor

    qs = [_q(1), _q(2), _q(4), _q(5)]  # model echoes the skipped source numbers
    _mock_anthropic_tool_use(mock_anthropic, qs, warnings=["skipped_numbering"])

    result = QuestionExtractor(api_key="test-key").extract("source", PDF_FILENAME)

    assert result["total"] == 4
    assert [q["index"] for q in result["questions"]] == [1, 2, 3, 4]
    assert "skipped_numbering" in result["warnings"]


@patch("app.extraction.extractor.Anthropic")
def test_extract_handles_duplicate_numbering(mock_anthropic):
    """Two questions sharing a source number → both kept with unique question_ids."""
    from app.extraction.extractor import QuestionExtractor

    qs = [_q(1, text="First question?"), _q(1, text="Second question?")]
    _mock_anthropic_tool_use(
        mock_anthropic, qs, warnings=["duplicate_numbering_detected"]
    )

    result = QuestionExtractor(api_key="test-key").extract("source", PDF_FILENAME)

    ids = [q["question_id"] for q in result["questions"]]
    assert ids == ["sun-q01", "sun-q02"]
    assert len(set(ids)) == 2
    assert "duplicate_numbering_detected" in result["warnings"]


@patch("app.extraction.extractor.Anthropic")
def test_extract_strips_question_marks_inconsistently_present(mock_anthropic):
    """Questions are extracted whether or not they end in a question mark."""
    from app.extraction.extractor import QuestionExtractor

    qs = [_q(1, text="Do you use MFA?"), _q(2, text="Do you use MFA")]
    _mock_anthropic_tool_use(mock_anthropic, qs)

    result = QuestionExtractor(api_key="test-key").extract("source", PDF_FILENAME)

    texts = [q["text"] for q in result["questions"]]
    assert "Do you use MFA?" in texts
    assert "Do you use MFA" in texts


@patch("app.extraction.extractor.Anthropic")
def test_extract_assigns_stable_question_ids(mock_anthropic):
    """Same input → identical question_ids across runs (deterministic, model-independent)."""
    from app.extraction.extractor import QuestionExtractor

    _mock_anthropic_tool_use(mock_anthropic, [_q(i) for i in range(1, 6)])

    extractor = QuestionExtractor(api_key="test-key")
    first = extractor.extract("source", PDF_FILENAME)
    second = extractor.extract("source", PDF_FILENAME)

    ids1 = [q["question_id"] for q in first["questions"]]
    ids2 = [q["question_id"] for q in second["questions"]]
    assert ids1 == ids2 == ["sun-q01", "sun-q02", "sun-q03", "sun-q04", "sun-q05"]
