from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select

from app.crud import api_error, get_user_or_404, latest_message, make_id
from app.database import get_session
from app.models import ChatMessage, ChatRoom, User
from app.schemas import ChatMessageCreateRequest, ChatMessageCreateResponse, ChatMessagesResponse, ChatsResponse
from app.services.realtime import manager

router = APIRouter(prefix="/api/chats", tags=["chats"])


def message_out(message: ChatMessage) -> dict:
    return {
        "id": message.id,
        "room_id": message.room_id,
        "sender_id": message.sender_id,
        "text": message.text,
        "image_url": message.image_url,
        "created_at": message.created_at,
    }


def room_out(session: Session, room: ChatRoom) -> dict:
    # Include member display data so the frontend can render chat lists without extra lookups.
    members = []
    for user_id in room.member_ids:
        user = session.get(User, user_id)
        if user:
            members.append({"id": user.id, "display_name": user.display_name, "avatar_url": user.avatar_url})
    latest = latest_message(session, room.id)
    return {
        "id": room.id,
        "member_ids": room.member_ids,
        "members": members,
        "latest_message": message_out(latest) if latest else None,
        "created_at": room.created_at,
        "updated_at": room.updated_at,
    }


@router.get("", response_model=ChatsResponse)
def list_chats(userId: str = "user-mina", session: Session = Depends(get_session)):
    get_user_or_404(session, userId)
    rooms = [room for room in session.exec(select(ChatRoom)).all() if userId in room.member_ids]
    return {"items": [room_out(session, room) for room in rooms]}


@router.get("/{room_id}/messages", response_model=ChatMessagesResponse)
def list_messages(room_id: str, session: Session = Depends(get_session)):
    if session.get(ChatRoom, room_id) is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "CHAT_ROOM_NOT_FOUND", "Chat room not found")
    messages = session.exec(select(ChatMessage).where(ChatMessage.room_id == room_id).order_by(ChatMessage.created_at)).all()
    return {"items": [message_out(message) for message in messages]}


@router.post("/{room_id}/messages", response_model=ChatMessageCreateResponse)
async def create_message(room_id: str, payload: ChatMessageCreateRequest, session: Session = Depends(get_session)):
    room = session.get(ChatRoom, room_id)
    if room is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "CHAT_ROOM_NOT_FOUND", "Chat room not found")
    if payload.sender_id not in room.member_ids:
        raise api_error(status.HTTP_400_BAD_REQUEST, "SENDER_NOT_IN_ROOM", "Sender is not a room member")
    message = ChatMessage(id=make_id("msg"), room_id=room.id, sender_id=payload.sender_id, text=payload.text, image_url=None, created_at=datetime.now(timezone.utc))
    room.updated_at = message.created_at
    session.add(message)
    session.add(room)
    session.commit()
    session.refresh(message)
    output = message_out(message)
    # MVP writes messages through REST, then notifies subscribed WebSocket clients.
    await manager.broadcast_chat(room.id, room.member_ids, output)
    return {"item": output}
