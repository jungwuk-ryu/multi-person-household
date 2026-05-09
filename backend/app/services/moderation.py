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

    async def moderate_chat_text(self, text: str) -> ModerationStatus:
        fallback_status = self.moderate(text)
        if fallback_status == ModerationStatus.blocked:
            return ModerationStatus.blocked

        settings = get_settings()
        if not settings.gemini_api_key:
            return fallback_status

        payload = self._build_chat_payload(text)
        try:
            data = await self._call_gemini(
                payload,
                model=settings.gemini_moderation_model,
                timeout=min(settings.gemini_moderation_timeout_seconds, 6.0),
                max_attempts=1,
            )
        except HTTPException:
            return fallback_status

        if self._status_from_gemini_response(data) == ModerationStatus.blocked:
            return ModerationStatus.blocked
        return fallback_status

    async def suggest_setlog_caption(
        self,
        *,
        image_bytes: bytes,
        mime_type: str | None,
        filename: str | None = None,
    ) -> dict[str, str]:
        fallback_status = self.moderate(filename)
        if fallback_status == ModerationStatus.blocked:
            return {"safety_status": "blocked", "suggested_caption": "", "reason": "이미지 이름에 안전하지 않은 표현이 있어요."}

        settings = get_settings()
        if not settings.gemini_api_key:
            return {"safety_status": "approved", "suggested_caption": "오늘의 순간을 짧게 남겨요", "reason": "fallback"}
        if len(image_bytes) > settings.gemini_inline_media_max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "MEDIA_TOO_LARGE_FOR_GEMINI", "message": "Image is too large to verify with Gemini."},
            )

        payload = self._build_caption_payload(image_bytes=image_bytes, mime_type=mime_type)
        data = await self._call_gemini(
            payload,
            model=settings.gemini_caption_model,
            timeout=settings.gemini_caption_timeout_seconds,
            max_attempts=1,
        )
        return self._caption_from_gemini_response(data)

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

    def _build_caption_payload(self, *, image_bytes: bytes, mime_type: str | None) -> dict[str, Any]:
        guessed_mime_type = normalize_image_mime_type(mime_type)
        return {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": guessed_mime_type,
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            }
                        },
                        {"text": self._build_caption_prompt()},
                    ],
                }
            ],
            "safetySettings": SAFETY_SETTINGS,
            "generationConfig": {
                "temperature": 0.55,
                "maxOutputTokens": 96,
                "responseMimeType": "application/json",
            },
        }

    def _build_chat_payload(self, text: str) -> dict[str, Any]:
        return {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": self._build_chat_prompt(text)}],
                }
            ],
            "safetySettings": SAFETY_SETTINGS,
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 48,
                "responseMimeType": "application/json",
            },
        }

    def _build_chat_prompt(self, text: str) -> str:
        return (
            "너는 1인 가구 연결 서비스 '다인가구'의 실시간 채팅 안전 필터야.\n"
            "메시지를 답변하거나 고치지 말고 승인 여부만 판단해.\n"
            "거부해야 하는 경우: 성적/노출 표현, 혐오/괴롭힘, 협박/폭력, 자해/위험행위, 개인정보 요구/노출, "
            "불법행위, 스팸/광고, 만남 강요, 스토킹/집착, 미성년자 안전 문제가 의심되는 내용.\n"
            "평범한 식사 약속, 동네 수다, 가벼운 농담, 일상 대화는 approved야.\n"
            '반드시 JSON만 반환해: {"decision":"approved"|"blocked","reason":"짧은 한국어 사유"}\n'
            f"채팅 메시지: {text}"
        )

    def _build_caption_prompt(self) -> str:
        return (
            "너는 '다인가구'의 짧은 영상 로그 썸네일을 보고 한 줄 상태를 추천하는 에디터야.\n"
            "먼저 이미지가 서비스에 안전한지 확인해. 성적/노출, 폭력/자해, 혐오/괴롭힘, 개인정보, 위험행위, "
            "불법행위, 스팸, 미성년자 안전 문제가 의심되면 blocked로 판단해.\n"
            "안전하면 사용자가 직접 적은 소개글처럼 한국어 한 줄 상태를 추천해. AI가 설명하는 문장 금지.\n"
            "말투는 20대 한국인이 친구한테 툭 올리는 느낌: 자연스러운 1인칭, 짧은 혼잣말, 살짝 편한 커뮤니티 톤.\n"
            "8~24자, 해시태그/따옴표 없이, 이모지는 쓰지 말고, 이미지에서 보이는 상황만 바탕으로 써.\n"
            "좋은 예: 오늘 저녁은 이걸로 끝, 집 오자마자 바로 밥, 퇴근하고 잠깐 숨 돌림, 이 분위기 꽤 좋다\n"
            '반드시 JSON만 반환해: {"decision":"approved"|"blocked","caption":"추천 문장","reason":"짧은 사유"}'
        )

    async def _call_gemini(
        self,
        payload: dict[str, Any],
        *,
        model: str | None = None,
        timeout: float | None = None,
        max_attempts: int = GEMINI_MAX_ATTEMPTS,
    ) -> dict[str, Any]:
        settings = get_settings()
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model or settings.gemini_moderation_model}:generateContent"
        )
        async with httpx.AsyncClient(timeout=timeout or settings.gemini_moderation_timeout_seconds) as client:
            for attempt in range(max_attempts):
                try:
                    response = await client.post(
                        url,
                        params={"key": settings.gemini_api_key},
                        headers={"Content-Type": "application/json"},
                        json=payload,
                    )
                except httpx.HTTPError:
                    if attempt < max_attempts - 1:
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

                if response.status_code in RETRIABLE_GEMINI_STATUS_CODES and attempt < max_attempts - 1:
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

    def _caption_from_gemini_response(self, data: dict[str, Any]) -> dict[str, str]:
        prompt_feedback = data.get("promptFeedback") or data.get("prompt_feedback") or {}
        if prompt_feedback.get("blockReason") or prompt_feedback.get("block_reason"):
            return {"safety_status": "blocked", "suggested_caption": "", "reason": "안전 기준에 맞지 않는 장면이에요."}
        if self._has_blocking_safety_rating(prompt_feedback.get("safetyRatings") or prompt_feedback.get("safety_ratings")):
            return {"safety_status": "blocked", "suggested_caption": "", "reason": "안전 기준에 맞지 않는 장면이에요."}

        for candidate in data.get("candidates") or []:
            if candidate.get("finishReason") == "SAFETY" or candidate.get("finish_reason") == "SAFETY":
                return {"safety_status": "blocked", "suggested_caption": "", "reason": "안전 기준에 맞지 않는 장면이에요."}
            if self._has_blocking_safety_rating(candidate.get("safetyRatings") or candidate.get("safety_ratings")):
                return {"safety_status": "blocked", "suggested_caption": "", "reason": "안전 기준에 맞지 않는 장면이에요."}

            parsed = self._json_from_text(self._candidate_text(candidate))
            decision = str(parsed.get("decision", "")).lower()
            if decision == "blocked":
                return {"safety_status": "blocked", "suggested_caption": "", "reason": clean_caption_text(parsed.get("reason"))}
            caption = clean_caption_text(parsed.get("caption"))
            if decision == "approved" and caption:
                return {"safety_status": "approved", "suggested_caption": caption, "reason": clean_caption_text(parsed.get("reason"))}

        return {"safety_status": "approved", "suggested_caption": "오늘의 순간을 짧게 남겨요", "reason": "fallback"}

    def _json_from_text(self, text: str) -> dict[str, Any]:
        if not text.strip():
            return {}
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        raw = match.group(0) if match else text
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}


def normalize_image_mime_type(value: str | None) -> str:
    if value in {"image/jpeg", "image/png", "image/webp"}:
        return value
    return "image/jpeg"


def clean_caption_text(value: Any) -> str:
    text = str(value or "").strip()
    text = re.sub(r"^[\"'“”‘’]+|[\"'“”‘’]+$", "", text)
    text = re.sub(r"\s+", " ", text)
    return text[:60]
