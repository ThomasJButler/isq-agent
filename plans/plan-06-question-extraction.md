# Plan 6 — Question Extraction Strategy (TDD-first)

**Status:** Plan 6. TDD-first methodology (Plan 4 lock). Branching + Conventional Commits + CI (Plan 5 lock) apply.

**Owner:** Tom Butler
**Date:** 2026-05-25
**Prior plans:** Plan 1-5 ✅

---

## 0. What this plan does and doesn't do

**Locks in:**
- Two extraction paths: PDF (LLM-based) and XLSX (tabular, no LLM)
- A new endpoint: `POST /extract-questions` on rag-service
- LLM prompt for PDF question extraction (with strict output schema)
- Tabular XLSX parser for "Question / Response" two-column layout
- Output schema for extracted questions (locks question_id, text, page, source_index format)
- Edge case handling (0 detected, >100 detected, malformed numbering, embedded response placeholders)
- Test plan written FIRST; implementation follows

**Doesn't yet cover:**
- Answer generation (Plan 7)
- Confidence + flagging (Plan 8)
- Output rendering (Plan 9)
- Demo (Plan 10)
- Final consolidation (Plan 11)

---

## 1. Why a dedicated extraction step + dedicated endpoint

### Why dedicated step (not "just give the whole document to Claude")

Two reasons:
1. **Cost + latency.** Per-question retrieval needs to be fast. If we re-parse the whole PDF for every question, latency multiplies by question count.
2. **Auditability.** Lee can inspect the question list before any answers are generated. If 18 questions are extracted from a 20-question PDF, we know immediately something's wrong with extraction (not generation).

### Why a dedicated endpoint on rag-service (not in n8n's Anthropic node)

Considered both. Locking on **rag-service `/extract-questions`** for these reasons:

| Factor | n8n Anthropic node | rag-service endpoint ✅ |
|---|---|---|
| Testability | Prompt lives in n8n JSON, hard to pytest | Prompt in Python, full pytest coverage |
| Prompt management | Two places (extraction in n8n, answer in rag-service) | One place (centralised in `app/core/isq_prompts.py`) |
| Reusability | n8n-bound | Could be called from CLI, batch script, or alternate frontend |
| Walkthrough story | "extraction lives in n8n" — fine | "I centralised LLM prompts in one module — easier to test, easier to swap models" — stronger |

**Trade-off:** one extra HTTP hop per ISQ. Mitigated by the fact that extraction is one-time (not per-question).

---

## 2. Test plan (defined FIRST)

### Tests for question extraction (`tests/test_question_extractor.py`)

| Test name | What it verifies |
|---|---|
| `test_extract_from_pdf_text_returns_questions` | Given Sunflowers PDF text, returns 20 questions with sequential indices |
| `test_extract_from_pdf_text_preserves_text` | Each question's text matches what's in the source |
| `test_extract_from_pdf_text_includes_page_numbers` | Each question carries its source page |
| `test_extract_from_pdf_ignores_response_placeholders` | "Supplier Response:" boxes don't become questions |
| `test_extract_from_pdf_ignores_instructions` | Cover-page instructions don't become questions |
| `test_extract_from_xlsx_rows_returns_questions` | Given Simple Salvage XLSX rows, returns 10 questions |
| `test_extract_from_xlsx_uses_tabular_method` | Returns `extraction_method: "tabular"` (not "llm") |
| `test_extract_from_pdf_uses_llm_method` | Returns `extraction_method: "llm"` |
| `test_extract_handles_zero_questions` | Empty/non-questionnaire input → returns empty list + warning |
| `test_extract_handles_more_than_100_questions` | Returns full list + warning flag `"large_questionnaire"` |
| `test_extract_handles_malformed_numbering` | Skipped numbers (1, 3, 4) → extracts what's there, no crash |
| `test_extract_handles_duplicate_numbering` | Two "Question 1" → returns both with disambiguating indices |
| `test_extract_strips_question_marks_inconsistently_present` | "Do you use MFA?" and "Do you use MFA" both extracted |
| `test_extract_assigns_stable_question_ids` | Same input → same question_ids on re-run (deterministic) |

### Tests for the `/extract-questions` endpoint (`tests/test_extract_questions_endpoint.py`)

| Test name | What it verifies |
|---|---|
| `test_extract_endpoint_returns_200_for_pdf` | Valid PDF text → 200 + JSON with questions |
| `test_extract_endpoint_returns_200_for_xlsx` | Valid XLSX rows → 200 + JSON |
| `test_extract_endpoint_returns_422_for_invalid_format` | `source_format: "txt"` → 422 with error |
| `test_extract_endpoint_includes_warnings` | When extraction has warnings, they appear in response |
| `test_extract_endpoint_propagates_request_id` | `X-Request-Id` header is echoed in response logs |
| `test_extract_endpoint_handles_anthropic_failure` | When Claude unavailable, returns 503 (n8n retries) |

**Test count for Plan 6 scope:** ~20 tests. Estimated test-writing time: ~90 minutes.

---

## 3. Unified LLM extraction (locked — changed from dual-path 2026-05-25)

**Tom's call:** use LLM extraction for BOTH PDF and XLSX. Consistency beats micro-optimisation here.

### The unified flow

```
PDF: extract text directly via PDF parser
XLSX: flatten rows to a text representation (helper function), then feed to LLM
        ↓
Both feed the SAME extractor prompt with the SAME tool-use schema
        ↓
Same response shape, same test surface, same code path
```

### Why unified (over dual-path)

| Factor | Dual-path | Unified LLM ✅ |
|---|---|---|
| Codebases | Two extraction paths to maintain | One path, one prompt, one schema |
| Tests | Test surface ~2× | Test surface 1× |
| Cost | XLSX free, PDF ~$0.01 | Both ~$0.01 (negligible vs $0 across hundreds of runs) |
| Latency | XLSX <100ms, PDF 3-5s | Both 3-5s (acceptable; extraction is one-time per ISQ, not per-question) |
| Output schema | Same shape but two methods | Same shape, one method |
| Walkthrough story | "I matched method to format" — fine | "I unified under LLM for consistency — fewer paths, more uniform output, easier to swap to another LLM later" — also fine, slightly stronger for engineering-judgement angle |

### XLSX-to-text flattening

A tiny helper turns spreadsheet rows into a plain-text representation the LLM can read:

```python
def flatten_xlsx_to_text(rows: list[dict], filename: str) -> str:
    """
    Render XLSX rows as plain text for LLM extraction.
    Preserves structure: title row, header row, data rows, with separators.
    """
    lines = [f"# {filename}", ""]
    for row in rows:
        # Render non-empty cells as "Col: value" pairs separated by " | "
        cells = [f"{k}: {v}" for k, v in row.items() if v not in (None, "")]
        if cells:
            lines.append(" | ".join(cells))
        else:
            lines.append("")  # preserve blank rows as separators
    return "\n".join(lines)
```

The LLM extractor sees something like:

```
# Simple_Salvage_Basic_ISQ.xlsx

Simple Salvage - Supplier Security Questionnaire: None
Company Name: None
Date: 18/05/2026

Question: Response
Question: Do you use MFA for staff accounts? | Response: 
Question: Are company laptops encrypted? | Response: 
...
```

And the same prompt that handles PDF extraction picks out the 10 questions cleanly.

### Path routing (n8n)

```
file uploaded
  ↓
mimetype = application/pdf  → extract text via PDF parser → POST /extract-questions { source_format: "pdf", source_text: <text> }
mimetype = application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
                              → parse rows via XLSX node → flatten to text → POST /extract-questions { source_format: "xlsx", source_text: <flattened text> }
mimetype = anything else      → user-facing error: "We support PDF and XLSX. This file is: <type>."
```

**Note:** `source_format` is still recorded in the response for traceability ("this came from a PDF" vs "this came from a flattened XLSX"), but the extraction logic is one path. The `extraction_method` field always returns `"llm"`.

---

## 4. Service contract update — `POST /extract-questions`

### Request

```json
{
  "source_format": "pdf",  // or "xlsx_rows"
  "source_text": "Sunflowers Charity\nSupplier Information Security Questionnaire\n...",  // for pdf
  "source_rows": [          // for xlsx_rows
    { "Question": "Do you use MFA for staff accounts?", "Response": "" },
    { "Question": "Are company laptops encrypted?", "Response": "" }
  ],
  "filename": "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf"
}
```

### Response

```json
{
  "questions": [
    {
      "question_id": "sun-q01",
      "index": 1,
      "text": "Do you maintain a formal Information Security Policy?",
      "page": 1
    },
    {
      "question_id": "sun-q02",
      "index": 2,
      "text": "Is multi-factor authentication (MFA) enforced for staff access to business systems?",
      "page": 1
    },
    // ... 18 more
  ],
  "total": 20,
  "extraction_method": "llm",          // or "tabular"
  "warnings": [],                       // or ["large_questionnaire"], ["duplicate_numbering_detected"]
  "metrics": {
    "tokens_in": 3200,
    "tokens_out": 1850,
    "cost_usd": 0.007,
    "latency_ms": 3420
  }
}
```

### Field rules

- `question_id` — stable, derived from filename prefix + index. Same input always produces same IDs. Used downstream by the answer generator and the renderers.
- `index` — 1-based, matches source numbering where possible.
- `text` — exactly as it appears in the source, stripped of trailing question marks if absent in source.
- `page` — for PDFs only; null for XLSX.
- `extraction_method` — provenance for debugging and walkthrough.
- `warnings` — soft signals, don't block the workflow but surface to user.

---

## 5. LLM prompt for PDF extraction (draft v0)

### Why tool-use is the right call (promoted from below)

Standard "return JSON" prompting is fragile — Claude sometimes adds preamble ("Here's the JSON you asked for:"), wraps in markdown code fences, or makes minor JSON syntax errors. Each is a parse-failure waiting to happen in production.

**Anthropic's tool-use API solves this.** You define a tool with a strict input schema. Claude is forced to call that tool with arguments matching the schema. Anthropic's servers validate the structure before returning, so malformed JSON is impossible.

This is THE Claude-native pattern for structured output. We use it here for question extraction, and again in Plan 7 for answer generation.

**Walkthrough talking point:** "I used Anthropic's tool-use API specifically to eliminate a class of failure mode I'd otherwise have to handle in code. Five lines of schema definition replaces 50 lines of defensive JSON parsing."

### MCP stretch goal — wrap as a callable tool

Once `/extract-questions` is working, an obvious stretch is to expose it as an MCP tool that any Claude Code chat can invoke:

```
mcp__isq-agent__extract_questions(file_path)
```

This would let Tom (or anyone) drop a PDF into a Claude Code chat and say "extract the questions from this" — the MCP triggers the rag-service, returns the structured questions, and Claude reasons about them inline.

Deferred to post-submission, but mention in the walkthrough as a Claude-native extension. ~2 hours to build.

### System prompt

```
You extract numbered questions from a supplier security questionnaire.

Output a JSON object with this exact schema:

{
  "questions": [
    { "index": <integer, 1-based>, "text": "<the question, no trailing punctuation>", "page": <integer or null> },
    ...
  ],
  "warnings": [ "<string>", ... ]  // empty list if none
}

RULES:
1. Extract ONLY numbered questions (e.g. "1. Do you...", "Q1: ...", "Question 5: ...")
2. IGNORE response placeholders, including "Supplier Response:", "Response:", and any blank box labels
3. IGNORE cover-page instructions ("Please complete the questionnaire below...")
4. IGNORE headers, tables of contents, footers, signature lines
5. Preserve question wording exactly as written, except strip leading numbering ("1. ") and trailing punctuation
6. If numbering skips (e.g. 1, 2, 4, 5), extract what's there and add warning "skipped_numbering"
7. If numbering duplicates (e.g. two "Question 1"), extract both with disambiguating indices, add warning "duplicate_numbering_detected"
8. If you detect more than 100 questions, still extract all but add warning "large_questionnaire"
9. Output ONLY the JSON object — no preamble, no explanation, no markdown code fences
```

### User prompt

```
SOURCE FILENAME: {filename}

SOURCE TEXT:
{source_text}
```

### Why JSON mode

Use Anthropic's tool-use API to force JSON output:

```python
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=8000,
    system=SYSTEM_PROMPT,
    messages=[{"role": "user", "content": user_prompt}],
    tools=[{
        "name": "extract_questions",
        "description": "Extract numbered questions from a questionnaire",
        "input_schema": {
            "type": "object",
            "properties": {
                "questions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "index": {"type": "integer"},
                            "text": {"type": "string"},
                            "page": {"type": ["integer", "null"]}
                        },
                        "required": ["index", "text"]
                    }
                },
                "warnings": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["questions", "warnings"]
        }
    }],
    tool_choice={"type": "tool", "name": "extract_questions"}
)
```

**Why tool-use instead of "return JSON"-in-prompt:** Claude's tool-use guarantees schema conformance. No parse errors, no malformed JSON in production.

---

## 6. XLSX tabular parser logic

For the Simple Salvage spreadsheet:

```
ISQ Questionnaire (sheet)
─────────────────────────
Simple Salvage - Supplier Security Questionnaire   (title row)
(blank)
Company Name | (blank)                              (header / metadata rows)
Completed By | (blank)
Date         | 18/05/2026
(blank)
Question                            | Response     (column headers)
Do you use MFA for staff accounts?  | (blank)
Are company laptops encrypted?      | (blank)
...
```

### Parser pseudocode

```python
def extract_from_xlsx(rows: list[dict]) -> ExtractionResult:
    """
    Walk the rows looking for the column header pair {"Question", "Response"}.
    From that row+1 onwards, extract each "Question" cell as a question.
    Skip rows where the Question cell is empty.
    """
    questions = []
    header_found = False

    for row_idx, row in enumerate(rows):
        if not header_found:
            # Look for a row that has both "Question" and "Response" as values
            if "Question" in row.values() and "Response" in row.values():
                header_found = True
            continue

        question_text = (row.get("Question") or "").strip()
        if question_text:
            questions.append({
                "question_id": f"q{len(questions) + 1:02d}",
                "index": len(questions) + 1,
                "text": question_text,
                "page": None,  # XLSX has no pages
            })

    return ExtractionResult(
        questions=questions,
        extraction_method="tabular",
        warnings=[] if questions else ["no_questions_detected"],
    )
```

### Why "Question" + "Response" as the header signature

Both example XLSX questionnaires use this convention. If a different XLSX comes in with different column names ("Q", "Answer"), we fall back gracefully with `no_questions_detected` warning and the user knows to convert manually. Pragmatic over clever.

---

## 7. Edge cases (locked behaviour)

| Edge case | Behaviour | Surfaced to user? |
|---|---|---|
| Zero questions detected | Return `questions: []` + `warnings: ["no_questions_detected"]` | Yes — "No questions detected. Is this a questionnaire?" |
| More than 100 questions | (CUT per Audit 3 — unlikely to trigger; no code path) | Walkthrough talking point only |
| Skipped numbering | Extract what's there + `warnings: ["skipped_numbering"]` | Soft — shown in summary, doesn't block |
| Duplicate numbering | Both extracted with disambiguating indices + `warnings: ["duplicate_numbering_detected"]` | Soft |
| Embedded response placeholders treated as questions | Filtered out by LLM prompt rule #2 + by test | No, but tested |
| Mixed Q&A (some answered already) | LLM extracts only the questions, ignores pre-filled answers | No — handled silently |
| PDF with no numbering at all (just paragraphs) | LLM falls back to detecting question marks + interrogative phrasing; `warnings: ["unnumbered_questions"]` | Yes — "Detected unnumbered questions. Review the extracted list before continuing." |
| Anthropic API failure mid-extraction | Return 503 to n8n; n8n retries with exponential backoff | Yes if all retries fail — "Question extraction unavailable. Retry shortly." |

---

## 8. 🖐️ Manual Coding Exercise 5 — TEST FILE FIRST (TDD)

**Purpose:** TDD cycle for question extraction. ~80 lines of tests + ~120 lines of implementation. Total ~45 minutes.

### Part A — type the test file FIRST

**File:** `rag-service/tests/test_question_extractor.py`

```python
"""
Tests for question extraction from PDF text and XLSX rows.
Written FIRST per TDD discipline. Implementation in app/extraction/question_extractor.py follows.
"""

import pytest
from unittest.mock import patch, MagicMock
from app.extraction.question_extractor import extract_questions, ExtractionResult


# Fixtures

@pytest.fixture
def sunflowers_pdf_text():
    """Realistic snippet of Sunflowers Charity PDF text."""
    return (
        "Sunflowers Charity\n"
        "Supplier Information Security Questionnaire\n"
        "Please complete the questionnaire below.\n\n"
        "1. Do you maintain a formal Information Security Policy?\n"
        "Response:\n\n"
        "2. Is multi-factor authentication (MFA) enforced for staff access to business systems?\n"
        "Response:\n\n"
        "3. Describe how customer and donor data is encrypted in transit and at rest.\n"
        "Response:\n"
    )


@pytest.fixture
def simple_salvage_xlsx_rows():
    """Realistic XLSX rows for Simple Salvage."""
    return [
        {"Simple Salvage - Supplier Security Questionnaire": None},
        {},
        {"Company Name": None},
        {"Date": "18/05/2026"},
        {},
        {"Question": "Response"},  # header row
        {"Question": "Do you use MFA for staff accounts?", "Response": ""},
        {"Question": "Are company laptops encrypted?", "Response": ""},
        {"Question": "Do you perform backups?", "Response": ""},
    ]


# LLM extraction tests (Path A — PDF)

class TestExtractFromPdf:
    @patch("app.extraction.question_extractor.call_claude_extract")
    def test_returns_questions(self, mock_claude, sunflowers_pdf_text):
        mock_claude.return_value = {
            "questions": [
                {"index": 1, "text": "Do you maintain a formal Information Security Policy?", "page": 1},
                {"index": 2, "text": "Is multi-factor authentication (MFA) enforced for staff access to business systems?", "page": 1},
                {"index": 3, "text": "Describe how customer and donor data is encrypted in transit and at rest.", "page": 1},
            ],
            "warnings": [],
        }

        result = extract_questions(
            source_format="pdf",
            source_text=sunflowers_pdf_text,
            filename="Sunflowers.pdf",
        )

        assert len(result.questions) == 3
        assert result.questions[0]["text"] == "Do you maintain a formal Information Security Policy?"
        assert result.extraction_method == "llm"

    @patch("app.extraction.question_extractor.call_claude_extract")
    def test_assigns_stable_question_ids(self, mock_claude, sunflowers_pdf_text):
        mock_claude.return_value = {
            "questions": [
                {"index": 1, "text": "Q1", "page": 1},
                {"index": 2, "text": "Q2", "page": 1},
            ],
            "warnings": [],
        }

        result = extract_questions(
            source_format="pdf",
            source_text=sunflowers_pdf_text,
            filename="Sunflowers.pdf",
        )

        # TODO ① — Tom: assert that question_ids follow the pattern "sun-q01", "sun-q02"
        # Hint: filename prefix is the first 3 lowercase chars of filename, then "-q" + zero-padded index
        # ~3 lines.
        pass

    @patch("app.extraction.question_extractor.call_claude_extract")
    def test_handles_zero_questions(self, mock_claude):
        mock_claude.return_value = {"questions": [], "warnings": []}

        result = extract_questions(
            source_format="pdf",
            source_text="Not a questionnaire, just prose.",
            filename="random.pdf",
        )

        assert result.questions == []
        assert "no_questions_detected" in result.warnings


# Tabular extraction tests (Path B — XLSX)

class TestExtractFromXlsx:
    def test_returns_questions(self, simple_salvage_xlsx_rows):
        result = extract_questions(
            source_format="xlsx_rows",
            source_rows=simple_salvage_xlsx_rows,
            filename="SimpleSalvage.xlsx",
        )

        assert len(result.questions) == 3
        assert result.questions[0]["text"] == "Do you use MFA for staff accounts?"
        assert result.extraction_method == "tabular"

    def test_skips_metadata_rows(self, simple_salvage_xlsx_rows):
        """Header detection should skip the company name + date rows."""
        result = extract_questions(
            source_format="xlsx_rows",
            source_rows=simple_salvage_xlsx_rows,
            filename="SimpleSalvage.xlsx",
        )

        for q in result.questions:
            assert "Company Name" not in q["text"]
            assert "Date" not in q["text"]

    def test_handles_empty_rows(self):
        """Rows below the header with empty Question cells should be skipped."""
        rows = [
            {"Question": "Response"},
            {"Question": "Real question 1", "Response": ""},
            {"Question": "", "Response": ""},
            {"Question": "Real question 2", "Response": ""},
        ]

        result = extract_questions(
            source_format="xlsx_rows",
            source_rows=rows,
            filename="test.xlsx",
        )

        # TODO ② — Tom: assert that only 2 questions came back (the empty Question row is skipped)
        # Hint: len(result.questions) == 2
        # ~1 line.
        pass

    def test_no_header_means_no_questions(self):
        """If the Question/Response header isn't found, return empty + warning."""
        rows = [
            {"some other column": "data"},
            {"another column": "data"},
        ]

        result = extract_questions(
            source_format="xlsx_rows",
            source_rows=rows,
            filename="malformed.xlsx",
        )

        assert result.questions == []
        assert "no_questions_detected" in result.warnings


# Format validation tests

def test_rejects_unsupported_format():
    with pytest.raises(ValueError, match="Unsupported source_format"):
        extract_questions(
            source_format="txt",
            source_text="some text",
            filename="x.txt",
        )
```

### Part B — run tests, watch them fail

```bash
cd rag-service
pytest tests/test_question_extractor.py -v
# Expected: ModuleNotFoundError. Confirms tests exist and fail for the right reason.
```

### Part C — implement to make tests pass

**File:** `rag-service/app/extraction/question_extractor.py`

This is implementation, not a typing exercise — code-write at normal pace, not character-by-character. Estimated ~120 lines including the Claude tool-use setup.

The structure follows directly from your tests:

1. `ExtractionResult` dataclass (questions, total, extraction_method, warnings, metrics)
2. `extract_questions(source_format, ...)` dispatcher (routes to LLM or tabular)
3. `_extract_from_pdf_text(text, filename)` (calls Claude tool-use)
4. `_extract_from_xlsx_rows(rows, filename)` (tabular parser per Section 6)
5. `_assign_question_ids(questions, filename)` (stable IDs)
6. `call_claude_extract(text, filename)` (the tool-use call, mockable in tests)

### Part D — verify all tests green

```bash
pytest tests/test_question_extractor.py -v
# Expected: all green
```

### Part E — add the endpoint

**File:** `rag-service/app/api/extract_questions.py`

```python
from fastapi import APIRouter, HTTPException
from app.extraction.question_extractor import extract_questions
from app.models.extraction import ExtractRequest, ExtractResponse

router = APIRouter()

@router.post("/extract-questions", response_model=ExtractResponse)
async def extract_questions_endpoint(request: ExtractRequest) -> ExtractResponse:
    try:
        result = extract_questions(
            source_format=request.source_format,
            source_text=request.source_text,
            source_rows=request.source_rows,
            filename=request.filename,
        )
        return ExtractResponse(**result.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
```

Plus `tests/test_extract_questions_endpoint.py` per Section 2.

### Acceptance for TODOs

- **TODO ①** (Part A line ~70): assert `result.questions[0]["question_id"] == "sun-q01"` and `result.questions[1]["question_id"] == "sun-q02"` — 3 lines
- **TODO ②** (Part A line ~110): assert `len(result.questions) == 2` — 1 line

### Commit pattern (Plan 5 discipline)

```bash
git checkout -b feature/question-extraction
# Type tests first
git add tests/test_question_extractor.py
git commit -m "test(extraction): add failing tests for question extraction"

# Implement
git add app/extraction/ tests/
git commit -m "feat(extraction): add question extractor with PDF (LLM) and XLSX (tabular) paths"

# Add endpoint
git add app/api/extract_questions.py app/models/extraction.py tests/test_extract_questions_endpoint.py
git commit -m "feat(api): add POST /extract-questions endpoint"

git push -u origin feature/question-extraction
# Open PR, self-review, squash-merge to main
```

---

## 9. 📘 Concept Primer

### Structured output via JSON mode (Claude tool-use)

When you ask Claude "give me JSON", it usually does — but sometimes it adds a chatty preamble ("Here's the JSON you asked for: ..."), or wraps it in markdown code fences, or makes a typo in the JSON. That's a parsing nightmare in production.

Claude's **tool-use API** is the fix. You define a "tool" with a strict input schema. Claude is forced to call that tool with arguments matching the schema. Anthropic's servers validate the structure BEFORE returning it to you, so you can never get malformed JSON back.

It's like the difference between asking someone to write a cheque on a napkin versus filling out a cheque form. Both might work, but only one is guaranteed to be machine-readable.

We use it for question extraction because we MUST get a list of questions back, in a known shape, every time. No "Claude got chatty today" failures.

### n8n Code nodes (and why we're NOT using one here)

n8n has a "Code" node where you can write JavaScript or Python. Some teams stuff complex logic into Code nodes when n8n's built-in nodes aren't enough.

We're explicitly NOT doing that here. Our question extraction logic lives in `rag-service`, not in a Code node, because:
- **Testable**: Python in rag-service is testable with pytest. JS in a Code node is hard to test.
- **Reviewable**: Code in a repo gets reviewed in PRs. Code in n8n workflow JSON is buried.
- **Maintainable**: One day n8n might get replaced. Our logic survives.

The walkthrough point: "n8n owns the workflow; rag-service owns the AI logic. The split keeps each in their lane."

### Edge case handling (why we surface warnings instead of just errors)

Edge cases come in three flavours:
1. **Hard errors** (corrupted PDF, API down) → 4xx or 5xx, user sees an error
2. **Soft signals** (skipped numbering, duplicate questions) → questions still extracted, but with warnings attached
3. **Silent fixes** (trailing question marks, blank rows) → handled invisibly

Warnings sit in the middle. They tell the user "I did something, but you might want to double-check." They don't block the workflow. They don't pretend nothing happened. They're an honest middle ground.

Walkthrough story: "I treat the user as an adult. If the extraction had to make a guess, I tell them I guessed. They can override, retry, or proceed."

---

## 10. End-of-Plan-6 checklist

Tomorrow (or whenever you start the question extraction build):

- [ ] `git checkout -b feature/question-extraction`
- [ ] Create `rag-service/app/extraction/__init__.py`
- [ ] Create `rag-service/tests/test_question_extractor.py` (Manual Coding Exercise 5 Part A) — TYPE this one
- [ ] Run `pytest tests/test_question_extractor.py -v` — confirm failures
- [ ] Implement `rag-service/app/extraction/question_extractor.py` (Manual Coding Exercise 5 Part C) — code-write at normal pace
- [ ] Run tests until green
- [ ] Commit: `test(extraction): add failing tests for question extraction`
- [ ] Commit: `feat(extraction): add question extractor with PDF (LLM) and XLSX (tabular) paths`
- [ ] Add `app/api/extract_questions.py` + `app/models/extraction.py` + `tests/test_extract_questions_endpoint.py`
- [ ] Commit: `feat(api): add POST /extract-questions endpoint`
- [ ] Open PR, self-review, squash-merge to main
- [ ] Delete feature branch
- [ ] Tag if this completes a milestone (probably not yet — wait for Plan 7)

Optional smoke test against real corpus:

```bash
# After indexing, run against a real Sunflowers PDF
curl -X POST http://localhost:8000/extract-questions \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: smoketest-001" \
  -d '{"source_format": "pdf", "source_text": "<paste a few KB of real PDF text>", "filename": "Sunflowers.pdf"}'
# Expected: JSON response with ~20 questions
```

---

## 11. What Plan 7 will tackle

Plan 7 — **Answer Generation Strategy (TDD-first)**:

- Test plan for answer generation (mocked Claude, real prompt)
- The Claude single-call multi-field prompt (NewsPerspective shape + SQL-Ball strict rules)
- Few-shot example selection from ISQ_01 (gold standard)
- Source-weighting in the prompt (policies > historical ISQs)
- Citation tracking — how the LLM identifies which chunks it used
- Edge cases (no chunks retrieved, all chunks irrelevant, Claude refuses to answer)
- 🖐️ **Manual Coding Exercise 6** — typing `tests/test_generator.py` first, then the generator module
- 📘 Concept Primer sections: few-shot prompting, citations vs grounding, refusal handling

---

## Git execution block

See `git-conventions.md` for the full reference.

**Branch:** `feature/question-extraction`

**Commits (in order):**
1. `test(extraction): add tests for question extractor (pdf and xlsx paths)` — stages `rag-service/tests/test_question_extractor.py`
2. Run `pytest rag-service/tests/test_question_extractor.py -v` — confirm tests fail for the right reason
3. `feat(extraction): add unified LLM question extractor via claude tool-use` — stages `rag-service/app/extraction/extractor.py`, `rag-service/app/extraction/schemas.py`
4. `feat(api): add POST /extract-questions endpoint` — stages `rag-service/app/api/extract.py`
5. End-to-end smoke test:
   ```bash
   curl -X POST http://localhost:8000/extract-questions \
     -F "file=@source-corpus/inbound-isq-questionnaires/Sunflowers.pdf"
   # expect ~20 questions back
   ```

**Push + PR:**
```bash
git push -u origin feature/question-extraction
gh pr create --fill
```

**After merge — tag `v0.2.0`:**
```bash
git checkout main && git pull
git tag -a v0.2.0 -m "v0.2.0 — question extraction live"
git push origin v0.2.0
```

---

## Plan 6 done ✅

Question extraction locked. Two paths (LLM for PDF, tabular for XLSX). Endpoint specified. Tool-use for guaranteed JSON. Test plan written first. Manual Coding Exercise 5 is the first proper TDD-discipline-with-branching cycle (test first, fail, implement, commit, PR, merge).

**Tom's reaction needed before Plan 7:**

1. Two extraction paths (LLM for PDF, tabular for XLSX) — agreed, or want LLM for both?
2. Endpoint in rag-service vs n8n Anthropic node — agreed?
3. JSON mode via Claude tool-use (Section 5) — happy with this choice?
4. Edge case handling (warnings vs hard errors) — appropriate?
5. Plan 7 outline — anything to swap in/out?

Say "go" if happy and I'll write Plan 7.
