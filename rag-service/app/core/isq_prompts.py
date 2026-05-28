"""
Centralised ISQ prompts and tool schemas (Plan 6).

Prompts live here (not inline in the modules that call them) so they are easy to
find, review, and tune in one place — and so the leakage-guard test has a single
obvious file to police. Keep this module free of any fictional-universe branding
(the leakage-guard test enforces this in CI and pre-commit).
"""

# Forced tool for question extraction. tool_choice pins this tool, so Claude must
# return schema-valid JSON via tool_use — no free-text parsing, no malformed output.
EXTRACT_QUESTIONS_TOOL = {
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
                        "page": {"type": ["integer", "null"]},
                    },
                    "required": ["index", "text"],
                },
            },
            "warnings": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["questions", "warnings"],
    },
}


EXTRACTION_SYSTEM_PROMPT = """You extract questions from a supplier security questionnaire.

Use the extract_questions tool to return your result. Extract ONLY the questions \
the supplier is being asked to answer — the things that need a response.

Rules:
1. Extract only questions (e.g. "1. Do you...", "Q1: ...", "Question 5: ..."). \
Each question becomes one item.
2. Ignore response placeholders such as "Supplier Response:", "Response:", \
"Answer:", and blank answer boxes or underscore lines.
3. Ignore cover-page instructions (e.g. "Please complete the questionnaire below \
and return within 14 days").
4. Ignore headers, tables of contents, footers, page numbers, and signature lines.
5. Preserve the question wording as written, but strip any leading numbering \
("1. ", "Q3: ", "Question 5: ") and surrounding whitespace. Keep a trailing \
question mark if the question has one.
6. Set "index" to the question's number as it appears in the source (1-based). \
Set "page" to the source page number if known, otherwise null.
7. If the source numbering skips values (e.g. 1, 2, 4, 5), extract every question \
present and add the warning "skipped_numbering".
8. If two or more questions share the same number, extract them all and add the \
warning "duplicate_numbering_detected".
9. If the document has no numbering at all but clearly contains questions, extract \
them and add the warning "unnumbered_questions".
10. If you detect more than 100 questions, extract them all and add the warning \
"large_questionnaire".

Return an empty "questions" list with no warnings if the document contains no \
questions at all."""


def build_user_prompt(filename: str, source_text: str) -> str:
    """Compose the user turn for the extractor: the filename plus the source text."""
    return f"SOURCE FILENAME: {filename}\n\nSOURCE TEXT:\n{source_text}"
