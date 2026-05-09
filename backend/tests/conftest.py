import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ["GEMINI_API_KEY"] = ""

from sqlmodel import Session

from app.database import create_db_and_tables, engine
from app.seed import seed_database


def pytest_sessionstart(session):
    create_db_and_tables()
    with Session(engine) as db:
        seed_database(db)
