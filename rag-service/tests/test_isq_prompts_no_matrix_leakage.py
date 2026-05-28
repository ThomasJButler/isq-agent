"""
Matrix-strip leakage guard.

Several RAG modules were lifted from "Morpheus" — a Matrix-themed internal
codebase. This guard scans the application source for Matrix-universe terminology
so none of it leaks into the public repository. It scans `app/` only (the test
suite legitimately contains these terms in this file's own term list).

If this test fails, the reported file:line is real leakage to rename — not a
false positive to silence.
"""

import re
from pathlib import Path

import pytest

APP_DIR = Path(__file__).resolve().parents[1] / "app"

# Distinctive Matrix-universe terms only — chosen to avoid colliding with
# legitimate security / RAG vocabulary. (Deliberately NOT "oracle" or "agent"
# alone, which have legitimate technical meanings.)
FORBIDDEN_TERMS = [
    "morpheus",
    "neo",
    "trinity",
    "zion",
    "the matrix",
    "agent smith",
    "red pill",
    "blue pill",
    "nebuchadnezzar",
    "merovingian",
    "niobe",
    "white rabbit",
]

_PATTERNS = [
    (term, re.compile(rf"\b{re.escape(term)}s?\b", re.IGNORECASE))
    for term in FORBIDDEN_TERMS
]


def _app_python_files() -> list[Path]:
    return sorted(APP_DIR.rglob("*.py"))


def test_app_dir_exists():
    """Sanity: the scan target exists (guards against a silently-empty scan)."""
    assert APP_DIR.is_dir(), f"app dir not found: {APP_DIR}"
    assert _app_python_files(), "no python files found under app/ to scan"


def test_no_matrix_terminology_in_app_source():
    """No Matrix/Morpheus terminology may appear in app/ source."""
    violations: list[str] = []

    for path in _app_python_files():
        for lineno, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1
        ):
            for term, pattern in _PATTERNS:
                if pattern.search(line):
                    rel = path.relative_to(APP_DIR.parent)
                    violations.append(f"{rel}:{lineno} — '{term}' in: {line.strip()}")

    assert not violations, "Matrix terminology leaked into app source:\n" + "\n".join(
        violations
    )


@pytest.mark.parametrize("term", FORBIDDEN_TERMS)
def test_each_forbidden_term_is_absent(term):
    """Per-term check so a failure names exactly which term leaked."""
    pattern = re.compile(rf"\b{re.escape(term)}s?\b", re.IGNORECASE)
    hits = [
        f"{path.relative_to(APP_DIR.parent)}:{lineno}"
        for path in _app_python_files()
        for lineno, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1
        )
        if pattern.search(line)
    ]
    assert not hits, f"'{term}' found in: {hits}"
