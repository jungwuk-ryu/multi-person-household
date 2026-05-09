from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select

from app.crud import api_error, get_or_create_room, get_user_or_404, make_id
from app.database import get_session
from app.models import FlashMeet, FlashMeetStatus
from app.schemas import FlashMeetCreateRequest, FlashMeetCreateResponse, FlashMeetJoinRequest, FlashMeetJoinResponse, FlashMeetsResponse
from app.services.realtime import manager

router = APIRouter(prefix="/api/flash-meets", tags=["flash-meets"])

FLASH_META = {
    "meal": {
        "template": "meal_room",
        "title": "혼밥방",
        "thumbnail_url": "/uploads/seed/flash-meal.png",
    },
    "cafe": {
        "template": "after_work_chat_room",
        "title": "퇴근 후 수다방",
        "thumbnail_url": "/uploads/seed/flash-chat.png",
    },
    "walk": {
        "template": "neighborhood_walk_room",
        "title": "동네 산책방",
        "thumbnail_url": "/uploads/seed/flash-walk.png",
    },
    "call": {
        "template": "after_work_chat_room",
        "title": "퇴근 후 수다방",
        "thumbnail_url": "/uploads/seed/flash-chat.png",
    },
    "other": {
        "template": "other_room",
        "title": "기타",
        "thumbnail_url": "/uploads/seed/flash-other.png",
    },
}


def flash_out(session: Session, meet: FlashMeet) -> dict:
    # Build one shared shape for REST responses and broadcast payloads.
    creator = get_user_or_404(session, meet.creator_id)
    meta = FLASH_META.get(meet.type.value, FLASH_META["meal"])
    expires_at = meet.expires_at if meet.expires_at.tzinfo else meet.expires_at.replace(tzinfo=timezone.utc)
    remaining = max(0, int((expires_at - datetime.now(timezone.utc)).total_seconds() // 60))
    return {
        "id": meet.id,
        "creator_id": meet.creator_id,
        "creator_name": creator.display_name,
        "type": meet.type,
        "template": meta["template"],
        "title": meta["title"],
        "message": meet.message,
        "city_label": meet.city_label,
        "expires_at": expires_at,
        "expires_in_minutes": remaining,
        "participant_ids": meet.participant_ids,
        "status": meet.status,
        "thumbnail_url": meta["thumbnail_url"],
    }


@router.get("", response_model=FlashMeetsResponse)
def list_flash_meets(userId: str = "user-mina", session: Session = Depends(get_session)):
    get_user_or_404(session, userId)
    now = datetime.now(timezone.utc)
    meets = session.exec(select(FlashMeet).where(FlashMeet.status == FlashMeetStatus.active, FlashMeet.expires_at > now)).all()
    deduped: list[FlashMeet] = []
    seen: set[tuple[str, str, str]] = set()
    for meet in meets:
        key = (meet.type.value, meet.city_label, meet.message)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(meet)
    return {"items": [flash_out(session, meet) for meet in deduped]}


@router.post("", response_model=FlashMeetCreateResponse)
async def create_flash_meet(payload: FlashMeetCreateRequest, session: Session = Depends(get_session)):
    get_user_or_404(session, payload.creator_id)
    participant_ids: list[str] = []
    for user_id in [payload.creator_id, *payload.participant_ids]:
        get_user_or_404(session, user_id)
        if user_id not in participant_ids:
            participant_ids.append(user_id)
    meet = FlashMeet(id=make_id("flash"), creator_id=payload.creator_id, type=payload.type, message=payload.message, city_label=payload.city_label, expires_at=datetime.now(timezone.utc) + timedelta(hours=payload.expires_in_hours), participant_ids=participant_ids, status=FlashMeetStatus.active)
    session.add(meet)
    session.commit()
    session.refresh(meet)
    output = flash_out(session, meet)
    await manager.broadcast("flash:new", {"flashMeet": output})
    return {"item": output}


@router.post("/{meet_id}/join", response_model=FlashMeetJoinResponse)
async def join_flash_meet(meet_id: str, payload: FlashMeetJoinRequest, session: Session = Depends(get_session)):
    meet = session.get(FlashMeet, meet_id)
    if meet is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "FLASH_MEET_NOT_FOUND", "Flash meet not found")
    get_user_or_404(session, payload.user_id)
    if meet.creator_id == payload.user_id:
        raise api_error(status.HTTP_400_BAD_REQUEST, "CANNOT_JOIN_OWN_FLASH_MEET", "Creator cannot join own flash meet")
    participants = list(meet.participant_ids)
    # Repeated joins are idempotent; only add the participant once.
    if payload.user_id not in participants:
        participants.append(payload.user_id)
        meet.participant_ids = participants
    room = get_or_create_room(session, meet.creator_id, payload.user_id)
    session.add(meet)
    session.commit()
    session.refresh(meet)
    await manager.broadcast("flash:joined", {"flashMeetId": meet.id, "userId": payload.user_id, "chatRoomId": room.id})
    return {"chat_room_id": room.id, "flash_meet": flash_out(session, meet)}
