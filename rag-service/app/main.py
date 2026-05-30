"""
FastAPI entry point for the ISQ Agent RAG service.
Handles route registration, CORS for n8n, lifecycle setup, structured logging.
"""

import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import answer, extract, health, index, process, render, runs
from app.core.config import settings
from app.core.rate_limit import limiter


# Structured logging — JSON-style for production parseability
logging.basicConfig(
    level=logging.INFO,
    format='{"ts":"%(asctime)s","level":"%(levelname)s","module":"%(name)s","msg":"%(message)s"}',
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events — runs on startup and shutdown."""
    # Startup logging — key config without secrets
    logger.info(f"RAG service starting — embedding model: {settings.voyage_model}")
    logger.info(f"RAG service starting — pinecone index: {settings.pinecone_index}")
    logger.info(f"RAG service starting — LLM model: {settings.anthropic_model}")

    yield  # service is running

    # On shutdown — log clean exit
    logger.info("RAG service shutting down")


app = FastAPI(
    title="ISQ Agent RAG Service",
    description=(
        "Internal service for answering Information Security Questionnaire "
        "questions, grounded in Northstar Labs policies and historical responses."
    ),
    version="1.1.0",
    lifespan=lifespan,
)

# Per-IP rate limiting (v1.1 cost protection). Limits are attached per-route in the
# api modules via @limiter.limit; here we register the limiter + its 429 handler so a
# tripped limit returns a clean Too Many Requests rather than a 500.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def _allowed_origins() -> list[str]:
    """CORS origins from the ALLOWED_ORIGINS env (comma-separated), else the local
    n8n + dev defaults. A deployed frontend (e.g. the Vercel dashboard) is allowed by
    setting ALLOWED_ORIGINS on the host, with no code change."""
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5678,http://n8n:5678")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


# CORS: n8n + localhost by default; ALLOWED_ORIGINS env adds deployed frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=True,
)


# Route registration
app.include_router(health.router, tags=["health"])
app.include_router(answer.router, tags=["answer"])
app.include_router(index.router, tags=["index"])
app.include_router(extract.router, tags=["extraction"])
app.include_router(process.router, tags=["processing"])
app.include_router(render.router, tags=["render"])
app.include_router(runs.router, tags=["runs"])


@app.get("/")
async def root():
    """Default route — links to health and docs."""
    return {
        "service": "ISQ Agent RAG Service",
        "version": app.version,
        "health": "/health",
        "docs": "/docs",
    }
