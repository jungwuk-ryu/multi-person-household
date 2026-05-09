from datetime import datetime, timedelta, timezone

from sqlmodel import Session

from app.models import AlbumItem, ChatMessage, ChatRoom, FlashMeet, FlashMeetStatus, Friendship, MediaType, ModerationStatus, Setlog, User
from app.services.media import ensure_upload_dirs


BASE_TIME = datetime(2026, 5, 9, 12, 0, tzinfo=timezone.utc)

LEGACY_SEED_IDS = {
    User: ["user-mina", "user-jun", "user-soo", "user-hana"],
    Setlog: ["setlog-meal-mina-001", "setlog-daily-jun-001", "setlog-friends-jun-001", "setlog-meal-soo-001", "setlog-blocked-001"],
    Friendship: ["friend-user-mina-user-jun", "friend-user-jun-user-mina"],
    FlashMeet: ["flash-coffee-001", "flash-meal-001", "flash-expired-001"],
    ChatRoom: ["chat-mina-jun"],
    ChatMessage: ["msg-mina-jun-001", "msg-jun-mina-001"],
    AlbumItem: ["album-mina-group-001"],
}


def _remove_legacy_seed(session: Session) -> None:
    for model, ids in LEGACY_SEED_IDS.items():
        for item_id in ids:
            item = session.get(model, item_id)
            if item is not None:
                session.delete(item)


def _upsert_seed(session: Session, model: type, item) -> None:
    existing = session.get(model, item.id)
    if existing is None:
        session.add(item)
        return
    for key in type(item).model_fields:
        setattr(existing, key, getattr(item, key))
    session.add(existing)


def seed_database(session: Session) -> None:
    ensure_upload_dirs()
    _remove_legacy_seed(session)
    now = datetime.now(timezone.utc)

    users = [
        User(id="u_01", display_name="성수 지은", avatar_url="/uploads/seed/selfie-woman.webp", gender="female", city_label="성수", bio="퇴근 후 혼밥을 덜 조용하게 만들고 싶은 사람"),
        User(id="u_02", display_name="저녁밥 민서", avatar_url="/uploads/seed/dog.webp", gender="female", city_label="성수", bio="저녁 8시 이후 짧은 수다 환영"),
        User(id="u_03", display_name="뚝섬 산책러", avatar_url="/uploads/seed/seoul-landscape.webp", gender="male", city_label="뚝섬", bio="밥 먹고 20분 걷기"),
        User(id="u_04", display_name="퇴근후 나은", avatar_url="/uploads/seed/selfie-woman-alt.webp", gender="female", city_label="성수", bio="혼밥 로그를 매일 남겨요"),
    ]
    for user in users:
        _upsert_seed(session, User, user)

    setlogs = [
        Setlog(id="s_01", user_id="u_02", media_type=MediaType.video, media_url="/uploads/seed/IMG_9563.mp4", thumbnail_url="/uploads/seed/IMG_9563.jpg", caption="집에서 토끼옷 입고 혼자 춤추는 중ㅋㅋ", category="chat", visibility="public", city_label="성수", hour_slot="20:00", created_at=BASE_TIME - timedelta(minutes=60), moderation_status=ModerationStatus.approved),
        Setlog(id="s_02", user_id="u_04", media_type=MediaType.video, media_url="/uploads/seed/IMG_9183.mp4", thumbnail_url="/uploads/seed/IMG_9183.jpg", caption="모래언덕에서 ATV 타니까 속이 뻥 뚫린다", category="walk", visibility="public", city_label="성수", hour_slot="20:00", created_at=BASE_TIME - timedelta(minutes=57), moderation_status=ModerationStatus.approved),
        Setlog(id="s_03", user_id="u_03", media_type=MediaType.video, media_url="/uploads/seed/IMG_8211.mp4", thumbnail_url="/uploads/seed/IMG_8211.jpg", caption="예쁜 칵테일 한 잔으로 오늘 마무리", category="chat", visibility="public", city_label="뚝섬", hour_slot="20:00", created_at=BASE_TIME - timedelta(minutes=53), moderation_status=ModerationStatus.approved),
        Setlog(id="s_04", user_id="u_01", media_type=MediaType.video, media_url="/uploads/seed/IMG_9255.mp4", thumbnail_url="/uploads/seed/IMG_9255.jpg", caption="빨간 등대 보면서 바람 쐬는 중", category="walk", visibility="friends", city_label="성수", hour_slot="19:00", created_at=BASE_TIME - timedelta(minutes=98), moderation_status=ModerationStatus.approved),
        Setlog(id="s_05", user_id="u_02", media_type=MediaType.video, media_url="/uploads/seed/IMG_4444.mp4", thumbnail_url="/uploads/seed/IMG_4444.jpg", caption="숯불에 고기 굽는 냄새 미쳤다... 같이 먹을 사람", category="meal", visibility="public", city_label="성수", hour_slot="20:00", created_at=BASE_TIME - timedelta(minutes=48), moderation_status=ModerationStatus.approved),
        Setlog(id="s_blocked_01", user_id="u_04", media_type=MediaType.image, media_url="/uploads/seed/IMG_8211.jpg", thumbnail_url="/uploads/seed/IMG_8211.jpg", caption="blocked seed content", category="chat", visibility="public", city_label="성수", hour_slot="17:00", created_at=BASE_TIME - timedelta(hours=5), moderation_status=ModerationStatus.blocked),
    ]
    for setlog in setlogs:
        _upsert_seed(session, Setlog, setlog)

    for friendship in [
        Friendship(id="friend-u_01-u_02", user_id="u_01", friend_user_id="u_02"),
        Friendship(id="friend-u_02-u_01", user_id="u_02", friend_user_id="u_01"),
        Friendship(id="friend-u_01-u_04", user_id="u_01", friend_user_id="u_04"),
        Friendship(id="friend-u_04-u_01", user_id="u_04", friend_user_id="u_01"),
    ]:
        _upsert_seed(session, Friendship, friendship)

    for meet in [
        FlashMeet(id="r_01", creator_id="u_04", type="meal", message="이따 저녁 같이 먹을 사람!!! 성수 근처면 바로 ㄱㄱ", city_label="성수", expires_at=now + timedelta(minutes=42), participant_ids=["u_04", "u_02", "u_01"], status=FlashMeetStatus.active),
        FlashMeet(id="r_02", creator_id="u_02", type="cafe", message="퇴근했는데 집 가기 아쉬운 사람? 카페에서 수다 ㄱ", city_label="성수", expires_at=now + timedelta(minutes=74), participant_ids=["u_02", "u_04"], status=FlashMeetStatus.active),
        FlashMeet(id="r_03", creator_id="u_03", type="walk", message="뚝섬 산책 갈 사람 있음?? 20분만 걷자", city_label="뚝섬", expires_at=now + timedelta(minutes=31), participant_ids=["u_03", "u_01"], status=FlashMeetStatus.active),
    ]:
        _upsert_seed(session, FlashMeet, meet)

    for room in [
        ChatRoom(id="c_01", member_ids=["u_01", "u_02"], created_at=BASE_TIME - timedelta(hours=2), updated_at=BASE_TIME - timedelta(minutes=50)),
        ChatRoom(id="c_02", member_ids=["u_01", "u_04"], created_at=BASE_TIME - timedelta(hours=1), updated_at=BASE_TIME - timedelta(minutes=28)),
    ]:
        _upsert_seed(session, ChatRoom, room)

    for message in [
        ChatMessage(id="m_01", room_id="c_01", sender_id="u_02", text="오늘 로그 봤어요. 저녁 아직이면 혼밥방 들어와요.", image_url=None, created_at=BASE_TIME - timedelta(minutes=49)),
        ChatMessage(id="m_02", room_id="c_01", sender_id="u_01", text="좋아요. 저는 성수 쪽이에요.", image_url=None, created_at=BASE_TIME - timedelta(minutes=48)),
        ChatMessage(id="m_03", room_id="c_02", sender_id="u_04", text="등대 로그 좋다. 다음엔 같이 바람 쐬러 가요.", image_url=None, created_at=BASE_TIME - timedelta(minutes=27)),
    ]:
        _upsert_seed(session, ChatMessage, message)

    _upsert_seed(session, AlbumItem, AlbumItem(id="a_01", owner_user_id="u_01", member_ids=["u_01", "u_02", "u_04"], source_setlog_ids=["s_01", "s_04", "s_05"], image_url="/uploads/seed/generated-demo.jpg", created_at=BASE_TIME))
    session.commit()
