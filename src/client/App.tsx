import {
  Bell,
  Camera,
  ChevronRight,
  Clock3,
  Flag,
  Heart,
  Home,
  ImagePlus,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  Utensils,
  Wand2,
  Wind,
  X
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api/client";
import brandLogo from "./assets/brand/daingagu-logo.webp";
import dogProfile from "./assets/profiles/dog.webp";
import seoulLandscapeProfile from "./assets/profiles/seoul-landscape.webp";
import selfieWomanProfile from "./assets/profiles/selfie-woman.webp";
import selfieWomanAltProfile from "./assets/profiles/selfie-woman-alt.webp";

type Tab = "feed" | "rooms" | "capture" | "connections" | "more";
type Filter = "all" | "friends" | "sameGender" | "oppositeGender" | "nearby";
type ConnectionMode = "friends" | "groups";
type ConnectionTarget = { type: "friend"; id: string } | { type: "group"; id: string };
type LogTopic = "meal" | "chat" | "walk";
type TopicFilter = "all" | LogTopic;
type Visibility = "public" | "friends";
type ModerationStatus = "pending" | "approved" | "blocked";
type RoomTemplate = "meal_room" | "after_work_chat_room" | "neighborhood_walk_room" | "other_room";
type RoomFilter = "all" | RoomTemplate;
type MoreAction = "profile" | "neighborhood" | "feed" | "notifications" | "reports" | "support";
type AiStyle = "default" | "memo" | "3d";
type AiGenerationState =
  | { status: "idle" }
  | { status: "base-generating"; style: AiStyle; message: string }
  | { status: "memo-generating"; style: AiStyle; imageUrl: string; message: string }
  | { status: "completed"; style: AiStyle; imageUrl: string; title: string; message: string }
  | { status: "failed"; style: AiStyle; imageUrl?: string; message: string };

type User = {
  id: string;
  nickname: string;
  cityLabel: string;
  gender: "female" | "male" | "other";
  avatar: string;
  profileImageUrl: string;
  bio: string;
};

type Setlog = {
  id: string;
  userId: string;
  mediaType: "video" | "image";
  thumbnailUrl: string;
  mediaUrl?: string;
  caption: string;
  visibility: Visibility;
  cityLabel: string;
  gender: User["gender"];
  topic: LogTopic;
  durationSeconds: 4;
  hourSlot: string;
  createdAt: string;
  moderationStatus: ModerationStatus;
  isFriend: boolean;
  likeCount: number;
  uploadState?: "uploading" | "reviewing" | "failed";
  uploadMessage?: string;
};

type Room = {
  id: string;
  creatorId: string;
  template: RoomTemplate;
  title: string;
  message: string;
  cityLabel: string;
  expiresInMinutes: number;
  participantIds: string[];
  status: "active" | "expired" | "closed";
  thumbnailUrl: string;
};

type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

type AlbumItem = {
  id: string;
  title: string;
  imageUrl: string;
  sourceSetlogIds: string[];
  type: "setlog_frame" | "ai_group_photo";
  createdAt: string;
};

type RecordedSetlogCapture = {
  videoBlob: Blob;
  videoUrl: string;
  thumbnailUrl: string;
};

type CaptionSuggestionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; caption: string }
  | { status: "blocked"; message: string }
  | { status: "failed"; message: string };

type ReportReason = "inappropriate" | "harassment" | "privacy" | "spam" | "pressure" | "other";

const SETLOG_DURATION_SECONDS = 4;
const LIKED_SETLOGS_STORAGE_KEY = "daingagu:liked-setlogs";
const feedHourSlots = [
  { offset: -1, label: "1시간 전" },
  { offset: 0, label: "지금" },
  { offset: 1, label: "1시간 후" }
] as const;
const MEMO_STYLE_PROMPT = `
[컨셉]
전체적인 분위기는 따뜻하고 감성적인 '인스타 스토리' 또는 '잡지 속 카페 투어' 페이지처럼 연출해줘. 사진의 여백을 활용해 흰색 손글씨 주석을 추가해줘.

[드로잉 규칙]
펜 스타일: 얇은 흰색 펜으로 직접 그린 듯한 느낌. 한 붓 그리기처럼 자연스럽고 살짝 삐뚤삐뚤한 선.
라인: 주요 음식/오브젝트의 외곽선을 따라 얇은 흰색 테두리 추가.
유도: 화살표나 부드러운 곡선 점선을 활용해 시선을 아이템으로 유도.
장식: 작은 하트(♡), 반짝이(✨), 김이 모락모락 나는 선(♨), 귀여운 미소(о´∀\`о) 등 감성적인 아이콘을 과하지 않게 배치.

[텍스트 규칙]
언어: 한국어(한글) 손글씨체.
말투: 짧고 귀여운 혼잣말, 일기 형식, 다정하고 감성적인 톤.
내용 구성:
메인 음식: 식감과 맛 표현 (예: "완전 겉바속촉!", "입에서 살살 녹아")
사이드/음료: 기분과 상태 표현 (예: "시원함 그 자체", "향긋해서 좋아")
분위기: 공간의 느낌 (예: "나만 알고 싶은 자리", "햇살 맛집이네")
총평: 한 줄 요약 (예: "오늘 하루도 수고했어🍀", "완벽한 한 끼였다!")

이 사진 속 아이템들을 분석해서, 위에서 정의한 [한글 전용 범용 프롬프트] 규칙대로 흰색 손글씨 메모를 추가해줘. 여백을 잘 살려서 세련되게 만들어줘.
`.trim();
const THREE_D_STYLE_PROMPT = `
Create an image that looks like a high-quality 3D reconstruction of a real-world space generated from multiple photographs using advanced photogrammetry or Gaussian splatting.

The result should closely match real-world geometry and appearance, almost indistinguishable from reality at first glance.

Quality:
- highly detailed and accurate geometry
- realistic proportions and spatial consistency
- sharp, high-resolution textures derived from real images
- consistent lighting and color across the scene

Subtle imperfections (important):
- slight surface noise or uneven mesh in less visible areas
- minor texture seams or blending artifacts
- small floating fragments or soft edges in complex regions
- very subtle reconstruction errors, not distracting

Camera:
- natural perspective (eye-level or slightly elevated)
- similar to viewing a reconstructed 3D model in a viewer

Style:
- clean but still recognizably reconstructed (not CGI perfect)
- looks like a near-final photogrammetry or NeRF result

Background:
- neutral studio background (white or light gray)

Important:
- Do NOT stylize or make it artistic
- Do NOT make it look like a perfect CGI render
- It should feel like a real place reconstructed into 3D with very high fidelity
`.trim();

const currentUser: User = {
  id: "u_01",
  nickname: "성수 지은",
  cityLabel: "성수",
  gender: "female",
  avatar: "지",
  profileImageUrl: selfieWomanProfile,
  bio: "퇴근 후 혼밥을 덜 조용하게 만들고 싶은 사람"
};

const users: User[] = [
  currentUser,
  {
    id: "u_02",
    nickname: "저녁밥 민서",
    cityLabel: "성수",
    gender: "female",
    avatar: "민",
    profileImageUrl: dogProfile,
    bio: "저녁 8시 이후 짧은 수다 환영"
  },
  {
    id: "u_03",
    nickname: "뚝섬 산책러",
    cityLabel: "뚝섬",
    gender: "male",
    avatar: "산",
    profileImageUrl: seoulLandscapeProfile,
    bio: "밥 먹고 20분 걷기"
  },
  {
    id: "u_04",
    nickname: "퇴근후 나은",
    cityLabel: "성수",
    gender: "female",
    avatar: "나",
    profileImageUrl: selfieWomanAltProfile,
    bio: "혼밥 로그를 매일 남겨요"
  }
];

const media = {
  dinnerA:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
  dinnerB:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
  roomDinner:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
  walk:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  cafe:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  generated:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80"
};

const mockVideos = {
  dinnerA: {
    video: "/mock_videos/IMG_9563.mp4",
    poster: "/mock_videos/IMG_9563.jpg"
  },
  roomDinner: {
    video: "/mock_videos/IMG_9183.mp4",
    poster: "/mock_videos/IMG_9183.jpg"
  },
  walk: {
    video: "/mock_videos/IMG_8211.mp4",
    poster: "/mock_videos/IMG_8211.jpg"
  },
  dinnerB: {
    video: "/mock_videos/IMG_9255.mp4",
    poster: "/mock_videos/IMG_9255.jpg"
  },
  cafe: {
    video: "/mock_videos/IMG_4444.mp4",
    poster: "/mock_videos/IMG_4444.jpg"
  }
};

const initialSetlogs: Setlog[] = [
  {
    id: "s_01",
    userId: "u_02",
    mediaType: "video",
    thumbnailUrl: mockVideos.dinnerA.poster,
    mediaUrl: mockVideos.dinnerA.video,
    caption: "집에서 토끼옷 입고 혼자 춤추는 중ㅋㅋ",
    visibility: "public",
    cityLabel: "성수",
    gender: "female",
    topic: "chat",
    durationSeconds: SETLOG_DURATION_SECONDS,
    hourSlot: "20:00",
    createdAt: "2026-05-09T11:00:00.000Z",
    moderationStatus: "approved",
    isFriend: true,
    likeCount: 12
  },
  {
    id: "s_02",
    userId: "u_04",
    mediaType: "video",
    thumbnailUrl: mockVideos.dinnerA.poster,
    mediaUrl: mockVideos.dinnerA.video,
    caption: "퇴근하고 토끼옷 입고 방에서 춤추는 중ㅋㅋ",
    visibility: "public",
    cityLabel: "성수",
    gender: "female",
    topic: "chat",
    durationSeconds: SETLOG_DURATION_SECONDS,
    hourSlot: "20:00",
    createdAt: "2026-05-09T11:03:00.000Z",
    moderationStatus: "approved",
    isFriend: false,
    likeCount: 8
  },
  {
    id: "s_03",
    userId: "u_03",
    mediaType: "video",
    thumbnailUrl: mockVideos.walk.poster,
    mediaUrl: mockVideos.walk.video,
    caption: "예쁜 칵테일 한 잔으로 오늘 마무리",
    visibility: "public",
    cityLabel: "뚝섬",
    gender: "male",
    topic: "chat",
    durationSeconds: SETLOG_DURATION_SECONDS,
    hourSlot: "20:00",
    createdAt: "2026-05-09T11:07:00.000Z",
    moderationStatus: "approved",
    isFriend: false,
    likeCount: 5
  },
  {
    id: "s_04",
    userId: "u_04",
    mediaType: "video",
    thumbnailUrl: mockVideos.dinnerB.poster,
    mediaUrl: mockVideos.dinnerB.video,
    caption: "빨간 등대 보면서 바람 쐬는 중",
    visibility: "friends",
    cityLabel: "성수",
    gender: "female",
    topic: "walk",
    durationSeconds: SETLOG_DURATION_SECONDS,
    hourSlot: "19:00",
    createdAt: "2026-05-09T10:22:00.000Z",
    moderationStatus: "approved",
    isFriend: true,
    likeCount: 9
  },
  {
    id: "s_05",
    userId: "u_02",
    mediaType: "video",
    thumbnailUrl: mockVideos.cafe.poster,
    mediaUrl: mockVideos.cafe.video,
    caption: "숯불에 고기 굽는 냄새 미쳤다... 같이 먹을 사람",
    visibility: "public",
    cityLabel: "성수",
    gender: "female",
    topic: "meal",
    durationSeconds: SETLOG_DURATION_SECONDS,
    hourSlot: "20:00",
    createdAt: "2026-05-09T11:12:00.000Z",
    moderationStatus: "approved",
    isFriend: true,
    likeCount: 18
  }
];

const initialRooms: Room[] = [
  {
    id: "r_01",
    creatorId: "u_04",
    template: "meal_room",
    title: "혼밥방",
    message: "이따 저녁 같이 먹을 사람!!! 성수 근처면 바로 ㄱㄱ",
    cityLabel: "성수",
    expiresInMinutes: 42,
    participantIds: ["u_04", "u_02", "u_01"],
    status: "active",
    thumbnailUrl: "/uploads/seed/flash-meal.png"
  },
  {
    id: "r_02",
    creatorId: "u_02",
    template: "after_work_chat_room",
    title: "퇴근 후 수다방",
    message: "퇴근했는데 집 가기 아쉬운 사람? 카페에서 수다 ㄱ",
    cityLabel: "성수",
    expiresInMinutes: 74,
    participantIds: ["u_02", "u_04"],
    status: "active",
    thumbnailUrl: "/uploads/seed/flash-chat.png"
  },
  {
    id: "r_03",
    creatorId: "u_03",
    template: "neighborhood_walk_room",
    title: "동네 산책방",
    message: "뚝섬 산책 갈 사람 있음?? 20분만 걷자",
    cityLabel: "뚝섬",
    expiresInMinutes: 31,
    participantIds: ["u_03", "u_01"],
    status: "active",
    thumbnailUrl: "/uploads/seed/flash-walk.png"
  },
  {
    id: "r_04",
    creatorId: "u_02",
    template: "other_room",
    title: "기타",
    message: "지금 할 일은 없는데 잠깐 떠들 사람 있나요",
    cityLabel: "성수",
    expiresInMinutes: 58,
    participantIds: ["u_02"],
    status: "active",
    thumbnailUrl: "/uploads/seed/flash-other.png"
  }
];

const initialMessages: ChatMessage[] = [
  {
    id: "m_01",
    roomId: "c_01",
    senderId: "u_02",
    text: "오늘 로그 봤어요. 저녁 아직이면 혼밥방 들어와요.",
    createdAt: "20:11"
  },
  {
    id: "m_02",
    roomId: "c_01",
    senderId: "u_01",
    text: "좋아요. 저는 성수 쪽이에요.",
    createdAt: "20:12"
  },
  {
    id: "m_03",
    roomId: "c_02",
    senderId: "u_04",
    text: "등대 로그 좋다. 다음엔 같이 바람 쐬러 가요.",
    createdAt: "19:42"
  },
  {
    id: "m_04",
    roomId: "r_01",
    senderId: "u_04",
    text: "오늘 저녁 성수에서 먹을 사람들 여기로 모여요.",
    createdAt: "20:18"
  }
];

const filters: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "friends", label: "친구" },
  { id: "sameGender", label: "동성" },
  { id: "oppositeGender", label: "이성" },
  { id: "nearby", label: "주변" }
];

const topicFilters: Array<{ id: TopicFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "meal", label: "혼밥" },
  { id: "chat", label: "수다" },
  { id: "walk", label: "산책" }
];

const roomFilters: Array<{ id: RoomFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "meal_room", label: "혼밥방" },
  { id: "after_work_chat_room", label: "수다방" },
  { id: "neighborhood_walk_room", label: "산책방" },
  { id: "other_room", label: "기타" }
];

const reportReasons: Array<{ id: ReportReason; label: string; description: string }> = [
  { id: "inappropriate", label: "부적절한 사진/영상", description: "불쾌하거나 민감한 장면" },
  { id: "harassment", label: "불쾌한 말투", description: "비난, 조롱, 괴롭힘" },
  { id: "privacy", label: "개인정보 노출", description: "얼굴, 연락처, 위치 노출" },
  { id: "spam", label: "스팸/홍보", description: "반복 홍보나 광고성 내용" },
  { id: "pressure", label: "만남 강요", description: "원치 않는 만남 요구" },
  { id: "other", label: "기타", description: "다른 이유로 불편함" }
];

const roomMeta: Record<RoomTemplate, { icon: typeof Utensils; tone: string; caption: string }> = {
  meal_room: {
    icon: Utensils,
    tone: "bg-coral-light text-coral",
    caption: "지금 밥 먹는 사람"
  },
  after_work_chat_room: {
    icon: MessageCircle,
    tone: "bg-evening/45 text-night",
    caption: "퇴근 후 짧은 안부"
  },
  neighborhood_walk_room: {
    icon: Wind,
    tone: "bg-noon/55 text-ink",
    caption: "동네 한 바퀴"
  },
  other_room: {
    icon: MoreHorizontal,
    tone: "bg-cloud text-ink",
    caption: "무엇이든 가볍게"
  }
};

const tabs: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: "feed", label: "피드", icon: Home },
  { id: "rooms", label: "번개", icon: Users },
  { id: "capture", label: "만들기", icon: Camera },
  { id: "connections", label: "친구", icon: MessageCircle },
  { id: "more", label: "더보기", icon: MoreHorizontal }
];

const friendChatRoomId = (friendId: string) => {
  if (friendId === "u_02") return "c_01";
  if (friendId === "u_04") return "c_02";
  return `friend-${[currentUser.id, friendId].sort().join("-")}`;
};

const readLikedSetlogs = () => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const value = window.sessionStorage.getItem(LIKED_SETLOGS_STORAGE_KEY);
    const ids = value ? JSON.parse(value) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
};

const persistLikedSetlogs = (ids: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LIKED_SETLOGS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Demo preference only; liking still works for the current render if storage is unavailable.
  }
};

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [activeTopic, setActiveTopic] = useState<TopicFilter>("all");
  const [feedHourOffset, setFeedHourOffset] = useState(0);
  const [nickname, setNickname] = useState(currentUser.nickname);
  const [loginName, setLoginName] = useState(currentUser.nickname);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [setlogs, setSetlogs] = useState<Setlog[]>(initialSetlogs);
  const [likedSetlogIds, setLikedSetlogIds] = useState<Set<string>>(() => readLikedSetlogs());
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [friendIds, setFriendIds] = useState<string[]>(["u_02", "u_04"]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatDraft, setChatDraft] = useState("오늘 저녁 같이 남겨볼래요?");
  const [albumItems, setAlbumItems] = useState<AlbumItem[]>([]);
  const [sheet, setSheet] = useState<null | "upload" | "room" | "ai">(null);
  const [toast, setToast] = useState("");
  const [caption, setCaption] = useState("혼밥 중, 같이 먹는 느낌이면 좋겠다");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [roomTemplate, setRoomTemplate] = useState<RoomTemplate>("meal_room");
  const [roomMessage, setRoomMessage] = useState("성수에서 지금 밥 먹는 사람들");
  const [roomHours, setRoomHours] = useState<1 | 2 | 3>(1);
  const [selectedRoomFriendIds, setSelectedRoomFriendIds] = useState<string[]>(["u_02"]);
  const [selectedSetlogIds, setSelectedSetlogIds] = useState<string[]>(["s_01", "s_04"]);
  const [baseSetlogId, setBaseSetlogId] = useState("s_04");
  const [aiStyle, setAiStyle] = useState<AiStyle>("default");
  const [aiGeneration, setAiGeneration] = useState<AiGenerationState>({ status: "idle" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("inappropriate");
  const [reportDetail, setReportDetail] = useState("");
  const [isSafetyOpen, setIsSafetyOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [profileTargetId, setProfileTargetId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const loginResult = await api.login(currentUser.id);
      if (cancelled) return;

      const [remoteSetlogs, remoteRooms, remoteChats, remoteAlbum] = await Promise.all([
        api.getSetlogs(activeFilter, currentUser.id),
        api.getRooms(currentUser.id),
        api.getChats(currentUser.id),
        api.getAlbum(currentUser.id)
      ]);
      if (cancelled) return;

      const nextSetlogs = normalizeSetlogs(remoteSetlogs);
      if (nextSetlogs.length) {
        setSetlogs((items) => {
          const localUploads = items.filter((item) => item.uploadState);
          return [
            ...localUploads,
            ...nextSetlogs.filter((remoteSetlog) => !localUploads.some((localSetlog) => localSetlog.id === remoteSetlog.id))
          ];
        });
      }

      const nextRooms = normalizeRooms(remoteRooms);
      if (nextRooms.length) setRooms(nextRooms);

      const nextMessages = normalizeMessages(remoteChats);
      if (nextMessages.length) setMessages(nextMessages);

      const nextAlbumItems = normalizeAlbumItems(remoteAlbum);
      if (nextAlbumItems.length) setAlbumItems(nextAlbumItems);
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [activeFilter]);

  const approvedSetlogs = useMemo(
    () => setlogs.filter((setlog) => setlog.moderationStatus === "approved"),
    [setlogs]
  );

  const filteredSetlogs = useMemo(() => {
    const items = setlogs.filter((setlog) => {
      const visibleLocalUpload = setlog.userId === currentUser.id && Boolean(setlog.uploadState);
      if (setlog.moderationStatus !== "approved" && !visibleLocalUpload) return false;
      if (activeFilter === "friends") return friendIds.includes(setlog.userId) || setlog.userId === currentUser.id;
      if (activeFilter === "sameGender") {
        return setlog.gender === currentUser.gender && getUser(setlog.userId).gender === currentUser.gender;
      }
      if (activeFilter === "oppositeGender") {
        const userGender = getUser(setlog.userId).gender;
        return currentUser.gender !== "other" && userGender !== "other" && userGender !== currentUser.gender && setlog.gender === userGender;
      }
      if (activeFilter === "nearby") return setlog.cityLabel === currentUser.cityLabel;
      return setlog.visibility === "public" || setlog.userId === currentUser.id || friendIds.includes(setlog.userId);
    }).filter((setlog) => {
      if (activeTopic === "all") return true;
      return setlog.topic === activeTopic;
    });
    const uniqueItems = items.filter((setlog, index, list) => {
      if (setlog.uploadState) return true;
      return list.findIndex((item) => item.userId === setlog.userId && !item.uploadState) === index;
    });
    const visibleItems = [...uniqueItems].sort((a, b) => {
      const aMine = a.userId === currentUser.id ? 1 : 0;
      const bMine = b.userId === currentUser.id ? 1 : 0;
      if (aMine !== bMine) return bMine - aMine;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    if (feedHourOffset === 0) return visibleItems;
    const shift = feedHourOffset > 0 ? 1 : Math.max(0, visibleItems.length - 1);
    return [...visibleItems.slice(shift), ...visibleItems.slice(0, shift)];
  }, [activeFilter, activeTopic, feedHourOffset, friendIds, setlogs]);

  const selectedSetlogs = useMemo(
    () => selectedSetlogIds.map((id) => approvedSetlogs.find((setlog) => setlog.id === id)).filter((setlog): setlog is Setlog => Boolean(setlog)),
    [approvedSetlogs, selectedSetlogIds]
  );

  const reportTarget = useMemo(
    () => setlogs.find((setlog) => setlog.id === reportTargetId) ?? null,
    [reportTargetId, setlogs]
  );
  const profileTarget = useMemo(
    () => users.find((user) => user.id === profileTargetId) ?? null,
    [profileTargetId]
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const handleTab = (tab: Tab) => {
    if (tab === "capture") {
      setSheet("upload");
      return;
    }
    setActiveTab(tab);
  };

  const handleDemoLogin = async () => {
    const nextName = loginName.trim() || currentUser.nickname;
    setNickname(nextName);
    setIsLoggedIn(true);
    await api.login(currentUser.id);
    showToast(`${nextName} 닉네임으로 시작했어요`);
  };

  const handleReport = (setlogId: string) => {
    setReportTargetId(setlogId);
    setReportReason("inappropriate");
    setReportDetail("");
  };

  const handleSubmitReport = () => {
    if (!reportDetail.trim()) return;
    const reasonLabel = reportReasons.find((reason) => reason.id === reportReason)?.label ?? "신고";
    setReportTargetId(null);
    setReportDetail("");
    showToast(`${reasonLabel} 신고가 접수됐어요`);
  };

  const handleOpenProfile = (userId: string) => {
    setProfileTargetId(userId);
  };

  const handleAddFriend = async (userId: string) => {
    if (userId === currentUser.id || friendIds.includes(userId)) return;
    setFriendIds((ids) => (ids.includes(userId) ? ids : [...ids, userId]));
    showToast("친구가 되었어요");
    await api.addFriend(userId, currentUser.id);
  };

  const handleToggleLike = async (setlogId: string) => {
    const wasLiked = likedSetlogIds.has(setlogId);
    const nextLiked = !wasLiked;
    const nextLikedIds = new Set(likedSetlogIds);
    if (nextLiked) {
      nextLikedIds.add(setlogId);
    } else {
      nextLikedIds.delete(setlogId);
    }
    setLikedSetlogIds(nextLikedIds);
    persistLikedSetlogs(nextLikedIds);
    setSetlogs((items) =>
      items.map((item) =>
        item.id === setlogId ? { ...item, likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1)) } : item
      )
    );

    const response = await api.updateSetlogLike(setlogId, nextLiked);
    if (response) {
      setSetlogs((items) => items.map((item) => (item.id === setlogId ? { ...item, likeCount: response.likeCount } : item)));
      return;
    }

    // Keep the optimistic session state if the demo server is temporarily stale or unavailable.
  };

  const handleUpload = async (capture: RecordedSetlogCapture) => {
    setIsUploading(true);
    setUploadStatus("업로드 및 검토 중");
    const topic = inferLogTopic(caption);
    const temporaryId = `optimistic_${Date.now()}`;
    const optimisticSetlog: Setlog = {
      id: temporaryId,
      userId: currentUser.id,
      mediaType: "video",
      thumbnailUrl: capture.thumbnailUrl,
      mediaUrl: capture.videoUrl,
      caption,
      visibility,
      cityLabel: currentUser.cityLabel,
      gender: currentUser.gender,
      topic,
      durationSeconds: SETLOG_DURATION_SECONDS,
      hourSlot: "",
      createdAt: new Date().toISOString(),
      moderationStatus: "pending",
      isFriend: true,
      likeCount: 0,
      uploadState: "reviewing",
      uploadMessage: "업로드 및 검토 중"
    };
    setSetlogs((items) => [optimisticSetlog, ...items]);
    setSheet(null);
    setActiveTab("feed");
    showToast("업로드 및 검토 중이에요");

    const createdSetlog = await api.createSetlogFormData({
      userId: currentUser.id,
      caption,
      visibility,
      topic,
      durationSeconds: SETLOG_DURATION_SECONDS,
      cityLabel: currentUser.cityLabel,
      media: capture.videoBlob,
      thumbnail: await dataUrlToBlob(capture.thumbnailUrl),
      moderationProvider: "gemini"
    });

    if (!createdSetlog || createdSetlog.moderationStatus !== "approved") {
      const errorCode = api.getLastError()?.code;
      const message =
        createdSetlog?.moderationStatus === "blocked" || errorCode === "SETLOG_REJECTED"
          ? "안전 기준에 맞지 않아 올릴 수 없어요"
          : errorCode === "GEMINI_MODERATION_FAILED"
            ? "영상 확인이 지연되고 있어요. 잠시 뒤 다시 시도해 주세요"
            : errorCode === "UNSUPPORTED_MEDIA_TYPE"
              ? "영상 형식을 처리하지 못했어요. 다시 촬영해 주세요"
              : "업로드에 실패했어요. 잠시 뒤 다시 시도해 주세요";
      setUploadStatus(message);
      setSetlogs((items) =>
        items.map((item) =>
          item.id === temporaryId
            ? {
                ...item,
                moderationStatus: errorCode === "SETLOG_REJECTED" || createdSetlog?.moderationStatus === "blocked" ? "blocked" : "pending",
                uploadState: "failed",
                uploadMessage: message
              }
            : item
        )
      );
      setIsUploading(false);
      showToast(message);
      return;
    }

    const newSetlog: Setlog = {
      id: createdSetlog.id,
      userId: createdSetlog.userId || currentUser.id,
      mediaType: createdSetlog.mediaType,
      thumbnailUrl: createdSetlog.thumbnailUrl || capture.thumbnailUrl,
      mediaUrl: createdSetlog.mediaUrl || capture.videoUrl,
      caption: createdSetlog.caption || caption,
      visibility: createdSetlog.visibility,
      cityLabel: createdSetlog.cityLabel || currentUser.cityLabel,
      gender: createdSetlog.gender || currentUser.gender,
      topic: createdSetlog.topic ?? topic,
      durationSeconds: SETLOG_DURATION_SECONDS,
      hourSlot: createdSetlog.hourSlot,
      createdAt: createdSetlog.createdAt,
      moderationStatus: createdSetlog.moderationStatus,
      isFriend: true,
      likeCount: createdSetlog.likeCount
    };
    setSetlogs((items) => items.map((item) => (item.id === temporaryId ? newSetlog : item)));
    setUploadStatus("새 로그가 올라갔어요");
    setIsUploading(false);
    showToast("다인가구에 로그가 올라갔어요");
  };

  const handleCreateRoom = async () => {
    const title = templateTitle(roomTemplate);
    const participantIds = Array.from(new Set([currentUser.id, ...selectedRoomFriendIds]));
    const newRoom: Room = {
      id: `r_${Date.now()}`,
      creatorId: currentUser.id,
      template: roomTemplate,
      title,
      message: roomMessage,
      cityLabel: currentUser.cityLabel,
      expiresInMinutes: roomHours * 60,
      participantIds,
      status: "active",
      thumbnailUrl: thumbnailForRoomTemplate(roomTemplate)
    };
    await api.createRoom({
      creatorId: currentUser.id,
      template: roomTemplate,
      message: roomMessage,
      cityLabel: currentUser.cityLabel,
      expiresInMinutes: newRoom.expiresInMinutes,
      participantIds
    });
    setRooms((items) => [newRoom, ...items]);
    setSheet(null);
    setActiveTab("rooms");
    showToast(`${title}이 열렸어요`);
  };

  const handleJoinRoom = async (roomId: string) => {
    setRooms((items) =>
      items.map((room) =>
        room.id === roomId && !room.participantIds.includes(currentUser.id)
          ? { ...room, participantIds: [...room.participantIds, currentUser.id] }
          : room
      )
    );
    setActiveTab("connections");
    setMessages((items) => [
      ...items,
      {
        id: `m_${Date.now()}`,
        roomId,
        senderId: "u_01",
        text: "방에 들어왔어요. 오늘의 로그를 나눠요.",
        createdAt: "지금"
      }
    ]);
    await api.joinRoom(roomId, currentUser.id);
    showToast("번개방에 참여했어요");
  };

  const handleSendMessage = async (roomId: string) => {
    const text = chatDraft.trim();
    if (!text) return;
    setChatDraft("");
    const sentMessage = await api.sendChatMessage(roomId, currentUser.id, text);
    if (!sentMessage) {
      const error = api.getLastError();
      if (error?.code !== "CHAT_MESSAGE_BLOCKED" && error?.code !== "EMPTY_CHAT_MESSAGE") {
        showToast("메시지를 보내지 못했어요");
      }
      return;
    }
    setMessages((items) => [
      ...items,
      {
        id: sentMessage.id,
        roomId: sentMessage.roomId || roomId,
        senderId: sentMessage.senderId || currentUser.id,
        text: sentMessage.text || text,
        createdAt: sentMessage.createdAt || "지금"
      }
    ]);
  };

  const openAiSheet = () => {
    setAiGeneration({ status: "idle" });
    setSheet("ai");
  };

  const albumItemFromPhoto = (photo: NonNullable<Awaited<ReturnType<typeof api.createAiPhoto>>>, title: string): AlbumItem => ({
    id: photo.id,
    title,
    imageUrl: photo.imageUrl ?? media.generated,
    sourceSetlogIds: photo.sourceSetlogIds.length ? photo.sourceSetlogIds : selectedSetlogIds,
    type: "ai_group_photo",
    createdAt: photo.createdAt || "지금"
  });

  const waitForGeneratedAlbumItem = async (knownAlbumIds: Set<string>, sourceIds: string[]) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await delay(4000);
      const remoteAlbum = await api.getAlbum(currentUser.id);
      const nextAlbumItems = normalizeAlbumItems(remoteAlbum);
      if (nextAlbumItems.length) {
        setAlbumItems(nextAlbumItems);
      }
      const completedItem = nextAlbumItems.find(
        (item) => !knownAlbumIds.has(item.id) && sourceIds.every((sourceId) => item.sourceSetlogIds.includes(sourceId))
      );
      if (completedItem) return completedItem;
    }
    return null;
  };

  const handleGenerateAiPhoto = async () => {
    const safeBaseSetlogId = selectedSetlogIds.includes(baseSetlogId) ? baseSetlogId : selectedSetlogIds[0] ?? baseSetlogId;
    const style = aiStyle;
    const styledTitle = style === "memo" ? "밋업 나우! 메모" : style === "3d" ? "밋업 나우! 3D" : "밋업 나우!";
    const styledPrompt = style === "3d" ? THREE_D_STYLE_PROMPT : MEMO_STYLE_PROMPT;
    const knownAlbumIds = new Set(albumItems.map((item) => item.id));
    setIsGenerating(true);
    setAiGeneration({
      status: "base-generating",
      style,
      message:
        style === "memo"
          ? "먼저 한 장소에 함께 있는 기본 사진을 만들고 있어요."
          : style === "3d"
            ? "먼저 한 장소에 함께 있는 기본 사진을 만들고 있어요."
            : "한 장소에 함께 있는 사진을 만들고 있어요."
    });
    const basePhoto = await api.createAiPhoto({
      userId: currentUser.id,
      sourceSetlogIds: selectedSetlogIds,
      baseSetlogId: safeBaseSetlogId,
      persist: style === "default",
      moderationProvider: "gemini",
      imageProvider: "gpt-image-2"
    });

    if (!basePhoto?.imageUrl) {
      setIsGenerating(false);
      setAiGeneration({ status: "failed", style, message: api.getLastError()?.message || "밋업 나우! 사진을 만들지 못했어요." });
      showToast(api.getLastError()?.message || "밋업 나우! 사진을 만들지 못했어요");
      return;
    }

    if (style === "default") {
      const albumItem = albumItemFromPhoto(basePhoto, "밋업 나우!");
      setAlbumItems((items) => [albumItem, ...items.filter((item) => item.id !== albumItem.id)]);
      setIsGenerating(false);
      setAiGeneration({
        status: "completed",
        style,
        imageUrl: basePhoto.imageUrl,
        title: "밋업 나우!",
        message: "완성된 사진이 앨범에 저장됐어요."
      });
      showToast("밋업 나우! 사진이 완성됐어요");
      return;
    }

    setAiGeneration({
      status: "memo-generating",
      style,
      imageUrl: basePhoto.imageUrl,
      message:
        style === "3d"
          ? "기본 사진이 완성됐어요. 3D 재구성 버전을 추가로 만들고 있어요."
          : "기본 사진이 완성됐어요. 흰색 손글씨 메모 버전을 추가로 만들고 있어요."
    });
    const memoPhoto = await api.createMemoPhoto({
      userId: currentUser.id,
      sourceImageUrl: basePhoto.imageUrl,
      sourceSetlogIds: selectedSetlogIds,
      baseSetlogId: safeBaseSetlogId,
      style: style === "3d" ? "3d" : "memo",
      prompt: styledPrompt
    });

    if (!memoPhoto?.imageUrl) {
      const lastError = api.getLastError();
      const shouldWaitForServerResult =
        !lastError || lastError.code === "REQUEST_TIMEOUT" || lastError.code === "HTTP_ERROR" || (lastError.status ?? 0) >= 500;
      if (shouldWaitForServerResult) {
        setAiGeneration({
          status: "memo-generating",
          style,
          imageUrl: basePhoto.imageUrl,
          message: `${style === "3d" ? "3D" : "메모"} 생성이 오래 걸리고 있어요. 서버에서 계속 만들고 있으니 완료되면 앨범에 표시할게요.`
        });
        showToast(`${style === "3d" ? "3D" : "메모"} 생성이 계속 진행 중이에요`);
        const recoveredAlbumItem = await waitForGeneratedAlbumItem(knownAlbumIds, selectedSetlogIds);
        if (recoveredAlbumItem) {
          setIsGenerating(false);
          setAiGeneration({
            status: "completed",
            style,
            imageUrl: recoveredAlbumItem.imageUrl,
            title: styledTitle,
            message: `${style === "3d" ? "3D 재구성" : "손글씨 메모"} 버전이 앨범에 저장됐어요.`
          });
          showToast(`${styledTitle} 사진이 완성됐어요`);
          return;
        }
      }
      setIsGenerating(false);
      setAiGeneration({
        status: "failed",
        style,
        imageUrl: basePhoto.imageUrl,
        message: lastError?.message || `${style === "3d" ? "3D" : "메모"} 버전을 만들지 못했어요. 기본 사진은 화면에 남겨둘게요.`
      });
      showToast(lastError?.message || `${style === "3d" ? "3D" : "메모"} 버전을 만들지 못했어요`);
      return;
    }

    const memoAlbumItem = albumItemFromPhoto(memoPhoto, styledTitle);
    setAlbumItems((items) => [memoAlbumItem, ...items.filter((item) => item.id !== memoAlbumItem.id)]);
    setIsGenerating(false);
    setAiGeneration({
      status: "completed",
      style,
      imageUrl: memoPhoto.imageUrl,
      title: styledTitle,
      message: `${style === "3d" ? "3D 재구성" : "손글씨 메모"} 버전이 앨범에 저장됐어요.`
    });
    showToast(`${styledTitle} 사진이 완성됐어요`);
  };

  return (
    <main className="app-shell">
      <section className="phone-frame" aria-label="다인가구 모바일 웹 앱">
        <AppHeader
          nickname={nickname}
          loginName={loginName}
          setLoginName={setLoginName}
          isLoggedIn={isLoggedIn}
          onDemoLogin={handleDemoLogin}
          onSafetyClick={() => setIsSafetyOpen(true)}
          onNotificationClick={() => setIsNotificationOpen(true)}
        />
        <div className="screen-scroll">
          {activeTab === "feed" && (
            <FeedScreen
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              activeTopic={activeTopic}
              setActiveTopic={setActiveTopic}
              feedHourOffset={feedHourOffset}
              setFeedHourOffset={setFeedHourOffset}
              setlogs={filteredSetlogs}
              rooms={rooms}
              friendIds={friendIds}
              likedSetlogIds={likedSetlogIds}
              onReport={handleReport}
              onToggleLike={handleToggleLike}
              onOpenProfile={handleOpenProfile}
              onJoinRoom={handleJoinRoom}
              onOpenRoomSheet={() => setSheet("room")}
            />
          )}
          {activeTab === "rooms" && (
            <RoomsScreen rooms={rooms} onCreate={() => setSheet("room")} onJoin={handleJoinRoom} />
          )}
          {activeTab === "connections" && (
            <ConnectionsScreen
              setlogs={approvedSetlogs}
              rooms={rooms}
              friendIds={friendIds}
              messages={messages}
              draft={chatDraft}
              setDraft={setChatDraft}
              onSend={handleSendMessage}
              albumItems={albumItems}
              setSelectedSetlogIds={setSelectedSetlogIds}
              setBaseSetlogId={setBaseSetlogId}
              onOpenAi={openAiSheet}
            />
          )}
          {activeTab === "more" && (
            <MoreScreen
              nickname={nickname}
              activeFilter={activeFilter}
              activeTopic={activeTopic}
              friendCount={friendIds.length}
              roomCount={rooms.length}
              albumCount={albumItems.length}
            />
          )}
        </div>
        <BottomNav activeTab={activeTab} onTab={handleTab} />
        {sheet === "upload" && (
          <UploadSheet
            caption={caption}
            setCaption={setCaption}
            visibility={visibility}
            setVisibility={setVisibility}
            uploadStatus={uploadStatus}
            isUploading={isUploading}
            onClose={() => setSheet(null)}
            onSubmit={handleUpload}
          />
        )}
        {sheet === "room" && (
          <RoomSheet
            roomTemplate={roomTemplate}
            setRoomTemplate={setRoomTemplate}
            message={roomMessage}
            setMessage={setRoomMessage}
            roomHours={roomHours}
            setRoomHours={setRoomHours}
            friends={users.filter((user) => friendIds.includes(user.id))}
            selectedFriendIds={selectedRoomFriendIds}
            setSelectedFriendIds={setSelectedRoomFriendIds}
            onClose={() => setSheet(null)}
            onSubmit={handleCreateRoom}
          />
        )}
        {sheet === "ai" && (
          <AiSheet
            selectedSetlogs={selectedSetlogs}
            baseSetlogId={baseSetlogId}
            setBaseSetlogId={setBaseSetlogId}
            aiStyle={aiStyle}
            setAiStyle={setAiStyle}
            generation={aiGeneration}
            onClose={() => setSheet(null)}
            onGenerate={handleGenerateAiPhoto}
            isGenerating={isGenerating}
          />
        )}
        {reportTargetId && (
          <ReportSheet
            setlog={reportTarget}
            reason={reportReason}
            setReason={setReportReason}
            detail={reportDetail}
            setDetail={setReportDetail}
            onClose={() => setReportTargetId(null)}
            onSubmit={handleSubmitReport}
          />
        )}
        {isSafetyOpen && <SafetyModal onClose={() => setIsSafetyOpen(false)} />}
        {isNotificationOpen && <NotificationSheet onClose={() => setIsNotificationOpen(false)} />}
        {profileTarget && (
          <ProfileSheet
            user={profileTarget}
            isFriend={friendIds.includes(profileTarget.id)}
            setlogs={approvedSetlogs.filter((setlog) => setlog.userId === profileTarget.id)}
            onClose={() => setProfileTargetId(null)}
            onAddFriend={() => handleAddFriend(profileTarget.id)}
          />
        )}
        {toast && <div className="toast">{toast}</div>}
      </section>
    </main>
  );
}

function AppHeader({
  nickname,
  loginName,
  setLoginName,
  isLoggedIn,
  onDemoLogin,
  onSafetyClick,
  onNotificationClick
}: {
  nickname: string;
  loginName: string;
  setLoginName: (name: string) => void;
  isLoggedIn: boolean;
  onDemoLogin: () => void;
  onSafetyClick: () => void;
  onNotificationClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/[0.04] bg-white/85 px-4 pb-3 pt-4 backdrop-blur-[18px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <img className="brand-logo" src={brandLogo} alt="다인가구" />
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="안전 상태" onClick={onSafetyClick}>
            <ShieldCheck size={20} />
          </IconButton>
          <IconButton label="알림" onClick={onNotificationClick}>
            <Bell size={20} />
          </IconButton>
          <UserAvatar user={currentUser} className="active" label={`${nickname} 프로필`} />
        </div>
      </div>
      {!isLoggedIn && (
        <div className="mt-3 rounded-[18px] border border-line bg-white p-2">
          <div className="flex items-center gap-2">
            <input
              className="text-input min-w-0 flex-1"
              value={loginName}
              onChange={(event) => setLoginName(event.target.value)}
              aria-label="익명 닉네임"
            />
            <button className="small-action whitespace-nowrap" onClick={onDemoLogin}>
              시작하기
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function FeedScreen({
  activeFilter,
  setActiveFilter,
  activeTopic,
  setActiveTopic,
  feedHourOffset,
  setFeedHourOffset,
  setlogs,
  rooms,
  friendIds,
  likedSetlogIds,
  onReport,
  onToggleLike,
  onOpenProfile,
  onJoinRoom,
  onOpenRoomSheet
}: {
  activeFilter: Filter;
  setActiveFilter: (filter: Filter) => void;
  activeTopic: TopicFilter;
  setActiveTopic: (topic: TopicFilter) => void;
  feedHourOffset: number;
  setFeedHourOffset: (offset: number) => void;
  setlogs: Setlog[];
  rooms: Room[];
  friendIds: string[];
  likedSetlogIds: Set<string>;
  onReport: (setlogId: string) => void;
  onToggleLike: (setlogId: string) => void;
  onOpenProfile: (userId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onOpenRoomSheet: () => void;
}) {
  const touchStartRef = useRef<{ x: number; y: number; ignore: boolean } | null>(null);
  const feedHourLabel = feedHourSlots.find((slot) => slot.offset === feedHourOffset)?.label ?? "지금";
  const moveHour = (direction: -1 | 1) => {
    setFeedHourOffset(Math.max(-1, Math.min(1, feedHourOffset + direction)));
  };

  return (
    <div
      className="feed-screen space-y-5 px-4 pb-4 pt-4"
      onTouchStart={(event) => {
        const target = event.target instanceof Element ? event.target : null;
        touchStartRef.current = {
          x: event.touches[0]?.clientX ?? 0,
          y: event.touches[0]?.clientY ?? 0,
          ignore: Boolean(target?.closest(".filter-row, .topic-row, .room-strip, button"))
        };
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (!start || start.ignore) return;
        const touch = event.changedTouches[0];
        if (!touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
        moveHour(dx < 0 ? 1 : -1);
      }}
    >
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">동네에서 올라온 로그</h2>
            <div className="feed-hour-pill">
              <span>{feedHourLabel}</span>
              <small>좌우로 넘겨보기</small>
            </div>
          </div>
          <button className="small-action" onClick={onOpenRoomSheet}>
            <Plus size={16} />
            방 만들기
          </button>
        </div>
        <div className="filter-row" aria-label="다인가구 필터">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={`filter-chip ${activeFilter === filter.id ? "active" : ""}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <span>로그 주제</span>
          <div className="topic-row" aria-label="로그 주제">
            {topicFilters.map((topic) => (
              <button
                key={topic.id}
                className={`topic-chip ${activeTopic === topic.id ? "active" : ""}`}
                onClick={() => setActiveTopic(topic.id)}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">열린 번개방</h2>
          <span className="text-[12px] font-extrabold text-muted">잠시 열림</span>
        </div>
        <div className="room-strip">
          {rooms.slice(0, 2).map((room) => (
            <RoomCard key={room.id} room={room} compact onJoin={onJoinRoom} />
          ))}
        </div>
      </section>
      <section className="space-y-4">
        {setlogs.map((setlog) => (
          <SetlogCard
            key={setlog.id}
            setlog={setlog}
            isFriend={friendIds.includes(setlog.userId) || setlog.userId === currentUser.id}
            isLiked={likedSetlogIds.has(setlog.id)}
            onReport={onReport}
            onToggleLike={onToggleLike}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </section>
    </div>
  );
}

function RoomsScreen({ rooms, onCreate, onJoin }: { rooms: Room[]; onCreate: () => void; onJoin: (roomId: string) => void }) {
  const [activeRoomFilter, setActiveRoomFilter] = useState<RoomFilter>("all");
  const filteredRooms = activeRoomFilter === "all" ? rooms : rooms.filter((room) => room.template === activeRoomFilter);

  return (
    <div className="space-y-5 px-4 pb-4 pt-4">
      <section className="flex items-center justify-between">
        <div>
          <h2 className="page-title">번개방</h2>
          <p className="helper-copy">혼밥, 퇴근 후 수다, 산책을 가볍게 시작해요.</p>
        </div>
        <button className="capture-mini" onClick={onCreate} aria-label="방 만들기">
          <Plus size={24} />
        </button>
      </section>
      <div className="filter-row room-filter-row" aria-label="번개방 필터">
        {roomFilters.map((filter) => (
          <button
            key={filter.id}
            className={`filter-chip ${activeRoomFilter === filter.id ? "active" : ""}`}
            onClick={() => setActiveRoomFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <section className="space-y-3">
        {filteredRooms.map((room) => (
          <RoomCard key={room.id} room={room} onJoin={onJoin} />
        ))}
      </section>
    </div>
  );
}

function ConnectionsScreen({
  setlogs,
  rooms,
  friendIds,
  messages,
  draft,
  setDraft,
  onSend,
  albumItems,
  setSelectedSetlogIds,
  setBaseSetlogId,
  onOpenAi
}: {
  setlogs: Setlog[];
  rooms: Room[];
  friendIds: string[];
  messages: ChatMessage[];
  draft: string;
  setDraft: (text: string) => void;
  onSend: (roomId: string) => void;
  albumItems: AlbumItem[];
  setSelectedSetlogIds: (ids: string[]) => void;
  setBaseSetlogId: (id: string) => void;
  onOpenAi: () => void;
}) {
  const friendUsers = users.filter((user) => friendIds.includes(user.id));
  const firstFriendId = friendUsers[0]?.id ?? currentUser.id;
  const firstGroupId = rooms[0]?.id ?? "r_01";
  const [mode, setMode] = useState<ConnectionMode>("friends");
  const [selectedTarget, setSelectedTarget] = useState<ConnectionTarget>({ type: "friend", id: firstFriendId });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAlbumOpen, setIsAlbumOpen] = useState(false);
  const [activeSetlogIndex, setActiveSetlogIndex] = useState(0);
  const activeTarget: ConnectionTarget =
    selectedTarget.type === "friend" && friendUsers.some((user) => user.id === selectedTarget.id)
      ? selectedTarget
      : selectedTarget.type === "group" && rooms.some((room) => room.id === selectedTarget.id)
        ? selectedTarget
        : mode === "friends"
          ? { type: "friend", id: firstFriendId }
          : { type: "group", id: firstGroupId };

  const selectedFriend = activeTarget.type === "friend" ? getUser(activeTarget.id) : null;
  const selectedRoom = activeTarget.type === "group" ? rooms.find((room) => room.id === activeTarget.id) ?? rooms[0] : null;
  const targetUserIds = selectedFriend ? [selectedFriend.id] : selectedRoom?.participantIds ?? [currentUser.id];
  const targetSetlogs = setlogs
    .filter((setlog) => targetUserIds.includes(setlog.userId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sortForMeetup = (a: Setlog, b: Setlog) => {
    const aVideo = a.mediaType === "video" ? 1 : 0;
    const bVideo = b.mediaType === "video" ? 1 : 0;
    if (aVideo !== bVideo) return bVideo - aVideo;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  };
  const ownMeetupSetlog = setlogs.filter((setlog) => setlog.userId === currentUser.id).sort(sortForMeetup)[0];
  const targetOtherSetlogs = targetSetlogs.filter((setlog) => setlog.userId !== currentUser.id).sort(sortForMeetup);
  const fallbackOtherSetlogs = setlogs
    .filter((setlog) => setlog.userId !== currentUser.id && !targetSetlogs.some((target) => target.id === setlog.id))
    .sort(sortForMeetup);
  const primaryOtherSetlogs = [...targetOtherSetlogs, ...fallbackOtherSetlogs].filter(
    (setlog, index, list) => list.findIndex((item) => item.userId === setlog.userId) === index
  );
  const extraOtherSetlogs = [...targetOtherSetlogs, ...fallbackOtherSetlogs].filter(
    (setlog) => !primaryOtherSetlogs.some((item) => item.id === setlog.id)
  );
  const meetupSetlogs = [ownMeetupSetlog, ...primaryOtherSetlogs, ...extraOtherSetlogs].filter(
    (setlog): setlog is Setlog => Boolean(setlog)
  ).filter(
    (setlog, index, list) => list.findIndex((item) => item.id === setlog.id) === index
  );
  const playableSetlogs = targetSetlogs;
  const safeSetlogIndex = playableSetlogs.length ? activeSetlogIndex % playableSetlogs.length : 0;
  const heroSetlog = playableSetlogs[safeSetlogIndex];
  const targetTitle = selectedFriend?.nickname ?? selectedRoom?.title ?? "친구";
  const targetSubtitle = selectedFriend
    ? `${selectedFriend.cityLabel} · ${targetSetlogs.length}개 로그`
    : `${selectedRoom?.cityLabel ?? currentUser.cityLabel} · ${selectedRoom?.participantIds.length ?? 1}명`;
  const targetAvatars = selectedFriend ? [selectedFriend] : (selectedRoom?.participantIds ?? []).map(getUser);
  const targetRoomId = selectedFriend ? friendChatRoomId(selectedFriend.id) : selectedRoom?.id ?? firstGroupId;
  const targetMessages = messages.filter((message) => message.roomId === targetRoomId);
  const chatMessages = targetMessages;
  const targetSetlogIds = useMemo(() => new Set(targetSetlogs.map((setlog) => setlog.id)), [targetSetlogs]);
  const targetAlbumItems = useMemo(
    () => albumItems.filter((item) => item.sourceSetlogIds.some((setlogId) => targetSetlogIds.has(setlogId))),
    [albumItems, targetSetlogIds]
  );

  const switchMode = (nextMode: ConnectionMode) => {
    setMode(nextMode);
    setSelectedTarget(nextMode === "friends" ? { type: "friend", id: firstFriendId } : { type: "group", id: firstGroupId });
    setActiveSetlogIndex(0);
  };

  const handleSelectTarget = (target: ConnectionTarget) => {
    setSelectedTarget(target);
    setActiveSetlogIndex(0);
  };

  const showNextSetlog = () => {
    if (playableSetlogs.length <= 1) return;
    setActiveSetlogIndex((index) => (index + 1) % playableSetlogs.length);
  };

  useEffect(() => {
    if (heroSetlog?.mediaUrl || playableSetlogs.length <= 1) return undefined;
    const timer = window.setTimeout(showNextSetlog, 4000);
    return () => window.clearTimeout(timer);
  }, [heroSetlog?.id, heroSetlog?.mediaUrl, playableSetlogs.length]);

  const handleMeetupNow = () => {
    const ids = meetupSetlogs.slice(0, 4).map((setlog) => setlog.id);
    if (ids.length < 2) return;
    setSelectedSetlogIds(ids);
    setBaseSetlogId(ids[0]);
    onOpenAi();
  };

  return (
    <div className="connections-screen">
      <section className="connections-header">
        <div>
          <h2 className="page-title">친구와 그룹</h2>
          <p className="helper-copy">로그와 앨범을 한 화면에서 이어봐요.</p>
        </div>
        <span className="credit-pill">크레딧 10</span>
      </section>

      <div className="connection-switch" aria-label="친구 또는 그룹 보기">
        <button className={mode === "friends" ? "active" : ""} onClick={() => switchMode("friends")}>
          친구
        </button>
        <button className={mode === "groups" ? "active" : ""} onClick={() => switchMode("groups")}>
          그룹
        </button>
      </div>

      <section className="thread-list" aria-label={mode === "friends" ? "친구 목록" : "그룹 목록"}>
        {mode === "friends" &&
          friendUsers.map((friend) => {
            const count = setlogs.filter((setlog) => setlog.userId === friend.id).length;
            const selected = activeTarget.type === "friend" && activeTarget.id === friend.id;
            const latestSetlog = setlogs.find((setlog) => setlog.userId === friend.id);
            const latestFriendMessage = messages.filter((message) => message.roomId === friendChatRoomId(friend.id)).at(-1);
            return (
              <button
                key={friend.id}
                className={`thread-row ${selected ? "selected" : ""}`}
                onClick={() => handleSelectTarget({ type: "friend", id: friend.id })}
              >
                <UserAvatar user={friend} className={selected ? "active" : ""} />
                <div className="thread-copy">
                  <div>
                    <strong>{friend.nickname}</strong>
                    <span>{latestFriendMessage?.createdAt ?? "방금"}</span>
                  </div>
                  <p>{latestFriendMessage?.text ?? latestSetlog?.caption ?? "최근 로그를 확인해보세요"}</p>
                </div>
                <small>{count}개</small>
              </button>
            );
          })}
        {mode === "groups" &&
          rooms.map((room) => {
            const selected = activeTarget.type === "group" && activeTarget.id === room.id;
            const participants = room.participantIds.map(getUser);
            const roomSetlogs = setlogs.filter((setlog) => room.participantIds.includes(setlog.userId));
            const latestGroupMessage = messages.filter((message) => message.roomId === room.id).at(-1);
            return (
              <button
                key={room.id}
                className={`thread-row ${selected ? "selected" : ""}`}
                onClick={() => handleSelectTarget({ type: "group", id: room.id })}
              >
                <div className="connection-avatar-stack">
                  {participants.slice(0, 3).map((participant) => (
                    <UserAvatar key={participant.id} user={participant} className="participant-avatar" />
                  ))}
                </div>
                <div className="thread-copy">
                  <div>
                    <strong>{room.title}</strong>
                    <span>{room.cityLabel}</span>
                  </div>
                  <p>{room.message}</p>
                  {latestGroupMessage && <p>{latestGroupMessage.text}</p>}
                </div>
                <small>{roomSetlogs.length}개</small>
              </button>
            );
          })}
      </section>

      <section className="connection-workspace" key={`${activeTarget.type}-${activeTarget.id}`}>
        <div className="connection-viewer">
          <div className="connection-media">
            {heroSetlog?.mediaUrl ? (
              <video
                key={heroSetlog.id}
                src={heroSetlog.mediaUrl}
                poster={heroSetlog.thumbnailUrl}
                autoPlay
                muted
                playsInline
                onEnded={showNextSetlog}
              />
            ) : (
              <img src={heroSetlog?.thumbnailUrl ?? media.generated} alt={`${targetTitle} 로그`} />
            )}
            <div className="connection-overlay">
              <div className="connection-overlay-top">
                <div className="connection-avatar-stack on-media">
                  {targetAvatars.slice(0, 4).map((user) => (
                    <UserAvatar key={user.id} user={user} className="participant-avatar" />
                  ))}
                </div>
                <span>{targetSubtitle}{playableSetlogs.length > 1 ? ` · ${safeSetlogIndex + 1}/${playableSetlogs.length}` : ""}</span>
              </div>
              <div>
                <h3>{targetTitle}</h3>
                <p>{heroSetlog?.caption ?? "아직 올라온 로그가 없어요."}</p>
                <div className="viewer-actions">
                  <button className="viewer-action" onClick={() => setIsChatOpen(true)}>
                    <MessageCircle size={17} />
                    채팅
                  </button>
                  <button className="viewer-action" onClick={() => setIsAlbumOpen(true)}>
                    <ImagePlus size={17} />
                    앨범
                  </button>
                  <button className="viewer-action light" onClick={handleMeetupNow} disabled={meetupSetlogs.length < 2}>
                    <Sparkles size={17} />
                    밋업 나우!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isChatOpen && (
        <ChatSheet
          title={targetTitle}
          subtitle={targetSubtitle}
          avatars={targetAvatars}
          messages={chatMessages}
          draft={draft}
          setDraft={setDraft}
          onSend={() => onSend(targetRoomId)}
          onClose={() => setIsChatOpen(false)}
        />
      )}
      {isAlbumOpen && (
        <AlbumSheet
          albumItems={targetAlbumItems}
          targetName={targetTitle}
          targetType={activeTarget.type}
          targetSetlogCount={targetSetlogs.length}
          onClose={() => setIsAlbumOpen(false)}
        />
      )}
    </div>
  );
}

function AlbumSheet({
  albumItems,
  targetName,
  targetType,
  targetSetlogCount,
  onClose
}: {
  albumItems: AlbumItem[];
  targetName: string;
  targetType: ConnectionTarget["type"];
  targetSetlogCount: number;
  onClose: () => void;
}) {
  const title = targetType === "friend" ? `${targetName} 앨범` : `${targetName} 그룹 앨범`;
  const emptyTitle =
    targetType === "friend"
      ? targetSetlogCount
        ? `${targetName}와 연결된 앨범이 없어요`
        : `${targetName}의 로그가 아직 없어요`
      : targetSetlogCount
        ? `${targetName} 그룹 앨범이 아직 없어요`
        : `${targetName} 그룹 로그가 아직 없어요`;
  const emptyMessage =
    targetType === "friend"
      ? targetSetlogCount
        ? `${targetName}의 로그로 밋업 나우!를 만들면 여기에 저장돼요.`
        : `${targetName}의 로그가 올라오면 여기서 함께 만든 장면을 볼 수 있어요.`
      : targetSetlogCount
        ? "이 그룹 로그를 연결해 밋업 나우!를 만들면 여기에 저장돼요."
        : "그룹에 올라온 로그가 생기면 여기서 함께 만든 장면을 볼 수 있어요.";

  return (
    <BottomSheet title={title} onClose={onClose}>
      {albumItems.length ? (
        <div className="album-sheet-grid">
          {albumItems.map((item) => (
            <article key={item.id} className="album-card">
              <img src={item.imageUrl} alt={item.title} />
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong>{item.title}</strong>
                  <span className={item.type === "ai_group_photo" ? "ai-badge" : "frame-badge"}>
                    {item.type === "ai_group_photo" ? "AI" : "로그"}
                  </span>
                </div>
                <p>{item.type === "ai_group_photo" ? "밋업 나우!로 만든 장면" : "다인가구에서 남긴 순간"}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="album-empty">
          <span>
            <ImagePlus size={28} />
          </span>
          <h3>{emptyTitle}</h3>
          <p>{emptyMessage}</p>
        </section>
      )}
    </BottomSheet>
  );
}

function ChatSheet({
  title,
  subtitle,
  avatars,
  messages,
  draft,
  setDraft,
  onSend,
  onClose
}: {
  title: string;
  subtitle: string;
  avatars: User[];
  messages: ChatMessage[];
  draft: string;
  setDraft: (text: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="bottom-sheet chat-bottom-sheet" role="dialog" aria-modal="true" aria-label={`${title} 채팅`} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="chat-sheet-header">
          <div className="connection-avatar-stack">
            {avatars.slice(0, 4).map((user) => (
              <UserAvatar key={user.id} user={user} className="participant-avatar" />
            ))}
          </div>
          <div className="min-w-0">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="icon-soft" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <div className="chat-sheet-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <MessageCircle size={22} />
              <span>아직 대화가 없어요.</span>
            </div>
          )}
          {messages.map((message) => {
            const mine = message.senderId === currentUser.id;
            return (
              <div key={message.id} className={`chat-line ${mine ? "mine" : ""}`}>
                {!mine && <UserAvatar user={getUser(message.senderId)} className="small" />}
                <div className={`chat-bubble ${mine ? "mine" : ""}`}>
                  <p>{message.text}</p>
                  <span>{message.createdAt}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="chat-sheet-input">
          <input
            ref={inputRef}
            className="chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSend();
            }}
            aria-label={`${title}에게 보낼 메시지`}
          />
          <button className="send-button" onClick={onSend} aria-label="보내기">
            <ChevronRight size={22} />
          </button>
        </div>
      </section>
    </div>
  );
}

function ChatsScreen({
  messages,
  friendIds,
  draft,
  setDraft,
  onSend
}: {
  messages: ChatMessage[];
  friendIds: string[];
  draft: string;
  setDraft: (text: string) => void;
  onSend: () => void;
}) {
  const friend = users.find((user) => friendIds.includes(user.id)) ?? users[1];
  return (
    <div className="flex min-h-full flex-col px-4 pb-4 pt-4">
      <section className="chat-header">
        <UserAvatar user={friend} className="active" />
        <div>
          <h2 className="text-[20px] font-extrabold text-ink">{friend.nickname}</h2>
          <p className="helper-copy">친구와 번개방에서 이어지는 가벼운 대화</p>
        </div>
      </section>
      <div className="mt-4 space-y-3">
        {messages.map((message) => {
          const mine = message.senderId === currentUser.id;
          return (
            <div key={message.id} className={`chat-bubble ${mine ? "mine" : ""}`}>
              <p>{message.text}</p>
              <span>{message.createdAt}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto pt-5">
        <div className="rounded-[24px] bg-white p-3 shadow-card">
          <div className="flex items-center gap-2">
            <input
              className="chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSend();
              }}
              aria-label="채팅 메시지"
            />
            <button className="send-button" onClick={onSend} aria-label="보내기">
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlbumScreen({
  albumItems,
  setlogs,
  selectedSetlogIds,
  setSelectedSetlogIds,
  baseSetlogId,
  setBaseSetlogId,
  onOpenAi
}: {
  albumItems: AlbumItem[];
  setlogs: Setlog[];
  selectedSetlogIds: string[];
  setSelectedSetlogIds: (ids: string[]) => void;
  baseSetlogId: string;
  setBaseSetlogId: (id: string) => void;
  onOpenAi: () => void;
}) {
  const toggle = (id: string) => {
    setSelectedSetlogIds(selectedSetlogIds.includes(id) ? selectedSetlogIds.filter((item) => item !== id) : [...selectedSetlogIds, id]);
  };
  return (
    <div className="space-y-5 px-4 pb-4 pt-4">
      <section className="ai-hero">
        <div>
          <p className="text-[12px] font-extrabold text-coral">함께한 기억</p>
          <h2 className="page-title">밋업 나우!</h2>
          <p className="helper-copy">각자의 순간을 한 장소의 사진처럼 모아요.</p>
        </div>
        <button className="accent-button" onClick={onOpenAi} disabled={selectedSetlogIds.length < 2}>
          <Wand2 size={18} />
          밋업 나우!
        </button>
      </section>
      <section className="space-y-3">
        <h3 className="section-title">밋업에 담을 로그</h3>
        <div className="select-grid">
          {setlogs.slice(0, 6).map((setlog) => (
            <div
              key={setlog.id}
              className={`select-card ${selectedSetlogIds.includes(setlog.id) ? "selected" : ""} ${baseSetlogId === setlog.id ? "base" : ""}`}
            >
              <button className="w-full text-left" onClick={() => toggle(setlog.id)}>
                <img src={setlog.thumbnailUrl} alt={`${getUser(setlog.userId).nickname} 로그`} />
                <strong>{getUser(setlog.userId).nickname}</strong>
              </button>
              <button
                className="base-button"
                onClick={() => setBaseSetlogId(setlog.id)}
              >
                기준 장소
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="section-title">사진첩</h3>
        {albumItems.map((item) => (
          <article key={item.id} className="album-card">
            <img src={item.imageUrl} alt={item.title} />
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <strong>{item.title}</strong>
                <span className={item.type === "ai_group_photo" ? "ai-badge" : "frame-badge"}>
                  {item.type === "ai_group_photo" ? "함께" : "로그"}
                </span>
              </div>
              <p>{item.type === "ai_group_photo" ? "밋업 나우!로 만든 장면" : "다인가구에서 남긴 순간"}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function MoreScreen({
  nickname,
  activeFilter,
  activeTopic,
  friendCount,
  roomCount,
  albumCount
}: {
  nickname: string;
  activeFilter: Filter;
  activeTopic: TopicFilter;
  friendCount: number;
  roomCount: number;
  albumCount: number;
}) {
  const filterLabel = filters.find((filter) => filter.id === activeFilter)?.label ?? "전체";
  const topicLabel = topicFilters.find((topic) => topic.id === activeTopic)?.label ?? "전체";
  const [activeMoreAction, setActiveMoreAction] = useState<MoreAction | null>(null);

  return (
    <div className="more-screen">
      <section className="more-profile">
        <div className="more-profile-info">
          <UserAvatar user={currentUser} className="active more-profile-avatar" />
          <div className="min-w-0">
            <h2>{nickname}</h2>
            <p>{currentUser.cityLabel}에서 오늘의 로그를 남기는 중</p>
          </div>
        </div>
        <button className="ghost-button" onClick={() => setActiveMoreAction("profile")}>
          프로필 관리
          <ChevronRight size={16} />
        </button>
      </section>

      <section className="more-stats" aria-label="다인가구 사용 현황">
        <div>
          <strong>{friendCount}</strong>
          <span>친구</span>
        </div>
        <div>
          <strong>{roomCount}</strong>
          <span>번개방</span>
        </div>
        <div>
          <strong>{albumCount}</strong>
          <span>앨범</span>
        </div>
      </section>

      <section className="more-panel">
        <h3>내 로그 설정</h3>
        <div className="settings-list">
          <button className="settings-row" onClick={() => setActiveMoreAction("neighborhood")}>
            <span className="settings-icon">
              <MapPin size={18} />
            </span>
            <span>
              <strong>동네 범위</strong>
              <small>{currentUser.cityLabel}</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button className="settings-row" onClick={() => setActiveMoreAction("feed")}>
            <span className="settings-icon">
              <Users size={18} />
            </span>
            <span>
              <strong>피드 필터</strong>
              <small>{filterLabel} · {topicLabel}</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button className="settings-row" onClick={() => setActiveMoreAction("notifications")}>
            <span className="settings-icon">
              <Bell size={18} />
            </span>
            <span>
              <strong>알림</strong>
              <small>친구 로그와 번개방 참여 알림</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section className="more-panel">
        <h3>안전과 도움말</h3>
        <div className="settings-list">
          <button className="settings-row" onClick={() => setActiveMoreAction("reports")}>
            <span className="settings-icon coral">
              <ShieldCheck size={18} />
            </span>
            <span>
              <strong>신고 내역</strong>
              <small>접수한 신고와 처리 상태</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button className="settings-row" onClick={() => setActiveMoreAction("support")}>
            <span className="settings-icon coral">
              <MessageCircle size={18} />
            </span>
            <span>
              <strong>문의하기</strong>
              <small>서비스 이용 중 불편한 점 보내기</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section className="more-version">
        <img src={brandLogo} alt="다인가구" />
        <span>오늘도 함께 기록 중</span>
      </section>
      {activeMoreAction && (
        <MoreActionSheet
          action={activeMoreAction}
          nickname={nickname}
          filterLabel={filterLabel}
          topicLabel={topicLabel}
          friendCount={friendCount}
          roomCount={roomCount}
          albumCount={albumCount}
          onClose={() => setActiveMoreAction(null)}
        />
      )}
    </div>
  );
}

function MoreActionSheet({
  action,
  nickname,
  filterLabel,
  topicLabel,
  friendCount,
  roomCount,
  albumCount,
  onClose
}: {
  action: MoreAction;
  nickname: string;
  filterLabel: string;
  topicLabel: string;
  friendCount: number;
  roomCount: number;
  albumCount: number;
  onClose: () => void;
}) {
  const content: Record<MoreAction, { title: string; icon: typeof Users; body: React.ReactNode }> = {
    profile: {
      title: "프로필 관리",
      icon: Users,
      body: (
        <>
          <section className="more-action-profile">
            <UserAvatar user={currentUser} className="active more-action-avatar" />
            <div className="min-w-0">
              <h3>{nickname}</h3>
              <p>{currentUser.cityLabel} · 여성 · 익명 프로필</p>
            </div>
          </section>
          <div className="more-action-grid">
            <span>닉네임</span>
            <strong>{nickname}</strong>
            <span>프로필 공개</span>
            <strong>친구와 동네</strong>
            <span>소개</span>
            <strong>{currentUser.bio}</strong>
          </div>
        </>
      )
    },
    neighborhood: {
      title: "동네 범위",
      icon: MapPin,
      body: (
        <>
          <div className="more-action-map">
            <MapPin size={26} />
            <strong>{currentUser.cityLabel}</strong>
          </div>
          <div className="segmented">
            <button className="active">가까운 동네</button>
            <button>넓게 보기</button>
          </div>
          <p className="more-action-copy">현재 동네를 중심으로 번개방과 공개 로그를 먼저 보여주고 있어요.</p>
        </>
      )
    },
    feed: {
      title: "피드 필터",
      icon: Users,
      body: (
        <>
          <div className="more-action-grid">
            <span>관계 필터</span>
            <strong>{filterLabel}</strong>
            <span>로그 주제</span>
            <strong>{topicLabel}</strong>
            <span>정렬</span>
            <strong>최근 올라온 순</strong>
          </div>
          <div className="more-action-chips">
            {filters.map((filter) => (
              <span key={filter.id} className={filter.label === filterLabel ? "active" : ""}>{filter.label}</span>
            ))}
          </div>
        </>
      )
    },
    notifications: {
      title: "알림 설정",
      icon: Bell,
      body: (
        <div className="more-toggle-list">
          <div><span>친구 새 로그</span><strong>켜짐</strong></div>
          <div><span>번개방 참여</span><strong>켜짐</strong></div>
          <div><span>밋업 나우! 완료</span><strong>켜짐</strong></div>
        </div>
      )
    },
    reports: {
      title: "신고 내역",
      icon: ShieldCheck,
      body: (
        <div className="more-timeline">
          <article>
            <strong>접수된 신고가 없어요</strong>
            <p>불편한 로그를 신고하면 이곳에서 처리 상태를 확인할 수 있어요.</p>
          </article>
          <article>
            <strong>Gemini 안전 검토 활성화</strong>
            <p>이미지와 채팅을 실시간으로 살피고 있어요.</p>
          </article>
        </div>
      )
    },
    support: {
      title: "문의하기",
      icon: MessageCircle,
      body: (
        <>
          <textarea className="textarea" defaultValue="다인가구를 사용하면서 궁금한 점이 있어요." rows={4} />
          <button className="primary-button" onClick={onClose}>
            문의 보내기
          </button>
        </>
      )
    }
  };
  const selected = content[action];
  const Icon = selected.icon;

  return (
    <BottomSheet title={selected.title} onClose={onClose}>
      <section className="more-action-summary">
        <span>
          <Icon size={22} />
        </span>
        <div>
          <strong>{friendCount}명 친구 · {roomCount}개 번개방</strong>
          <p>{albumCount}개의 사진과 로그가 연결되어 있어요.</p>
        </div>
      </section>
      {selected.body}
    </BottomSheet>
  );
}

function SetlogCard({
  setlog,
  isFriend,
  isLiked,
  onReport,
  onToggleLike,
  onOpenProfile
}: {
  setlog: Setlog;
  isFriend: boolean;
  isLiked: boolean;
  onReport: (setlogId: string) => void;
  onToggleLike: (setlogId: string) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const user = getUser(setlog.userId);
  const isUploadingSetlog = setlog.uploadState === "uploading" || setlog.uploadState === "reviewing";
  const isFailedSetlog = setlog.uploadState === "failed";
  const stateLabel = isFailedSetlog ? setlog.uploadMessage : isUploadingSetlog ? setlog.uploadMessage ?? "업로드 및 검토 중" : "";
  const canOpenProfile = !setlog.uploadState;
  return (
    <article
      className={`log-card ${canOpenProfile ? "clickable" : ""} ${isUploadingSetlog ? "reviewing" : ""} ${isFailedSetlog ? "failed" : ""}`}
      onClick={canOpenProfile ? () => onOpenProfile(setlog.userId) : undefined}
    >
      <div className="media-wrap">
        {setlog.mediaUrl ? (
          <video src={setlog.mediaUrl} poster={setlog.thumbnailUrl} autoPlay muted loop playsInline />
        ) : (
          <img src={setlog.thumbnailUrl} alt={`${user.nickname}의 로그`} />
        )}
        {stateLabel && (
          <div className={`upload-state-badge ${isFailedSetlog ? "failed" : ""}`}>
            {isUploadingSetlog && <span className="upload-spinner" />}
            <span>{stateLabel}</span>
          </div>
        )}
        <div className="video-social-overlay">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <UserAvatar user={user} className={`video-avatar ${isFriend ? "recent" : ""}`} />
              <div className="min-w-0">
                <strong>{user.nickname}</strong>
                <span>
                  <MapPin size={12} />
                  {setlog.cityLabel}
                </span>
              </div>
            </div>
            <p>{setlog.caption}</p>
          </div>
          {setlog.moderationStatus === "approved" && (
            <div className="video-actions">
              <button
                className={`video-action like ${isLiked ? "active" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleLike(setlog.id);
                }}
                aria-label={isLiked ? "하트 취소" : "하트"}
              >
                <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                <span>{setlog.likeCount}</span>
              </button>
              <button
                className="video-action"
                onClick={(event) => {
                  event.stopPropagation();
                  onReport(setlog.id);
                }}
                aria-label="신고하기"
              >
                <Flag size={17} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function RoomCard({ room, compact = false, onJoin }: { room: Room; compact?: boolean; onJoin: (roomId: string) => void }) {
  const meta = roomMeta[room.template];
  const Icon = meta.icon;
  const host = getUser(room.creatorId);
  const participants = room.participantIds.map(getUser);
  return (
    <article className={`room-card ${compact ? "compact" : ""}`}>
      <div className="room-media">
        <img src={room.thumbnailUrl} alt={`${room.title} 로그`} />
        <span className="room-icon">
          <Icon size={17} />
        </span>
      </div>
      <div className="room-content">
        <div>
          <div className="room-title-row">
            <strong>{room.title}</strong>
            <span>{room.expiresInMinutes}분</span>
          </div>
          <p className="room-message">{room.message}</p>
        </div>
        <div className="room-footer">
          <div className="room-meta">
            <span>
              <MapPin size={13} />
              {room.cityLabel}
            </span>
            <span>{room.participantIds.length}명</span>
          </div>
          <div className="room-actions-row">
            <div className="participant-stack" aria-label="참여한 사람">
              {participants.slice(0, 4).map((participant) => (
                <UserAvatar key={participant.id} user={participant} className="participant-avatar" />
              ))}
            </div>
            <button className="join-button" onClick={() => onJoin(room.id)}>
              참여
            </button>
          </div>
        </div>
        {!compact && <p className="text-[11px] font-semibold text-muted">호스트 {host.nickname} · {meta.caption}</p>}
      </div>
    </article>
  );
}

function BottomNav({ activeTab, onTab }: { activeTab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="하단 내비게이션">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        const capture = tab.id === "capture";
        return (
          <button
            key={tab.id}
            className={`${capture ? "nav-capture" : "nav-item"} ${active ? "active" : ""}`}
            onClick={() => onTab(tab.id)}
          >
            <Icon size={capture ? 28 : 21} />
            {!capture && <span>{tab.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}

function UploadSheet({
  caption,
  setCaption,
  visibility,
  setVisibility,
  uploadStatus,
  isUploading,
  onClose,
  onSubmit
}: {
  caption: string;
  setCaption: (caption: string) => void;
  visibility: Visibility;
  setVisibility: (visibility: Visibility) => void;
  uploadStatus: string;
  isUploading: boolean;
  onClose: () => void;
  onSubmit: (capture: RecordedSetlogCapture) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const firstThumbnailRef = useRef<string | null>(null);
  const suggestionRequestRef = useRef(0);
  const [cameraState, setCameraState] = useState<"requesting" | "ready" | "recording" | "recorded" | "denied" | "unsupported">("requesting");
  const [capture, setCapture] = useState<RecordedSetlogCapture | null>(null);
  const [captionSuggestion, setCaptionSuggestion] = useState<CaptionSuggestionState>({ status: "idle" });

  const stopTimers = () => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const requestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setCameraState("unsupported");
      return;
    }

    setCameraState("requesting");
    setCapture(null);
    suggestionRequestRef.current += 1;
    setCaptionSuggestion({ status: "idle" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraState("ready");
    } catch {
      setCameraState("denied");
    }
  };

  useEffect(() => {
    void requestCamera();

    return () => {
      suggestionRequestRef.current += 1;
      stopTimers();
      recorderRef.current = null;
      stopCamera();
    };
  }, []);

  const captureThumbnail = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return media.dinnerB;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  };

  const requestCaptionSuggestion = async (thumbnailUrl: string) => {
    const requestId = suggestionRequestRef.current + 1;
    suggestionRequestRef.current = requestId;
    setCaptionSuggestion({ status: "loading" });
    try {
      const imageBlob = await dataUrlToBlob(thumbnailUrl);
      if (suggestionRequestRef.current !== requestId) return;
      const suggestion = await api.suggestSetlogCaption(imageBlob);
      if (suggestionRequestRef.current !== requestId) return;
      if (!suggestion) {
        setCaptionSuggestion({ status: "failed", message: "추천을 불러오지 못했어요." });
        return;
      }
      if (suggestion.safetyStatus === "blocked") {
        setCaptionSuggestion({ status: "blocked", message: suggestion.reason || "이 장면으로는 추천을 만들 수 없어요." });
        return;
      }
      if (suggestion.suggestedCaption) {
        setCaptionSuggestion({ status: "ready", caption: suggestion.suggestedCaption });
        return;
      }
      setCaptionSuggestion({ status: "failed", message: "추천을 불러오지 못했어요." });
    } catch {
      if (suggestionRequestRef.current === requestId) {
        setCaptionSuggestion({ status: "failed", message: "추천을 불러오지 못했어요." });
      }
    }
  };

  const startRecording = async () => {
    if (cameraState === "recording") return;
    if (!streamRef.current) {
      await requestCamera();
      if (!streamRef.current) return;
    }

    const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) =>
      MediaRecorder.isTypeSupported(type)
    );
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorderRef.current = recorder;
    firstThumbnailRef.current = captureThumbnail();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      stopTimers();
      const type = (recorder.mimeType || "video/webm").split(";", 1)[0] || "video/webm";
      const videoBlob = new Blob(chunksRef.current, { type });
      const videoUrl = URL.createObjectURL(videoBlob);
      const thumbnailUrl = firstThumbnailRef.current ?? captureThumbnail();
      setCapture({ videoBlob, videoUrl, thumbnailUrl });
      void requestCaptionSuggestion(thumbnailUrl);
      setCameraState("recorded");
      stopCamera();
    };

    setCapture(null);
    setCaptionSuggestion({ status: "idle" });
    setCameraState("recording");
    recorder.start();
    stopTimerRef.current = window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, SETLOG_DURATION_SECONDS * 1000);
  };

  const previewLabel =
    cameraState === "recording"
      ? "녹화 중"
      : cameraState === "recorded"
        ? "녹화 완료"
        : cameraState === "ready"
          ? "카메라 준비"
          : "카메라 준비";

  const helperText =
    cameraState === "requesting"
      ? "카메라 권한을 요청하고 있어요."
      : cameraState === "denied"
        ? "브라우저에서 카메라 권한을 허용해 주세요."
        : cameraState === "unsupported"
          ? "이 브라우저에서는 카메라 녹화를 지원하지 않아요."
          : cameraState === "recording"
            ? "녹화 중이에요."
            : cameraState === "recorded"
              ? "녹화된 로그를 올릴 수 있어요."
              : "버튼을 눌러 로그를 남겨보세요.";

  return (
    <BottomSheet title="로그 찍기" onClose={onClose}>
      <div className="upload-preview camera-preview">
        {capture ? (
          <video src={capture.videoUrl} poster={capture.thumbnailUrl} controls playsInline />
        ) : (
          <video ref={videoRef} autoPlay muted playsInline />
        )}
        <div>{previewLabel}</div>
      </div>
      <div className="camera-controls">
        <button
          className={cameraState === "recording" ? "record-button recording" : "record-button"}
          onClick={cameraState === "recorded" ? requestCamera : startRecording}
          disabled={cameraState === "requesting" || cameraState === "unsupported" || cameraState === "recording"}
        >
          <Camera size={18} />
          {cameraState === "recorded" ? "다시 찍기" : cameraState === "recording" ? "촬영 중" : "촬영 시작"}
        </button>
        <span className="camera-state">{helperText}</span>
      </div>
      <label className="field-label">한 줄 상태</label>
      <textarea className="textarea" value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} />
      {captionSuggestion.status !== "idle" && (
        <div className={`caption-suggestion ${captionSuggestion.status}`}>
          <span className="caption-suggestion-icon">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0">
            <strong>추천 한 줄</strong>
            {captionSuggestion.status === "loading" && <p>첫 장면을 보고 추천을 만들고 있어요.</p>}
            {captionSuggestion.status === "ready" && <p>{captionSuggestion.caption}</p>}
            {captionSuggestion.status === "blocked" && <p>{captionSuggestion.message}</p>}
            {captionSuggestion.status === "failed" && <p>{captionSuggestion.message}</p>}
          </div>
          {captionSuggestion.status === "ready" && (
            <button className="suggestion-apply" onClick={() => setCaption(captionSuggestion.caption)}>
              적용
            </button>
          )}
        </div>
      )}
      <label className="field-label">공개 범위</label>
      <div className="segmented">
        <button className={visibility === "public" ? "active" : ""} onClick={() => setVisibility("public")}>공개</button>
        <button className={visibility === "friends" ? "active" : ""} onClick={() => setVisibility("friends")}>친구만</button>
      </div>
      {isUploading && uploadStatus && (
        <div className="notice-box">
          <ShieldCheck size={17} />
          <span>{uploadStatus}</span>
        </div>
      )}
      <button className="primary-button" onClick={() => capture && onSubmit(capture)} disabled={isUploading || !capture || cameraState === "recording"}>
        <ShieldCheck size={18} />
        {isUploading ? "올리는 중" : "다인가구에 올리기"}
      </button>
    </BottomSheet>
  );
}

function RoomSheet({
  roomTemplate,
  setRoomTemplate,
  message,
  setMessage,
  roomHours,
  setRoomHours,
  friends,
  selectedFriendIds,
  setSelectedFriendIds,
  onClose,
  onSubmit
}: {
  roomTemplate: RoomTemplate;
  setRoomTemplate: (template: RoomTemplate) => void;
  message: string;
  setMessage: (message: string) => void;
  roomHours: 1 | 2 | 3;
  setRoomHours: (hours: 1 | 2 | 3) => void;
  friends: User[];
  selectedFriendIds: string[];
  setSelectedFriendIds: (ids: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const toggleFriend = (id: string) => {
    setSelectedFriendIds(selectedFriendIds.includes(id) ? selectedFriendIds.filter((item) => item !== id) : [...selectedFriendIds, id]);
  };

  return (
    <BottomSheet title="그룹 만들기" onClose={onClose}>
      <div className="space-y-2">
        {(Object.keys(roomMeta) as RoomTemplate[]).map((template) => {
          const Icon = roomMeta[template].icon;
          return (
            <button key={template} className={`sheet-row ${roomTemplate === template ? "selected" : ""}`} onClick={() => setRoomTemplate(template)}>
              <span className={`template-icon ${roomMeta[template].tone}`}>
                <Icon size={18} />
              </span>
              <span>
                <strong>{templateTitle(template)}</strong>
                <small>{roomMeta[template].caption}</small>
              </span>
            </button>
          );
        })}
      </div>
      <label className="field-label">한 줄 메시지</label>
      <input className="text-input" value={message} onChange={(event) => setMessage(event.target.value)} />
      <div className="flex items-center justify-between">
        <label className="field-label">친구 초대</label>
        <span className="text-[12px] font-extrabold text-muted">{selectedFriendIds.length}명 선택</span>
      </div>
      <div className="friend-picker">
        {friends.map((friend) => {
          const selected = selectedFriendIds.includes(friend.id);
          return (
            <button key={friend.id} className={`friend-pick-row ${selected ? "selected" : ""}`} onClick={() => toggleFriend(friend.id)}>
              <UserAvatar user={friend} />
              <span>
                <strong>{friend.nickname}</strong>
                <small>{friend.cityLabel}</small>
              </span>
              <span className="pick-check">{selected ? "선택됨" : "초대"}</span>
            </button>
          );
        })}
      </div>
      <label className="field-label">만료 시간</label>
      <div className="segmented">
        {[1, 2, 3].map((value) => (
          <button key={value} className={roomHours === value ? "active" : ""} onClick={() => setRoomHours(value as 1 | 2 | 3)}>
            {value}시간
          </button>
        ))}
      </div>
      <div className="notice-box">
        <Clock3 size={17} />
        <span>{roomHours}시간 동안 열려 있어요.</span>
      </div>
      <button className="primary-button" onClick={onSubmit}>
        <Users size={18} />
        그룹 열기
      </button>
    </BottomSheet>
  );
}

function AiSheet({
  selectedSetlogs,
  baseSetlogId,
  setBaseSetlogId,
  aiStyle,
  setAiStyle,
  generation,
  onClose,
  onGenerate,
  isGenerating
}: {
  selectedSetlogs: Setlog[];
  baseSetlogId: string;
  setBaseSetlogId: (id: string) => void;
  aiStyle: AiStyle;
  setAiStyle: (style: AiStyle) => void;
  generation: AiGenerationState;
  onClose: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const base = selectedSetlogs.find((setlog) => setlog.id === baseSetlogId) ?? selectedSetlogs[0];
  return (
    <BottomSheet title="밋업 나우!" onClose={onClose}>
      <div className="ai-style-switch" aria-label="밋업 나우 스타일">
        <button className={aiStyle === "default" ? "active" : ""} onClick={() => setAiStyle("default")} disabled={isGenerating}>
          <span>기본</span>
          <strong>한 장소에 함께</strong>
        </button>
        <button className={aiStyle === "memo" ? "active" : ""} onClick={() => setAiStyle("memo")} disabled={isGenerating}>
          <span>메모</span>
          <strong>흰색 손글씨 주석</strong>
        </button>
        <button className={aiStyle === "3d" ? "active" : ""} onClick={() => setAiStyle("3d")} disabled={isGenerating}>
          <span>3D</span>
          <strong>공간 재구성</strong>
        </button>
      </div>
      <div className="ai-preview">
        {selectedSetlogs.map((setlog) => (
          <button
            key={setlog.id}
            type="button"
            className={setlog.id === base?.id ? "base" : ""}
            onClick={() => setBaseSetlogId(setlog.id)}
            disabled={isGenerating}
            aria-pressed={setlog.id === base?.id}
          >
            {setlog.mediaType === "video" && setlog.mediaUrl ? (
              <video src={setlog.mediaUrl} poster={setlog.thumbnailUrl} muted loop playsInline autoPlay />
            ) : (
              <img src={setlog.thumbnailUrl} alt={`${getUser(setlog.userId).nickname} 로그`} />
            )}
            <span>{setlog.id === base?.id ? "기준 장소" : getUser(setlog.userId).nickname}</span>
          </button>
        ))}
      </div>
      {generation.status !== "idle" && (
        <section className={`ai-generation-card ${generation.status}`}>
          {generation.status === "base-generating" && <div className="ai-generation-placeholder"><span /></div>}
          {"imageUrl" in generation && generation.imageUrl && (
            <div className="ai-generation-image">
              <img src={generation.imageUrl} alt={generation.status === "completed" ? generation.title : "생성 중인 밋업 사진"} />
              {generation.status === "memo-generating" && (
                <span className="ai-generation-badge">
                  <Sparkles size={14} />
                  {generation.style === "3d" ? "3D 생성 중" : "메모 생성 중"}
                </span>
              )}
            </div>
          )}
          <div>
            <strong>{generation.status === "completed" ? generation.title : generation.status === "failed" ? "생성 확인 필요" : "이미지 생성 중"}</strong>
            <p>{generation.message}</p>
          </div>
        </section>
      )}
      <div className="credit-panel">
        <span>크레딧: 10개</span>
        <strong>사용 시 1개 차감</strong>
      </div>
      <div className="notice-box">
        <Sparkles size={17} />
        <span>
          {aiStyle === "memo"
            ? "기본 사진을 만든 뒤 손글씨 메모 버전을 이어서 만들어요."
            : aiStyle === "3d"
              ? "기본 사진을 만든 뒤 고품질 3D 재구성 버전을 이어서 만들어요."
              : "각자의 셋로그를 한 장소에 실제로 모인 사진처럼 만들어볼까요?"}
        </span>
      </div>
      <div className="confirm-actions">
        <button className="ghost-button" onClick={onClose} disabled={isGenerating}>
          아니요
        </button>
        <button className="accent-button" onClick={onGenerate} disabled={isGenerating}>
          <Wand2 size={18} />
          {isGenerating ? "만드는 중" : aiStyle === "memo" ? "메모 버전 만들기" : aiStyle === "3d" ? "3D 버전 만들기" : "예, 만들기"}
        </button>
      </div>
    </BottomSheet>
  );
}

function ProfileSheet({
  user,
  isFriend,
  setlogs,
  onClose,
  onAddFriend
}: {
  user: User;
  isFriend: boolean;
  setlogs: Setlog[];
  onClose: () => void;
  onAddFriend: () => void;
}) {
  const latest = setlogs[0];
  const topicLabel = latest ? (topicFilters.find((topic) => topic.id === latest.topic)?.label ?? "로그") : "로그";

  return (
    <BottomSheet title="프로필" onClose={onClose}>
      <section className="profile-card">
        <div className="profile-hero">
          <img src={user.profileImageUrl} alt="" />
          <div className="profile-hero-shade" />
          <div className="profile-hero-copy">
            <UserAvatar user={user} className="profile-avatar-lg" />
            <div className="min-w-0">
              <h3>{user.nickname}</h3>
              <p>{user.cityLabel}</p>
            </div>
          </div>
        </div>
        <p className="profile-bio">{user.bio}</p>
        <div className="profile-stats">
          <div>
            <strong>{setlogs.length}</strong>
            <span>로그</span>
          </div>
          <div>
            <strong>{topicLabel}</strong>
            <span>최근 주제</span>
          </div>
          <div>
            <strong>{isFriend ? "친구" : "새 연결"}</strong>
            <span>상태</span>
          </div>
        </div>
      </section>

      {latest && (
        <article className="profile-latest-log">
          {latest.mediaUrl && latest.mediaType === "video" ? (
            <video src={latest.mediaUrl} poster={latest.thumbnailUrl} autoPlay muted loop playsInline />
          ) : (
            <img src={latest.thumbnailUrl} alt={`${user.nickname} 최근 로그`} />
          )}
          <div className="min-w-0">
            <strong>최근 로그</strong>
            <p>{latest.caption}</p>
          </div>
        </article>
      )}

      <button className={isFriend ? "ghost-button w-full" : "primary-button"} onClick={isFriend ? onClose : onAddFriend}>
        <Users size={18} />
        {isFriend ? "이미 친구예요" : "친구 추가"}
      </button>
    </BottomSheet>
  );
}

function NotificationSheet({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheet title="알림" onClose={onClose}>
      <section className="notification-empty">
        <span>
          <Bell size={28} />
        </span>
        <h3>아직 알림이 없어요!</h3>
      </section>
    </BottomSheet>
  );
}

function ReportSheet({
  setlog,
  reason,
  setReason,
  detail,
  setDetail,
  onClose,
  onSubmit
}: {
  setlog: Setlog | null;
  reason: ReportReason;
  setReason: (reason: ReportReason) => void;
  detail: string;
  setDetail: (detail: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const user = setlog ? getUser(setlog.userId) : null;
  return (
    <BottomSheet title="신고하기" onClose={onClose}>
      <div className="report-target">
        {user && <UserAvatar user={user} />}
        <div className="min-w-0">
          <strong>{user?.nickname ?? "선택한 로그"}</strong>
          <p>{setlog?.caption ?? "신고할 로그를 확인하고 있어요."}</p>
        </div>
      </div>
      <label className="field-label">신고 사유</label>
      <div className="report-reason-grid">
        {reportReasons.map((item) => (
          <button
            key={item.id}
            className={`report-reason ${reason === item.id ? "selected" : ""}`}
            onClick={() => setReason(item.id)}
            type="button"
          >
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </button>
        ))}
      </div>
      <label className="field-label">상세 내용</label>
      <textarea
        className="textarea report-textarea"
        value={detail}
        onChange={(event) => setDetail(event.target.value)}
        placeholder="어떤 점이 불편했는지 상황을 적어주세요."
        rows={4}
        maxLength={260}
      />
      <div className="report-helper">
        <span>{detail.trim() ? "내용을 확인한 뒤 조치할게요." : "상황을 한 줄 이상 남겨주세요."}</span>
        <span>{detail.length}/260</span>
      </div>
      <button className="primary-button" onClick={onSubmit} disabled={!detail.trim()}>
        <Flag size={18} />
        신고 제출
      </button>
    </BottomSheet>
  );
}

function SafetyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="safety-backdrop" role="presentation" onClick={onClose}>
      <section className="safety-modal" role="dialog" aria-modal="true" aria-label="다인가구 안전 안내" onClick={(event) => event.stopPropagation()}>
        <div className="safety-orb">
          <ShieldCheck size={30} />
        </div>
        <div className="safety-copy">
          <span>Gemini 보호 모드</span>
          <h2>채팅과 이미지를 꼼꼼하게 확인하고 있어요</h2>
          <p>다인가구는 대화, 사진, 영상 로그, 신고 흐름을 함께 살펴서 혼자 사는 사람들이 안심하고 연결될 수 있도록 지켜요.</p>
        </div>

        <div className="safety-grid">
          <article>
            <span className="safety-icon">
              <MessageCircle size={18} />
            </span>
            <strong>채팅 확인</strong>
            <p>불쾌한 말투, 만남 강요, 개인정보 요청처럼 위험한 흐름을 세심하게 살펴요.</p>
          </article>
          <article>
            <span className="safety-icon coral">
              <ImagePlus size={18} />
            </span>
            <strong>이미지 확인</strong>
            <p>사진과 영상 로그에서 민감하거나 불편한 장면이 보이면 노출을 막을 수 있어요.</p>
          </article>
        </div>

        <div className="safety-status">
          <div>
            <Sparkles size={18} />
            <span>오늘 올라온 로그를 실시간으로 살피는 중</span>
          </div>
          <strong>안전</strong>
        </div>

        <button className="primary-button safety-close" onClick={onClose}>
          확인했어요
        </button>
      </section>
    </div>
  );
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="bottom-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-ink">{title}</h2>
          <button className="icon-soft" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </section>
    </div>
  );
}

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button className="icon-button" aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function UserAvatar({ user, className = "", label }: { user: User; className?: string; label?: string }) {
  return (
    <div className={`avatar ${className}`} aria-label={label ?? `${user.nickname} 프로필`}>
      <img src={user.profileImageUrl} alt="" />
    </div>
  );
}

function normalizeSetlogs(payload: unknown): Setlog[] {
  return getPayloadArray(payload)
    .map((item): Setlog | null => {
      if (!isRecord(item)) return null;
      const userId = pickString(item, ["userId", "user_id", "authorId"]) ?? pickNestedString(item, "user", "id") ?? "u_02";
      const visibility = pickString(item, ["visibility"]) === "friends" ? "friends" : "public";
      const moderation = pickString(item, ["moderationStatus", "moderation_status", "status"]);
      const caption = pickString(item, ["caption", "message", "text"]) ?? "방금 올라온 로그";
      return {
        id: pickString(item, ["id", "_id"]) ?? `remote_setlog_${Math.random().toString(36).slice(2)}`,
        userId,
        mediaType: "video",
        thumbnailUrl: pickString(item, ["thumbnailUrl", "thumbnail_url", "imageUrl", "image_url"]) ?? media.dinnerA,
        mediaUrl: pickString(item, ["mediaUrl", "media_url", "videoUrl", "video_url"]),
        caption,
        visibility,
        cityLabel: pickString(item, ["cityLabel", "city_label", "neighborhood"]) ?? getUser(userId).cityLabel,
        gender: toGender(pickString(item, ["gender"]) ?? getUser(userId).gender),
        topic: toLogTopic(pickString(item, ["topic", "logTopic", "log_topic", "category"]), caption),
        durationSeconds: toDuration(),
        hourSlot: pickString(item, ["hourSlot", "hour_slot"]) ?? "20:00",
        createdAt: pickString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
        moderationStatus: moderation === "blocked" ? "blocked" : moderation === "pending" ? "pending" : "approved",
        isFriend: Boolean(item.isFriend),
        likeCount: pickNumber(item, ["likeCount", "like_count", "likes"]) ?? 0
      } satisfies Setlog;
    })
    .filter((item): item is Setlog => item !== null);
}

function normalizeRooms(payload: unknown): Room[] {
  return getPayloadArray(payload)
    .map((item): Room | null => {
      if (!isRecord(item)) return null;
      const template = toRoomTemplate(pickString(item, ["template", "type"]));
      return {
        id: pickString(item, ["id", "_id"]) ?? `remote_room_${Math.random().toString(36).slice(2)}`,
        creatorId: pickString(item, ["creatorId", "creator_id", "hostId"]) ?? currentUser.id,
        template,
        title: pickString(item, ["title"]) ?? templateTitle(template),
        message: pickString(item, ["message", "caption", "description"]) ?? roomMeta[template].caption,
        cityLabel: pickString(item, ["cityLabel", "city_label", "neighborhood"]) ?? currentUser.cityLabel,
        expiresInMinutes: pickNumber(item, ["expiresInMinutes", "expires_in_minutes", "ttlMinutes"]) ?? 60,
        participantIds: pickStringArray(item, ["participantIds", "participant_ids"]) ?? [currentUser.id],
        status: pickString(item, ["status"]) === "expired" ? "expired" : pickString(item, ["status"]) === "closed" ? "closed" : "active",
        thumbnailUrl: pickString(item, ["thumbnailUrl", "thumbnail_url", "imageUrl", "image_url"]) ?? media.roomDinner
      } satisfies Room;
    })
    .filter((item): item is Room => item !== null);
}

function normalizeMessages(payload: unknown): ChatMessage[] {
  const items = getPayloadArray(payload);
  const threadMessages = items.flatMap((item) => {
    if (!isRecord(item)) return [];
    const messages = getPayloadArray(item.messages);
    if (messages.length) return messages;
    const latest = item.lastMessage ?? item.latestMessage ?? item.last_message ?? item.latest_message;
    return latest ? [latest] : [];
  });
  const source = threadMessages.length ? threadMessages : items;
  return source
    .map((item): ChatMessage | null => {
      if (!isRecord(item)) return null;
      return {
        id: pickString(item, ["id", "_id"]) ?? `remote_message_${Math.random().toString(36).slice(2)}`,
        roomId: pickString(item, ["roomId", "room_id", "chatId"]) ?? "c_01",
        senderId: pickString(item, ["senderId", "sender_id", "userId"]) ?? "u_02",
        text: pickString(item, ["text", "message", "body"]) ?? "",
        createdAt: pickString(item, ["createdAt", "created_at", "time"]) ?? "지금"
      } satisfies ChatMessage;
    })
    .filter((item): item is ChatMessage => item !== null && item.text.length > 0);
}

function normalizeAlbumItems(payload: unknown): AlbumItem[] {
  return getPayloadArray(payload)
    .map((item): AlbumItem | null => {
      if (!isRecord(item)) return null;
      const imageUrl = pickString(item, ["imageUrl", "image_url", "generatedImageUrl", "generated_image_url"]);
      if (!imageUrl) return null;
      return {
        id: pickString(item, ["id", "_id", "albumItemId", "album_item_id"]) ?? `remote_album_${Math.random().toString(36).slice(2)}`,
        title: pickString(item, ["title", "name"]) ?? "밋업 나우!",
        imageUrl,
        sourceSetlogIds: pickStringArray(item, ["sourceSetlogIds", "source_setlog_ids", "setlogIds", "setlog_ids"]) ?? [],
        type: pickString(item, ["type"]) === "setlog_frame" ? "setlog_frame" : "ai_group_photo",
        createdAt: pickString(item, ["createdAt", "created_at"]) ?? "방금"
      } satisfies AlbumItem;
    })
    .filter((item): item is AlbumItem => item !== null);
}

function getPayloadArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const candidates = [payload.items, payload.data, payload.setlogs, payload.rooms, payload.chats, payload.messages];
  const array = candidates.find(Array.isArray);
  return array ?? [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  const value = keys.map((key) => record[key]).find((candidate) => typeof candidate === "string");
  return typeof value === "string" && value.trim() ? value : undefined;
}

function pickNestedString(record: Record<string, unknown>, parentKey: string, childKey: string) {
  const parent = record[parentKey];
  if (!isRecord(parent)) return undefined;
  return pickString(parent, [childKey]);
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  const value = keys.map((key) => record[key]).find((candidate) => typeof candidate === "number");
  return typeof value === "number" ? value : undefined;
}

function pickStringArray(record: Record<string, unknown>, keys: string[]) {
  const value = keys.map((key) => record[key]).find(Array.isArray);
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function toDuration(): 4 {
  return SETLOG_DURATION_SECONDS;
}

function toGender(value: string): User["gender"] {
  if (value === "female" || value === "male") return value;
  return "other";
}

function toLogTopic(value: string | undefined, caption = ""): LogTopic {
  if (value === "meal" || value === "chat" || value === "walk") return value;
  return inferLogTopic(caption);
}

function inferLogTopic(text: string): LogTopic {
  if (["밥", "혼밥", "저녁", "식탁", "도시락", "샐러드"].some((word) => text.includes(word))) return "meal";
  if (["산책", "걷기", "한강", "뚝섬"].some((word) => text.includes(word))) return "walk";
  return "chat";
}

function toRoomTemplate(value: string | undefined): RoomTemplate {
  if (value === "after_work_chat_room" || value === "neighborhood_walk_room" || value === "meal_room" || value === "other_room") return value;
  if (value === "cafe" || value === "call") return "after_work_chat_room";
  if (value === "walk") return "neighborhood_walk_room";
  if (value === "other") return "other_room";
  return "meal_room";
}

function templateTitle(template: RoomTemplate) {
  if (template === "after_work_chat_room") return "퇴근 후 수다방";
  if (template === "neighborhood_walk_room") return "동네 산책방";
  if (template === "other_room") return "기타";
  return "혼밥방";
}

function thumbnailForRoomTemplate(template: RoomTemplate) {
  if (template === "neighborhood_walk_room") return "/uploads/seed/flash-walk.png";
  if (template === "after_work_chat_room") return "/uploads/seed/flash-chat.png";
  if (template === "other_room") return "/uploads/seed/flash-other.png";
  return "/uploads/seed/flash-meal.png";
}

function getUser(userId: string) {
  return users.find((user) => user.id === userId) ?? currentUser;
}

export default App;
