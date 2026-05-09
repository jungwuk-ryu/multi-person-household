from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from app.config import get_settings
from app.database import create_db_and_tables, engine
from app.routers import ai, album, auth, chats, flash_meets, friends, setlogs, users
from app.seed import seed_database
from app.services.media import ensure_upload_dirs
from app.services.realtime import manager

settings = get_settings()
ensure_upload_dirs()
app = FastAPI(title="Setlog Backend MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.client_origin, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Startup is safe to run repeatedly: tables are created if missing and seed inserts are idempotent.
    ensure_upload_dirs()
    create_db_and_tables()
    with Session(engine) as session:
        seed_database(session)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        return JSONResponse(status_code=exc.status_code, content={"error": {"code": detail["code"], "message": detail["message"]}})
    return JSONResponse(status_code=exc.status_code, content={"error": {"code": "HTTP_ERROR", "message": str(detail)}})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": {"code": "VALIDATION_ERROR", "message": "Request validation failed"}})


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(users.router)
app.include_router(auth.router)
app.include_router(setlogs.router)
app.include_router(flash_meets.router)
app.include_router(friends.router)
app.include_router(chats.router)
app.include_router(album.router)
app.include_router(ai.router)

app.mount("/uploads", StaticFiles(directory=settings.upload_path), name="uploads")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, userId: str):
    await manager.connect(websocket, userId)
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            payload = data.get("payload", {})
            if message_type == "chat:join":
                room_id = payload.get("roomId")
                if room_id:
                    manager.join_room(websocket, room_id)
            elif message_type == "chat:message":
                # Message persistence is REST-only in the MVP contract.
                await manager.send_error(websocket, "CHAT_MESSAGE_WS_RESERVED", "Use POST /api/chats/{roomId}/messages to create chat messages.")
            else:
                await manager.send_error(websocket, "UNKNOWN_MESSAGE_TYPE", "Unsupported WebSocket message type.")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
