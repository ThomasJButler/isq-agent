"""Health endpoint — stubbed for Plan 3. Dependency checks land in Plan 4."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}
