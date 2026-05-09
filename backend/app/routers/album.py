from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.crud import get_user_or_404
from app.database import get_session
from app.models import AlbumItem
from app.schemas import AlbumResponse

router = APIRouter(prefix="/api/album", tags=["album"])


@router.get("", response_model=AlbumResponse)
def list_album(userId: str = "user-mina", session: Session = Depends(get_session)):
    get_user_or_404(session, userId)
    items = session.exec(select(AlbumItem).where(AlbumItem.owner_user_id == userId).order_by(AlbumItem.created_at.desc())).all()
    return {"items": items}
