import {
  Bell,
  Camera,
  ChevronRight,
  Clock3,
  Flag,
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
  Wind
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api/client";
import brandLogo from "./assets/brand/daingagu-logo.webp";
import dogProfile from "./assets/profiles/dog.webp";
import seoulLandscapeProfile from "./assets/profiles/seoul-landscape.webp";
import selfieWomanProfile from "./assets/profiles/selfie-woman.webp";
import selfieWomanAltProfile from "./assets/profiles/selfie-woman-alt.webp";
import roomChatThumbnail from "./assets/rooms/room-chat.webp";
import roomMealThumbnail from "./assets/rooms/room-meal.webp";
import roomWalkThumbnail from "./assets/rooms/room-walk.webp";

type Tab = "feed" | "rooms" | "capture" | "connections" | "more";
type Filter = "all" | "friends" | "sameGender" | "oppositeGender" | "nearby";
type ConnectionMode = "friends" | "groups";
type ConnectionTarget = { type: "friend"; id: string } | { type: "group"; id: string };
type LogTopic = "meal" | "chat" | "walk";
type TopicFilter = "all" | LogTopic;
type Visibility = "public" | "friends";
type ModerationStatus = "pending" | "approved" | "blocked";
type RoomTemplate = "meal_room" | "after_work_chat_room" | "neighborhood_walk_room";

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

type ReportReason = "inappropriate" | "harassment" | "privacy" | "spam" | "pressure" | "other";

const SETLOG_DURATION_SECONDS = 4;

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
    isFriend: true
  },
  {
    id: "s_02",
    userId: "u_04",
    mediaType: "video",
    thumbnailUrl: mockVideos.roomDinner.poster,
    mediaUrl: mockVideos.roomDinner.video,
    caption: "모래언덕에서 ATV 타니까 속이 뻥 뚫린다",
    visibility: "public",
    cityLabel: "성수",
    gender: "female",
    topic: "walk",
    durationSeconds: SETLOG_DURATION_SECONDS,
    hourSlot: "20:00",
    createdAt: "2026-05-09T11:03:00.000Z",
    moderationStatus: "approved",
    isFriend: false
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
    isFriend: false
  },
  {
    id: "s_04",
    userId: "u_01",
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
    isFriend: true
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
    isFriend: true
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
    thumbnailUrl: roomMealThumbnail
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
    thumbnailUrl: roomChatThumbnail
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
    thumbnailUrl: roomWalkThumbnail
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
  }
};

const tabs: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: "feed", label: "피드", icon: Home },
  { id: "rooms", label: "번개", icon: Users },
  { id: "capture", label: "만들기", icon: Camera },
  { id: "connections", label: "친구", icon: MessageCircle },
  { id: "more", label: "더보기", icon: MoreHorizontal }
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [activeTopic, setActiveTopic] = useState<TopicFilter>("all");
  const [nickname, setNickname] = useState(currentUser.nickname);
  const [loginName, setLoginName] = useState(currentUser.nickname);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [setlogs, setSetlogs] = useState<Setlog[]>(initialSetlogs);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [friendIds] = useState<string[]>(["u_02", "u_04"]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatDraft, setChatDraft] = useState("오늘 저녁 같이 남겨볼래요?");
  const [albumItems, setAlbumItems] = useState<AlbumItem[]>([
    {
      id: "a_01",
      title: "친구들과 남긴 저녁",
      imageUrl: media.dinnerA,
      sourceSetlogIds: ["s_01"],
      type: "setlog_frame",
      createdAt: "20:00"
    },
    {
      id: "a_02",
      title: "내 작은 식탁",
      imageUrl: media.dinnerB,
      sourceSetlogIds: ["s_04"],
      type: "setlog_frame",
      createdAt: "19:00"
    }
  ]);
  const [sheet, setSheet] = useState<null | "upload" | "room" | "ai">(null);
  const [toast, setToast] = useState("");
  const [caption, setCaption] = useState("혼밥 중, 같이 먹는 느낌이면 좋겠다");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [roomTemplate, setRoomTemplate] = useState<RoomTemplate>("meal_room");
  const [roomMessage, setRoomMessage] = useState("성수에서 지금 밥 먹는 사람들");
  const [roomHours, setRoomHours] = useState<1 | 2 | 3>(1);
  const [selectedSetlogIds, setSelectedSetlogIds] = useState<string[]>(["s_01", "s_04"]);
  const [baseSetlogId, setBaseSetlogId] = useState("s_04");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("새 로그를 준비 중이에요");
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("inappropriate");
  const [reportDetail, setReportDetail] = useState("");

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
      if (nextSetlogs.length) setSetlogs(nextSetlogs);

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
    return approvedSetlogs.filter((setlog) => {
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
  }, [activeFilter, activeTopic, approvedSetlogs, friendIds]);

  const selectedSetlogs = useMemo(
    () => approvedSetlogs.filter((setlog) => selectedSetlogIds.includes(setlog.id)),
    [approvedSetlogs, selectedSetlogIds]
  );

  const reportTarget = useMemo(
    () => setlogs.find((setlog) => setlog.id === reportTargetId) ?? null,
    [reportTargetId, setlogs]
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

  const handleUpload = async (capture: RecordedSetlogCapture) => {
    setIsUploading(true);
    setUploadStatus("업로드 준비 중");
    const isBlocked = caption.toLowerCase().includes("blocked") || caption.includes("게시불가");
    const topic = inferLogTopic(caption);
    const newSetlog: Setlog = {
      id: `s_${Date.now()}`,
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
      hourSlot: "20:00",
      createdAt: new Date().toISOString(),
      moderationStatus: isBlocked ? "blocked" : "approved",
      isFriend: true
    };
    void api.createSetlogFormData({
      userId: currentUser.id,
      caption,
      visibility,
      topic,
      durationSeconds: SETLOG_DURATION_SECONDS,
      cityLabel: currentUser.cityLabel,
      thumbnailUrl: newSetlog.thumbnailUrl,
      media: capture.videoBlob,
      moderationProvider: "gemini"
    });
    setSetlogs((items) => [newSetlog, ...items]);
    setUploadStatus(isBlocked ? "게시할 수 없는 로그예요" : "새 로그가 올라갔어요");
    setIsUploading(false);
    setSheet(null);
    setActiveTab("feed");
    showToast(isBlocked ? "게시할 수 없는 로그예요" : "다인가구에 로그가 올라갔어요");
  };

  const handleCreateRoom = async () => {
    const templateTitle = roomTemplate === "meal_room" ? "혼밥방" : roomTemplate === "after_work_chat_room" ? "퇴근 후 수다방" : "동네 산책방";
    const newRoom: Room = {
      id: `r_${Date.now()}`,
      creatorId: currentUser.id,
      template: roomTemplate,
      title: templateTitle,
      message: roomMessage,
      cityLabel: currentUser.cityLabel,
      expiresInMinutes: roomHours * 60,
      participantIds: [currentUser.id],
      status: "active",
      thumbnailUrl: roomTemplate === "neighborhood_walk_room" ? media.walk : roomTemplate === "after_work_chat_room" ? media.cafe : media.dinnerB
    };
    await api.createRoom({
      creatorId: currentUser.id,
      template: roomTemplate,
      message: roomMessage,
      cityLabel: currentUser.cityLabel,
      expiresInMinutes: newRoom.expiresInMinutes
    });
    setRooms((items) => [newRoom, ...items]);
    setSheet(null);
    setActiveTab("rooms");
    showToast(`${templateTitle}이 열렸어요`);
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
        roomId: "c_01",
        senderId: "u_01",
        text: "방에 들어왔어요. 오늘의 로그를 나눠요.",
        createdAt: "지금"
      }
    ]);
    await api.joinRoom(roomId, currentUser.id);
    showToast("번개방에 참여했어요");
  };

  const handleSendMessage = () => {
    const text = chatDraft.trim();
    if (!text) return;
    setMessages((items) => [
      ...items,
      {
        id: `m_${Date.now()}`,
        roomId: "c_01",
        senderId: currentUser.id,
        text,
        createdAt: "지금"
      }
    ]);
    setChatDraft("");
  };

  const handleGenerateAiPhoto = async () => {
    setIsGenerating(true);
    await api.createAiPhoto({
      userId: currentUser.id,
      sourceSetlogIds: selectedSetlogIds,
      baseSetlogId,
      moderationProvider: "gemini",
      imageProvider: "gpt-image-2"
    });
    window.setTimeout(() => {
      setAlbumItems((items) => [
        {
          id: `a_${Date.now()}`,
          title: "성수 혼밥방에서 함께",
          imageUrl: media.generated,
          sourceSetlogIds: selectedSetlogIds,
          type: "ai_group_photo",
          createdAt: "지금"
        },
        ...items
      ]);
      setIsGenerating(false);
      setSheet(null);
      showToast("같이 있었던 사진이 완성됐어요");
    }, 900);
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
        />
        <div className="screen-scroll">
          {activeTab === "feed" && (
            <FeedScreen
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              activeTopic={activeTopic}
              setActiveTopic={setActiveTopic}
              setlogs={filteredSetlogs}
              rooms={rooms}
              friendIds={friendIds}
              onReport={handleReport}
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
              selectedSetlogIds={selectedSetlogIds}
              setSelectedSetlogIds={setSelectedSetlogIds}
              baseSetlogId={baseSetlogId}
              setBaseSetlogId={setBaseSetlogId}
              onOpenAi={() => setSheet("ai")}
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
            onClose={() => setSheet(null)}
            onSubmit={handleCreateRoom}
          />
        )}
        {sheet === "ai" && (
          <AiSheet
            selectedSetlogs={selectedSetlogs}
            baseSetlogId={baseSetlogId}
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
  onDemoLogin
}: {
  nickname: string;
  loginName: string;
  setLoginName: (name: string) => void;
  isLoggedIn: boolean;
  onDemoLogin: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/[0.04] bg-white/85 px-4 pb-3 pt-4 backdrop-blur-[18px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <img className="brand-logo" src={brandLogo} alt="다인가구" />
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="안전 상태">
            <ShieldCheck size={20} />
          </IconButton>
          <IconButton label="알림">
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
  setlogs,
  rooms,
  friendIds,
  onReport,
  onJoinRoom,
  onOpenRoomSheet
}: {
  activeFilter: Filter;
  setActiveFilter: (filter: Filter) => void;
  activeTopic: TopicFilter;
  setActiveTopic: (topic: TopicFilter) => void;
  setlogs: Setlog[];
  rooms: Room[];
  friendIds: string[];
  onReport: (setlogId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onOpenRoomSheet: () => void;
}) {
  return (
    <div className="space-y-5 px-4 pb-4 pt-4">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">동네에서 올라온 로그</h2>
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
            onReport={onReport}
          />
        ))}
      </section>
    </div>
  );
}

function RoomsScreen({ rooms, onCreate, onJoin }: { rooms: Room[]; onCreate: () => void; onJoin: (roomId: string) => void }) {
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
      <div className="template-grid">
        {(Object.keys(roomMeta) as RoomTemplate[]).map((template) => {
          const Icon = roomMeta[template].icon;
          const label = template === "meal_room" ? "혼밥방" : template === "after_work_chat_room" ? "퇴근 후 수다방" : "동네 산책방";
          return (
            <div className="template-card" key={template}>
              <span className={`template-icon ${roomMeta[template].tone}`}>
                <Icon size={18} />
              </span>
              <strong>{label}</strong>
              <span>{roomMeta[template].caption}</span>
            </div>
          );
        })}
      </div>
      <section className="space-y-3">
        {rooms.map((room) => (
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
  selectedSetlogIds,
  setSelectedSetlogIds,
  baseSetlogId,
  setBaseSetlogId,
  onOpenAi
}: {
  setlogs: Setlog[];
  rooms: Room[];
  friendIds: string[];
  messages: ChatMessage[];
  draft: string;
  setDraft: (text: string) => void;
  onSend: () => void;
  albumItems: AlbumItem[];
  selectedSetlogIds: string[];
  setSelectedSetlogIds: (ids: string[]) => void;
  baseSetlogId: string;
  setBaseSetlogId: (id: string) => void;
  onOpenAi: () => void;
}) {
  const friendUsers = users.filter((user) => friendIds.includes(user.id));
  const firstFriendId = friendUsers[0]?.id ?? currentUser.id;
  const firstGroupId = rooms[0]?.id ?? "r_01";
  const [mode, setMode] = useState<ConnectionMode>("friends");
  const [selectedTarget, setSelectedTarget] = useState<ConnectionTarget>({ type: "friend", id: firstFriendId });
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const activeTarget =
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
  const heroSetlog = targetSetlogs[0] ?? setlogs[0];
  const targetTitle = selectedFriend?.nickname ?? selectedRoom?.title ?? "친구";
  const targetSubtitle = selectedFriend
    ? `${selectedFriend.cityLabel} · ${targetSetlogs.length}개 로그`
    : `${selectedRoom?.cityLabel ?? currentUser.cityLabel} · ${selectedRoom?.participantIds.length ?? 1}명`;
  const targetAvatars = selectedFriend ? [selectedFriend, currentUser] : (selectedRoom?.participantIds ?? []).map(getUser);
  const recentMessages = messages.slice(-2);

  const switchMode = (nextMode: ConnectionMode) => {
    setMode(nextMode);
    setSelectedTarget(nextMode === "friends" ? { type: "friend", id: firstFriendId } : { type: "group", id: firstGroupId });
  };

  const toggleSetlog = (id: string) => {
    setSelectedSetlogIds(selectedSetlogIds.includes(id) ? selectedSetlogIds.filter((item) => item !== id) : [...selectedSetlogIds, id]);
  };

  const handleTargetPhoto = () => {
    const ids = targetSetlogs.slice(0, 4).map((setlog) => setlog.id);
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
          <p className="helper-copy">함께 남긴 로그와 사진을 한 곳에서 이어봐요.</p>
        </div>
      </section>

      <div className="connection-switch" aria-label="친구 또는 그룹 보기">
        <button className={mode === "friends" ? "active" : ""} onClick={() => switchMode("friends")}>
          친구
        </button>
        <button className={mode === "groups" ? "active" : ""} onClick={() => switchMode("groups")}>
          그룹
        </button>
      </div>

      <section className="connection-strip" aria-label={mode === "friends" ? "친구 목록" : "그룹 목록"}>
        {mode === "friends" &&
          friendUsers.map((friend) => {
            const count = setlogs.filter((setlog) => setlog.userId === friend.id).length;
            const selected = activeTarget.type === "friend" && activeTarget.id === friend.id;
            return (
              <button
                key={friend.id}
                className={`connection-card ${selected ? "selected" : ""}`}
                onClick={() => setSelectedTarget({ type: "friend", id: friend.id })}
              >
                <UserAvatar user={friend} className={selected ? "active" : ""} />
                <span>
                  <strong>{friend.nickname}</strong>
                  <small>{friend.cityLabel} · {count}개 로그</small>
                </span>
                <ChevronRight size={18} />
              </button>
            );
          })}
        {mode === "groups" &&
          rooms.map((room) => {
            const selected = activeTarget.type === "group" && activeTarget.id === room.id;
            const participants = room.participantIds.map(getUser);
            return (
              <button
                key={room.id}
                className={`connection-card group ${selected ? "selected" : ""}`}
                onClick={() => setSelectedTarget({ type: "group", id: room.id })}
              >
                <div className="connection-avatar-stack">
                  {participants.slice(0, 3).map((participant) => (
                    <UserAvatar key={participant.id} user={participant} className="participant-avatar" />
                  ))}
                </div>
                <span>
                  <strong>{room.title}</strong>
                  <small>{room.cityLabel} · {participants.length}명</small>
                </span>
                <ChevronRight size={18} />
              </button>
            );
          })}
      </section>

      <section className="connection-viewer">
        <div className="connection-media">
          {heroSetlog?.mediaUrl ? (
            <video src={heroSetlog.mediaUrl} poster={heroSetlog.thumbnailUrl} autoPlay muted loop playsInline />
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
              <span>{targetSubtitle}</span>
            </div>
            <div>
              <h3>{targetTitle}</h3>
              <p>{heroSetlog?.caption ?? "아직 올라온 로그가 없어요."}</p>
              <div className="viewer-actions">
                <button className="viewer-action" onClick={() => chatInputRef.current?.focus()}>
                  <MessageCircle size={17} />
                  채팅
                </button>
                <button className="viewer-action light" onClick={handleTargetPhoto} disabled={targetSetlogs.length < 2}>
                  <ImagePlus size={17} />
                  같이 사진
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="viewer-chat-panel">
          <div className="viewer-message-row">
            {recentMessages.map((message) => (
              <span key={message.id} className={message.senderId === currentUser.id ? "mine" : ""}>
                {message.text}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={chatInputRef}
              className="chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSend();
              }}
              aria-label={`${targetTitle}에게 보낼 메시지`}
            />
            <button className="send-button" onClick={onSend} aria-label="보내기">
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      </section>

      <section className="ai-hero">
        <div>
          <p className="text-[12px] font-extrabold text-coral">사진첩</p>
          <h3 className="section-title">같이 있었던 사진</h3>
          <p className="helper-copy">친구와 그룹 로그를 골라 한 장의 장면으로 만들어요.</p>
        </div>
        <button className="accent-button" onClick={onOpenAi} disabled={selectedSetlogIds.length < 2}>
          <Wand2 size={18} />
          만들기
        </button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="section-title">같이 담을 로그</h3>
          <span className="text-[12px] font-extrabold text-muted">{selectedSetlogIds.length}개 선택</span>
        </div>
        <div className="select-grid compact">
          {setlogs.slice(0, 6).map((setlog) => (
            <div
              key={setlog.id}
              className={`select-card ${selectedSetlogIds.includes(setlog.id) ? "selected" : ""} ${baseSetlogId === setlog.id ? "base" : ""}`}
            >
              <button className="w-full text-left" onClick={() => toggleSetlog(setlog.id)}>
                <img src={setlog.thumbnailUrl} alt={`${getUser(setlog.userId).nickname} 로그`} />
                <strong>{getUser(setlog.userId).nickname}</strong>
              </button>
              <button className="base-button" onClick={() => setBaseSetlogId(setlog.id)}>
                기준 장소
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="section-title">앨범</h3>
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
              <p>{item.type === "ai_group_photo" ? "같이 있었던 장면" : "다인가구에서 남긴 순간"}</p>
            </div>
          </article>
        ))}
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
          <h2 className="page-title">같이 있었던 사진</h2>
          <p className="helper-copy">각자의 순간을 한 장의 사진으로 모아요.</p>
        </div>
        <button className="accent-button" onClick={onOpenAi} disabled={selectedSetlogIds.length < 2}>
          <Wand2 size={18} />
          만들기
        </button>
      </section>
      <section className="space-y-3">
        <h3 className="section-title">같이 담을 로그</h3>
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
              <p>{item.type === "ai_group_photo" ? "같이 있었던 장면" : "다인가구에서 남긴 순간"}</p>
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
        <button className="ghost-button">
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
          <button className="settings-row">
            <span className="settings-icon">
              <MapPin size={18} />
            </span>
            <span>
              <strong>동네 범위</strong>
              <small>{currentUser.cityLabel}</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button className="settings-row">
            <span className="settings-icon">
              <Users size={18} />
            </span>
            <span>
              <strong>피드 필터</strong>
              <small>{filterLabel} · {topicLabel}</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button className="settings-row">
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
          <button className="settings-row">
            <span className="settings-icon coral">
              <ShieldCheck size={18} />
            </span>
            <span>
              <strong>신고 내역</strong>
              <small>접수한 신고와 처리 상태</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button className="settings-row">
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
    </div>
  );
}

function SetlogCard({
  setlog,
  isFriend,
  onReport
}: {
  setlog: Setlog;
  isFriend: boolean;
  onReport: (setlogId: string) => void;
}) {
  const user = getUser(setlog.userId);
  return (
    <article className="log-card">
      <div className="media-wrap">
        {setlog.mediaUrl ? (
          <video src={setlog.mediaUrl} poster={setlog.thumbnailUrl} autoPlay muted loop playsInline />
        ) : (
          <img src={setlog.thumbnailUrl} alt={`${user.nickname}의 로그`} />
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
          <div className="video-actions">
            <button className="video-action" onClick={() => onReport(setlog.id)} aria-label="신고하기">
              <Flag size={17} />
            </button>
          </div>
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
  const countdownTimerRef = useRef<number | null>(null);
  const [cameraState, setCameraState] = useState<"requesting" | "ready" | "recording" | "recorded" | "denied" | "unsupported">("requesting");
  const [remainingSeconds, setRemainingSeconds] = useState(SETLOG_DURATION_SECONDS);
  const [capture, setCapture] = useState<RecordedSetlogCapture | null>(null);

  const stopTimers = () => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
    stopTimerRef.current = null;
    countdownTimerRef.current = null;
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
      setRemainingSeconds(SETLOG_DURATION_SECONDS);
      setCameraState("ready");
    } catch {
      setCameraState("denied");
    }
  };

  useEffect(() => {
    void requestCamera();

    return () => {
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

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      stopTimers();
      const type = recorder.mimeType || "video/webm";
      const videoBlob = new Blob(chunksRef.current, { type });
      const videoUrl = URL.createObjectURL(videoBlob);
      const thumbnailUrl = captureThumbnail();
      setCapture({ videoBlob, videoUrl, thumbnailUrl });
      setCameraState("recorded");
      setRemainingSeconds(SETLOG_DURATION_SECONDS);
      stopCamera();
    };

    const startedAt = Date.now();
    setCapture(null);
    setRemainingSeconds(SETLOG_DURATION_SECONDS);
    setCameraState("recording");
    recorder.start();
    countdownTimerRef.current = window.setInterval(() => {
      const remainingMs = SETLOG_DURATION_SECONDS * 1000 - (Date.now() - startedAt);
      setRemainingSeconds(Math.max(0, Math.ceil(remainingMs / 1000)));
    }, 160);
    stopTimerRef.current = window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, SETLOG_DURATION_SECONDS * 1000);
  };

  const previewLabel =
    cameraState === "recording"
      ? `${remainingSeconds}초`
      : cameraState === "recorded"
        ? "녹화 완료"
        : cameraState === "ready"
          ? "4초 고정"
          : "카메라 준비";

  const helperText =
    cameraState === "requesting"
      ? "카메라 권한을 요청하고 있어요."
      : cameraState === "denied"
        ? "브라우저에서 카메라 권한을 허용해 주세요."
        : cameraState === "unsupported"
          ? "이 브라우저에서는 카메라 녹화를 지원하지 않아요."
          : cameraState === "recording"
            ? "녹화 중이에요. 4초 뒤 자동으로 멈춰요."
            : cameraState === "recorded"
              ? "녹화된 로그를 올릴 수 있어요."
              : "버튼을 누르면 4초 로그가 녹화돼요.";

  return (
    <BottomSheet title="4초 로그 찍기" onClose={onClose}>
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
          {cameraState === "recorded" ? "다시 찍기" : cameraState === "recording" ? "녹화 중" : "녹화 시작"}
        </button>
        <span className="camera-state">{helperText}</span>
      </div>
      <label className="field-label">한 줄 상태</label>
      <textarea className="textarea" value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} />
      <label className="field-label">공개 범위</label>
      <div className="segmented">
        <button className={visibility === "public" ? "active" : ""} onClick={() => setVisibility("public")}>공개</button>
        <button className={visibility === "friends" ? "active" : ""} onClick={() => setVisibility("friends")}>친구만</button>
      </div>
      <div className="notice-box">
        <ShieldCheck size={17} />
        <span>{uploadStatus}</span>
      </div>
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
  onClose,
  onSubmit
}: {
  roomTemplate: RoomTemplate;
  setRoomTemplate: (template: RoomTemplate) => void;
  message: string;
  setMessage: (message: string) => void;
  roomHours: 1 | 2 | 3;
  setRoomHours: (hours: 1 | 2 | 3) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <BottomSheet title="번개방 만들기" onClose={onClose}>
      <div className="space-y-2">
        {(Object.keys(roomMeta) as RoomTemplate[]).map((template) => {
          const Icon = roomMeta[template].icon;
          const label = template === "meal_room" ? "혼밥방" : template === "after_work_chat_room" ? "퇴근 후 수다방" : "동네 산책방";
          return (
            <button key={template} className={`sheet-row ${roomTemplate === template ? "selected" : ""}`} onClick={() => setRoomTemplate(template)}>
              <span className={`template-icon ${roomMeta[template].tone}`}>
                <Icon size={18} />
              </span>
              <span>
                <strong>{label}</strong>
                <small>{roomMeta[template].caption}</small>
              </span>
            </button>
          );
        })}
      </div>
      <label className="field-label">한 줄 메시지</label>
      <input className="text-input" value={message} onChange={(event) => setMessage(event.target.value)} />
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
        방 카드 열기
      </button>
    </BottomSheet>
  );
}

function AiSheet({
  selectedSetlogs,
  baseSetlogId,
  onClose,
  onGenerate,
  isGenerating
}: {
  selectedSetlogs: Setlog[];
  baseSetlogId: string;
  onClose: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const base = selectedSetlogs.find((setlog) => setlog.id === baseSetlogId) ?? selectedSetlogs[0];
  return (
    <BottomSheet title="같이 있었던 사진" onClose={onClose}>
      <div className="ai-preview">
        {selectedSetlogs.map((setlog) => (
          <div key={setlog.id} className={setlog.id === base?.id ? "base" : ""}>
            <img src={setlog.thumbnailUrl} alt={`${getUser(setlog.userId).nickname} 로그`} />
            <span>{setlog.id === base?.id ? "기준 장소" : getUser(setlog.userId).nickname}</span>
          </div>
        ))}
      </div>
      <div className="notice-box">
        <Sparkles size={17} />
        <span>각자의 로그 순간을 한 장소의 사진처럼 모아요.</span>
      </div>
      <button className="accent-button w-full justify-center" onClick={onGenerate} disabled={isGenerating}>
        <Wand2 size={18} />
        {isGenerating ? "사진 만드는 중" : "같이 있었던 사진 만들기"}
      </button>
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

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="bottom-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-ink">{title}</h2>
          <button className="icon-soft" onClick={onClose} aria-label="닫기">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </section>
    </div>
  );
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button className="icon-button" aria-label={label}>
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
        isFriend: Boolean(item.isFriend)
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
        title: pickString(item, ["title", "name"]) ?? "같이 있었던 장면",
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
  if (value === "after_work_chat_room" || value === "neighborhood_walk_room" || value === "meal_room") return value;
  return "meal_room";
}

function templateTitle(template: RoomTemplate) {
  if (template === "after_work_chat_room") return "퇴근 후 수다방";
  if (template === "neighborhood_walk_room") return "동네 산책방";
  return "혼밥방";
}

function getUser(userId: string) {
  return users.find((user) => user.id === userId) ?? currentUser;
}

export default App;
