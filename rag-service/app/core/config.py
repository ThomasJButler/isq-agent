"""Application settings loaded from the repo-root .env via pydantic-settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    voyage_api_key: str
    voyage_model: str = "voyage-3-large"

    anthropic_api_key: str
    anthropic_model: str = "claude-sonnet-4-5"
    # Query rewriting is a cheap keyword-expansion step, so it runs on fast Haiku regardless
    # of the answer-generation model (the Settings UI promises exactly this). Keeping it off
    # the heavy model is a big per-question latency + cost win.
    anthropic_query_rewrite_model: str = "claude-haiku-4-5"

    pinecone_api_key: str
    pinecone_index: str = "isq-agent-knowledge"

    log_level: str = "INFO"
    rag_service_port: int = 8000

    # Cost-protection limits (v1.1) — bound abuse on the free hosted deploy. All
    # env-overridable on Render; see SECURITY.md. These sit in front of the
    # Anthropic workspace rate limits + monthly spend cap.
    max_questions: int = 50  # reject a questionnaire with more questions (413)
    max_upload_mb: int = 10  # reject a larger /render source workbook (413)
    rate_limit_default: str = "30/minute"  # per-IP, the lighter public endpoints
    rate_limit_heavy: str = "5/minute"  # per-IP, /process-questionnaire (fans out)

    # Answer generation runs the questions concurrently, up to this many at a time (v1.2
    # perf). A 20-question run is ~20 generation calls — far under the Anthropic workspace
    # rpm even at this width, but bounded so a huge questionnaire can't fan out unchecked.
    answer_concurrency: int = 5


settings = Settings()

# Generation models the API will honour when a run asks for one (the dashboard model picker
# sends `model`). An unrecognised or absent value falls back to settings.anthropic_model, so
# a bad request degrades to the default rather than erroring. Keep in sync with the frontend
# Settings options and pricing.py.
ALLOWED_GENERATION_MODELS = frozenset(
    {
        "claude-sonnet-4-5",
        "claude-sonnet-4-6",
        "claude-opus-4-7",
        "claude-opus-4-8",
        "claude-haiku-4-5",
    }
)


def resolve_generation_model(requested: str | None) -> str:
    """Return the requested generation model if it's allowed, else the configured default."""
    if requested and requested in ALLOWED_GENERATION_MODELS:
        return requested
    return settings.anthropic_model
