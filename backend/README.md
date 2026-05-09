# 다인가구 Backend

FastAPI MVP backend for the 다인가구 demo contract.

## Install

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Environment

Copy `.env.example` to `.env` if you want to override defaults. The default mock mode works without API keys.

For real OpenAI image generation:

```text
MOCK_AI=false
OPENAI_API_KEY=your_api_key_here
OPENAI_IMAGE_MODEL=gpt-image-1.5
```

Generated images are saved under `app/uploads/generated/` and served from `/uploads/generated/...`.

## Run

```powershell
uvicorn app.main:app --reload --port 8000
```

Startup creates SQLite tables and inserts missing seed records without wiping local data.

## Test

```powershell
pytest
```

## Seed Data

Seed data is inserted automatically on startup. Stable IDs and response shapes are documented in `../docs/promise/backend-api-contract.md`.
