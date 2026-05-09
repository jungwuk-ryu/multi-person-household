from pathlib import Path
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov"}
ALLOWED_MEDIA_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
MAX_UPLOAD_SIZE = 25 * 1024 * 1024


def ensure_upload_dirs() -> None:
    base = get_settings().upload_path
    for relative in ("", "seed", "generated", "setlogs"):
        (base / relative).mkdir(parents=True, exist_ok=True)
        gitkeep = base / relative / ".gitkeep"
        gitkeep.touch(exist_ok=True)


async def save_upload(file: UploadFile, setlog_id: str) -> str:
    if file.content_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"code": "UNSUPPORTED_MEDIA_TYPE", "message": "Only image and short video uploads are supported."})
    data = await file.read()
    if len(data) > MAX_UPLOAD_SIZE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"code": "MEDIA_TOO_LARGE", "message": "Uploads must be 25MB or smaller."})
    suffix = ALLOWED_MEDIA_TYPES[file.content_type]
    target = get_settings().upload_path / "setlogs" / f"{setlog_id}{suffix}"
    target.write_bytes(data)
    return f"/uploads/setlogs/{target.name}"


def media_path_from_url(media_url: str) -> Path | None:
    if not media_url.startswith("/uploads/"):
        return None
    base = get_settings().upload_path.resolve()
    target = (base / media_url.removeprefix("/uploads/")).resolve()
    if base not in target.parents and target != base:
        return None
    return target


async def save_url_image(image_url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(image_url)
            response.raise_for_status()
        content_type = response.headers.get("content-type", "").split(";")[0]
        suffix = ALLOWED_IMAGE_TYPES.get(content_type, ".jpg")
        name = f"url-{uuid4().hex}{suffix}"
        target = get_settings().upload_path / "setlogs" / name
        target.write_bytes(response.content)
        return f"/uploads/setlogs/{name}"
    except Exception:
        # Preserve the original URL instead of blocking prototype flows on remote fetch failures.
        return image_url
