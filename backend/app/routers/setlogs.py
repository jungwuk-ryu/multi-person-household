from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlmodel import Session, select

from app.crud import friend_ids, get_user_or_404, make_id, setlog_out
from app.database import get_session
from app.models import MediaType, ModerationStatus, Setlog, SetlogCategory, Visibility
from app.schemas import SetlogCreateResponse, SetlogFromUrlRequest, SetlogsResponse
from app.services.media import save_upload, save_url_image
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
    moderation = ModerationService().moderate(media.filename, caption)
    media_type = MediaType.video if (media.content_type or "").startswith("video/") else MediaType.image
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
    moderation = ModerationService().moderate(payload.image_url, payload.caption)
    setlog = Setlog(id=make_id("setlog"), user_id=user.id, media_url=media_url, thumbnail_url=media_url, caption=payload.caption, category=payload.category, visibility=payload.visibility, city_label=payload.city_label, hour_slot=_hour_slot(), moderation_status=moderation)
    session.add(setlog)
    session.commit()
    session.refresh(setlog)
    return {"item": setlog_out(setlog, user)}
