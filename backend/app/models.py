from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Gender(str, Enum):
    female = "female"
    male = "male"
    other = "other"


class Visibility(str, Enum):
    public = "public"
    friends = "friends"


class ModerationStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    blocked = "blocked"


class MediaType(str, Enum):
    image = "image"
    video = "video"


class SetlogCategory(str, Enum):
    meal = "meal"
    chat = "chat"
    walk = "walk"
    daily = "daily"
    exercise = "exercise"
    hobby = "hobby"
    other = "other"


class FlashMeetType(str, Enum):
    meal = "meal"
    cafe = "cafe"
    walk = "walk"
    call = "call"


class FlashMeetStatus(str, Enum):
    active = "active"
    expired = "expired"
    closed = "closed"


class User(SQLModel, table=True):
    id: str = Field(primary_key=True)
    display_name: str
    avatar_url: str
    gender: Gender
    city_label: str
    bio: str = ""


class Setlog(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    media_type: MediaType = MediaType.image
    media_url: str
    thumbnail_url: str
    caption: str
    category: SetlogCategory
    visibility: Visibility
    city_label: str
    hour_slot: str
    created_at: datetime = Field(default_factory=utc_now, index=True)
    moderation_status: ModerationStatus = Field(default=ModerationStatus.approved, index=True)


class Friendship(SQLModel, table=True):
    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    friend_user_id: str = Field(foreign_key="user.id", index=True)


class FlashMeet(SQLModel, table=True):
    id: str = Field(primary_key=True)
    creator_id: str = Field(foreign_key="user.id", index=True)
    type: FlashMeetType
    message: str
    city_label: str
    expires_at: datetime = Field(index=True)
    participant_ids: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    status: FlashMeetStatus = Field(default=FlashMeetStatus.active, index=True)


class ChatRoom(SQLModel, table=True):
    id: str = Field(primary_key=True)
    member_ids: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ChatMessage(SQLModel, table=True):
    id: str = Field(primary_key=True)
    room_id: str = Field(foreign_key="chatroom.id", index=True)
    sender_id: str = Field(foreign_key="user.id", index=True)
    text: str
    image_url: str | None = None
    created_at: datetime = Field(default_factory=utc_now, index=True)


class AlbumItem(SQLModel, table=True):
    id: str = Field(primary_key=True)
    owner_user_id: str = Field(foreign_key="user.id", index=True)
    member_ids: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    source_setlog_ids: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    image_url: str
    type: str = "ai_group_photo"
    created_at: datetime = Field(default_factory=utc_now, index=True)
