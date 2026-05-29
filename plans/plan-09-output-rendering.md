# Plan 9 — Output Rendering Strategy (TDD-first)

**Status:** Plan 9. TDD-first. Renders the canonical JSON from Plan 7/8 into three deliverable formats.

**Owner:** Tom Butler
**Date:** 2026-05-25
**Prior plans:** Plan 1-8 ✅

---

## 0. What this plan does and doesn't do

**Locks in:**
- Three render adapters over the canonical JSON: clean DOCX, typeset PDF, populated XLSX
- Library choices and rationale
- Visual style (clean enterprise — Plan 1 Section 7a aesthetic)
- How `needs_review` propagates visually in each format
- Summary section generation
- Test plan written FIRST (snapshot-style for visual outputs)

**Doesn't yet cover:**
- Demo walkthrough script (Plan 10)
- Final consolidation + execution timeline (Plan 11)

---

## 0a. Scope amendments (Audit 3, 2026-05-25)

- **PDF renderer DEFERRED.** Original scope was 3 visual outputs (DOCX + PDF + XLSX) + JSON. Per Audit 3 time-budget analysis, PDF moves to "if Friday morning permits, else v1.1 backlog." DOCX + XLSX + JSON ship as the v1 minimum.
- **Visual style for the rendered DOCX/XLSX/PDF outputs is the navy/amber/Calibri compliance palette from Plan 1 Section 7a.** This is correct — printed compliance documents should look like compliance documents. (Confirmed during the Claude Design pass: the dashboard's warm-paper aesthetic does NOT propagate to rendered outputs.)
- **Clarification on `text_snippet`:** the `text_snippet` field in citations is **200 characters max** (a preview). The full chunk text stored in Pinecone metadata is **500 characters** (the chunk_size constant from Plan 4). These are different fields, do not conflate.
- **Dashboard design (stretch deliverable) is LOCKED to Iteration 3 — the Claude × RiverAI Hybrid.** See `plans/design-decision-locked.md` for the full decision record + must-do tweaks. Source files live at `design/design_handoff_isq_agent/designs/prototype-hybrid/`.
- **Prerequisite — canonical-JSON assembler.** These renderers consume a single canonical envelope (`questionnaire_meta` + `answers[]` + `summary_metrics` + `banner`), but `/answer` returns **one question** today. Something must loop `/answer` over the extracted questions, aggregate per-question results, and compute `summary_metrics` (incl. `average_confidence`, `flagged_question_indices`). Decide where this lives — n8n orchestration or a small FastAPI helper — and treat it as a Plan 9 prerequisite. Per-question `confidence` is the nested object `{score, dimensions, needs_review, review_reason}` from Plan 8 (the §5 flat `needs_review`/`review_reason` are illustrative — read them off `confidence`).
- **Download delivery (only if the stretch dashboard is built).** `render_<fmt>()` returns a local `output_path`; the dashboard Results page needs browser-downloadable URLs. The canonical envelope has no `run_id` today — add one and expose either a `/runs/{id}/download/{fmt}` route or n8n static serving. Out of scope for v1 (n8n hands the files back directly), noted so it isn't a surprise later.

---

## 1. The architecture decision — typeset, not overlay

### Three formats, two strategies

| Format | Strategy | Why |
|---|---|---|
| **DOCX** | Typeset from scratch | Clean report format. Best showcase for layout + branding. |
| **PDF** | Typeset from scratch (mirrors source layout but isn't an overlay) | True overlay (writing text onto the original PDF) is genuinely hard — font matching, response-box detection, layout variation. Typeset gives 90% of the perceived value at 10% of the complexity. |
| **XLSX** | True overlay (populate Response column in copy of source) | XLSX has explicit structure — populating a cell is trivial. Overlay is the right call here. |

Walkthrough talking point: "I considered true PDF overlay — writing answers directly onto the response boxes of the original. The layout-detection complexity wasn't worth it for v1, especially when the typeset version gives a cleaner result anyway. In v2 with more time, I'd add pdf-lib-based overlay for the audit-trail case where compliance teams want the literal completed form. XLSX overlay is straightforward and shipped."

### Library choices (LOCKED)

| Format | Library | Why |
|---|---|---|
| DOCX | `python-docx` | Tom already uses this in JobSearch2026. Battle-tested. Clean API. |
| PDF | `reportlab` (typeset) | More flexible than weasyprint for the layout we want. Direct primitive control. |
| XLSX | `openpyxl` | Standard for XLSX cell manipulation. Already in Morpheus's document_processor. |
| JSON | Python stdlib `json` | Obviously |

---

## 2. Test plan (defined FIRST)

### Tests for DOCX renderer (`tests/test_render_docx.py`)

| Test | Verifies |
|---|---|
| `test_renders_file_to_path` | Given canonical JSON + path, writes a valid .docx file |
| `test_includes_summary_table_at_top` | First section is the summary (total, flagged count, cost, time) |
| `test_includes_all_answers_in_order` | Each answer appears with question text + answer + confidence |
| `test_marks_flagged_answers_with_review_badge` | Flagged answers render with `[⚠ REVIEW]` indicator |
| `test_uses_calibri_body_font` | Body text style uses Calibri 11pt |
| `test_uses_navy_color_for_headers` | Headers use navy (#1F2A44) |
| `test_includes_review_reason_for_flagged_answers` | Flagged answers include the review reason below the answer text |
| `test_includes_citations_per_answer` | Citation list appears under each answer |
| `test_all_flagged_includes_banner` | When all questions flagged, prominent banner appears at top |
| `test_handles_empty_answer_list` | Zero answers → renders summary saying "no questions answered" |
| `test_no_matrix_terminology_in_output` | Output file doesn't contain "Matrix", "Neo", etc. (defence-in-depth lint) |

### Tests for PDF renderer (`tests/test_render_pdf.py`)

| Test | Verifies |
|---|---|
| `test_renders_file_to_path` | Writes a valid .pdf file |
| `test_includes_cover_page` | First page is cover with summary |
| `test_includes_all_answers` | All answers present in body |
| `test_marks_flagged_with_review_indicator` | Flagged answers have `[REVIEW]` indicator |
| `test_uses_uk_paper_size` | A4 (not US Letter) |
| `test_summary_count_matches_answers` | Summary count matches actual answer count |

### Tests for XLSX renderer (`tests/test_render_xlsx.py`)

| Test | Verifies |
|---|---|
| `test_renders_file_to_path` | Writes a valid .xlsx file |
| `test_populates_response_column` | Every Question row gets its Response column filled |
| `test_highlights_flagged_cells_yellow` | Flagged cells get yellow fill (`#FFEB9C`) |
| `test_preserves_source_structure` | Title row, metadata rows, header row all preserved |
| `test_includes_summary_sheet` | Second worksheet has the summary |
| `test_no_matrix_terminology_in_output` | Output doesn't leak Matrix terms |

### Tests for JSON renderer (`tests/test_render_json.py`)

| Test | Verifies |
|---|---|
| `test_renders_canonical_structure` | Output matches Plan 2 service contract shape |
| `test_includes_all_required_fields` | questionnaire_meta, answers, summary_metrics all present |
| `test_handles_missing_optional_fields` | Optional fields render as null, not omitted |
| `test_is_valid_json` | Output parses with `json.loads` |

**Test count for Plan 9:** ~26 tests across 4 modules. Estimated writing time: ~2 hours.

---

## 3. Visual style (locked from Plan 1 Section 7a)

### DOCX

- Body: Calibri 11pt black
- Headers: Calibri Bold, navy (#1F2A44), sizes 16pt (H1) / 13pt (H2) / 11.5pt (H3)
- Summary table: thin grey borders, header row navy-on-white-bold
- Flagged badge: `[⚠ REVIEW]` in bold red (#B91C1C), inline with question text
- Review reason: italic grey, indented under the flagged answer
- Citations: small caps grey, comma-separated, under the answer
- Northstar Labs branding: header on every page (top right, small navy text)
- No emoji except the `⚠` for review badges (single exception for accessibility — screen readers announce it as "warning")
- Margins: 1 inch all sides
- Page numbers: bottom right, small grey

### PDF (typeset via reportlab)

Same style applied via reportlab styles:
- A4 paper
- Calibri equivalent (Helvetica via reportlab default — Calibri isn't built into reportlab without embedding)
- Cover page: navy title bar, summary table, recipient/sender info
- Body: question + answer pairs, page-breaks respected
- Footer: page numbers, "Northstar Labs Response"

### XLSX (overlay onto source)

- Source structure preserved exactly
- Response cells populated with the answer text
- Flagged cells: fill colour `#FFEB9C` (light yellow), font unchanged
- Flagged answers prefixed in-cell with `[REVIEW] ` before the answer text
- Second worksheet named "Summary" added with the summary table

### JSON

- Pretty-printed with 2-space indent
- UTF-8 encoded
- Keys ordered: questionnaire_meta first, answers second, summary_metrics last (predictable for diff-readers)

---

## 4. Output schemas

### DOCX structure (top to bottom)

**Field note:** `{requester_name}` here (and `RESPONSE TO {requester_name}` on the PDF cover page below) is populated from `questionnaire_meta.origin` — the field the canonical fixtures actually use (e.g. "Sunflowers Charity", "Blackridge Wind Energy"). Use one name across the templates, the renderer, and the fixtures.

```
[Northstar Labs header banner]

NORTHSTAR LABS — RESPONSE TO {requester_name}
{filename of source ISQ}
Completed: {iso timestamp}

SUMMARY
─────────────────────────────────────────
Total questions:    {n}
Flagged for review: {k} ({list of indices})
Total cost:         ${cost}
Total time:         {seconds}s

[Optional banner if all_flagged]
⚠ ALL ANSWERS FLAGGED FOR REVIEW
The knowledge base may not cover this questionnaire's domain.

QUESTIONS & ANSWERS
─────────────────────────────────────────

Q1: {question text}
{answer text}
Confidence: {score} | Citations: {source_ids}

Q2: {question text}  [⚠ REVIEW]
{answer text}
Review reason: {review_reason}
Confidence: {score} | Citations: {source_ids}

... and so on
```

### XLSX overlay structure

Source XLSX is opened, then:
- Find the Response column header
- For each subsequent row with a Question, write the answer to the Response cell
- If flagged: fill the Response cell yellow, prepend `[REVIEW] `
- Add a "Summary" sheet (new sheet appended)

### PDF cover page

```
NORTHSTAR LABS
RESPONSE TO {requester_name}
{filename}

────────────────────

Total questions:    {n}
Flagged for review: {k}
Total cost:         ${cost}
Total time:         {seconds}s

[banner if all_flagged]

────────────────────

Page 1 of {total}
```

Body pages: one question + answer pair per page (or two per page if short), with the review badge inline.

---

## 5. needs_review visual propagation (locked behaviours)

Already specified in Plan 8 Section 6. Re-stated here for the renderer to consume:

| Format | Flagged indicator | Position | Style |
|---|---|---|---|
| DOCX | `[⚠ REVIEW]` | Inline with question heading | Red bold (#B91C1C) |
| DOCX | review_reason | Below the answer | Italic grey, indented |
| PDF | `[REVIEW]` | Inline with question | Red bold |
| PDF | review_reason | Below answer | Italic grey |
| XLSX | Yellow cell fill (#FFEB9C) | Response cell | Background colour change |
| XLSX | `[REVIEW] ` prefix | Inside cell | Text prefix |
| JSON | `needs_review: true` | Structured field | n/a |
| JSON | `review_reason: "..."` | Structured field | n/a |

---

## 6. Banner rendering (when all flagged)

For DOCX:
```
┌────────────────────────────────────────────────────┐
│ ⚠ ALL ANSWERS FLAGGED FOR REVIEW                   │
│                                                    │
│ The knowledge base may not cover this              │
│ questionnaire's domain. Consider whether the       │
│ source corpus needs extending for this requester.  │
└────────────────────────────────────────────────────┘
```
Boxed table, amber border (#F59E0B), navy text.

For PDF: same boxed table on the cover page.

For XLSX: First row of the Summary sheet is the banner text in amber-filled cells.

For JSON: `summary_metrics.banner: "all_flagged"`.

---

## 7. Renderer module structure

```
rag-service/app/render/
├── __init__.py
├── render_docx.py        # python-docx
├── render_pdf.py         # reportlab
├── render_xlsx.py        # openpyxl
├── render_json.py        # stdlib json
└── shared.py             # common helpers: format_currency, format_duration, style constants
```

### Entry point per renderer

Each renderer exposes one function:

```python
def render_docx(canonical: dict, output_path: str) -> str:
    """Render canonical JSON to DOCX. Returns the output path."""
    ...
```

Same signature shape for `render_pdf`, `render_xlsx`, `render_json`. Makes them composable from n8n (n8n calls each renderer in parallel).

### Style constants (shared)

```python
# app/render/shared.py
NAVY = "#1F2A44"
AMBER_REVIEW = "#FFEB9C"
RED_REVIEW = "#B91C1C"
GREY_CITATION = "#6B7280"
BODY_FONT = "Calibri"
BODY_SIZE_PT = 11
HEADER_SIZE_PT = {"h1": 16, "h2": 13, "h3": 11.5}
```

---

## 8. 🖐️ Manual Coding Exercise 8 — TEST FILE FIRST (DOCX renderer)

**Purpose:** TDD cycle for the DOCX renderer (the most-shown output in your walkthrough). ~70 lines tests + ~200 lines implementation. ~60 minutes.

The other two renderers (PDF, XLSX) follow the same TDD pattern; you'll code-write them at normal pace once the DOCX one is done.

### Part A — type the DOCX test file FIRST

**File:** `rag-service/tests/test_render_docx.py`

```python
"""
Tests for the DOCX renderer.
Written FIRST per TDD discipline. Implementation in app/render/render_docx.py follows.
"""

import os
from pathlib import Path
import pytest
from docx import Document
from app.render.render_docx import render_docx


# Fixtures

@pytest.fixture
def canonical_one_answer():
    """Minimal canonical JSON with one answered question."""
    return {
        "questionnaire_meta": {
            "origin": "Sunflowers Charity",
            "filename": "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf",
            "received_at": "2026-05-25T19:30:00Z",
            "completed_at": "2026-05-25T19:30:42Z",
            "total_questions": 1,
        },
        "answers": [
            {
                "question_id": "sun-q01",
                "question_text": "Do you maintain a formal Information Security Policy?",
                "answer": "Yes. Northstar Labs maintains a formal Information Security Policy which is reviewed annually...",
                "citations": [
                    {"source_id": "isp-s0", "text_snippet": "Northstar Labs is a UK-based..."},
                ],
                "confidence": {
                    "score": 0.91,
                    "needs_review": False,
                    "review_reason": None,
                },
                "metrics": {"tokens_in": 1240, "tokens_out": 95, "cost_usd": 0.0042, "latency_ms": 1820},
            }
        ],
        "summary_metrics": {
            "total_cost_usd": 0.0042,
            "total_tokens": 1335,
            "total_latency_ms": 1820,
            "questions_flagged_for_review": 0,
            "banner": None,
        },
    }


@pytest.fixture
def canonical_with_flagged_answer():
    """Canonical JSON with one flagged answer."""
    return {
        "questionnaire_meta": {
            "origin": "Blackridge Wind Energy",
            "filename": "Blackridge.pdf",
            "received_at": "2026-05-25T19:30:00Z",
            "completed_at": "2026-05-25T19:30:42Z",
            "total_questions": 1,
        },
        "answers": [
            {
                "question_id": "bla-q01",
                "question_text": "How is privileged access to OT systems controlled?",
                "answer": "Northstar Labs does not operate operational technology systems.",
                "citations": [],
                "confidence": {
                    "score": 0.55,
                    "needs_review": True,
                    "review_reason": "Scope mismatch — Northstar is software-only.",
                },
                "metrics": {"tokens_in": 800, "tokens_out": 60, "cost_usd": 0.003, "latency_ms": 1200},
            }
        ],
        "summary_metrics": {
            "total_cost_usd": 0.003,
            "total_tokens": 860,
            "total_latency_ms": 1200,
            "questions_flagged_for_review": 1,
            "banner": "all_flagged",
        },
    }


# Tests

class TestRenderDocx:
    def test_writes_file_to_path(self, canonical_one_answer, tmp_path):
        output = tmp_path / "output.docx"
        result_path = render_docx(canonical_one_answer, str(output))
        assert os.path.exists(result_path)
        assert result_path == str(output)

    def test_output_is_valid_docx(self, canonical_one_answer, tmp_path):
        output = tmp_path / "output.docx"
        render_docx(canonical_one_answer, str(output))
        # If invalid, opening will raise
        doc = Document(str(output))
        assert doc is not None

    def test_includes_question_text(self, canonical_one_answer, tmp_path):
        output = tmp_path / "output.docx"
        render_docx(canonical_one_answer, str(output))
        doc = Document(str(output))
        full_text = "\n".join(p.text for p in doc.paragraphs)
        assert "Do you maintain a formal Information Security Policy?" in full_text

    def test_includes_answer_text(self, canonical_one_answer, tmp_path):
        output = tmp_path / "output.docx"
        render_docx(canonical_one_answer, str(output))
        doc = Document(str(output))
        full_text = "\n".join(p.text for p in doc.paragraphs)
        assert "Northstar Labs maintains a formal Information Security Policy" in full_text

    def test_includes_summary_table(self, canonical_one_answer, tmp_path):
        output = tmp_path / "output.docx"
        render_docx(canonical_one_answer, str(output))
        doc = Document(str(output))
        # TODO ① — Tom: assert that the doc contains at least one table (the summary table)
        # Hint: assert len(doc.tables) >= 1
        # ~1 line.
        pass

    def test_marks_flagged_answer_with_review_badge(self, canonical_with_flagged_answer, tmp_path):
        output = tmp_path / "flagged.docx"
        render_docx(canonical_with_flagged_answer, str(output))
        doc = Document(str(output))
        full_text = "\n".join(p.text for p in doc.paragraphs)
        assert "REVIEW" in full_text

    def test_includes_review_reason_for_flagged(self, canonical_with_flagged_answer, tmp_path):
        output = tmp_path / "flagged.docx"
        render_docx(canonical_with_flagged_answer, str(output))
        doc = Document(str(output))
        full_text = "\n".join(p.text for p in doc.paragraphs)
        # TODO ② — Tom: assert that the review reason appears somewhere in the doc
        # Hint: assert "Scope mismatch" in full_text
        # ~1 line.
        pass

    def test_all_flagged_banner_present(self, canonical_with_flagged_answer, tmp_path):
        output = tmp_path / "all_flagged.docx"
        render_docx(canonical_with_flagged_answer, str(output))
        doc = Document(str(output))
        full_text = "\n".join(p.text for p in doc.paragraphs)
        assert "ALL ANSWERS FLAGGED" in full_text.upper()

    def test_no_matrix_terminology_in_output(self, canonical_one_answer, tmp_path):
        """Defence-in-depth: even if a chunk leaks 'Matrix', the renderer doesn't propagate it."""
        output = tmp_path / "output.docx"
        render_docx(canonical_one_answer, str(output))
        doc = Document(str(output))
        full_text = "\n".join(p.text for p in doc.paragraphs).lower()
        forbidden = ["morpheus", "the matrix", "neo ", "white rabbit", "redpill", "bluepill"]
        for term in forbidden:
            assert term not in full_text, f"Matrix term '{term}' leaked into DOCX output"

    def test_uses_calibri_body_font(self, canonical_one_answer, tmp_path):
        output = tmp_path / "output.docx"
        render_docx(canonical_one_answer, str(output))
        doc = Document(str(output))
        # Check that at least one body paragraph uses Calibri
        for p in doc.paragraphs:
            for run in p.runs:
                if run.font.name:
                    assert run.font.name == "Calibri", f"Unexpected font: {run.font.name}"
                    break  # just check the first one we find
            break

    def test_handles_empty_answers(self, tmp_path):
        empty_canonical = {
            "questionnaire_meta": {"origin": "Test", "filename": "test.pdf", "received_at": "", "completed_at": "", "total_questions": 0},
            "answers": [],
            "summary_metrics": {"total_cost_usd": 0.0, "total_tokens": 0, "total_latency_ms": 0, "questions_flagged_for_review": 0, "banner": None},
        }
        output = tmp_path / "empty.docx"
        result = render_docx(empty_canonical, str(output))
        assert os.path.exists(result)
```

### Part B — fail tests, then implement

```bash
cd rag-service
pytest tests/test_render_docx.py -v
# Expected: ModuleNotFoundError. Tests fail for the right reason.
```

### Part C — implement `rag-service/app/render/render_docx.py`

Structure (~200 lines, code-write at normal pace):

1. Imports: `python-docx`, `app.render.shared` for style constants
2. `render_docx(canonical, output_path)` entry point
3. Helpers:
   - `_add_header(doc, meta)` — Northstar Labs branding + title
   - `_add_summary_table(doc, meta, summary)` — the summary block at top
   - `_add_all_flagged_banner(doc, summary)` — conditional banner
   - `_add_answer(doc, answer)` — one question/answer pair, with flagged styling
   - `_add_citations(doc, citations)` — citation list under each answer
   - `_apply_navy_color(run)`, `_apply_calibri_font(run)` — style helpers

### Part D — green tests, commit, PR, merge

Run tests. Commit with Conventional Commits format:

```bash
git add tests/test_render_docx.py
git commit -m "test(render): add failing tests for DOCX renderer"

git add app/render/render_docx.py app/render/shared.py app/render/__init__.py
git commit -m "feat(render): add DOCX renderer with summary, flagged badges, no-Matrix lint"

git push -u origin feature/render-docx
# Open PR, self-review, squash-merge
```

### Part E — repeat the pattern for PDF, XLSX, JSON

After DOCX is green and merged, repeat the TDD cycle for each:

1. `feature/render-pdf` branch → test_render_pdf.py first → render_pdf.py → PR
2. `feature/render-xlsx` branch → test_render_xlsx.py first → render_xlsx.py → PR
3. `feature/render-json` branch → test_render_json.py first → render_json.py → PR

Each is shorter than DOCX (PDF and XLSX inherit the style constants and helpers from shared.py; JSON is trivial).

### Acceptance for TODOs

- **TODO ①** (Part A line ~95): `assert len(doc.tables) >= 1` — 1 line
- **TODO ②** (Part A line ~110): `assert "Scope mismatch" in full_text` — 1 line

### Commit summary across Plan 9

```
test(render): add failing tests for DOCX renderer
feat(render): add DOCX renderer with summary, flagged badges, no-Matrix lint
test(render): add failing tests for PDF renderer
feat(render): add typeset PDF renderer using reportlab
test(render): add failing tests for XLSX overlay renderer
feat(render): add XLSX overlay renderer with flagged-cell highlighting
test(render): add failing tests for JSON renderer
feat(render): add canonical JSON renderer
feat(api): wire all four renderers into n8n response
```

After all four renderers green + merged: tag `v0.5.0`.

---

## 9. 📘 Concept Primer

### PDF overlay vs typeset

If you want to fill in a paper form, you have two options:
- **Overlay:** photocopy the form, then handwrite or print directly onto the photocopy
- **Typeset:** write your responses in a fresh document that mirrors the form's structure

Overlay looks more authentic — it IS the original form, just with answers added. But it's harder because you need to know exactly where each blank goes (positioning, font matching, response box detection).

Typeset is cleaner — you control the layout entirely. You lose the "this is the original form" feeling but you gain readability + simplicity.

We picked typeset for PDF because the layout-detection complexity isn't worth it for v1. For XLSX we picked overlay because XLSX is structured (cells have addresses), making overlay trivial.

### python-docx

A Python library for creating and editing Microsoft Word `.docx` files. Lets you write Python code that builds a Word document section by section — add a heading, add a paragraph, add a table, set fonts, set colours, save the file.

Under the hood, `.docx` is actually a ZIP containing XML files. python-docx handles all the XML so you work with high-level concepts (`doc.add_paragraph("Hello")`).

We use it because it's reliable, well-documented, and produces Word docs that open cleanly in Microsoft Word, LibreOffice, and Google Docs.

### Cell colouring in openpyxl

In an XLSX file, each cell can have a "fill colour" — the background colour of that cell. You can set this via openpyxl:

```python
from openpyxl.styles import PatternFill
yellow_fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")
worksheet["B5"].fill = yellow_fill
```

We use this to highlight flagged cells. The reviewer opening the spreadsheet sees the yellow cells immediately — they don't have to read every answer to find which ones need review.

It's the same as how you'd colour-code cells manually in Excel, but done in code.

---

## 10. End-of-Plan-9 checklist

For the build session:

- [ ] `git checkout -b feature/render-docx`
- [ ] Create `rag-service/app/render/__init__.py` and `shared.py` with style constants
- [ ] Create `rag-service/tests/test_render_docx.py` (Exercise 8 Part A) — TYPE
- [ ] Run pytest, confirm failures
- [ ] Implement `app/render/render_docx.py` — code-write at normal pace
- [ ] Run tests until green
- [ ] Two commits, PR, squash-merge
- [ ] Repeat the pattern for `feature/render-pdf`, `feature/render-xlsx`, `feature/render-json`
- [ ] Tag `v0.5.0` after all four merged
- [ ] Update n8n workflow to call each renderer (parallel HTTP requests after answer assembly)
- [ ] Smoke-test with a real Sunflowers run end-to-end — three download links should produce three real files

---

## 11. What Plan 10 will tackle

Plan 10 — **Demo + Walkthrough Script**:

- The full walkthrough script (verbatim — the words you'll say)
- Slide deck (if any — probably minimal, screen-share is the main artefact)
- Demo dataset choice (Sunflowers first, Blackridge second to show flagging)
- "What I'd do with more time" list (Lee explicitly asked)
- Q&A preparation (likely questions + your answers)
- Rehearsal plan
- 🖐️ **Manual Coding Exercise 9** — typing the walkthrough script + recording yourself once

---

## Git execution block

See `git-conventions.md` for the full reference. Three render adapters = three branches. PDF deferred to Friday per Audit 3 (ship `v0.5.0` once DOCX + XLSX + JSON are green).

**Branch A — DOCX renderer:** `feature/render-docx`
1. `test(render): add tests for docx renderer (summary, badge, banner)` — stages `rag-service/tests/test_render_docx.py`
2. `feat(render): add docx renderer with summary table and needs-review badge` — stages `rag-service/app/render/docx.py`, `rag-service/app/render/shared.py`
3. Push, PR, squash-merge.

**Branch B — XLSX renderer:** `feature/render-xlsx`
1. `test(render): add tests for xlsx overlay renderer` — stages `rag-service/tests/test_render_xlsx.py`
2. `feat(render): add xlsx overlay renderer with cell colouring` — stages `rag-service/app/render/xlsx.py`
3. Push, PR, squash-merge.

**Branch C — JSON renderer:** `feature/render-json`
1. `test(render): add tests for canonical json renderer` — stages `rag-service/tests/test_render_json.py`
2. `feat(render): add canonical json renderer` — stages `rag-service/app/render/json.py`
3. Push, PR, squash-merge.

**After all three merge:**
```bash
# Update n8n workflow to call all three renderers in parallel
# End-to-end smoke test with Sunflowers PDF
git checkout main && git pull
git tag -a v0.5.0 -m "v0.5.0 — DOCX + XLSX + JSON renderers (PDF deferred)"
git push origin v0.5.0
```

**Friday-morning stretch — PDF renderer (only if time):** `feature/render-pdf`
1. `test(render): add tests for pdf typeset renderer` — stages `rag-service/tests/test_render_pdf.py`
2. `feat(render): add pdf typeset renderer with cover page` — stages `rag-service/app/render/pdf.py`
3. Push, PR, squash-merge. Bump tag to `v0.5.1` only if shipping — otherwise document in v1.1 backlog.

---

## Plan 9 done ✅

Three render adapters locked. Typeset for DOCX + PDF, overlay for XLSX. Visual style locked (Calibri/navy/amber). needs_review visual propagation defined for each format. Banner rendering specified. Test plan written FIRST. Manual Coding Exercise 8 follows TDD-with-branching pattern.

**Tom's reaction needed before Plan 10:**

1. Typeset PDF (not overlay) — agreed?
2. python-docx + reportlab + openpyxl library choices — happy?
3. Visual style (Calibri, navy #1F2A44, amber #FFEB9C, red #B91C1C) — locked or want to tune?
4. Module structure (`app/render/{docx,pdf,xlsx,json}.py` + `shared.py`) — agreed?
5. Plan 10 outline — happy?

Say "go" and I'll write Plan 10.
