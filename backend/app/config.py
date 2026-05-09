from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    port: int = 8000
    client_origin: str = "http://localhost:5173"
    database_url: str = "sqlite:///./daingagu.db"
    mock_ai: bool = False
    openai_api_key: str = ""
    openai_image_model: str = "gpt-image-2"
    openai_image_parallel_requests: int = 2
    openai_image_max_retries: int = 2
    openai_image_timeout_seconds: float = 45.0
    gemini_api_key: str = ""
    gemini_moderation_model: str = "gemini-2.5-flash"
    gemini_caption_model: str = "gemini-2.5-flash-lite"
    gemini_moderation_timeout_seconds: float = 18.0
    gemini_caption_timeout_seconds: float = 8.0
    gemini_inline_media_max_bytes: int = 18 * 1024 * 1024
    upload_dir: str = "uploads"

    model_config = SettingsConfigDict(env_file=(REPO_ROOT / ".env", BACKEND_DIR / ".env"), extra="ignore")

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        if not path.is_absolute():
            path = Path(__file__).resolve().parent / path
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
