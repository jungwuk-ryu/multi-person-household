from datetime import datetime, timezone

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.crud import api_error, friend_ids, get_user_or_404, make_id, setlog_out
from app.database import get_session
from app.models import MediaType, ModerationStatus, Setlog, SetlogCategory, Visibility
from app.schemas import (
    SetlogCaptionSuggestionResponse,
    SetlogCreateResponse,
    SetlogFromUrlRequest,
    SetlogLikeRequest,
    SetlogLikeResponse,
    SetlogsResponse,
)
from app.services.media import media_path_from_url, normalize_media_type, save_upload, save_url_image
from app.services.moderation import ModerationService

router = APIRouter(prefix="/api/setlogs", tags=["setlogs"])


@router.get("", response_model=SetlogsResponse)
def list_setlogs(filter: str = "all", userId: str = "user-mina", session: Session = Depends(get_session)):
    current = get_user_or_404(session, userId)
    friends = friend_ids(session, current.id)
    setlogs = session.exec(select(Setlog).order_by(Setlog.created_at.desc())).all()
    items = []
    for setlog in setlogs:
        # Blocked content is persisted for audit/demo purposes, but never shown in feeds.
        if setlog.moderation_status != ModerationStatus.approved:
            continue
        author = get_user_or_404(session, setlog.user_id)
        include = False
        # Keep feed behavior explicit so it stays aligned with the frontend contract.
        if filter == "all":
            include = setlog.visibility == Visibility.public or setlog.user_id == current.id or setlog.user_id in friends
        elif filter == "friends":
            include = (setlog.user_id in friends or setlog.user_id == current.id) and setlog.visibility in {Visibility.public, Visibility.friends}
        elif filter == "sameGender":
            include = setlog.visibility == Visibility.public and author.gender == current.gender
        elif filter == "oppositeGender":
            include = setlog.visibility == Visibility.public and author.gender != current.gender and author.gender.value != "other" and current.gender.value != "other"
        elif filter == "nearby":
            include = setlog.visibility == Visibility.public and author.city_label == current.city_label
        elif filter == "meal":
            include = setlog.visibility == Visibility.public and setlog.category == SetlogCategory.meal
        if include:
            items.append(setlog_out(setlog, author, setlog.user_id in friends))
    return {"items": items}


def _hour_slot() -> str:
    return datetime.now(timezone.utc).strftime("%H:00")


def _delete_saved_media(media_path: Path | None) -> None:
    if media_path is not None and media_path.exists():
        media_path.unlink()


def _reject_blocked_setlog(media_path: Path | None = None) -> None:
    _delete_saved_media(media_path)
    raise api_error(status.HTTP_400_BAD_REQUEST, "SETLOG_REJECTED", "Gemini rejected this Setlog for safety.")


@router.post("", response_model=SetlogCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_setlog(
    userId: str = Form(...),
    caption: str = Form(...),
    category: SetlogCategory = Form(...),
    visibility: Visibility = Form(...),
    cityLabel: str = Form(...),
    media: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    user = get_user_or_404(session, userId)
    setlog_id = make_id("setlog")
    media_url = await save_upload(media, setlog_id)
    media_path = media_path_from_url(media_url)
    media_content_type = normalize_media_type(media.content_type)
    try:
        moderation = await ModerationService().moderate_setlog(
            caption=caption,
            filename=media.filename,
            media_path=media_path,
            mime_type=media_content_type,
        )
    except HTTPException:
        _delete_saved_media(media_path)
        raise
    if moderation == ModerationStatus.blocked:
        _reject_blocked_setlog(media_path)
    media_type = MediaType.video if media_content_type.startswith("video/") else MediaType.image
    setlog = Setlog(id=setlog_id, user_id=user.id, media_type=media_type, media_url=media_url, thumbnail_url=media_url, caption=caption, category=category, visibility=visibility, city_label=cityLabel, hour_slot=_hour_slot(), moderation_status=moderation)
    session.add(setlog)
    session.commit()
    session.refresh(setlog)
    return {"item": setlog_out(setlog, user)}


@router.post("/from-url", response_model=SetlogCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_setlog_from_url(payload: SetlogFromUrlRequest, session: Session = Depends(get_session)):
    user = get_user_or_404(session, payload.user_id)
    # URL ingestion is best-effort; demos should still work if the remote asset is unavailable.
    media_url = await save_url_image(payload.image_url)
    media_path = media_path_from_url(media_url)
    try:
        moderation = await ModerationService().moderate_setlog(
            caption=payload.caption,
            filename=payload.image_url,
            media_path=media_path,
        )
    except HTTPException:
        _delete_saved_media(media_path)
        raise
    if moderation == ModerationStatus.blocked:
        _reject_blocked_setlog(media_path)
    setlog = Setlog(id=make_id("setlog"), user_id=user.id, media_url=media_url, thumbnail_url=media_url, caption=payload.caption, category=payload.category, visibility=payload.visibility, city_label=payload.city_label, hour_slot=_hour_slot(), moderation_status=moderation)
    session.add(setlog)
    session.commit()
    session.refresh(setlog)
    return {"item": setlog_out(setlog, user)}


@router.post("/caption-suggestion", response_model=SetlogCaptionSuggestionResponse)
async def suggest_caption_from_thumbnail(image: UploadFile = File(...)):
    content_type = normalize_media_type(image.content_type)
    if not content_type.startswith("image/"):
        raise api_error(status.HTTP_400_BAD_REQUEST, "IMAGE_REQUIRED", "Thumbnail image is required.")
    image_bytes = await image.read()
    return await ModerationService().suggest_setlog_caption(
        image_bytes=image_bytes,
        mime_type=content_type,
        filename=image.filename,
    )


@router.post("/{setlog_id}/like", response_model=SetlogLikeResponse)
def update_setlog_like(setlog_id: str, payload: SetlogLikeRequest, session: Session = Depends(get_session)):
    setlog = session.get(Setlog, setlog_id)
    if setlog is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "SETLOG_NOT_FOUND", "Setlog not found")
    if setlog.moderation_status != ModerationStatus.approved:
        raise api_error(status.HTTP_400_BAD_REQUEST, "SETLOG_NOT_LIKEABLE", "Only approved Setlogs can be liked")
    delta = 1 if payload.liked else -1
    setlog.like_count = max(0, setlog.like_count + delta)
    session.add(setlog)
    session.commit()
    session.refresh(setlog)
    return {"like_count": setlog.like_count}
