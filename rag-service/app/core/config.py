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


settings = Settings()
