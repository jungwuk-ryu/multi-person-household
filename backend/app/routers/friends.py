from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.crud import get_or_create_room, get_user_or_404
from app.database import get_session
from app.models import Friendship
from app.schemas import FriendRequest, FriendResponse

router = APIRouter(prefix="/api/friends", tags=["friends"])


@router.post("/{target_user_id}", response_model=FriendResponse)
def add_friend(target_user_id: str, payload: FriendRequest, session: Session = Depends(get_session)):
    get_user_or_404(session, payload.user_id)
    get_user_or_404(session, target_user_id)
    for user_id, friend_id in [(payload.user_id, target_user_id), (target_user_id, payload.user_id)]:
        friendship_id = f"friend-{user_id}-{friend_id}"
        if session.get(Friendship, friendship_id) is None:
            session.add(Friendship(id=friendship_id, user_id=user_id, friend_user_id=friend_id))
    get_or_create_room(session, payload.user_id, target_user_id)
    session.commit()
    return {"ok": True, "friendship": {"user_id": payload.user_id, "friend_user_id": target_user_id}}
