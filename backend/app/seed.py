from datetime import datetime, timedelta, timezone

from sqlmodel import Session

from app.models import AlbumItem, ChatMessage, ChatRoom, FlashMeet, FlashMeetStatus, Friendship, Setlog, User
from app.services.media import ensure_upload_dirs


BASE_TIME = datetime(2026, 5, 9, 12, 0, tzinfo=timezone.utc)


def _add_missing(session: Session, model: type, item) -> None:
    # Seed by stable IDs only; never overwrite user-created local data.
    if session.get(model, item.id) is None:
        session.add(item)


def seed_database(session: Session) -> None:
    ensure_upload_dirs()
    users = [
        User(id="user-mina", display_name="Demo User", avatar_url="/uploads/seed/avatar-mina.jpg", gender="female", city_label="Seongsu", bio="After-work dinner and local cafe logs"),
        User(id="user-jun", display_name="Jun", avatar_url="/uploads/seed/avatar-jun.jpg", gender="male", city_label="Seongsu", bio="Walks, meals, and quick meetups"),
        User(id="user-soo", display_name="Minseo", avatar_url="/uploads/seed/avatar-soo.jpg", gender="female", city_label="Seongsu", bio="Neighborhood dinner notes"),
        User(id="user-hana", display_name="Hana", avatar_url="/uploads/seed/avatar-hana.jpg", gender="female", city_label="Hongdae", bio="Daily hobby logs"),
    ]
    for user in users:
        _add_missing(session, User, user)

    setlogs = [
        Setlog(id="setlog-meal-mina-001", user_id="user-mina", media_url="/uploads/seed/meal-mina.jpg", thumbnail_url="/uploads/seed/meal-mina.jpg", caption="Late dinner after work", category="meal", visibility="public", city_label="Seongsu", hour_slot="21:00", created_at=BASE_TIME - timedelta(hours=2), moderation_status="approved"),
        Setlog(id="setlog-daily-jun-001", user_id="user-jun", media_url="/uploads/seed/daily-jun.jpg", thumbnail_url="/uploads/seed/daily-jun.jpg", caption="Evening walk near home", category="daily", visibility="public", city_label="Seongsu", hour_slot="19:00", created_at=BASE_TIME - timedelta(hours=1), moderation_status="approved"),
        Setlog(id="setlog-friends-jun-001", user_id="user-jun", media_url="/uploads/seed/friends-jun.jpg", thumbnail_url="/uploads/seed/friends-jun.jpg", caption="Friend-only cafe table", category="hobby", visibility="friends", city_label="Seongsu", hour_slot="18:00", created_at=BASE_TIME - timedelta(hours=3), moderation_status="approved"),
        Setlog(id="setlog-meal-soo-001", user_id="user-soo", media_url="/uploads/seed/meal-01.jpg", thumbnail_url="/uploads/seed/meal-01.jpg", caption="Dinner after work", category="meal", visibility="public", city_label="Seongsu", hour_slot="20:00", created_at=BASE_TIME - timedelta(hours=4), moderation_status="approved"),
        Setlog(id="setlog-blocked-001", user_id="user-hana", media_url="/uploads/seed/blocked.jpg", thumbnail_url="/uploads/seed/blocked.jpg", caption="blocked seed content", category="daily", visibility="public", city_label="Hongdae", hour_slot="17:00", created_at=BASE_TIME - timedelta(hours=5), moderation_status="blocked"),
    ]
    for setlog in setlogs:
        _add_missing(session, Setlog, setlog)

    for friendship in [
        Friendship(id="friend-user-mina-user-jun", user_id="user-mina", friend_user_id="user-jun"),
        Friendship(id="friend-user-jun-user-mina", user_id="user-jun", friend_user_id="user-mina"),
    ]:
        _add_missing(session, Friendship, friendship)

    for meet in [
        FlashMeet(id="flash-coffee-001", creator_id="user-mina", type="cafe", message="Coffee near Seongsu?", city_label="Seongsu", expires_at=BASE_TIME + timedelta(hours=1), participant_ids=["user-mina"], status=FlashMeetStatus.active),
        FlashMeet(id="flash-meal-001", creator_id="user-jun", type="meal", message="Anyone eating near Seongsu?", city_label="Seongsu", expires_at=BASE_TIME + timedelta(hours=2), participant_ids=["user-jun"], status=FlashMeetStatus.active),
        FlashMeet(id="flash-expired-001", creator_id="user-hana", type="walk", message="Old walk invite", city_label="Hongdae", expires_at=BASE_TIME - timedelta(hours=1), participant_ids=["user-hana"], status=FlashMeetStatus.expired),
    ]:
        _add_missing(session, FlashMeet, meet)

    _add_missing(session, ChatRoom, ChatRoom(id="chat-mina-jun", member_ids=["user-mina", "user-jun"], created_at=BASE_TIME - timedelta(hours=2), updated_at=BASE_TIME - timedelta(minutes=50)))
    for message in [
        ChatMessage(id="msg-mina-jun-001", room_id="chat-mina-jun", sender_id="user-mina", text="Did you eat dinner?", image_url=None, created_at=BASE_TIME - timedelta(hours=1)),
        ChatMessage(id="msg-jun-mina-001", room_id="chat-mina-jun", sender_id="user-jun", text="Want to eat together?", image_url=None, created_at=BASE_TIME - timedelta(minutes=50)),
    ]:
        _add_missing(session, ChatMessage, message)

    _add_missing(session, AlbumItem, AlbumItem(id="album-mina-group-001", owner_user_id="user-mina", member_ids=["user-mina", "user-jun"], source_setlog_ids=["setlog-meal-mina-001", "setlog-daily-jun-001"], image_url="/uploads/seed/generated-demo.jpg", created_at=BASE_TIME))
    session.commit()
