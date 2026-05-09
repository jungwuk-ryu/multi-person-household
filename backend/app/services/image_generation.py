import base64
from uuid import uuid4

import httpx
from fastapi import HTTPException, status

from app.config import get_settings
from app.services.media import ensure_upload_dirs


class ImageGenerationService:
    def generate_group_photo(self, prompt: str, source_urls: list[str]) -> str:
        settings = get_settings()
        if settings.mock_ai:
            return "/uploads/seed/generated-demo.jpg"
        if not settings.openai_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "OPENAI_API_KEY_MISSING", "message": "OPENAI_API_KEY is required when MOCK_AI=false."},
            )

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "OPENAI_SDK_MISSING", "message": "Install backend requirements before using real image generation."},
            ) from exc

        client = OpenAI(api_key=settings.openai_api_key)
        try:
            result = client.images.generate(
                model=settings.openai_image_model,
                prompt=self._build_prompt(prompt, source_urls),
                size="1024x1024",
                n=1,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"code": "OPENAI_IMAGE_GENERATION_FAILED", "message": str(exc)},
            ) from exc

        image = result.data[0]
        if getattr(image, "b64_json", None):
            return self._save_base64_png(image.b64_json)
        if getattr(image, "url", None):
            return self._download_and_save(image.url)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "OPENAI_IMAGE_RESPONSE_EMPTY", "message": "OpenAI image response did not include image data."},
        )

    def _build_prompt(self, prompt: str, source_urls: list[str]) -> str:
        # Source URLs are context for future image-edit support; current MVP generates one memory image.
        source_context = ", ".join(source_urls)
        return f"{prompt}\nCreate a warm, realistic group-photo style memory for Setlog. Source media references: {source_context}"

    def _save_base64_png(self, b64_json: str) -> str:
        ensure_upload_dirs()
        filename = f"group-photo-{uuid4().hex}.png"
        target = get_settings().upload_path / "generated" / filename
        target.write_bytes(base64.b64decode(b64_json))
        return f"/uploads/generated/{filename}"

    def _download_and_save(self, image_url: str) -> str:
        ensure_upload_dirs()
        filename = f"group-photo-{uuid4().hex}.png"
        target = get_settings().upload_path / "generated" / filename
        with httpx.Client(timeout=15) as client:
            response = client.get(image_url)
            response.raise_for_status()
        target.write_bytes(response.content)
        return f"/uploads/generated/{filename}"
