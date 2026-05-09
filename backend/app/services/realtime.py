from collections import defaultdict
from datetime import date, datetime
from enum import Enum

from fastapi import WebSocket

from app.schemas import to_camel


def websocket_payload(value):
    # WebSocket responses do not pass through FastAPI response models, so normalize here.
    if isinstance(value, dict):
        return {to_camel(str(key)): websocket_payload(item) for key, item in value.items()}
    if isinstance(value, list):
        return [websocket_payload(item) for item in value]
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


class ConnectionManager:
    def __init__(self) -> None:
        self.active: dict[WebSocket, str] = {}
        self.room_subscriptions: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        await websocket.accept()
        self.active[websocket] = user_id

    def disconnect(self, websocket: WebSocket) -> None:
        self.active.pop(websocket, None)
        for sockets in self.room_subscriptions.values():
            sockets.discard(websocket)

    def join_room(self, websocket: WebSocket, room_id: str) -> None:
        self.room_subscriptions[room_id].add(websocket)

    async def send_error(self, websocket: WebSocket, code: str, message: str) -> None:
        await websocket.send_json({"type": "error", "payload": {"code": code, "message": message}})

    async def broadcast(self, message_type: str, payload: dict) -> None:
        for websocket in list(self.active):
            await websocket.send_json({"type": message_type, "payload": websocket_payload(payload)})

    async def broadcast_chat(self, room_id: str, member_ids: list[str], message: dict) -> None:
        for websocket in list(self.room_subscriptions.get(room_id, set())):
            if self.active.get(websocket) in member_ids:
                await websocket.send_json({"type": "chat:new-message", "payload": websocket_payload({"room_id": room_id, "message": message})})


manager = ConnectionManager()
