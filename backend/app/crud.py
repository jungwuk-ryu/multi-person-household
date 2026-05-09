from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import ChatMessage, ChatRoom, Friendship, Setlog, User


def api_error(http_status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=http_status, detail={"code": code, "message": message})


def get_user_or_404(session: Session, user_id: str) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "USER_NOT_FOUND", "User not found")
    return user


def friend_ids(session: Session, user_id: str) -> set[str]:
    return set(session.exec(select(Friendship.friend_user_id).where(Friendship.user_id == user_id)).all())


def setlog_out(setlog: Setlog, user: User, is_friend: bool | None = None) -> dict:
    return {
        "id": setlog.id,
        "user_id": setlog.user_id,
        "user_name": user.display_name,
        "avatar_url": user.avatar_url,
        "media_type": setlog.media_type,
        "media_url": setlog.media_url,
        "thumbnail_url": setlog.thumbnail_url,
        "caption": setlog.caption,
        "category": setlog.category,
        "visibility": setlog.visibility,
        "city_label": setlog.city_label,
        "gender": user.gender,
        "hour_slot": setlog.hour_slot,
        "created_at": setlog.created_at,
        "moderation_status": setlog.moderation_status,
        "is_friend": is_friend,
    }


def room_id_for(user_a: str, user_b: str) -> str:
    if {user_a, user_b} == {"user-mina", "user-jun"}:
        return "chat-mina-jun"
    first, second = sorted([user_a, user_b])
    return f"chat-{first.removeprefix('user-')}-{second.removeprefix('user-')}"


def get_or_create_room(session: Session, user_a: str, user_b: str) -> ChatRoom:
    room_id = room_id_for(user_a, user_b)
    room = session.get(ChatRoom, room_id)
    if room is None:
        now = datetime.now(timezone.utc)
        room = ChatRoom(id=room_id, member_ids=sorted([user_a, user_b]), created_at=now, updated_at=now)
        session.add(room)
        session.commit()
        session.refresh(room)
    return room


def make_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:12]}"


def latest_message(session: Session, room_id: str) -> ChatMessage | None:
    return session.exec(select(ChatMessage).where(ChatMessage.room_id == room_id).order_by(ChatMessage.created_at.desc())).first()
