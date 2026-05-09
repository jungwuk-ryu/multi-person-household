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

Copy `.env.example` to `.env` if you want to override defaults. Real OpenAI image generation is the default for demos with an API key.

For real OpenAI image generation:

```text
MOCK_AI=false
OPENAI_API_KEY=your_api_key_here
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_PARALLEL_REQUESTS=2
OPENAI_IMAGE_MAX_RETRIES=2
OPENAI_IMAGE_TIMEOUT_SECONDS=45
```

Generated images are saved under `app/uploads/generated/` and served from `/uploads/generated/...`. Group-photo generation uses the selected base Setlog as the single location and can start multiple OpenAI image requests in parallel, returning the first successful result. Memo and 3D modes first create a non-persisted base image, then use that generated image as the reference for a second edited image.

For local API-key-free development, set `MOCK_AI=true`.

For real Gemini moderation/caption suggestions:

```text
GEMINI_API_KEY=your_api_key_here
GEMINI_MODERATION_MODEL=gemini-2.5-flash
GEMINI_CAPTION_MODEL=gemini-2.5-flash-lite
```

The backend reads environment files from both the repository root `.env` and `backend/.env`, with `backend/.env` taking precedence.

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
