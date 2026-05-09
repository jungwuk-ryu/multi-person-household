from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings


def _connect_args() -> dict[str, bool]:
    if get_settings().database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


engine = create_engine(get_settings().database_url, connect_args=_connect_args())


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_compat_columns()


def _ensure_compat_columns() -> None:
    inspector = inspect(engine)
    if "setlog" not in inspector.get_table_names():
        return
    setlog_columns = {column["name"] for column in inspector.get_columns("setlog")}
    if "like_count" in setlog_columns:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE setlog ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0"))


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
