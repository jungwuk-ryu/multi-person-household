from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import User
from app.schemas import UsersResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=UsersResponse)
def list_users(session: Session = Depends(get_session)):
    return {"items": session.exec(select(User)).all()}
