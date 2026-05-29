"""POST /render — render the canonical envelope to a downloadable file (Plan 10).

The n8n workflow runs in its own container and can't import the Python renderers the way the
packaged skill does, so it posts the /process-questionnaire envelope here and gets back a
DOCX, XLSX or JSON file. For XLSX the answers are overlaid onto an uploaded source workbook
when one is supplied; without a source a standalone workbook is produced.
"""

import json
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.render.render_docx import render_docx
from app.render.render_json import render_json
from app.render.render_xlsx import render_xlsx

router = APIRouter(tags=["render"])

# format -> (download filename, media type)
_FORMATS = {
    "json": ("response.json", "application/json"),
    "docx": (
        "response.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    "xlsx": (
        "response.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ),
}


@router.post("/render")
async def render(
    request: Request,
    fmt: str = Form(..., alias="format"),
    envelope: str = Form(...),
    source: UploadFile | None = File(None),
) -> FileResponse:
    """Render the canonical envelope to the requested format and return it as a download."""
    if fmt not in _FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{fmt}'. Use one of: {', '.join(_FORMATS)}.",
        )
    try:
        canonical = json.loads(envelope)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400, detail=f"Malformed envelope JSON: {exc}"
        ) from exc

    tmp_dir = Path(tempfile.mkdtemp(prefix="isq-render-"))
    filename, media_type = _FORMATS[fmt]
    out_path = tmp_dir / filename

    if fmt == "json":
        render_json(canonical, str(out_path))
    elif fmt == "docx":
        render_docx(canonical, str(out_path))
    else:  # xlsx
        source_path: str | None = None
        if source is not None:
            source_path = str(tmp_dir / "source.xlsx")
            with open(source_path, "wb") as fh:
                fh.write(await source.read())
        render_xlsx(canonical, str(out_path), source_path)

    # Echo an inbound X-Request-Id so n8n can correlate this render with the rest of the run
    # (same convention as /answer, /extract-questions, /process-questionnaire).
    request_id = request.headers.get("x-request-id")
    headers = {"X-Request-Id": request_id} if request_id else None

    # FileResponse streams the file after the handler returns, so the temp dir can only be
    # removed once the response has been sent: a background task, not an inline rmtree.
    return FileResponse(
        path=str(out_path),
        media_type=media_type,
        filename=filename,
        headers=headers,
        background=BackgroundTask(shutil.rmtree, tmp_dir, ignore_errors=True),
    )
