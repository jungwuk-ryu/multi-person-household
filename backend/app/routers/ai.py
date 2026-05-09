from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select

from app.crud import api_error, get_user_or_404, make_id
from app.database import get_session
from app.models import AlbumItem, ModerationStatus, Setlog
from app.schemas import GroupPhotoRequest, GroupPhotoResponse
from app.services.image_generation import ImageGenerationService
from app.services.moderation import ModerationService

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/group-photo", response_model=GroupPhotoResponse)
def generate_group_photo(payload: GroupPhotoRequest, session: Session = Depends(get_session)):
    get_user_or_404(session, payload.user_id)
    setlogs = session.exec(select(Setlog).where(Setlog.id.in_(payload.source_setlog_ids))).all()
    found_ids = {item.id for item in setlogs}
    if found_ids != set(payload.source_setlog_ids):
        raise api_error(status.HTTP_404_NOT_FOUND, "SOURCE_SETLOG_NOT_FOUND", "One or more source Setlogs were not found")
    if any(item.moderation_status != ModerationStatus.approved for item in setlogs):
        raise api_error(status.HTTP_400_BAD_REQUEST, "SOURCE_SETLOG_NOT_APPROVED", "Source Setlogs must be approved")
    # Keep moderation and image generation behind service boundaries for future real providers.
    pre_status = ModerationService().moderate(payload.prompt)
    if pre_status == ModerationStatus.blocked:
        raise api_error(status.HTTP_400_BAD_REQUEST, "AI_PROMPT_BLOCKED", "Prompt was blocked by moderation")
    image_url = ImageGenerationService().generate_group_photo(payload.prompt, [item.media_url for item in setlogs])
    post_status = ModerationService().moderate(image_url)
    album = AlbumItem(id=make_id("album"), owner_user_id=payload.user_id, member_ids=sorted({item.user_id for item in setlogs}), source_setlog_ids=payload.source_setlog_ids, image_url=image_url)
    session.add(album)
    session.commit()
    session.refresh(album)
    return {"id": album.id, "generated_image_url": image_url, "status": post_status, "source_setlog_ids": payload.source_setlog_ids, "album_item": album}
