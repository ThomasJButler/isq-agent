"""
FastAPI entry point for the ISQ Agent RAG service.
Handles route registration, CORS for n8n, lifecycle setup, structured logging.
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import answer, extract, health, index
from app.core.config import settings


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
    version="0.1.0",
    lifespan=lifespan,
)


# CORS — allow n8n container and localhost dev to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5678", "http://n8n:5678"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=True,
)


# Route registration
app.include_router(health.router, tags=["health"])
app.include_router(answer.router, tags=["answer"])
app.include_router(index.router, tags=["index"])
app.include_router(extract.router, tags=["extraction"])


@app.get("/")
async def root():
    """Default route — links to health and docs."""
    return {
        "service": "ISQ Agent RAG Service",
        "version": "0.1.0",
        "health": "/health",
        "docs": "/docs",
    }
