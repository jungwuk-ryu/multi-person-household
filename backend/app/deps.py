from fastapi import Depends
from sqlmodel import Session

from app.database import get_session


SessionDep = Depends(get_session)
