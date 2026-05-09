from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import FlashMeetStatus, FlashMeetType, Gender, MediaType, ModerationStatus, SetlogCategory, Visibility


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class ErrorBody(CamelModel):
    code: str
    message: str


class ErrorResponse(CamelModel):
    error: ErrorBody


class UserOut(CamelModel):
    id: str
    display_name: str
    avatar_url: str
    gender: Gender
    city_label: str
    bio: str = ""


class UsersResponse(CamelModel):
    items: list[UserOut]


class DemoLoginRequest(CamelModel):
    user_id: str


class DemoLoginResponse(CamelModel):
    token: str
    user: UserOut


class SetlogOut(CamelModel):
    id: str
    user_id: str
    user_name: str | None = None
    avatar_url: str | None = None
    media_type: MediaType
    media_url: str
    thumbnail_url: str
    caption: str
    category: SetlogCategory
    visibility: Visibility
    city_label: str
    gender: Gender | None = None
    hour_slot: str
    created_at: datetime
    moderation_status: ModerationStatus
    is_friend: bool | None = None


class SetlogsResponse(CamelModel):
    items: list[SetlogOut]


class SetlogCreateResponse(CamelModel):
    item: SetlogOut


class SetlogFromUrlRequest(CamelModel):
    user_id: str
    caption: str
    category: SetlogCategory
    visibility: Visibility
    city_label: str
    image_url: str


class FlashMeetOut(CamelModel):
    id: str
    creator_id: str
    creator_name: str | None = None
    type: FlashMeetType
    template: str | None = None
    title: str | None = None
    message: str
    city_label: str
    expires_at: datetime
    expires_in_minutes: int | None = None
    participant_ids: list[str]
    status: FlashMeetStatus
    thumbnail_url: str | None = None


class FlashMeetsResponse(CamelModel):
    items: list[FlashMeetOut]


class FlashMeetCreateRequest(CamelModel):
    creator_id: str
    type: FlashMeetType
    message: str
    city_label: str
    expires_in_hours: int = Field(ge=1, le=3)


class FlashMeetCreateResponse(CamelModel):
    item: FlashMeetOut


class FlashMeetJoinRequest(CamelModel):
    user_id: str


class FlashMeetJoinResponse(CamelModel):
    chat_room_id: str
    flash_meet: FlashMeetOut


class FriendRequest(CamelModel):
    user_id: str


class FriendshipOut(CamelModel):
    user_id: str
    friend_user_id: str


class FriendResponse(CamelModel):
    ok: bool
    friendship: FriendshipOut


class ChatMemberOut(CamelModel):
    id: str
    display_name: str
    avatar_url: str


class ChatMessageOut(CamelModel):
    id: str
    room_id: str
    sender_id: str
    text: str
    image_url: str | None
    created_at: datetime


class ChatRoomOut(CamelModel):
    id: str
    member_ids: list[str]
    members: list[ChatMemberOut]
    latest_message: ChatMessageOut | None
    created_at: datetime
    updated_at: datetime


class ChatsResponse(CamelModel):
    items: list[ChatRoomOut]


class ChatMessagesResponse(CamelModel):
    items: list[ChatMessageOut]


class ChatMessageCreateRequest(CamelModel):
    sender_id: str
    text: str


class ChatMessageCreateResponse(CamelModel):
    item: ChatMessageOut


class AlbumItemOut(CamelModel):
    id: str
    owner_user_id: str
    member_ids: list[str]
    source_setlog_ids: list[str]
    image_url: str
    type: Literal["ai_group_photo"]
    created_at: datetime


class AlbumResponse(CamelModel):
    items: list[AlbumItemOut]


class GroupPhotoRequest(CamelModel):
    user_id: str
    source_setlog_ids: list[str]
    prompt: str


class GroupPhotoResponse(CamelModel):
    id: str
    generated_image_url: str
    status: ModerationStatus
    source_setlog_ids: list[str]
    album_item: AlbumItemOut
