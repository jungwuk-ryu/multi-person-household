import logging
import time

from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select

from app.crud import api_error, get_user_or_404, make_id
from app.database import get_session
from app.models import AlbumItem, ModerationStatus, Setlog, User
from app.schemas import GroupPhotoRequest, GroupPhotoResponse, MemoPhotoRequest
from app.services.image_generation import GroupPhotoSource, ImageGenerationService
from app.services.moderation import ModerationService

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = logging.getLogger("uvicorn.error")


@router.post("/group-photo", response_model=GroupPhotoResponse)
def generate_group_photo(payload: GroupPhotoRequest, session: Session = Depends(get_session)):
    request_id = make_id("ai")
    started_at = time.perf_counter()
    logger.info(
        "AI group-photo start request_id=%s user_id=%s source_setlog_ids=%s base_setlog_id=%s persist=%s",
        request_id,
        payload.user_id,
        payload.source_setlog_ids,
        payload.base_setlog_id,
        payload.persist,
    )
    get_user_or_404(session, payload.user_id)
    if len(payload.source_setlog_ids) < 2:
        raise api_error(status.HTTP_400_BAD_REQUEST, "AI_REQUIRES_TWO_SETLOGS", "At least two source Setlogs are required")
    setlogs = session.exec(select(Setlog).where(Setlog.id.in_(payload.source_setlog_ids))).all()
    found_ids = {item.id for item in setlogs}
    if found_ids != set(payload.source_setlog_ids):
        raise api_error(status.HTTP_404_NOT_FOUND, "SOURCE_SETLOG_NOT_FOUND", "One or more source Setlogs were not found")
    base_setlog_id = payload.base_setlog_id or payload.source_setlog_ids[0]
    if base_setlog_id not in found_ids:
        raise api_error(status.HTTP_400_BAD_REQUEST, "BASE_SETLOG_NOT_IN_SOURCES", "Base Setlog must be included in source Setlogs")
    if any(item.moderation_status != ModerationStatus.approved for item in setlogs):
        raise api_error(status.HTTP_400_BAD_REQUEST, "SOURCE_SETLOG_NOT_APPROVED", "Source Setlogs must be approved")
    # Keep moderation and image generation behind service boundaries for future real providers.
    pre_status = ModerationService().moderate(payload.prompt)
    if pre_status == ModerationStatus.blocked:
        raise api_error(status.HTTP_400_BAD_REQUEST, "AI_PROMPT_BLOCKED", "Prompt was blocked by moderation")
    setlog_by_id = {item.id: item for item in setlogs}
    ordered_setlogs = [setlog_by_id[item_id] for item_id in payload.source_setlog_ids]
    users = session.exec(select(User).where(User.id.in_([item.user_id for item in ordered_setlogs]))).all()
    user_by_id = {item.id: item for item in users}
    sources = [
        GroupPhotoSource(
            setlog_id=item.id,
            user_name=user_by_id.get(item.user_id).display_name if user_by_id.get(item.user_id) else item.user_id,
            caption=item.caption,
            category=item.category.value,
            city_label=item.city_label,
            media_url=item.media_url,
            thumbnail_url=item.thumbnail_url,
            is_base=item.id == base_setlog_id,
        )
        for item in ordered_setlogs
    ]
    try:
        image_url = ImageGenerationService().generate_group_photo(payload.prompt, sources, base_setlog_id=base_setlog_id)
    except Exception:
        logger.exception("AI group-photo failed request_id=%s elapsed=%.1fs", request_id, time.perf_counter() - started_at)
        raise
    post_status = ModerationService().moderate(image_url)
    album = None
    response_id = make_id("image")
    if payload.persist:
        album = AlbumItem(id=make_id("album"), owner_user_id=payload.user_id, member_ids=sorted({item.user_id for item in ordered_setlogs}), source_setlog_ids=payload.source_setlog_ids, image_url=image_url)
        session.add(album)
        session.commit()
        session.refresh(album)
        response_id = album.id
    logger.info(
        "AI group-photo complete request_id=%s image_url=%s album_id=%s status=%s elapsed=%.1fs",
        request_id,
        image_url,
        album.id if album else None,
        post_status,
        time.perf_counter() - started_at,
    )
    return {
        "id": response_id,
        "generated_image_url": image_url,
        "status": post_status,
        "source_setlog_ids": payload.source_setlog_ids,
        "base_setlog_id": base_setlog_id,
        "album_item": album,
    }


@router.post("/memo-photo", response_model=GroupPhotoResponse)
def generate_memo_photo(payload: MemoPhotoRequest, session: Session = Depends(get_session)):
    request_id = make_id("ai")
    started_at = time.perf_counter()
    logger.info(
        "AI memo-photo start request_id=%s user_id=%s style=%s source_image_url=%s source_setlog_ids=%s base_setlog_id=%s",
        request_id,
        payload.user_id,
        payload.style,
        payload.source_image_url,
        payload.source_setlog_ids,
        payload.base_setlog_id,
    )
    get_user_or_404(session, payload.user_id)
    if len(payload.source_setlog_ids) < 2:
        raise api_error(status.HTTP_400_BAD_REQUEST, "AI_REQUIRES_TWO_SETLOGS", "At least two source Setlogs are required")
    setlogs = session.exec(select(Setlog).where(Setlog.id.in_(payload.source_setlog_ids))).all()
    found_ids = {item.id for item in setlogs}
    if found_ids != set(payload.source_setlog_ids):
        raise api_error(status.HTTP_404_NOT_FOUND, "SOURCE_SETLOG_NOT_FOUND", "One or more source Setlogs were not found")
    base_setlog_id = payload.base_setlog_id or payload.source_setlog_ids[0]
    if base_setlog_id not in found_ids:
        raise api_error(status.HTTP_400_BAD_REQUEST, "BASE_SETLOG_NOT_IN_SOURCES", "Base Setlog must be included in source Setlogs")
    if any(item.moderation_status != ModerationStatus.approved for item in setlogs):
        raise api_error(status.HTTP_400_BAD_REQUEST, "SOURCE_SETLOG_NOT_APPROVED", "Source Setlogs must be approved")
    pre_status = ModerationService().moderate(payload.prompt)
    if pre_status == ModerationStatus.blocked:
        raise api_error(status.HTTP_400_BAD_REQUEST, "AI_PROMPT_BLOCKED", "Prompt was blocked by moderation")

    try:
        image_url = ImageGenerationService().generate_memo_photo(payload.source_image_url, payload.prompt, style=payload.style)
    except Exception:
        logger.exception("AI memo-photo failed request_id=%s style=%s elapsed=%.1fs", request_id, payload.style, time.perf_counter() - started_at)
        raise
    post_status = ModerationService().moderate(image_url)
    album = AlbumItem(
        id=make_id("album"),
        owner_user_id=payload.user_id,
        member_ids=sorted({item.user_id for item in setlogs}),
        source_setlog_ids=payload.source_setlog_ids,
        image_url=image_url,
    )
    session.add(album)
    session.commit()
    session.refresh(album)
    logger.info(
        "AI memo-photo complete request_id=%s style=%s image_url=%s album_id=%s status=%s elapsed=%.1fs",
        request_id,
        payload.style,
        image_url,
        album.id,
        post_status,
        time.perf_counter() - started_at,
    )
    return {
        "id": album.id,
        "generated_image_url": image_url,
        "status": post_status,
        "source_setlog_ids": payload.source_setlog_ids,
        "base_setlog_id": base_setlog_id,
        "album_item": album,
    }
