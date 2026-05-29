"""
Tests for the canonical JSON renderer.

Written FIRST per TDD discipline; the implementation in app/render/render_json.py
follows. The JSON renderer is the lossless, machine-readable deliverable: it
pretty-prints the canonical envelope with a predictable top-level key order, keeps
unicode and nulls intact, and round-trips byte-for-data through json.loads.
"""

import json

import pytest

from app.render.render_json import render_json


# Fixtures — the authoritative canonical envelope shape (Plan 9 §8).


@pytest.fixture
def canonical_one_answer():
    """Minimal canonical envelope with one answered, unflagged question."""
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
                "answer": "Yes. Northstar Labs maintains a formal Information Security "
                "Policy which is reviewed annually...",
                "citations": [
                    {
                        "source_id": "isp-s0",
                        "text_snippet": "Northstar Labs is a UK-based...",
                    },
                ],
                "confidence": {
                    "score": 0.91,
                    "needs_review": False,
                    "review_reason": None,
                },
                "metrics": {
                    "tokens_in": 1240,
                    "tokens_out": 95,
                    "cost_usd": 0.0042,
                    "latency_ms": 1820,
                },
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
    """Canonical envelope with one flagged answer and an all_flagged banner."""
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
                "metrics": {
                    "tokens_in": 800,
                    "tokens_out": 60,
                    "cost_usd": 0.003,
                    "latency_ms": 1200,
                },
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


@pytest.fixture
def canonical_unicode():
    """Non-ASCII origin, question and answer — exercises ensure_ascii=False."""
    return {
        "questionnaire_meta": {
            "origin": "Müller GmbH",
            "filename": "Müller_ISQ.pdf",
            "received_at": "2026-05-25T19:30:00Z",
            "completed_at": "2026-05-25T19:30:42Z",
            "total_questions": 1,
        },
        "answers": [
            {
                "question_id": "mul-q01",
                "question_text": "Quelle est la politique de sécurité de l'entreprise?",
                "answer": "Coûts maîtrisés — chiffrement à 100 £ près. naïve café résumé.",
                "citations": [],
                "confidence": {
                    "score": 0.80,
                    "needs_review": False,
                    "review_reason": None,
                },
                "metrics": {
                    "tokens_in": 10,
                    "tokens_out": 5,
                    "cost_usd": 0.0001,
                    "latency_ms": 100,
                },
            }
        ],
        "summary_metrics": {
            "total_cost_usd": 0.0001,
            "total_tokens": 15,
            "total_latency_ms": 100,
            "questions_flagged_for_review": 0,
            "banner": None,
        },
    }


# Helpers


def _load(path):
    """Parse the written JSON file back into a Python object."""
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _raw(path):
    """Read the written JSON file as raw text (for byte-level assertions)."""
    with open(path, encoding="utf-8") as f:
        return f.read()


# Tests


class TestRenderJson:
    def test_writes_file_to_path(self, canonical_one_answer, tmp_path):
        output = tmp_path / "out.json"
        result = render_json(canonical_one_answer, str(output))
        assert result == str(output)
        assert output.exists()

    def test_output_is_valid_json(self, canonical_one_answer, tmp_path):
        output = tmp_path / "out.json"
        render_json(canonical_one_answer, str(output))
        json.loads(_raw(output))  # raises JSONDecodeError if malformed

    def test_round_trip_lossless(self, canonical_with_flagged_answer, tmp_path):
        output = tmp_path / "out.json"
        render_json(canonical_with_flagged_answer, str(output))
        assert _load(output) == canonical_with_flagged_answer

    def test_includes_all_top_level_fields(self, canonical_one_answer, tmp_path):
        output = tmp_path / "out.json"
        render_json(canonical_one_answer, str(output))
        loaded = _load(output)
        assert {"questionnaire_meta", "answers", "summary_metrics"} <= set(loaded)

    def test_preserves_key_order(self, canonical_one_answer, tmp_path):
        output = tmp_path / "out.json"
        render_json(canonical_one_answer, str(output))
        loaded = _load(output)
        assert list(loaded)[:3] == ["questionnaire_meta", "answers", "summary_metrics"]
        # The raw text leads with the meta block at two-space indent.
        assert _raw(output).startswith('{\n  "questionnaire_meta"')

    def test_null_optional_fields_preserved(self, canonical_one_answer, tmp_path):
        output = tmp_path / "out.json"
        render_json(canonical_one_answer, str(output))
        loaded = _load(output)
        conf = loaded["answers"][0]["confidence"]
        assert "review_reason" in conf and conf["review_reason"] is None
        assert "banner" in loaded["summary_metrics"]
        assert loaded["summary_metrics"]["banner"] is None
        # Kept as null in the serialised text, not omitted.
        assert '"review_reason": null' in _raw(output)

    def test_uses_two_space_indent(self, canonical_one_answer, tmp_path):
        output = tmp_path / "out.json"
        render_json(canonical_one_answer, str(output))
        assert '\n  "answers"' in _raw(output)

    def test_unicode_preserved(self, canonical_unicode, tmp_path):
        output = tmp_path / "out.json"
        render_json(canonical_unicode, str(output))
        raw = _raw(output)
        assert "Müller GmbH" in raw
        assert "100 £" in raw
        assert "naïve café résumé" in raw
        assert "\\u" not in raw  # not escaped to \uXXXX

    def test_trailing_newline(self, canonical_one_answer, tmp_path):
        output = tmp_path / "out.json"
        render_json(canonical_one_answer, str(output))
        assert _raw(output).endswith("\n")

    def test_no_matrix_terminology_in_output(self, canonical_one_answer, tmp_path):
        """Defence-in-depth: the renderer never propagates Matrix terms."""
        output = tmp_path / "out.json"
        render_json(canonical_one_answer, str(output))
        raw = _raw(output).lower()
        forbidden = [
            "morpheus",
            "the matrix",
            "neo ",
            "white rabbit",
            "redpill",
            "bluepill",
        ]
        for term in forbidden:
            assert term not in raw, f"Matrix term '{term}' leaked into JSON output"
