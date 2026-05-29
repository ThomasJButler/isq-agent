"""
Tests for the packaged Claude Code skill (Plan 9.5).

Written FIRST per TDD discipline. The skill lives at <repo>/skill/isq-agent/ and is a zipped
directory (SKILL.md + scripts + references) installable in Claude Code. These tests pin the
trigger surface (SKILL.md frontmatter + length + no-Matrix lint), the health check's exit
codes against both /health response shapes (the live endpoint returns only {"status": "ok"}
today, so check_health must cope with a missing dependencies dict), process_isq's
argument/format validation, and that the directory zips into a valid .skill archive with
SKILL.md at the expected root.

The scripts are loaded by file path (importlib) rather than imported as a package, since they
live outside rag-service. Only the standalone, deterministic behaviour is unit-tested; the
full HTTP orchestration in process_isq is exercised by the manual end-to-end smoke.
"""

import importlib.util
import re
import zipfile
from pathlib import Path
from unittest.mock import Mock

SKILL_DIR = Path(__file__).resolve().parents[2] / "skill" / "isq-agent"
SKILL_MD = SKILL_DIR / "SKILL.md"


def _load_script(name):
    """Load a skill script as a module by file path (it lives outside the package)."""
    path = SKILL_DIR / "scripts" / name
    spec = importlib.util.spec_from_file_location(name[:-3], path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _frontmatter(text):
    """Return the YAML frontmatter block (between the first two --- fences)."""
    match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    assert match, "SKILL.md must open with a --- frontmatter block"
    return match.group(1)


def _mock_httpx(*, json_body=None, raises=None, status_error=None):
    """A stand-in httpx module whose .get returns a canned response or raises.

    raises: httpx.get itself raises (transport-level, i.e. unreachable).
    status_error: httpx.get returns a response whose raise_for_status() raises
        (the service is reachable but returned an HTTP error).
    """
    httpx = Mock()
    if raises is not None:
        httpx.get = Mock(side_effect=raises)
        return httpx
    resp = Mock()
    resp.raise_for_status = Mock(
        side_effect=status_error
    )  # no-op when status_error is None
    resp.json = Mock(return_value=json_body)
    httpx.get = Mock(return_value=resp)
    return httpx


# SKILL.md


def test_skill_md_has_required_frontmatter():
    fm = _frontmatter(SKILL_MD.read_text(encoding="utf-8"))
    assert re.search(r"^name:\s*\S+", fm, re.MULTILINE)
    assert re.search(r"^description:\s*\S+", fm, re.MULTILINE)


def test_skill_description_under_1000_chars():
    fm = _frontmatter(SKILL_MD.read_text(encoding="utf-8"))
    match = re.search(r"^description:\s*(.+)$", fm, re.MULTILINE)
    assert match, "frontmatter must have a description"
    assert len(match.group(1).strip()) <= 1000


def test_skill_md_no_matrix_terminology():
    text = SKILL_MD.read_text(encoding="utf-8").lower()
    for term in [
        "morpheus",
        "the matrix",
        "neo ",
        "white rabbit",
        "redpill",
        "bluepill",
    ]:
        assert term not in text, f"Matrix term '{term}' leaked into SKILL.md"


# check_health.py


def test_check_health_returns_0_when_status_ok(monkeypatch):
    ch = _load_script("check_health.py")
    monkeypatch.setattr(ch, "httpx", _mock_httpx(json_body={"status": "ok"}))
    assert ch.main() == 0


def test_check_health_returns_0_when_dependencies_all_true(monkeypatch):
    ch = _load_script("check_health.py")
    monkeypatch.setattr(
        ch,
        "httpx",
        _mock_httpx(
            json_body={
                "status": "ok",
                "dependencies": {"pinecone": True, "voyage": True, "anthropic": True},
            }
        ),
    )
    assert ch.main() == 0


def test_check_health_returns_2_when_dependencies_down(monkeypatch):
    ch = _load_script("check_health.py")
    monkeypatch.setattr(
        ch,
        "httpx",
        _mock_httpx(
            json_body={
                "status": "degraded",
                "dependencies": {"pinecone": True, "voyage": False},
            }
        ),
    )
    assert ch.main() == 2


def test_check_health_returns_1_when_unreachable(monkeypatch):
    ch = _load_script("check_health.py")
    monkeypatch.setattr(
        ch, "httpx", _mock_httpx(raises=RuntimeError("connection refused"))
    )
    assert ch.main() == 1


def test_check_health_returns_2_on_http_error(monkeypatch):
    """Reachable but the service returned a 4xx/5xx → exit 2, not 1 (unreachable)."""
    ch = _load_script("check_health.py")
    monkeypatch.setattr(
        ch, "httpx", _mock_httpx(status_error=RuntimeError("500 Server Error"))
    )
    assert ch.main() == 2


def test_check_health_empty_dependencies_defer_to_status(monkeypatch):
    """An empty dependencies dict is not vacuously healthy — fall back to status."""
    ch = _load_script("check_health.py")
    monkeypatch.setattr(
        ch, "httpx", _mock_httpx(json_body={"status": "degraded", "dependencies": {}})
    )
    assert ch.main() == 2


# process_isq.py


def test_process_isq_handles_missing_file():
    pi = _load_script("process_isq.py")
    assert pi.main(["/no/such/file.pdf"]) == 1


def test_process_isq_rejects_unsupported_format(tmp_path):
    pi = _load_script("process_isq.py")
    bad = tmp_path / "notes.txt"
    bad.write_text("not a questionnaire")
    assert pi.main([str(bad)]) == 1


# packaging


def test_zip_packaging_produces_valid_skill_file(tmp_path):
    skill_root = SKILL_DIR.parent  # <repo>/skill
    out = tmp_path / "isq-agent.skill"
    with zipfile.ZipFile(out, "w") as zf:
        for f in SKILL_DIR.rglob("*"):
            if f.is_file():
                zf.write(f, f.relative_to(skill_root))
    assert zipfile.is_zipfile(out)
    with zipfile.ZipFile(out) as zf:
        names = zf.namelist()
    assert "isq-agent/SKILL.md" in names
