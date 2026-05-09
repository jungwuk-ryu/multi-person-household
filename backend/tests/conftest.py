import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

TEST_STATE_DIR = Path(tempfile.mkdtemp(prefix="daingagu-test-"))
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_STATE_DIR / 'test.db'}"
os.environ["UPLOAD_DIR"] = str(TEST_STATE_DIR / "uploads")
os.environ["GEMINI_API_KEY"] = ""
os.environ["MOCK_AI"] = "true"

from sqlmodel import Session

from app.database import create_db_and_tables, engine
from app.seed import seed_database


def pytest_sessionstart(session):
    create_db_and_tables()
    with Session(engine) as db:
        seed_database(db)
