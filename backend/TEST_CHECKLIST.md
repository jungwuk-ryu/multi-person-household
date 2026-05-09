# Setlog Backend Test Checklist

Use this checklist after backend changes to verify the API contract in `../docs/promise/backend-api-contract.md`.

## Automated Smoke Tests

Run:

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\test.ps1
```

Or from Command Prompt:

```bat
cd backend
test.bat
```

Expected result:

```text
11 passed
```

## REST API Checks

- `GET /health` returns `{ "status": "ok" }`.
- `GET /api/users` returns seeded users including `user-mina`, `user-jun`, `user-soo`, and `user-hana`.
- `POST /api/auth/demo-login` with `userId=user-mina` returns token `demo-user-mina`.
- `GET /api/setlogs?filter=all&userId=user-mina` returns approved public Setlogs only.
- `GET /api/setlogs?filter=friends&userId=user-mina` includes friend Setlogs and excludes the current user's own Setlogs.
- `GET /api/setlogs?filter=sameGender&userId=user-mina` includes same-gender approved public Setlogs, including `user-mina`.
- `GET /api/setlogs?filter=nearby&userId=user-mina` returns approved public Setlogs from the same `cityLabel`.
- `GET /api/setlogs?filter=meal&userId=user-mina` returns approved public meal Setlogs only.
- `POST /api/setlogs` accepts multipart image uploads and returns `201 Created`.
- `POST /api/setlogs/from-url` stores a remote image when possible, or keeps the original URL when fetch fails.
- Setlog creation with `blocked` in caption, filename, or image URL returns `moderationStatus=blocked`.
- Blocked Setlogs are persisted but never returned by feed endpoints.
- `GET /api/flash-meets?userId=user-mina` returns active, non-expired flash meets only.
- `POST /api/flash-meets` accepts `expiresInHours` values `1`, `2`, or `3`.
- `POST /api/flash-meets/{id}/join` returns `chatRoomId`.
- Joining the same flash meet repeatedly is idempotent.
- Creator self-join returns `400` with `CANNOT_JOIN_OWN_FLASH_MEET`.
- `POST /api/friends/{targetUserId}` creates symmetric friendship and reuses/creates a one-to-one chat room.
- `GET /api/chats?userId=user-mina` returns one-to-one chat rooms.
- `GET /api/chats/{roomId}/messages` returns ordered chat history.
- `POST /api/chats/{roomId}/messages` creates text-only messages with `imageUrl=null`.
- `GET /api/album?userId=user-mina` returns user-owned album items.
- `POST /api/ai/group-photo` returns mock image `/uploads/seed/generated-demo.jpg` and persists an album item.

## WebSocket Checks

- Connect to `/ws?userId=user-mina`.
- Sending `chat:join` with `roomId=chat-mina-jun` subscribes the socket to that room.
- Creating a chat message through REST emits `chat:new-message` only to subscribed room members.
- Sending `chat:message` through WebSocket returns an error envelope with `CHAT_MESSAGE_WS_RESERVED`.
- Creating a flash meet through REST broadcasts `flash:new`.
- Joining a flash meet through REST broadcasts `flash:joined`.
- WebSocket messages use `{ "type": "...", "payload": {} }`.
- WebSocket payload fields use camelCase.

## Seed And Persistence Checks

- Startup creates tables if missing.
- Startup inserts seed records by stable IDs only when missing.
- Re-running seed does not duplicate records.
- Existing local data is not wiped.
- Uploaded files are not deleted by seed.
- Seed media paths resolve under `/uploads/seed/`.

## Manual Server Check

Run:

```powershell
cd backend
uv run --python 3.11 --with-requirements requirements.txt uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then verify:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod "http://127.0.0.1:8000/api/setlogs?filter=all&userId=user-mina"
```
