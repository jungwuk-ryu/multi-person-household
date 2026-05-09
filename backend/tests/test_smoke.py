from pathlib import Path

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.database import engine
from app.main import app
from app.models import Setlog
from app.seed import seed_database


client = TestClient(app)


def test_health_check():
    assert client.get("/health").json() == {"status": "ok"}


def test_demo_login():
    response = client.post("/api/auth/demo-login", json={"userId": "user-mina"})
    assert response.status_code == 200
    body = response.json()
    assert body["token"] == "demo-user-mina"
    assert body["user"]["id"] == "user-mina"


def test_setlog_filters_and_blocked_seed_exclusion():
    all_feed = client.get("/api/setlogs", params={"filter": "all", "userId": "user-mina"}).json()["items"]
    friends_feed = client.get("/api/setlogs", params={"filter": "friends", "userId": "user-mina"}).json()["items"]
    same_gender = client.get("/api/setlogs", params={"filter": "sameGender", "userId": "user-mina"}).json()["items"]
    nearby = client.get("/api/setlogs", params={"filter": "nearby", "userId": "user-mina"}).json()["items"]
    meal = client.get("/api/setlogs", params={"filter": "meal", "userId": "user-mina"}).json()["items"]
    assert all(item["moderationStatus"] == "approved" for item in all_feed)
    assert "setlog-blocked-001" not in {item["id"] for item in all_feed}
    assert "setlog-friends-jun-001" in {item["id"] for item in friends_feed}
    assert any(item["userId"] == "user-mina" for item in same_gender)
    assert all(item["cityLabel"] == "Seongsu" for item in nearby)
    assert all(item["category"] == "meal" for item in meal)


def test_url_setlog_creation_and_mock_moderation_blocked_exclusion():
    response = client.post(
        "/api/setlogs/from-url",
        json={
            "userId": "user-mina",
            "caption": "blocked test item",
            "category": "daily",
            "visibility": "public",
            "cityLabel": "Seongsu",
            "imageUrl": "https://example.invalid/blocked.jpg",
        },
    )
    assert response.status_code == 201
    item = response.json()["item"]
    assert item["moderationStatus"] == "blocked"
    feed_ids = {entry["id"] for entry in client.get("/api/setlogs", params={"filter": "all", "userId": "user-mina"}).json()["items"]}
    assert item["id"] not in feed_ids


def test_multipart_setlog_creation():
    response = client.post(
        "/api/setlogs",
        data={"userId": "user-mina", "caption": "Uploaded dinner", "category": "meal", "visibility": "public", "cityLabel": "Seongsu"},
        files={"media": ("meal.jpg", b"fake image", "image/jpeg")},
    )
    assert response.status_code == 201
    assert response.json()["item"]["mediaUrl"].startswith("/uploads/setlogs/")


def test_flash_meet_join_and_self_join_error():
    join = client.post("/api/flash-meets/flash-meal-001/join", json={"userId": "user-mina"})
    assert join.status_code == 200
    assert join.json()["chatRoomId"] == "chat-mina-jun"
    self_join = client.post("/api/flash-meets/flash-meal-001/join", json={"userId": "user-jun"})
    assert self_join.status_code == 400
    assert self_join.json()["error"]["code"] == "CANNOT_JOIN_OWN_FLASH_MEET"


def test_chat_message_creation():
    response = client.post("/api/chats/chat-mina-jun/messages", json={"senderId": "user-mina", "text": "I am heading out now."})
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["imageUrl"] is None
    assert item["text"] == "I am heading out now."


def test_mock_ai_group_photo_and_album_query():
    response = client.post(
        "/api/ai/group-photo",
        json={"userId": "user-mina", "sourceSetlogIds": ["setlog-meal-mina-001", "setlog-daily-jun-001"], "prompt": "Friendly neighborhood dinner memory"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["generatedImageUrl"] == "/uploads/seed/generated-demo.jpg"
    album = client.get("/api/album", params={"userId": "user-mina"}).json()["items"]
    assert body["id"] in {item["id"] for item in album}


def test_startup_seeding_is_idempotent():
    with Session(engine) as session:
        before = len(session.exec(select(Setlog)).all())
        seed_database(session)
        seed_database(session)
        after = len(session.exec(select(Setlog)).all())
    assert after == before


def test_websocket_reserved_chat_message_error():
    with client.websocket_connect("/ws?userId=user-mina") as websocket:
        websocket.send_json({"type": "chat:message", "payload": {"roomId": "chat-mina-jun", "senderId": "user-mina", "text": "hello"}})
        response = websocket.receive_json()
    assert response["type"] == "error"
    assert response["payload"]["code"] == "CHAT_MESSAGE_WS_RESERVED"


def test_websocket_chat_new_message_broadcast_uses_contract_shape():
    with client.websocket_connect("/ws?userId=user-mina") as websocket:
        websocket.send_json({"type": "chat:join", "payload": {"roomId": "chat-mina-jun"}})
        created = client.post("/api/chats/chat-mina-jun/messages", json={"senderId": "user-jun", "text": "Broadcast test"})
        assert created.status_code == 200
        event = websocket.receive_json()
    assert event["type"] == "chat:new-message"
    assert event["payload"]["roomId"] == "chat-mina-jun"
    assert event["payload"]["message"]["senderId"] == "user-jun"
    assert event["payload"]["message"]["imageUrl"] is None
