"""GET /runs/{id} — fetch a stored questionnaire run by id (v1.1 #18).

The dashboard's results screen reads the run id from its URL and calls this to render
real answers (replacing the build-time mock). The envelope returned is whatever
/process-questionnaire stored — the same canonical shape every renderer consumes.
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings
from app.core.rate_limit import limiter
from app.runs.store import run_store

router = APIRouter()


@router.get("/runs/{run_id}")
@limiter.limit(lambda: settings.rate_limit_default)
def get_run(run_id: str, request: Request) -> dict[str, Any]:
    """Return the stored canonical envelope for run_id, or 404 if unknown/expired."""
    envelope = run_store.get(run_id)
    if envelope is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No run found for id '{run_id}'. Runs are kept in memory and "
                "don't survive a service restart."
            ),
        )
    return envelope
