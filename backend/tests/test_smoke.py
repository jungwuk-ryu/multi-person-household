import base64
import os
from pathlib import Path
from types import SimpleNamespace

os.environ["GEMINI_API_KEY"] = ""
os.environ["MOCK_AI"] = "true"

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.config import get_settings
from app.database import engine
from app.database import create_db_and_tables
from app.main import app
from app.models import Setlog
from app.services.image_generation import DEMO_GENERATED_ASSET_URL, GroupPhotoSource, ImageGenerationService
from app.services.media import media_path_from_url
from app.seed import seed_database


with Session(engine) as session:
    create_db_and_tables()
    seed_database(session)

client = TestClient(app)
SEED_UPLOAD_DIR = Path(__file__).resolve().parents[1] / "app" / "uploads" / "seed"


def test_health_check():
    assert client.get("/health").json() == {"status": "ok"}


def test_demo_login():
    response = client.post("/api/auth/demo-login", json={"userId": "u_01"})
    assert response.status_code == 200
    body = response.json()
    assert body["token"] == "demo-u_01"
    assert body["user"]["id"] == "u_01"


def test_setlog_filters_and_blocked_seed_exclusion():
    all_feed = client.get("/api/setlogs", params={"filter": "all", "userId": "u_01"}).json()["items"]
    friends_feed = client.get("/api/setlogs", params={"filter": "friends", "userId": "u_01"}).json()["items"]
    same_gender = client.get("/api/setlogs", params={"filter": "sameGender", "userId": "u_01"}).json()["items"]
    opposite_gender = client.get("/api/setlogs", params={"filter": "oppositeGender", "userId": "u_01"}).json()["items"]
    nearby = client.get("/api/setlogs", params={"filter": "nearby", "userId": "u_01"}).json()["items"]
    meal = client.get("/api/setlogs", params={"filter": "meal", "userId": "u_01"}).json()["items"]
    assert all(item["moderationStatus"] == "approved" for item in all_feed)
    assert "s_blocked_01" not in {item["id"] for item in all_feed}
    assert "s_04" in {item["id"] for item in friends_feed}
    assert all(item["gender"] == "female" for item in same_gender)
    assert all(item["gender"] == "male" for item in opposite_gender)
    assert all(item["cityLabel"] == "성수" for item in nearby)
    assert all(item["category"] == "meal" for item in meal)


def test_url_setlog_creation_and_mock_moderation_blocked_exclusion():
    with Session(engine) as session:
        before_count = len(session.exec(select(Setlog)).all())
    response = client.post(
        "/api/setlogs/from-url",
        json={
            "userId": "u_01",
            "caption": "blocked test item",
            "category": "chat",
            "visibility": "public",
            "cityLabel": "성수",
            "imageUrl": "https://example.invalid/blocked.jpg",
        },
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SETLOG_REJECTED"
    with Session(engine) as session:
        after_count = len(session.exec(select(Setlog)).all())
    assert after_count == before_count


def test_multipart_setlog_creation():
    image_bytes = (SEED_UPLOAD_DIR / "IMG_9563.jpg").read_bytes()
    response = client.post(
        "/api/setlogs",
        data={"userId": "u_01", "caption": "Uploaded dinner", "category": "meal", "visibility": "public", "cityLabel": "성수"},
        files={"media": ("meal.jpg", image_bytes, "image/jpeg")},
    )
    assert response.status_code == 201
    assert response.json()["item"]["mediaUrl"].startswith("/uploads/setlogs/")


def test_multipart_webm_with_codec_parameter_is_accepted():
    video_bytes = (SEED_UPLOAD_DIR / "IMG_9563.mp4").read_bytes()
    response = client.post(
        "/api/setlogs",
        data={"userId": "u_01", "caption": "Uploaded video", "category": "daily", "visibility": "public", "cityLabel": "성수"},
        files={"media": ("clip.webm", video_bytes, "video/webm;codecs=vp9")},
    )
    assert response.status_code == 201
    item = response.json()["item"]
    assert item["mediaType"] == "video"
    assert item["mediaUrl"].endswith(".webm")


def test_caption_suggestion_fallback_without_gemini_key():
    response = client.post(
        "/api/setlogs/caption-suggestion",
        files={"image": ("thumb.jpg", b"fake image", "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["safetyStatus"] == "approved"
    assert body["suggestedCaption"]


def test_multipart_setlog_blocked_caption_is_rejected():
    image_bytes = (SEED_UPLOAD_DIR / "IMG_9563.jpg").read_bytes()
    with Session(engine) as session:
        before_count = len(session.exec(select(Setlog)).all())
    response = client.post(
        "/api/setlogs",
        data={"userId": "u_01", "caption": "blocked upload", "category": "meal", "visibility": "public", "cityLabel": "성수"},
        files={"media": ("blocked.jpg", image_bytes, "image/jpeg")},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SETLOG_REJECTED"
    with Session(engine) as session:
        after_count = len(session.exec(select(Setlog)).all())
    assert after_count == before_count


def test_setlog_like_count_increments_and_decrements():
    before = client.get("/api/setlogs", params={"filter": "all", "userId": "u_01"}).json()["items"]
    item = next(entry for entry in before if entry["id"] == "s_01")
    like_count = item["likeCount"]

    liked = client.post("/api/setlogs/s_01/like", json={"liked": True})
    assert liked.status_code == 200
    assert liked.json()["likeCount"] == like_count + 1

    unliked = client.post("/api/setlogs/s_01/like", json={"liked": False})
    assert unliked.status_code == 200
    assert unliked.json()["likeCount"] == like_count


def test_flash_meet_create_preserves_selected_participants():
    response = client.post(
        "/api/flash-meets",
        json={
            "creatorId": "u_01",
            "type": "meal",
            "message": "친구들이랑 저녁 로그 남길 사람",
            "cityLabel": "성수",
            "expiresInHours": 1,
            "participantIds": ["u_02", "u_04", "u_02"],
        },
    )
    assert response.status_code == 200
    assert response.json()["item"]["participantIds"] == ["u_01", "u_02", "u_04"]


def test_flash_meet_other_type_maps_to_other_room():
    response = client.post(
        "/api/flash-meets",
        json={
            "creatorId": "u_01",
            "type": "other",
            "message": "아무 얘기나 할 사람",
            "cityLabel": "성수",
            "expiresInHours": 1,
            "participantIds": [],
        },
    )
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["type"] == "other"
    assert item["template"] == "other_room"
    assert item["title"] == "기타"


def test_flash_meet_join_and_self_join_error():
    join = client.post("/api/flash-meets/r_01/join", json={"userId": "u_01"})
    assert join.status_code == 200
    assert join.json()["chatRoomId"] == "c_02"
    self_join = client.post("/api/flash-meets/r_01/join", json={"userId": "u_04"})
    assert self_join.status_code == 400
    assert self_join.json()["error"]["code"] == "CANNOT_JOIN_OWN_FLASH_MEET"


def test_chat_message_creation():
    response = client.post("/api/chats/c_01/messages", json={"senderId": "u_01", "text": " I am heading out now. "})
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["imageUrl"] is None
    assert item["text"] == "I am heading out now."


def test_blocked_chat_message_is_silently_rejected():
    before = client.get("/api/chats/c_01/messages").json()["items"]
    response = client.post("/api/chats/c_01/messages", json={"senderId": "u_01", "text": "blocked chat"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "CHAT_MESSAGE_BLOCKED"
    after = client.get("/api/chats/c_01/messages").json()["items"]
    assert len(after) == len(before)
    assert all(message["text"] != "blocked chat" for message in after)


def test_mock_ai_group_photo_generation():
    assert ImageGenerationService().generate_group_photo("Friendly neighborhood dinner memory", []) == DEMO_GENERATED_ASSET_URL


def test_group_photo_uses_base_setlog_id_contract():
    response = client.post(
        "/api/ai/group-photo",
        json={
            "userId": "u_01",
            "sourceSetlogIds": ["s_01", "s_04"],
            "baseSetlogId": "s_04",
            "prompt": "친구들이 한 장소에서 만난 자연스러운 사진",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["generatedImageUrl"] == DEMO_GENERATED_ASSET_URL
    assert body["baseSetlogId"] == "s_04"
    assert body["sourceSetlogIds"] == ["s_01", "s_04"]


def test_group_photo_preview_can_skip_album_persistence():
    response = client.post(
        "/api/ai/group-photo",
        json={
            "userId": "u_01",
            "sourceSetlogIds": ["s_01", "s_04"],
            "baseSetlogId": "s_04",
            "persist": False,
            "prompt": "친구들이 한 장소에서 만난 자연스러운 사진",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["generatedImageUrl"] == DEMO_GENERATED_ASSET_URL
    assert body["albumItem"] is None


def test_mock_ai_memo_photo_generation():
    response = client.post(
        "/api/ai/memo-photo",
        json={
            "userId": "u_01",
            "sourceImageUrl": "/uploads/seed/meal-01.jpg",
            "sourceSetlogIds": ["s_01", "s_04"],
            "baseSetlogId": "s_04",
            "prompt": "흰색 손글씨 메모를 추가해줘",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["generatedImageUrl"] == DEMO_GENERATED_ASSET_URL
    assert body["generatedImageUrl"] != "/uploads/seed/meal-01.jpg"
    assert body["albumItem"]["imageUrl"] == DEMO_GENERATED_ASSET_URL


def test_real_group_photo_uses_selected_setlog_images_and_saves_generated_output(monkeypatch, tmp_path):
    import openai

    class FakeImages:
        def __init__(self):
            self.edit_calls = []
            self.generate_calls = []

        def edit(self, **kwargs):
            self.edit_calls.append(kwargs)
            return SimpleNamespace(data=[SimpleNamespace(b64_json=base64.b64encode(b"group-image").decode("ascii"))])

        def generate(self, **kwargs):
            self.generate_calls.append(kwargs)
            return SimpleNamespace(data=[SimpleNamespace(b64_json=base64.b64encode(b"wrong-image").decode("ascii"))])

    fake_images = FakeImages()

    class FakeOpenAI:
        def __init__(self, *, api_key: str):
            self.api_key = api_key
            self.images = fake_images

    monkeypatch.setattr(openai, "OpenAI", FakeOpenAI)
    monkeypatch.setenv("MOCK_AI", "false")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_IMAGE_PARALLEL_REQUESTS", "1")
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    get_settings.cache_clear()

    try:
        seed_dir = tmp_path / "seed"
        seed_dir.mkdir(parents=True, exist_ok=True)
        (seed_dir / "base.jpg").write_bytes(b"base-image")
        (seed_dir / "friend.jpg").write_bytes(b"friend-image")
        sources = [
            GroupPhotoSource(
                setlog_id="s_friend",
                user_name="친구",
                caption="고기 먹는 중",
                category="meal",
                city_label="성수",
                media_url="/uploads/seed/friend-video.mp4",
                thumbnail_url="/uploads/seed/friend.jpg",
            ),
            GroupPhotoSource(
                setlog_id="s_base",
                user_name="나",
                caption="내 자취방",
                category="chat",
                city_label="성수",
                media_url="/uploads/seed/base-video.mp4",
                thumbnail_url="/uploads/seed/base.jpg",
            ),
        ]
        generated_url = ImageGenerationService().generate_group_photo("한 장소에서 같이 있는 사진", sources, base_setlog_id="s_base")
        generated_path = media_path_from_url(generated_url)

        assert generated_url.startswith("/uploads/generated/group-photo-")
        assert generated_path is not None
        assert generated_path.exists()
        assert generated_path.read_bytes() == b"group-image"
        assert len(fake_images.edit_calls) == 1
        assert fake_images.generate_calls == []
        image_inputs = fake_images.edit_calls[0]["image"]
        assert [item[0] for item in image_inputs] == ["base.jpg", "friend.jpg"]
        assert "provided input images" in fake_images.edit_calls[0]["prompt"]
        assert "first provided input image is the user-selected 기준 장소" in fake_images.edit_calls[0]["prompt"]
        assert "If a source image has no visible person, do not invent or force a person" in fake_images.edit_calls[0]["prompt"]
    finally:
        get_settings.cache_clear()


def test_real_memo_photo_uses_openai_sdk_and_saves_generated_output(monkeypatch, tmp_path):
    import openai

    class FakeImages:
        def __init__(self):
            self.calls = []

        def edit(self, **kwargs):
            self.calls.append(kwargs)
            return SimpleNamespace(data=[SimpleNamespace(b64_json=base64.b64encode(b"memo-image").decode("ascii"))])

    fake_images = FakeImages()

    class FakeOpenAI:
        def __init__(self, *, api_key: str):
            self.api_key = api_key
            self.images = fake_images

    monkeypatch.setattr(openai, "OpenAI", FakeOpenAI)
    monkeypatch.setenv("MOCK_AI", "false")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_IMAGE_PARALLEL_REQUESTS", "1")
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    get_settings.cache_clear()

    try:
        seed_source = tmp_path / "seed" / "meal-01.jpg"
        seed_source.parent.mkdir(parents=True, exist_ok=True)
        seed_source.write_bytes(b"seed-image")
        generated_url = ImageGenerationService().generate_memo_photo("/uploads/seed/meal-01.jpg", "메모 사진으로 바꿔줘")
        generated_path = media_path_from_url(generated_url)

        assert generated_url.startswith("/uploads/generated/group-photo-")
        assert generated_path is not None
        assert generated_path.exists()
        assert generated_path.read_bytes() == b"memo-image"
        assert len(fake_images.calls) == 1
        assert fake_images.calls[0]["model"] == "gpt-image-2"
        assert fake_images.calls[0]["size"] == "1024x1024"
        assert fake_images.calls[0]["n"] == 1
    finally:
        get_settings.cache_clear()


def test_startup_seeding_is_idempotent():
    with Session(engine) as session:
        before = len(session.exec(select(Setlog)).all())
        seed_database(session)
        seed_database(session)
        after = len(session.exec(select(Setlog)).all())
    assert after == before


def test_websocket_reserved_chat_message_error():
    with client.websocket_connect("/ws?userId=u_01") as websocket:
        websocket.send_json({"type": "chat:message", "payload": {"roomId": "c_01", "senderId": "u_01", "text": "hello"}})
        response = websocket.receive_json()
    assert response["type"] == "error"
    assert response["payload"]["code"] == "CHAT_MESSAGE_WS_RESERVED"


def test_websocket_chat_new_message_broadcast_uses_contract_shape():
    with client.websocket_connect("/ws?userId=u_01") as websocket:
        websocket.send_json({"type": "chat:join", "payload": {"roomId": "c_01"}})
        created = client.post("/api/chats/c_01/messages", json={"senderId": "u_02", "text": "Broadcast test"})
        assert created.status_code == 200
        event = websocket.receive_json()
    assert event["type"] == "chat:new-message"
    assert event["payload"]["roomId"] == "c_01"
    assert event["payload"]["message"]["senderId"] == "u_02"
    assert event["payload"]["message"]["imageUrl"] is None
