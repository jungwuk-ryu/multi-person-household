from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.crud import get_user_or_404
from app.database import get_session
from app.schemas import DemoLoginRequest, DemoLoginResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/demo-login", response_model=DemoLoginResponse)
def demo_login(payload: DemoLoginRequest, session: Session = Depends(get_session)):
    user = get_user_or_404(session, payload.user_id)
    return {"token": f"demo-{user.id}", "user": user}
