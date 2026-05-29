"""
Shared style constants + helpers for the render adapters (Plan 9).

The rendered compliance documents use the navy/amber/Calibri palette from Plan 1
Section 7a — printed compliance output should look like compliance output (this is
deliberately NOT the dashboard's warm-paper aesthetic). DOCX, PDF, and XLSX renderers
all draw their constants from here so the three formats stay visually consistent.
"""

from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

# Compliance palette (Plan 9 Section 3). RGBColor for python-docx runs; hex strings
# for raw oxml borders (which take a bare 6-char hex, no leading #).
NAVY = RGBColor(0x1F, 0x2A, 0x44)
RED_REVIEW = RGBColor(0xB9, 0x1C, 0x1C)
GREY_CITATION = RGBColor(0x6B, 0x72, 0x80)
AMBER_BORDER_HEX = "F59E0B"
GREY_BORDER_HEX = "BFBFBF"

BODY_FONT = "Calibri"
BODY_SIZE_PT = 11
HEADER_SIZE_PT = {"h1": 16, "h2": 13, "h3": 11.5}

# The single allowed glyph (Plan 9 Section 3) — screen readers announce it as "warning".
REVIEW_BADGE = "  [⚠ REVIEW]"
ALL_FLAGGED_HEADLINE = "⚠ ALL ANSWERS FLAGGED FOR REVIEW"
ALL_FLAGGED_BODY = (
    "The knowledge base may not cover this questionnaire's domain. "
    "Consider whether the source corpus needs extending for this requester."
)
ALL_FAILED_HEADLINE = "⚠ ALL ANSWERS FAILED TO GENERATE"
ALL_FAILED_BODY = (
    "Every question's answer generation failed. Check the rag-service and its upstream "
    "APIs are reachable, then re-run this questionnaire."
)


def format_currency(value: float) -> str:
    """Format a USD cost. 4dp keeps sub-cent run costs legible (e.g. $0.0042)."""
    return f"${value:.4f}"


def format_duration(latency_ms: float) -> str:
    """Format a latency in ms as seconds (e.g. 1820 -> '1.8s')."""
    return f"{(latency_ms or 0) / 1000:.1f}s"


def style_run(
    run,
    *,
    size_pt: float = BODY_SIZE_PT,
    color: RGBColor | None = None,
    bold: bool = False,
    italic: bool = False,
):
    """Apply the body font + optional weight/colour to a run.

    The font name MUST be set on the run (not just a style) so python-docx reads it
    back via run.font.name — the renderer's test asserts the body font is Calibri.
    """
    run.font.name = BODY_FONT
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color is not None:
        run.font.color.rgb = color
    return run


def set_cell_border(cell, *, color: str = GREY_BORDER_HEX, sz: str = "4") -> None:
    """Apply a single-line border to all four edges of a table cell.

    python-docx 1.2.0 has no high-level border API, so this writes the w:tcBorders
    oxml directly. sz is in eighths of a point ('4' = 0.5pt thin, '18' ≈ 2.25pt).
    """
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        element = OxmlElement(f"w:{edge}")
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), sz)
        element.set(qn("w:color"), color)
        borders.append(element)
    tc_pr.append(borders)
