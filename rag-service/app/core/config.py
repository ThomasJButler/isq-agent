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


settings = Settings()
