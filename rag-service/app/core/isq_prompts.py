"""
Centralised ISQ prompts and tool schemas (Plan 6).

Prompts live here (not inline in the modules that call them) so they are easy to
find, review, and tune in one place — and so the leakage-guard test has a single
obvious file to police. Keep this module free of any fictional-universe branding
(the leakage-guard test enforces this in CI and pre-commit).
"""

from typing import Any

# Forced tool for question extraction. tool_choice pins this tool, so Claude must
# return schema-valid JSON via tool_use — no free-text parsing, no malformed output.
EXTRACT_QUESTIONS_TOOL = {
    "name": "extract_questions",
    "description": "Extract questions from a questionnaire",
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


# --- Answer generation (Plan 7) -------------------------------------------------

# Forced tool for answer generation. tool_choice pins this, so Claude must return a
# schema-valid answer with citations and an honest four-dimension self-score.
SUBMIT_ANSWER_TOOL = {
    "name": "submit_answer",
    "description": "Submit a grounded answer to a security questionnaire question.",
    "input_schema": {
        "type": "object",
        "properties": {
            "answer": {
                "type": "string",
                "description": "The answer to provide to the requester.",
            },
            "citations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "source_id": {"type": "string"},
                        "text_snippet": {"type": "string", "maxLength": 200},
                    },
                    "required": ["source_id", "text_snippet"],
                },
            },
            "self_score": {
                "type": "object",
                "properties": {
                    "cites_policy": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                    "on_topic": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                    "vendor_tone": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                    "complete": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                },
                "required": ["cites_policy", "on_topic", "vendor_tone", "complete"],
            },
            "needs_review_reason": {
                "type": ["string", "null"],
                "description": "Reason if the answer needs human review, else null.",
            },
        },
        "required": ["answer", "citations", "self_score", "needs_review_reason"],
    },
}


ANSWER_SYSTEM_PROMPT = """You are an Information Security Lead at Northstar Labs \
answering a supplier security questionnaire sent by a potential client conducting \
vendor due diligence.

STRICT RULES:
1. Use ONLY the chunks provided in the SOURCES section of the user message.
2. Do not invent claims that are not present in the sources.
3. Prefer policy chunks over historical ISQ chunks when both cover the question.
4. Tone: professional, vendor-appropriate, concise. Mirror the style of the \
historical ISQ answers.
5. Length: 2-4 sentences typically; 5-7 for "describe" or "how do you" questions.
6. Format: prose, not bullet points (unless the source itself uses bullets).
7. If no source supports the answer, set needs_review_reason with a specific reason.
8. Never apologise. Never add "as an AI". Never add a disclaimer.
9. Use UK English spelling (organisation, programme, behaviour).

You MUST call the submit_answer tool. Self-score honestly:
- cites_policy: 1.0 if grounded in >=1 policy chunk; 0.5 if only historical_isq \
chunks; 0.0 if invented or no sources used.
- on_topic: 1.0 if it directly answers the question; lower if drifting or partial.
- vendor_tone: 1.0 if it matches historical ISQ style; lower if too casual, \
marketing-flavoured, or hedging.
- complete: 1.0 if it fully answers the question; lower if partial, evasive, or \
missing scope.

Set needs_review_reason (otherwise null) when: no sources support the answer; the \
question is outside Northstar Labs' scope (Northstar is a software-only company); \
the sources contradict each other; or the question is ambiguous and a clarification \
would help."""


# Two worked examples, embedded in the static system block so prompt caching covers
# them. Kept as illustrative text (not live turns) to keep the call shape simple.
ANSWER_FEW_SHOTS = """Two worked examples follow.

EXAMPLE 1 — a well-supported question
QUESTION: Do you maintain a formal Information Security Policy?
SOURCES:
[nlisp-p1-c0|policy|score=0.93] Northstar Labs maintains a documented Information \
Security Policy, approved by senior management and reviewed at least annually.
[hist01-q1|historical_isq|score=0.86] Q: Do you have an information security policy? \
A: Yes. Northstar Labs maintains a board-approved Information Security Policy, \
reviewed at least annually.
submit_answer input:
{
  "answer": "Yes. Northstar Labs maintains a documented Information Security Policy, \
approved by senior management and reviewed at least annually.",
  "citations": [{"source_id": "nlisp-p1-c0", "text_snippet": "documented Information \
Security Policy, approved by senior management and reviewed at least annually"}],
  "self_score": {"cites_policy": 1.0, "on_topic": 1.0, "vendor_tone": 0.95, "complete": 1.0},
  "needs_review_reason": null
}

EXAMPLE 2 — a question that is partly out of scope
QUESTION: How is privileged access to operational technology (OT) systems controlled?
SOURCES:
[nlaup-p2-c0|policy|score=0.71] Privileged access to production systems is granted on \
a least-privilege basis and reviewed quarterly.
[nlssdp-p1-c0|policy|score=0.64] Access to source control and CI/CD tooling requires \
multi-factor authentication.
submit_answer input:
{
  "answer": "Northstar Labs is a software-only organisation and does not operate \
operational technology (OT) environments. For our production systems, privileged \
access is granted on a least-privilege basis and reviewed quarterly.",
  "citations": [{"source_id": "nlaup-p2-c0", "text_snippet": "Privileged access to \
production systems is granted on a least-privilege basis and reviewed quarterly"}],
  "self_score": {"cites_policy": 0.7, "on_topic": 0.7, "vendor_tone": 0.95, "complete": 0.6},
  "needs_review_reason": "The question asks specifically about operational technology \
(OT). Northstar Labs is software-only and does not operate OT environments; the answer \
reframes to our production systems. Recommend manual review to confirm the requester \
accepts this framing."
}"""


def format_chunks_for_prompt(chunks: list[dict[str, Any]]) -> str:
    """
    Render retriever match dicts as a SOURCES block, policy chunks first.

    Each chunk becomes `[source_id|source_type|score=N.NN] text`. The retriever
    already sorts by weighted score; this groups policy ahead of historical_isq so
    the model sees the preferred sources first (rule 3), preserving score order
    within each group. A missing source_type falls back to "unknown" (never
    "policy") so a non-policy chunk is never mislabelled as a policy source.
    """
    policy = [c for c in chunks if c["metadata"].get("source_type") == "policy"]
    other = [c for c in chunks if c["metadata"].get("source_type") != "policy"]
    lines = [
        f"[{c['id']}|{c['metadata'].get('source_type') or 'unknown'}|"
        f"score={c['score']:.2f}] {c['metadata'].get('text', '')}"
        for c in policy + other
    ]
    return "\n\n".join(lines)


def build_answer_user_prompt(
    question: str,
    formatted_chunks: str,
    index: int | None = None,
    total: int | None = None,
) -> str:
    """Compose the user turn for answer generation (the only varying part)."""
    header = (
        f"QUESTION (#{index} of {total}): {question}"
        if index is not None and total is not None
        else f"QUESTION: {question}"
    )
    return (
        f"{header}\n\n"
        "SOURCES (ranked by relevance, policies first):\n\n"
        f"{formatted_chunks}\n\n"
        "Submit your answer using the submit_answer tool."
    )
