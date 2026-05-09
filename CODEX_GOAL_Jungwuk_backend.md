# Codex Goal: Setlog FastAPI Backend MVP

Use this document as the implementation goal for Codex. `SEED_Jungwuk_backend.yaml` is the seed artifact, and `docs/promise/backend-api-contract.md` is the frontend/backend source of truth.

## Mission

Build a runnable FastAPI backend MVP for Setlog, a public daily-log and lightweight flash-meet app for one-person households.

The backend must let a frontend teammate integrate independently through stable REST and WebSocket contracts, seeded demo data, SQLite persistence, local media handling, and mock-first AI safety/image flows.

Implementation belongs in `backend/`. Frontend implementation is out of scope.

## Required Stack

- Python 3.11+
- FastAPI
- Uvicorn
- Pydantic v2
- SQLite
- SQLModel
- `python-multipart`
- FastAPI `StaticFiles` for `/uploads`
- `httpx`
- FastAPI WebSocket endpoint with a connection manager
- `pydantic-settings`
- `pytest` and FastAPI/httpx test client

Recommended structure:

```text
backend/
  README.md
  .env.example
  requirements.txt
  app/
    main.py
    config.py
    database.py
    models.py
    schemas.py
    seed.py
    deps.py
    routers/
      auth.py
      users.py
      setlogs.py
      flash_meets.py
      friends.py
      chats.py
      album.py
      ai.py
    services/
      media.py
      moderation.py
      image_generation.py
      realtime.py
    uploads/
      .gitkeep
      seed/
        .gitkeep
      generated/
        .gitkeep
  tests/
    test_smoke.py
```

## Backend Boundary

You own:

- `backend/**`
- `docs/promise/backend-api-contract.md`

Do not implement frontend screens. Do not rewrite unrelated PRD files.

## Environment

Create `backend/.env.example` with:

```text
PORT=8000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=sqlite:///./setlog.db
MOCK_AI=true
OPENAI_API_KEY=
GEMINI_API_KEY=
UPLOAD_DIR=uploads
```

Default behavior must work with `MOCK_AI=true` and no API keys.

## Contract Rules

Implement `docs/promise/backend-api-contract.md` exactly.

Key fixed decisions:

- REST JSON fields are `camelCase`.
- Demo identity is `userId` based through query, JSON body, or multipart form fields.
- `POST /api/auth/demo-login` returns `demo-{userId}`, but bearer auth parsing is not required.
- Common REST errors use `{ "error": { "code": "...", "message": "..." } }`.
- WebSocket messages use `{ "type": "...", "payload": {} }`.
- WebSocket errors use `type: "error"` with `code` and `message` in `payload`.

## Data Model

Persist in SQLite:

- User
- Setlog
- Friendship
- FlashMeet
- ChatRoom
- ChatMessage
- AlbumItem
- Moderation result fields or equivalent columns

Core enums:

- `gender`: `female | male | other`
- `visibility`: `public | friends`
- `moderationStatus`: `pending | approved | blocked`
- `mediaType`: `image | video`
- `setlog.category`: `meal | daily | exercise | hobby | other`
- `flashMeet.type`: `meal | cafe | walk | call`
- `flashMeet.status`: `active | expired | closed`
- `feed filter`: `all | friends | sameGender | nearby | meal`

Video may remain schema-reserved, but first MVP accepts image media only.

## Seed Data

Create seed data automatically on startup or through a documented command.

Startup seeding must be idempotent:

- Create tables if missing.
- Insert missing seed records by stable IDs.
- Do not wipe existing local data.
- Do not delete uploaded files.

Use stable human-readable seed IDs documented in the contract:

- Users: `user-mina`, `user-jun`, `user-soo`, `user-hana`
- Setlogs: `setlog-meal-mina-001`, `setlog-daily-jun-001`, `setlog-friends-jun-001`, `setlog-meal-soo-001`
- Flash meets: `flash-coffee-001`, `flash-meal-001`, `flash-expired-001`
- Chat room: `chat-mina-jun`
- Chat messages: `msg-mina-jun-001`, `msg-jun-mina-001`
- Album item: `album-mina-group-001`

Minimum seed coverage:

- At least 4 demo users
- Public Setlogs
- Friend-only Setlogs
- Same-gender and nearby filter data
- Meal category Setlogs
- One blocked Setlog that never appears in feeds
- Active flash meets and one expired flash meet
- Friend relationships
- Chat history
- One album item
- Local placeholder media under `backend/app/uploads/seed/`

## Feed Rules

- `all`: approved public Setlogs.
- `friends`: approved public/friends Setlogs from friend users only; exclude the current user's own Setlogs.
- `sameGender`: approved public Setlogs from users with the same gender as the current user; include the current user's own Setlogs.
- `nearby`: approved public Setlogs whose author has the same `cityLabel` as the current user.
- `meal`: approved public Setlogs where `category=meal`.

Blocked Setlogs are persisted and returned from create requests with `moderationStatus=blocked`, but never returned by feeds. `POST /api/setlogs` returns `201 Created` for both approved and blocked outcomes.

## Media Requirements

Support both:

1. Multipart image upload through `POST /api/setlogs`.
2. JSON image URL creation through `POST /api/setlogs/from-url`.

Multipart upload restrictions:

- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Maximum size: 10MB

For image URLs:

- Try fetching the URL with `httpx`, storing it under `backend/app/uploads/`, and serving it as `/uploads/...`.
- If fetching fails, store the original URL as `mediaUrl` so demo flows are not blocked.

For seed/demo media:

- Use local placeholder image files under `backend/app/uploads/seed/`.
- Avoid remote seed media.

## Flash Meets

- `GET /api/flash-meets` returns active, non-expired meets and includes the current user's own meets.
- `expiresInHours` must be `1`, `2`, or `3`.
- Multiple participants are allowed.
- Repeated joins by the same user are idempotent.
- Creator self-join is forbidden and returns `400` with `CANNOT_JOIN_OWN_FLASH_MEET`.
- Joining creates or reuses a one-to-one chat room between creator and participant.

## Chats

- One-to-one chat rooms are unique per unordered user pair.
- Friendship and flash-meet flows reuse the same room for the same user pair.
- Message creation is REST-only in MVP through `POST /api/chats/{roomId}/messages`.
- Chat messages accept text only.
- `imageUrl` is reserved as nullable response data and should be `null` in MVP.

## Album And AI

`POST /api/ai/group-photo` uses:

```json
{
  "userId": "user-mina",
  "sourceSetlogIds": ["setlog-meal-mina-001", "setlog-daily-jun-001"],
  "prompt": "Friendly neighborhood dinner memory"
}
```

Rules:

- Source Setlogs must be approved.
- `memberIds` are derived from source Setlog authors.
- Run pre-moderation, mock or real image generation, post-moderation, and album item persistence.
- Store the result as a user-owned album item.
- Do not automatically post AI group photo results to feeds.
- Add `GET /api/album?userId={userId}` for user-owned album items.

Mock AI:

- Moderation approves by default.
- Moderation blocks when filename, imageUrl, or caption contains `blocked`, case-insensitive.
- Image generation returns `/uploads/seed/generated-demo.jpg`.
- No OpenAI or Gemini keys are required in mock mode.

Real AI wrappers:

- Keep Gemini moderation and OpenAI image generation behind clean service boundaries.
- Do not require real API calls for tests.
- Final OpenAI image model name is a non-blocking open question for non-mock implementation.

## REST API

Required endpoints:

- `GET /health`
- `GET /api/users`
- `POST /api/auth/demo-login`
- `GET /api/setlogs?filter=all|friends|sameGender|nearby|meal&userId=user-mina`
- `POST /api/setlogs`
- `POST /api/setlogs/from-url`
- `GET /api/flash-meets?userId=user-mina`
- `POST /api/flash-meets`
- `POST /api/flash-meets/{id}/join`
- `POST /api/friends/{targetUserId}`
- `GET /api/chats?userId=user-mina`
- `GET /api/chats/{roomId}/messages`
- `POST /api/chats/{roomId}/messages`
- `GET /api/album?userId=user-mina`
- `POST /api/ai/group-photo`

## WebSocket

Endpoint:

```text
/ws?userId={userId}
```

Supported behavior:

- On connect, register the user globally.
- `chat:join` subscribes a socket to a chat room.
- `chat:new-message` is emitted only to connected members subscribed to that room.
- `flash:new` and `flash:joined` are broadcast to all connected users.
- `chat:message` is reserved in MVP; if received, return an error envelope with `CHAT_MESSAGE_WS_RESERVED` and do not persist a message.

REST routes that create chat messages or flash updates must broadcast the matching WebSocket events.

## Tests

Add smoke tests for:

- Health check
- Demo login
- Setlog filters
- Multipart or URL Setlog creation with mock moderation
- Blocked Setlog create response and feed exclusion
- Flash meet join returns `chatRoomId`
- Creator self-join error
- Chat message creation
- Mock AI group photo generation
- User album query
- Idempotent startup seeding

Tests must run in mock mode without real AI keys.

## Done Criteria

- `backend/` can install dependencies and run locally.
- `backend/README.md` explains install, env, seed, run, and test commands.
- SQLite DB is initialized and seeded.
- Startup seeding is idempotent.
- All required REST endpoints return the documented shapes.
- WebSocket endpoint accepts connections and handles the required events.
- `docs/promise/backend-api-contract.md` matches the implementation.
- Mock AI path works end to end.
- Blocked moderation items are excluded from feed responses.

## Cross-Check Before Finishing

Before finalizing implementation, confirm alignment across:

- `SEED_Jungwuk_backend.yaml`
- `CODEX_GOAL_Jungwuk_backend.md`
- `docs/promise/backend-api-contract.md`

If implementation differs from the contract, fix either the code or the contract so they match.
