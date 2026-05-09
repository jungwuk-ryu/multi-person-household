# Backend API Contract

This document is the promise between the FastAPI backend owner and the frontend owner.

Base URL:

```text
http://localhost:8000
```

WebSocket URL:

```text
ws://localhost:8000/ws?userId=user-mina
```

Auth is demo-only. Frontend sends `userId` in query strings, JSON bodies, or multipart form fields. `POST /api/auth/demo-login` returns a `demo-{userId}` token for frontend session display only; MVP endpoints do not require bearer auth parsing.

All REST request and response fields use `camelCase`.

## Seed IDs

Users:

- `user-mina`: primary demo user
- `user-jun`: friend of `user-mina`
- `user-soo`: nearby public user
- `user-hana`: additional public user

Other stable seed IDs:

- Setlogs: `setlog-meal-mina-001`, `setlog-daily-jun-001`, `setlog-friends-jun-001`, `setlog-meal-soo-001`
- Flash meets: `flash-coffee-001`, `flash-meal-001`, `flash-expired-001`
- Chat rooms: `chat-mina-jun`
- Chat messages: `msg-mina-jun-001`, `msg-jun-mina-001`
- Album items: `album-mina-group-001`

The backend must seed enough Setlogs, flash meets, chats, and album items for these IDs. Seed media should use local placeholder image files under `/uploads/seed/` instead of remote URLs.

## Common Error Shape

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

Use appropriate HTTP status codes: `400`, `404`, `409`, `422`, `500`.

## Health

### GET /health

Response:

```json
{
  "status": "ok"
}
```

## Users

### GET /api/users

Response:

```json
{
  "items": [
    {
      "id": "user-mina",
      "displayName": "Demo User",
      "avatarUrl": "/uploads/seed/avatar-mina.jpg",
      "gender": "female",
      "cityLabel": "Seongsu",
      "bio": "After-work dinner and local cafe logs"
    }
  ]
}
```

## Auth

### POST /api/auth/demo-login

Request:

```json
{
  "userId": "user-mina"
}
```

Response:

```json
{
  "token": "demo-user-mina",
  "user": {
    "id": "user-mina",
    "displayName": "Demo User",
    "avatarUrl": "/uploads/seed/avatar-mina.jpg",
    "gender": "female",
    "cityLabel": "Seongsu",
    "bio": "After-work dinner and local cafe logs"
  }
}
```

## Setlogs

Setlog category enum:

```text
meal | daily | exercise | hobby | other
```

### GET /api/setlogs

Query:

```text
filter=all|friends|sameGender|nearby|meal
userId=user-mina
```

Filter rules:

- `all`: approved public Setlogs.
- `friends`: approved public/friends Setlogs from friend users only; current user's own Setlogs are excluded.
- `sameGender`: approved public Setlogs from users with the same gender as current user, including the current user's own Setlogs.
- `nearby`: approved public Setlogs with the same `cityLabel` as current user.
- `meal`: approved public Setlogs where `category` is `meal`.

Response:

```json
{
  "items": [
    {
      "id": "setlog-meal-soo-001",
      "userId": "user-soo",
      "userName": "Minseo",
      "avatarUrl": "/uploads/seed/avatar-soo.jpg",
      "mediaType": "image",
      "mediaUrl": "/uploads/seed/meal-01.jpg",
      "thumbnailUrl": "/uploads/seed/meal-01.jpg",
      "caption": "Dinner after work",
      "category": "meal",
      "visibility": "public",
      "cityLabel": "Seongsu",
      "gender": "female",
      "hourSlot": "20:00",
      "createdAt": "2026-05-09T11:00:00Z",
      "moderationStatus": "approved",
      "isFriend": false
    }
  ]
}
```

Rejected Setlogs must not appear in feed responses.

### POST /api/setlogs

Multipart form data:

- `userId`: string
- `caption`: string
- `category`: `meal | daily | exercise | hobby | other`
- `visibility`: `public | friends`
- `cityLabel`: string
- `media`: image or short video file

Allowed MIME types are `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`, and `video/quicktime`. Maximum file size is 25MB.

Successful create responses use `201 Created` only for Gemini-approved outcomes. Rejected Setlogs return `400 Bad Request` with `SETLOG_REJECTED`; uploaded media is removed and the Setlog is not persisted.

Response:

```json
{
  "item": {
    "id": "setlog-new",
    "userId": "user-mina",
    "mediaType": "image",
    "mediaUrl": "/uploads/setlogs/setlog-new.jpg",
    "thumbnailUrl": "/uploads/setlogs/setlog-new.jpg",
    "caption": "Late dinner",
    "category": "meal",
    "visibility": "public",
    "cityLabel": "Seongsu",
    "hourSlot": "21:00",
    "createdAt": "2026-05-09T12:00:00Z",
    "moderationStatus": "approved"
  }
}
```

### POST /api/setlogs/from-url

JSON request:

```json
{
  "userId": "user-mina",
  "caption": "Cafe log",
  "category": "daily",
  "visibility": "public",
  "cityLabel": "Seongsu",
  "imageUrl": "https://example.com/cafe.jpg"
}
```

Response shape is the same as `POST /api/setlogs`.

Backend should fetch and store the image when feasible. If fetching fails, backend stores the original URL as `mediaUrl` so demo flows are not blocked by remote asset issues.

For demo stability, seed images are local files. URL ingestion is for user-created prototype Setlogs, not required for seed media.

## Flash Meets

### GET /api/flash-meets

Query:

```text
userId=user-mina
```

Response:

```json
{
  "items": [
    {
      "id": "flash-meal-001",
      "creatorId": "user-jun",
      "creatorName": "Minseo",
      "type": "meal",
      "message": "Anyone eating near Seongsu?",
      "cityLabel": "Seongsu",
      "expiresAt": "2026-05-09T14:00:00Z",
      "participantIds": ["user-jun"],
      "status": "active"
    }
  ]
}
```

Only active, non-expired meets should be returned. The list includes flash meets created by the current user; frontend should disable the join action when `creatorId` equals the current `userId`.

### POST /api/flash-meets

Request:

```json
{
  "creatorId": "user-mina",
  "type": "meal",
  "message": "Dinner near Seongsu?",
  "cityLabel": "Seongsu",
  "expiresInHours": 2
}
```

`expiresInHours` must be `1`, `2`, or `3`.

Response:

```json
{
  "item": {
    "id": "flash-new",
    "creatorId": "user-mina",
    "creatorName": "Demo User",
    "type": "meal",
    "message": "Dinner near Seongsu?",
    "cityLabel": "Seongsu",
    "expiresAt": "2026-05-09T14:00:00Z",
    "participantIds": ["user-mina"],
    "status": "active"
  }
}
```

Also broadcast `flash:new`.

### POST /api/flash-meets/{id}/join

Request:

```json
{
  "userId": "user-mina"
}
```

Response:

```json
{
  "chatRoomId": "chat-mina-jun",
  "flashMeet": {
    "id": "flash-meal-001",
    "participantIds": ["user-jun", "user-mina"],
    "status": "active"
  }
}
```

Also broadcast `flash:joined`.

Join rules:

- Multiple participants are allowed.
- Repeated joins by the same user are idempotent.
- Creator self-join returns `400` with `CANNOT_JOIN_OWN_FLASH_MEET`.
- Joining creates or reuses the one-to-one room for the unordered creator/participant user pair.

## Friends

### POST /api/friends/{targetUserId}

Request:

```json
{
  "userId": "user-mina"
}
```

Response:

```json
{
  "ok": true,
  "friendship": {
    "userId": "user-mina",
    "friendUserId": "user-soo"
  }
}
```

Friendship is symmetric in the MVP.

## Chats

One-to-one chat rooms are unique per unordered user pair and reused across friendship and flash-meet join flows.

### GET /api/chats

Query:

```text
userId=user-mina
```

Response:

```json
{
  "items": [
    {
      "id": "chat-mina-jun",
      "memberIds": ["user-mina", "user-jun"],
      "members": [
        {
          "id": "user-jun",
          "displayName": "Minseo",
          "avatarUrl": "/uploads/seed/avatar-jun.jpg"
        }
      ],
      "latestMessage": {
        "id": "msg-jun-mina-001",
        "senderId": "user-jun",
        "text": "Want to eat together?",
        "createdAt": "2026-05-09T11:10:00Z"
      },
      "createdAt": "2026-05-09T10:00:00Z",
      "updatedAt": "2026-05-09T11:10:00Z"
    }
  ]
}
```

### GET /api/chats/{roomId}/messages

Response:

```json
{
  "items": [
    {
      "id": "msg-mina-jun-001",
      "roomId": "chat-mina-jun",
      "senderId": "user-mina",
      "text": "Did you eat dinner?",
      "imageUrl": null,
      "createdAt": "2026-05-09T11:00:00Z"
    }
  ]
}
```

### POST /api/chats/{roomId}/messages

Request:

```json
{
  "senderId": "user-mina",
  "text": "I am heading out now."
}
```

MVP message creation accepts text only. `imageUrl` is reserved as nullable response data and should be `null`.

Response:

```json
{
  "item": {
    "id": "msg-new",
    "roomId": "chat-mina-jun",
    "senderId": "user-mina",
    "text": "I am heading out now.",
    "imageUrl": null,
    "createdAt": "2026-05-09T12:00:00Z"
  }
}
```

Also broadcast `chat:new-message`.

## Album

### GET /api/album

Query:

```text
userId=user-mina
```

Response:

```json
{
  "items": [
    {
      "id": "album-mina-group-001",
      "ownerUserId": "user-mina",
      "memberIds": ["user-mina", "user-jun"],
      "sourceSetlogIds": ["setlog-meal-mina-001", "setlog-daily-jun-001"],
      "imageUrl": "/uploads/seed/generated-demo.jpg",
      "type": "ai_group_photo",
      "createdAt": "2026-05-09T12:00:00Z"
    }
  ]
}
```

## AI Group Photo

### POST /api/ai/group-photo

Request:

```json
{
  "userId": "user-mina",
  "sourceSetlogIds": ["setlog-meal-mina-001", "setlog-daily-jun-001"],
  "prompt": "Friendly neighborhood dinner memory"
}
```

Response:

```json
{
  "id": "album-new",
  "generatedImageUrl": "/uploads/seed/generated-demo.jpg",
  "status": "approved",
  "sourceSetlogIds": ["setlog-meal-mina-001", "setlog-daily-jun-001"],
  "albumItem": {
    "id": "album-new",
    "ownerUserId": "user-mina",
    "memberIds": ["user-mina", "user-jun"],
    "sourceSetlogIds": ["setlog-meal-mina-001", "setlog-daily-jun-001"],
    "imageUrl": "/uploads/seed/generated-demo.jpg",
    "type": "ai_group_photo",
    "createdAt": "2026-05-09T12:00:00Z"
  }
}
```

Backend must pre-moderate approved source Setlogs, generate or mock the image, post-moderate the generated result, and persist a user-owned album item. AI group photo results are not automatically posted to Setlog feeds.

## Mock AI Rules

When `MOCK_AI=true`:

- If `GEMINI_API_KEY` is configured, Setlog creation checks the caption and uploaded image/video with Gemini before persistence.
- Without `GEMINI_API_KEY`, moderation uses the deterministic demo fallback and rejects filename, imageUrl, or caption containing `blocked`.
- Rejected create responses use `400 Bad Request` with `SETLOG_REJECTED`, and feeds must not return the item.
- AI group photo returns `/uploads/seed/generated-demo.jpg`.
- OpenAI and Gemini keys are optional for local tests, but Gemini is required for real media safety checks.

## WebSocket Contract

Connect:

```text
ws://localhost:8000/ws?userId=user-mina
```

All messages are JSON envelopes:

```json
{
  "type": "event:name",
  "payload": {}
}
```

Error messages use:

```json
{
  "type": "error",
  "payload": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### chat:join

Client to server:

```json
{
  "type": "chat:join",
  "payload": {
    "roomId": "chat-mina-jun"
  }
}
```

After this event, the connected socket is subscribed to that room.

### chat:message

Client to server:

```json
{
  "type": "chat:message",
  "payload": {
    "roomId": "chat-mina-jun",
    "senderId": "user-mina",
    "text": "See you soon"
  }
}
```

MVP behavior: this event is reserved and does not persist messages. Clients should create messages through `POST /api/chats/{roomId}/messages`. If received, server returns:

```json
{
  "type": "error",
  "payload": {
    "code": "CHAT_MESSAGE_WS_RESERVED",
    "message": "Use POST /api/chats/{roomId}/messages to create chat messages."
  }
}
```

### chat:new-message

Server to client:

```json
{
  "type": "chat:new-message",
  "payload": {
    "roomId": "chat-mina-jun",
    "message": {
      "id": "msg-new",
      "roomId": "chat-mina-jun",
      "senderId": "user-mina",
      "text": "See you soon",
      "imageUrl": null,
      "createdAt": "2026-05-09T12:00:00Z"
    }
  }
}
```

Delivery rule: send only to connected members subscribed to the chat room.

### flash:new

Server to client:

```json
{
  "type": "flash:new",
  "payload": {
    "flashMeet": {
      "id": "flash-new",
      "type": "meal",
      "message": "Dinner near Seongsu?",
      "cityLabel": "Seongsu",
      "participantIds": ["user-mina"],
      "status": "active"
    }
  }
}
```

Delivery rule: broadcast to all connected users.

### flash:joined

Server to client:

```json
{
  "type": "flash:joined",
  "payload": {
    "flashMeetId": "flash-meal-001",
    "userId": "user-mina",
    "chatRoomId": "chat-mina-jun"
  }
}
```

Delivery rule: broadcast to all connected users.

## Seed Behavior

Startup seeding is idempotent:

- Create tables if missing.
- Insert seed records by stable IDs only when missing.
- Do not wipe existing local data.
- Do not delete uploaded files.

## Frontend Notes

- Use `user-mina` as the default current user.
- Treat `mediaUrl` and `avatarUrl` as directly renderable URLs.
- For local media, prefix with backend base URL when needed.
- Do not render rejected Setlogs in feed; backend should reject them before persistence.
- Flash meet expiration is server-owned.
- The frontend can start with this contract before backend implementation is complete.
