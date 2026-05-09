from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = 8000
    client_origin: str = "http://localhost:5173"
    database_url: str = "sqlite:///./daingagu.db"
    mock_ai: bool = True
    openai_api_key: str = ""
    openai_image_model: str = "gpt-image-1.5"
    gemini_api_key: str = ""
    upload_dir: str = "uploads"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        if not path.is_absolute():
            path = Path(__file__).resolve().parent / path
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
