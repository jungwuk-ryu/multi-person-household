import base64
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from dataclasses import dataclass, replace
import mimetypes
from typing import Any
import time
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from fastapi import HTTPException, status

from app.config import get_settings
from app.services.media import ensure_upload_dirs, media_path_from_url


@dataclass(frozen=True)
class GroupPhotoSource:
    setlog_id: str
    user_name: str
    caption: str
    category: str
    city_label: str
    media_url: str
    thumbnail_url: str
    is_base: bool = False


DEMO_GENERATED_ASSET_URL = "/uploads/seed/generated-demo.jpg"


class ImageGenerationService:
    def generate_group_photo(self, prompt: str, sources: list[GroupPhotoSource | str], base_setlog_id: str | None = None) -> str:
        settings = get_settings()
        if settings.mock_ai:
            return DEMO_GENERATED_ASSET_URL
        if not settings.openai_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "OPENAI_API_KEY_MISSING", "message": "OPENAI_API_KEY is required when MOCK_AI=false."},
            )

        OpenAI = self._get_openai_client_class()

        normalized_sources = self._normalize_sources(sources, base_setlog_id)
        candidate_count = max(1, min(settings.openai_image_parallel_requests, 3))
        prompts = [self._build_prompt(prompt, normalized_sources, candidate_index=index) for index in range(candidate_count)]

        try:
            result = self._generate_fastest(OpenAI, settings, prompts)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"code": "OPENAI_IMAGE_GENERATION_FAILED", "message": str(exc)},
            ) from exc

        return self._persist_generated_image(result)

    def generate_memo_photo(self, source_image_url: str, prompt: str, style: str = "memo") -> str:
        settings = get_settings()
        if settings.mock_ai:
            return DEMO_GENERATED_ASSET_URL
        if not settings.openai_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "OPENAI_API_KEY_MISSING", "message": "OPENAI_API_KEY is required when MOCK_AI=false."},
            )
        OpenAI = self._get_openai_client_class()

        source_path = self._resolve_upload_path(source_image_url)
        candidate_count = max(1, min(settings.openai_image_parallel_requests, 2))
        prompts = [self._build_style_prompt(prompt, style=style, candidate_index=index) for index in range(candidate_count)]
        try:
            result = self._edit_fastest(OpenAI, settings, source_path, prompts)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"code": "OPENAI_IMAGE_EDIT_FAILED", "message": str(exc)},
            ) from exc

        return self._persist_generated_image(result)

    def _generate_fastest(self, openai_cls, settings, prompts: list[str]):
        if len(prompts) == 1:
            return self._generate_with_retry(openai_cls, settings, prompts[0])

        executor = ThreadPoolExecutor(max_workers=len(prompts), thread_name_prefix="openai-image")
        pending: set[Future] = {executor.submit(self._generate_with_retry, openai_cls, settings, prompt) for prompt in prompts}
        errors: list[Exception] = []
        try:
            while pending:
                done, pending = wait(pending, return_when=FIRST_COMPLETED)
                for future in done:
                    try:
                        return future.result()
                    except Exception as exc:
                        errors.append(exc)
            if errors:
                raise errors[-1]
            raise RuntimeError("OpenAI image generation did not return a result.")
        finally:
            for future in pending:
                future.cancel()
            executor.shutdown(wait=False, cancel_futures=True)

    def _generate_with_retry(self, openai_cls, settings, prompt: str):
        last_error: Exception | None = None
        for attempt in range(settings.openai_image_max_retries + 1):
            try:
                client = openai_cls(api_key=settings.openai_api_key)
                return client.images.generate(
                    model=settings.openai_image_model,
                    prompt=prompt,
                    size="1024x1024",
                    n=1,
                    timeout=settings.openai_image_timeout_seconds,
                )
            except Exception as exc:
                last_error = exc
                if attempt >= settings.openai_image_max_retries or not self._is_rate_limit(exc):
                    raise
                time.sleep(0.8 * (attempt + 1))
        if last_error is not None:
            raise last_error
        raise RuntimeError("OpenAI image generation failed.")

    def _edit_fastest(self, openai_cls, settings, source_path: Path, prompts: list[str]):
        if len(prompts) == 1:
            return self._edit_with_retry(openai_cls, settings, source_path, prompts[0])

        executor = ThreadPoolExecutor(max_workers=len(prompts), thread_name_prefix="openai-image-edit")
        pending: set[Future] = {executor.submit(self._edit_with_retry, openai_cls, settings, source_path, prompt) for prompt in prompts}
        errors: list[Exception] = []
        try:
            while pending:
                done, pending = wait(pending, return_when=FIRST_COMPLETED)
                for future in done:
                    try:
                        return future.result()
                    except Exception as exc:
                        errors.append(exc)
            if errors:
                raise errors[-1]
            raise RuntimeError("OpenAI image edit did not return a result.")
        finally:
            for future in pending:
                future.cancel()
            executor.shutdown(wait=False, cancel_futures=True)

    def _edit_with_retry(self, openai_cls, settings, source_path: Path, prompt: str):
        last_error: Exception | None = None
        mime_type = mimetypes.guess_type(source_path.name)[0] or "image/png"
        for attempt in range(settings.openai_image_max_retries + 1):
            try:
                client = openai_cls(api_key=settings.openai_api_key)
                with source_path.open("rb") as image_file:
                    return client.images.edit(
                        model=settings.openai_image_model,
                        image=(source_path.name, image_file, mime_type),
                        prompt=prompt,
                        size="1024x1024",
                        n=1,
                        timeout=settings.openai_image_timeout_seconds,
                    )
            except Exception as exc:
                last_error = exc
                if attempt >= settings.openai_image_max_retries or not self._is_rate_limit(exc):
                    raise
                time.sleep(0.8 * (attempt + 1))
        if last_error is not None:
            raise last_error
        raise RuntimeError("OpenAI image edit failed.")

    def _normalize_sources(self, sources: list[GroupPhotoSource | str], base_setlog_id: str | None) -> list[GroupPhotoSource]:
        normalized: list[GroupPhotoSource] = []
        for index, source in enumerate(sources):
            if isinstance(source, GroupPhotoSource):
                normalized.append(source)
                continue
            normalized.append(
                GroupPhotoSource(
                    setlog_id=f"source_{index + 1}",
                    user_name=f"참여자 {index + 1}",
                    caption="",
                    category="daily",
                    city_label="",
                    media_url=source,
                    thumbnail_url=source,
                    is_base=source == base_setlog_id,
                )
            )
        if base_setlog_id and not any(source.is_base for source in normalized):
            normalized = [replace(source, is_base=source.setlog_id == base_setlog_id) for source in normalized]
        return normalized

    def _build_prompt(self, prompt: str, sources: list[GroupPhotoSource], candidate_index: int = 0) -> str:
        base_source = next((source for source in sources if source.is_base), sources[0] if sources else None)
        base_place = (
            f"{base_source.user_name}의 기준 로그 장소({base_source.city_label}, {base_source.caption})"
            if base_source
            else "자연스러운 실내 모임 장소"
        )
        source_lines = "\n".join(
            f"- {'[기준 장소] ' if source.is_base else ''}{source.user_name}: {source.caption} / {source.city_label} / {source.category}"
            for source in sources
        )
        composition = [
            "candid iPhone-style photo, natural Korean friends, soft indoor light, slight handheld realism",
            "wide realistic group snapshot, everyone visible, natural spacing, real social meetup energy",
            "documentary mobile photo, warm ordinary Seoul neighborhood mood, realistic faces and hands",
        ][candidate_index % 3]
        return f"""
{prompt}

Create one realistic photo for the Korean app '다인가구'.
Use this as the only location: {base_place}.
Show every participant from the source logs together in that same place, as if they actually met there.
Do not create a collage, split screen, poster, UI mockup, stickers, captions, watermarks, or duplicated people.
Keep the scene photorealistic and casual: {composition}.
Preserve the source-log situations as small natural details when possible, but the final image must look like one single camera photo.

Source logs:
{source_lines}
""".strip()

    def _build_style_prompt(self, prompt: str, style: str = "memo", candidate_index: int = 0) -> str:
        if style == "3d":
            reconstruction_guidance = [
                "Keep the people and space from the source image recognizable, but reinterpret the full scene as a high-fidelity 3D reconstruction preview.",
                "Make it look like a real-world space reconstructed into a navigable 3D model with neutral studio surroundings and subtle scan imperfections.",
            ][candidate_index % 2]
            return f"""
Edit the provided image while preserving the same people, place, and spatial relationship from the base meetup photo.
{reconstruction_guidance}
Do not add handwritten text, captions, UI chrome, poster layout, stickers, or fantasy styling.

{prompt}
""".strip()

        layout_guidance = [
            "여백을 넓게 살리고 손글씨 메모가 인물 얼굴을 가리지 않게 배치",
            "잡지 속 카페 투어 페이지처럼 정돈된 구도와 감성적인 흰색 주석",
        ][candidate_index % 2]
        return f"""
Edit the provided image while preserving the people, place, and main composition.
Add only subtle white handwritten Korean annotations and hand-drawn doodles.
Do not change identities, faces, body count, or location. Do not add UI chrome, app frames, stickers, or typed fonts.
{layout_guidance}

{prompt}
""".strip()

    def _resolve_upload_path(self, image_url: str) -> Path:
        parsed_path = urlparse(image_url).path if "://" in image_url else image_url
        path = media_path_from_url(parsed_path)
        if path is None or not path.exists() or not path.is_file():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "SOURCE_IMAGE_NOT_FOUND", "message": "Source image must be a generated upload."},
            )
        return path

    def _is_rate_limit(self, exc: Exception) -> bool:
        status_code = getattr(exc, "status_code", None)
        response = getattr(exc, "response", None)
        if response is not None:
            status_code = getattr(response, "status_code", status_code)
        return status_code == 429 or exc.__class__.__name__ == "RateLimitError"

    def _get_openai_client_class(self):
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "OPENAI_SDK_MISSING", "message": "Install backend requirements before using real image generation."},
            ) from exc
        return OpenAI

    def _persist_generated_image(self, result: Any) -> str:
        image = self._extract_first_image(result)
        b64_json = self._get_image_field(image, "b64_json")
        if b64_json:
            return self._save_base64_png(b64_json)
        image_url = self._get_image_field(image, "url")
        if image_url:
            return self._download_and_save(image_url)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "OPENAI_IMAGE_RESPONSE_EMPTY", "message": "OpenAI image response did not include image data."},
        )

    def _extract_first_image(self, result: Any) -> Any:
        data = result.get("data") if isinstance(result, dict) else getattr(result, "data", None)
        image = data[0] if data else None
        if image is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"code": "OPENAI_IMAGE_RESPONSE_EMPTY", "message": "OpenAI image response did not include image data."},
            )
        return image

    def _get_image_field(self, image: Any, field_name: str) -> Any:
        if isinstance(image, dict):
            return image.get(field_name)
        return getattr(image, field_name, None)

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
