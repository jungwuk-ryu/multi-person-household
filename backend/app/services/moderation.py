import asyncio
import base64
import json
import mimetypes
import re
from pathlib import Path
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.config import get_settings
from app.models import ModerationStatus


SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

BLOCKING_PROBABILITIES = {"MEDIUM", "HIGH"}
RETRIABLE_GEMINI_STATUS_CODES = {429, 500, 502, 503, 504}
GEMINI_MAX_ATTEMPTS = 3


class ModerationService:
    def moderate(self, *values: str | None) -> ModerationStatus:
        haystack = " ".join(value or "" for value in values).lower()
        if "blocked" in haystack or "게시불가" in haystack:
            return ModerationStatus.blocked
        return ModerationStatus.approved

    async def moderate_setlog(
        self,
        *,
        caption: str,
        filename: str | None = None,
        media_path: Path | None = None,
        mime_type: str | None = None,
    ) -> ModerationStatus:
        settings = get_settings()
        fallback_status = self.moderate(caption, filename)
        if not settings.gemini_api_key:
            return fallback_status

        payload = self._build_gemini_payload(caption=caption, media_path=media_path, mime_type=mime_type)
        data = await self._call_gemini(payload)
        status_from_gemini = self._status_from_gemini_response(data)
        if status_from_gemini == ModerationStatus.blocked:
            return ModerationStatus.blocked
        return fallback_status

    def _build_gemini_payload(self, *, caption: str, media_path: Path | None, mime_type: str | None) -> dict[str, Any]:
        parts: list[dict[str, Any]] = []
        settings = get_settings()

        if media_path is not None and media_path.exists():
            media_bytes = media_path.read_bytes()
            if len(media_bytes) > settings.gemini_inline_media_max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "MEDIA_TOO_LARGE_FOR_GEMINI",
                        "message": "Video is too large to verify with Gemini.",
                    },
                )
            guessed_mime_type = mime_type or mimetypes.guess_type(media_path.name)[0] or "application/octet-stream"
            parts.append(
                {
                    "inline_data": {
                        "mime_type": guessed_mime_type,
                        "data": base64.b64encode(media_bytes).decode("ascii"),
                    }
                }
            )

        parts.append({"text": self._build_prompt(caption, has_media=bool(parts))})
        return {
            "contents": [{"role": "user", "parts": parts}],
            "safetySettings": SAFETY_SETTINGS,
            "generationConfig": {"temperature": 0},
        }

    def _build_prompt(self, caption: str, *, has_media: bool) -> str:
        media_instruction = "첨부된 이미지/영상을 실제로 보고" if has_media else "첨부 미디어 없이"
        return (
            "너는 1인 가구 연결 서비스 '다인가구'의 엄격한 콘텐츠 안전 검수자야.\n"
            f"{media_instruction} 사용자의 한 줄 상태와 함께 검수해.\n"
            "거부해야 하는 경우: 성적/노출 콘텐츠, 폭력/자해/위험행위, 혐오/괴롭힘, 개인정보 노출, "
            "불법행위 조장, 스팸/홍보, 만남 강요, 미성년자 안전 문제가 의심되는 내용.\n"
            "허용 가능한 일상 기록, 식사, 산책, 가벼운 수다, 평범한 셀카나 풍경은 승인해.\n"
            '반드시 JSON만 반환해: {"decision":"approved"|"blocked","reason":"짧은 한국어 사유"}\n'
            f"한 줄 상태: {caption}"
        )

    async def _call_gemini(self, payload: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_moderation_model}:generateContent"
        )
        async with httpx.AsyncClient(timeout=settings.gemini_moderation_timeout_seconds) as client:
            for attempt in range(GEMINI_MAX_ATTEMPTS):
                try:
                    response = await client.post(
                        url,
                        params={"key": settings.gemini_api_key},
                        headers={"Content-Type": "application/json"},
                        json=payload,
                    )
                except httpx.HTTPError:
                    if attempt < GEMINI_MAX_ATTEMPTS - 1:
                        await asyncio.sleep(0.8 * (2**attempt))
                        continue
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail={"code": "GEMINI_MODERATION_FAILED", "message": "Gemini moderation request failed."},
                    ) from None

                if response.status_code < 400:
                    try:
                        return response.json()
                    except ValueError:
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail={"code": "GEMINI_MODERATION_FAILED", "message": "Gemini returned an invalid response."},
                        ) from None

                if response.status_code in RETRIABLE_GEMINI_STATUS_CODES and attempt < GEMINI_MAX_ATTEMPTS - 1:
                    await asyncio.sleep(0.8 * (2**attempt))
                    continue

                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail={
                        "code": "GEMINI_MODERATION_FAILED",
                        "message": f"Gemini moderation failed with status {response.status_code}.",
                    },
                ) from None

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "GEMINI_MODERATION_FAILED", "message": "Gemini moderation request failed."},
        )

    def _status_from_gemini_response(self, data: dict[str, Any]) -> ModerationStatus:
        prompt_feedback = data.get("promptFeedback") or data.get("prompt_feedback") or {}
        if prompt_feedback.get("blockReason") or prompt_feedback.get("block_reason"):
            return ModerationStatus.blocked
        if self._has_blocking_safety_rating(prompt_feedback.get("safetyRatings") or prompt_feedback.get("safety_ratings")):
            return ModerationStatus.blocked

        for candidate in data.get("candidates") or []:
            if candidate.get("finishReason") == "SAFETY" or candidate.get("finish_reason") == "SAFETY":
                return ModerationStatus.blocked
            if self._has_blocking_safety_rating(candidate.get("safetyRatings") or candidate.get("safety_ratings")):
                return ModerationStatus.blocked

            text = self._candidate_text(candidate)
            decision = self._decision_from_text(text)
            if decision == "blocked":
                return ModerationStatus.blocked
            if decision == "approved":
                return ModerationStatus.approved

        return ModerationStatus.blocked

    def _has_blocking_safety_rating(self, ratings: Any) -> bool:
        if not isinstance(ratings, list):
            return False
        for rating in ratings:
            if not isinstance(rating, dict):
                continue
            if rating.get("blocked"):
                return True
            if rating.get("probability") in BLOCKING_PROBABILITIES:
                return True
        return False

    def _candidate_text(self, candidate: dict[str, Any]) -> str:
        content = candidate.get("content") or {}
        parts = content.get("parts") or []
        return "\n".join(part.get("text", "") for part in parts if isinstance(part, dict))

    def _decision_from_text(self, text: str) -> str | None:
        if not text.strip():
            return None
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        raw = match.group(0) if match else text
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            lowered = text.lower()
            if "blocked" in lowered:
                return "blocked"
            if "approved" in lowered:
                return "approved"
            return None
        decision = str(parsed.get("decision", "")).lower()
        if decision in {"approved", "blocked"}:
            return decision
        return None
