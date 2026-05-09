const DEFAULT_API_BASE_URL = "http://131.186.62.191:3021";
const DEFAULT_TIMEOUT_MS = 4500;
const AI_TIMEOUT_MS = 20000;

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

const toApiAssetUrl = (value: string) => {
  if (!value) return value;
  if (/^(https?:|blob:|data:)/.test(value)) return value;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return value;
};

export type Visibility = "public" | "friends";
export type ModerationStatus = "pending" | "approved" | "blocked";
export type Gender = "female" | "male" | "other";
export type LogTopic = "meal" | "chat" | "walk";
export type RoomTemplate = "meal_room" | "after_work_chat_room" | "neighborhood_walk_room";
export type RoomStatus = "active" | "expired" | "closed";
export type MediaType = "video" | "image";

export type DemoLoginRequest = {
  userId?: string;
  nickname?: string;
  cityLabel?: string;
  gender?: Gender;
};

export type DemoLoginResponse = {
  userId: string;
  nickname: string;
  cityLabel: string;
  gender: Gender;
  token?: string;
};

export type SetlogDto = {
  id: string;
  userId: string;
  mediaType: MediaType;
  thumbnailUrl: string;
  mediaUrl?: string;
  caption: string;
  visibility: Visibility;
  cityLabel: string;
  gender: Gender;
  topic?: LogTopic;
  durationSeconds: 4;
  hourSlot: string;
  createdAt: string;
  moderationStatus: ModerationStatus;
  isFriend: boolean;
};

export type CreateSetlogRequest = {
  [key: string]: unknown;
  userId: string;
  caption: string;
  visibility: Visibility;
  cityLabel?: string;
  gender?: Gender;
  topic?: LogTopic;
  durationSeconds?: 4;
  hourSlot?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  media?: Blob | File;
};

export type RoomDto = {
  id: string;
  creatorId: string;
  template: RoomTemplate;
  title: string;
  message: string;
  cityLabel: string;
  expiresInMinutes: number;
  participantIds: string[];
  status: RoomStatus;
  thumbnailUrl: string;
  createdAt?: string;
};

export type CreateRoomRequest = {
  [key: string]: unknown;
  creatorId?: string;
  userId?: string;
  template: RoomTemplate;
  title?: string;
  message: string;
  cityLabel?: string;
  expiresInMinutes?: number;
  thumbnailUrl?: string;
};

export type ChatMessageDto = {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  createdAt: string;
  setlogId?: string;
  imageUrl?: string;
};

export type ChatThreadDto = {
  id: string;
  title?: string;
  participantIds: string[];
  lastMessage?: ChatMessageDto;
  messages: ChatMessageDto[];
};

export type CreateAiPhotoRequest = {
  [key: string]: unknown;
  userId?: string;
  groupId?: string;
  roomId?: string;
  sourceSetlogIds: string[];
  baseSetlogId: string;
  prompt?: string;
};

export type AiPhotoResponseDto = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed" | "blocked";
  title: string;
  imageUrl: string | null;
  sourceSetlogIds: string[];
  baseSetlogId?: string;
  moderationStatus?: ModerationStatus;
  createdAt: string;
  errorMessage?: string;
};

type RequestOptions = RequestInit & {
  timeoutMs?: number;
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pick = (value: UnknownRecord, ...keys: string[]) => {
  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null) return value[key];
  }
  return undefined;
};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : value === undefined || value === null ? fallback : String(value);

const asOptionalString = (value: unknown) => {
  const text = asString(value);
  return text ? text : undefined;
};

const asNumber = (value: unknown, fallback: number) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : [];

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  const text = asString(value);
  return allowed.includes(text as T) ? (text as T) : fallback;
};

const optionalOneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined => {
  const text = asOptionalString(value);
  return text && allowed.includes(text as T) ? (text as T) : undefined;
};

const duration = (): 4 => 4;

const unwrap = (data: unknown, ...keys: string[]) => {
  if (!isRecord(data)) return data;
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null) return value;
  }
  return data;
};

const normalizeSetlog = (item: unknown): SetlogDto | null => {
  if (!isRecord(item)) return null;

  return {
    id: asString(pick(item, "id", "setlogId", "setlog_id")),
    userId: asString(pick(item, "userId", "user_id", "authorId", "author_id")),
    mediaType: oneOf(pick(item, "mediaType", "media_type"), ["video", "image"], "video"),
    thumbnailUrl: toApiAssetUrl(asString(pick(item, "thumbnailUrl", "thumbnail_url", "thumbnail", "imageUrl", "image_url"))),
    mediaUrl: asOptionalString(pick(item, "mediaUrl", "media_url", "videoUrl", "video_url"))
      ? toApiAssetUrl(asString(pick(item, "mediaUrl", "media_url", "videoUrl", "video_url")))
      : undefined,
    caption: asString(pick(item, "caption", "text", "message")),
    visibility: oneOf(pick(item, "visibility", "scope"), ["public", "friends"], "public"),
    cityLabel: asString(pick(item, "cityLabel", "city_label", "neighborhood", "locationLabel", "location_label")),
    gender: oneOf(pick(item, "gender"), ["female", "male", "other"], "other"),
    topic: optionalOneOf(pick(item, "topic", "logTopic", "log_topic", "category"), ["meal", "chat", "walk"]),
    durationSeconds: duration(),
    hourSlot: asString(pick(item, "hourSlot", "hour_slot", "timeSlot", "time_slot")),
    createdAt: asString(pick(item, "createdAt", "created_at", "timestamp"), new Date().toISOString()),
    moderationStatus: oneOf(
      pick(item, "moderationStatus", "moderation_status", "status"),
      ["pending", "approved", "blocked"],
      "approved"
    ),
    isFriend: Boolean(pick(item, "isFriend", "is_friend"))
  };
};

const normalizeRoom = (item: unknown): RoomDto | null => {
  if (!isRecord(item)) return null;
  const type = asString(pick(item, "type"));
  const template =
    type === "walk"
      ? "neighborhood_walk_room"
      : type === "cafe" || type === "call"
        ? "after_work_chat_room"
        : type === "meal"
          ? "meal_room"
          : oneOf(
              pick(item, "template", "roomTemplate", "room_template"),
              ["meal_room", "after_work_chat_room", "neighborhood_walk_room"],
              "meal_room"
            );
  const expiresAt = asOptionalString(pick(item, "expiresAt", "expires_at"));
  const fallbackMinutes = expiresAt
    ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000))
    : 60;

  return {
    id: asString(pick(item, "id", "roomId", "room_id", "flashMeetId", "flash_meet_id")),
    creatorId: asString(pick(item, "creatorId", "creator_id", "userId", "user_id")),
    template,
    title: asString(pick(item, "title", "name")),
    message: asString(pick(item, "message", "caption", "description")),
    cityLabel: asString(pick(item, "cityLabel", "city_label", "neighborhood", "locationLabel", "location_label")),
    expiresInMinutes: asNumber(pick(item, "expiresInMinutes", "expires_in_minutes", "ttlMinutes", "ttl_minutes"), fallbackMinutes),
    participantIds: asStringArray(pick(item, "participantIds", "participant_ids", "participants")),
    status: oneOf(pick(item, "status"), ["active", "expired", "closed"], "active"),
    thumbnailUrl: toApiAssetUrl(asString(pick(item, "thumbnailUrl", "thumbnail_url", "thumbnail", "imageUrl", "image_url"))),
    createdAt: asOptionalString(pick(item, "createdAt", "created_at"))
  };
};

const normalizeChatMessage = (item: unknown): ChatMessageDto | null => {
  if (!isRecord(item)) return null;

  return {
    id: asString(pick(item, "id", "messageId", "message_id")),
    roomId: asString(pick(item, "roomId", "room_id", "chatId", "chat_id")),
    senderId: asString(pick(item, "senderId", "sender_id", "userId", "user_id")),
    text: asString(pick(item, "text", "message", "body")),
    createdAt: asString(pick(item, "createdAt", "created_at", "timestamp")),
    setlogId: asOptionalString(pick(item, "setlogId", "setlog_id")),
    imageUrl: asOptionalString(pick(item, "imageUrl", "image_url"))
      ? toApiAssetUrl(asString(pick(item, "imageUrl", "image_url")))
      : undefined
  };
};

const normalizeChatThread = (item: unknown): ChatThreadDto | null => {
  if (!isRecord(item)) return null;
  const messages = normalizeArray(pick(item, "messages", "items"), normalizeChatMessage);
  const lastMessage = normalizeChatMessage(pick(item, "lastMessage", "last_message", "latestMessage", "latest_message")) ?? undefined;

  return {
    id: asString(pick(item, "id", "roomId", "room_id", "chatId", "chat_id")),
    title: asOptionalString(pick(item, "title", "name")),
    participantIds: asStringArray(pick(item, "participantIds", "participant_ids", "participants", "memberIds", "member_ids")),
    lastMessage,
    messages: messages.length > 0 ? messages : lastMessage ? [lastMessage] : []
  };
};

const normalizeAiPhoto = (item: unknown): AiPhotoResponseDto | null => {
  if (!isRecord(item)) return null;

  return {
    id: asString(pick(item, "id", "photoId", "photo_id", "albumItemId", "album_item_id")),
    status: oneOf(pick(item, "status", "generationStatus", "generation_status"), ["pending", "processing", "completed", "failed", "blocked"], "completed"),
    title: asString(pick(item, "title", "name"), "다인가구 함께한 사진"),
    imageUrl: asString(pick(item, "imageUrl", "image_url", "generatedImageUrl", "generated_image_url", "url"))
      ? toApiAssetUrl(asString(pick(item, "imageUrl", "image_url", "generatedImageUrl", "generated_image_url", "url")))
      : null,
    sourceSetlogIds: asStringArray(pick(item, "sourceSetlogIds", "source_setlog_ids", "setlogIds", "setlog_ids")),
    baseSetlogId: asOptionalString(pick(item, "baseSetlogId", "base_setlog_id")),
    moderationStatus: oneOf<ModerationStatus>(
      pick(item, "moderationStatus", "moderation_status"),
      ["pending", "approved", "blocked"],
      "approved"
    ),
    createdAt: asString(pick(item, "createdAt", "created_at"), new Date().toISOString()),
    errorMessage: asOptionalString(pick(item, "errorMessage", "error_message", "error"))
  };
};

const normalizeLogin = (item: unknown): DemoLoginResponse | null => {
  const value = unwrap(item, "user", "data");
  if (!isRecord(value)) return null;

  return {
    userId: asString(pick(value, "userId", "user_id", "id")),
    nickname: asString(pick(value, "nickname", "name", "displayName", "display_name")),
    cityLabel: asString(pick(value, "cityLabel", "city_label", "neighborhood")),
    gender: oneOf(pick(value, "gender"), ["female", "male", "other"], "other"),
    token: asOptionalString(pick(value, "token", "accessToken", "access_token"))
  };
};

function normalizeArray<T>(data: unknown, normalize: (item: unknown) => T | null): T[] {
  const value = unwrap(data, "items", "data", "results", "setlogs", "rooms", "chats", "messages");
  const items = Array.isArray(value) ? value : [];
  return items.map(normalize).filter((item): item is T => item !== null);
}

export const normalizeSetlogs = (data: unknown): SetlogDto[] => normalizeArray(data, normalizeSetlog);
export const normalizeRooms = (data: unknown): RoomDto[] => normalizeArray(data, normalizeRoom);
export const normalizeMessages = (data: unknown): ChatMessageDto[] => {
  const threads = normalizeArray(data, normalizeChatThread).filter((thread) => thread.messages.length > 0);
  if (threads.length > 0) return threads.flatMap((thread) => thread.messages);

  const messages = normalizeArray(data, normalizeChatMessage);
  if (messages.length > 0) return messages;

  return [];
};
export const normalizeChatThreads = (data: unknown): ChatThreadDto[] => normalizeArray(data, normalizeChatThread);

async function requestJson<T>(
  path: string,
  options: RequestOptions,
  normalize: (data: unknown) => T | null
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers);

  if (!isFormData && options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("Content-Type") ?? "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();
    return normalize(data);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

const jsonBody = (payload: unknown) => JSON.stringify(payload);

export function buildSetlogUploadFormData(payload: CreateSetlogRequest): FormData {
  const formData = new FormData();
  const category = payload.topic ?? payload.category;

  for (const [key, value] of Object.entries(payload)) {
    if (key === "topic" || key === "durationSeconds" || key === "moderationProvider") continue;
    if (value === undefined || value === null) continue;
    if (key === "media" && value instanceof Blob) {
      formData.append("media", value);
      continue;
    }
    formData.append(key, String(value));
  }
  if (category) formData.set("category", String(category));

  return formData;
}

export const api = {
  login: (userIdOrPayload: string | DemoLoginRequest) => {
    const payload = typeof userIdOrPayload === "string" ? { userId: userIdOrPayload } : userIdOrPayload;

    return requestJson<DemoLoginResponse>(
      "/api/auth/demo-login",
      {
        method: "POST",
        body: jsonBody(payload)
      },
      normalizeLogin
    );
  },

  getSetlogs: (filter: string, userId: string) =>
    requestJson<SetlogDto[]>(
      `/api/setlogs?filter=${encodeURIComponent(filter)}&userId=${encodeURIComponent(userId)}`,
      {},
      (data) => normalizeArray(data, normalizeSetlog)
    ),

  createSetlog: (payload: CreateSetlogRequest | FormData) =>
    requestJson<SetlogDto>(
      "/api/setlogs",
      {
        method: "POST",
        body: payload instanceof FormData ? payload : jsonBody(payload),
        timeoutMs: 9000
      },
      (data) => normalizeSetlog(unwrap(data, "item", "setlog", "data"))
    ),

  createSetlogFormData: (payload: CreateSetlogRequest) =>
    api.createSetlog(buildSetlogUploadFormData(payload)),

  getRooms: (userId: string) =>
    requestJson<RoomDto[]>(
      `/api/flash-meets?userId=${encodeURIComponent(userId)}`,
      {},
      (data) => normalizeArray(data, normalizeRoom)
    ),

  createRoom: (payload: CreateRoomRequest) =>
    requestJson<RoomDto>(
      "/api/flash-meets",
      {
        method: "POST",
        body: jsonBody({
          creatorId: payload.creatorId ?? payload.userId,
          type:
            payload.template === "neighborhood_walk_room"
              ? "walk"
              : payload.template === "after_work_chat_room"
                ? "cafe"
                : "meal",
          message: payload.message,
          cityLabel: payload.cityLabel,
          expiresInHours: Math.max(1, Math.min(3, Math.ceil((Number(payload.expiresInMinutes) || 60) / 60)))
        })
      },
      (data) => normalizeRoom(unwrap(data, "item", "room", "flashMeet", "flash_meet", "data"))
    ),

  joinRoom: (roomId: string, userId: string) =>
    requestJson<RoomDto>(
      `/api/flash-meets/${encodeURIComponent(roomId)}/join`,
      {
        method: "POST",
        body: jsonBody({ userId })
      },
      (data) => normalizeRoom(unwrap(data, "room", "flashMeet", "flash_meet", "data"))
    ),

  addFriend: (targetUserId: string, userId: string) =>
    requestJson<{ ok: true }>(
      `/api/friends/${encodeURIComponent(targetUserId)}`,
      {
        method: "POST",
        body: jsonBody({ userId })
      },
      () => ({ ok: true })
    ),

  getChats: (userId: string) =>
    requestJson<ChatThreadDto[]>(
      `/api/chats?userId=${encodeURIComponent(userId)}`,
      {},
      (data) => {
        const list = normalizeArray(data, normalizeChatThread);
        if (list.length > 0) return list;
        const messages = normalizeArray(data, normalizeChatMessage);
        return messages.length > 0
          ? [{ id: "default", participantIds: [userId], messages, lastMessage: messages[messages.length - 1] }]
          : [];
      }
    ),

  getAlbum: (userId: string) =>
    requestJson<AiPhotoResponseDto[]>(
      `/api/album?userId=${encodeURIComponent(userId)}`,
      {},
      (data) => normalizeArray(data, normalizeAiPhoto)
    ),

  createAiPhoto: (payload: CreateAiPhotoRequest) =>
    requestJson<AiPhotoResponseDto>(
      "/api/ai/group-photo",
      {
        method: "POST",
        body: jsonBody({
          userId: payload.userId,
          sourceSetlogIds: payload.sourceSetlogIds,
          baseSetlogId: payload.baseSetlogId,
          prompt: payload.prompt ?? "각자의 로그 순간을 한 장소에서 함께 찍은 자연스러운 사진처럼 만들어줘"
        }),
        timeoutMs: AI_TIMEOUT_MS
      },
      (data) => normalizeAiPhoto(unwrap(data, "photo", "albumItem", "album_item", "data"))
    )
};
