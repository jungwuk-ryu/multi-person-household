# Setlog: 1인 가구 외로움을 줄이는 공개 일상 로그 PRD

작성일: 2026-05-09  
문서 목적: 해커톤 제출 및 3시간 MVP 구현 지시서  
우선순위: 우승 가능성 > 데모 안정성 > 기능 범위  
제품 형태: 모바일 최적화 웹 앱. PC 접속 시에도 모바일 앱 비율로 중앙 표시.

## 1. Executive Summary

Setlog는 혼자 사는 사람들이 익명 닉네임으로 매시간의 2~4초 짧은 일상 영상을 남기고, 같은 동네/생활권에 있는 사람을 발견해 밥, 산책, 퇴근 후 수다 같은 가벼운 번개방으로 연결되는 모바일 웹 서비스다.

핵심 문장:

> 혼자 있는 순간을, 같이 있는 장면으로 바꾸는 공개 일상 로그.

해커톤 주제는 "1인가구 - 외로움"이며, 요구 방향은 "멋진 기술보다 실제로 매일 쓰일 한 줄의 도구"다. Setlog MVP는 매일 쓸 수 있는 이유를 세 가지로 압축한다.

1. 지금 나만 혼자인 게 아니라는 공개 신호를 본다.
2. 밥 먹을 사람, 산책할 사람을 N시간 안에 가볍게 찾는다.
3. 실제로 만나지 못해도 각자의 방에서 올린 짧은 영상 로그를 AI로 "함께 있던 한 장면"으로 남긴다.

이 서비스는 원본 Setlog 앱의 "친구들과 시시콜콜한 일상을 나누는 시간대별 기록" 경험에서 출발하되, 1인 가구의 외로움 문제에 맞춰 익명 동네 피드, 번개방 카드, 친구 채팅, 공유 사진첩, AI 단체 사진 생성으로 확장한다. 동네 기반 기능은 해커톤 MVP에서 실제 위치 매칭이 아니라 UI와 seed 데이터로만 제공한다.

## 2. Problem & Insight

### 2.1 문제

1인 가구의 외로움은 대형 커뮤니티 가입이나 장기적인 관계 맺기 이전에, 일상의 아주 작은 순간에서 발생한다.

- 밥 먹을 때 바로 부를 사람이 없다.
- 잠깐 산책하거나 카페 갈 사람을 찾기 어렵다.
- 메신저로 먼저 연락하기는 부담스럽다.
- 기존 SNS는 멋진 순간 중심이라 혼자 사는 평범한 시간을 올리기 어렵다.
- 커뮤니티 번개는 모집 글 작성과 약속 확정의 부담이 크다.

### 2.2 제품 인사이트

외로움 완화의 시작점은 깊은 관계가 아니라 "지금 비슷한 시간을 보내는 사람이 보인다"는 감각이다.

따라서 MVP는 다음 질문에 답해야 한다.

- 지금 같은 동네/생활권에 나처럼 혼밥하는 사람이 있는가?
- 이 사람은 오늘 어떤 시간을 보내고 있는가?
- 지금 바로 같이 할 수 있는 작은 행동이 있는가?
- 직접 만나지 못해도 오늘 같이 있었다는 기억을 만들 수 있는가?

## 3. Target Users

### 3.1 Primary Persona: 퇴근 후 혼밥하는 1인 가구

- 20대 후반에서 30대 초반.
- 회사나 학교 이후 혼자 밥 먹는 시간이 반복된다.
- 익명 커뮤니티는 부담스럽고, 지인에게 매번 연락하기도 부담스럽다.
- 필요한 것: "지금 밥 먹을 사람", "내 일상에 반응해주는 사람", "부담 없는 연결".

### 3.2 Secondary Persona: 느슨한 친구 관계를 유지하고 싶은 사용자

- 매일 길게 대화하지는 않지만 친구들의 일상을 보고 싶다.
- 친구 필터로 가까운 사람들의 로그만 보고 싶다.
- 필요한 것: 친구 피드, 채팅, 사진첩, AI 추억 사진.

### 3.3 Hackathon Judge Persona

- 문제 정의가 명확한가?
- 매일 쓸 이유가 있는가?
- AI가 과시용이 아니라 문제 해결에 꼭 필요한가?
- 3시간 MVP가 실제로 작동하는가?
- 안전과 유해 콘텐츠 대응을 고려했는가?

## 4. Product Positioning

### 4.1 One-liner

혼자 사는 사람들이 익명 닉네임으로 2~4초 일상 영상을 남기고, 동네 기반 번개방에서 지금 같이 밥 먹거나 대화할 사람을 찾고, AI로 함께한 기억까지 남기는 모바일 웹 앱.

### 4.2 Differentiation

- 일반 SNS와 다르게 멋진 순간이 아니라 "지금 뭐해?" 수준의 평범한 시간을 올린다.
- 번개 앱과 다르게 약속 모집이 목적이 아니라 일상 로그에서 자연스럽게 연결된다.
- 채팅 앱과 다르게 대화 시작점이 영상/사진 로그다.
- 실명과 정확한 위치를 숨기고, 익명 닉네임과 동네 라벨만으로 느슨하게 연결한다.
- "혼밥방", "퇴근 후 수다방", "동네 산책방" 같은 방 카드 템플릿으로 들어가기 전 분위기를 이해시킨다.
- AI 사진 생성은 장식 기능이 아니라, 혼자 있던 여러 장면을 "같이 있던 기억"으로 바꾸는 정서적 보상이다.

### 4.3 North Star Metric

하루에 한 번 이상 Setlog를 올리거나 번개에 참여한 사용자 비율.

해커톤 MVP에서는 실제 지표 대신 아래 데모 지표를 성공 기준으로 둔다.

- 30초 안에 공개 피드에서 "나와 같은 시간대의 사람"을 발견한다.
- 60초 안에 혼밥방 생성 또는 참여가 가능하다.
- 90초 안에 친구와의 AI 단체 사진 생성 결과를 볼 수 있다.

## 5. MVP Scope

### 5.1 Must Have

- 모바일 웹 UI.
- PC 접속 시 모바일 프레임 고정 표시.
- 익명 닉네임 기반 데모 로그인. 실명은 받지 않는다.
- 공개 시간대별 Setlog 피드.
- 동네 기반 Setlog UI. 실제 GPS/거리 계산은 구현하지 않고 동네 라벨과 seed 데이터로만 보여준다.
- 필터: 전체, 친구, 동성, 주변, 밥 번개.
- Setlog 업로드: 2~4초 짧은 영상 로그. AI 생성 입력은 영상의 썸네일/대표 프레임을 사용한다.
- Gemini API 기반 유해 이미지/영상 검사 wrapper.
- N시간 후 만료되는 번개 생성 및 참여.
- 방 카드/템플릿: 혼밥방, 퇴근 후 수다방, 동네 산책방.
- 친구 추가.
- 친구 필터 피드 전환.
- 친구 채팅.
- 친구/그룹 사진첩.
- 친구 또는 그룹 단위 Setlog 영상을 하나의 장소 이미지로 합성한 AI 단체 사진 생성.
- OpenAI `gpt-image-2` 기반 이미지 생성/편집 wrapper.
- API 키가 없을 때 mock 결과로 데모 가능.

### 5.2 Should Have

- WebSocket 또는 polling 기반 번개/채팅 업데이트.
- 업로드 처리 상태: 검사 중, 공개됨, 차단됨.
- 생성형 AI 처리 상태: 생성 중, 완료, 실패.
- 신고 버튼 UI. 실제 신고 처리 backend/admin은 구현하지 않는다.
- Gemini 자동 차단 결과 표시.
- 데모 seed 데이터.

### 5.3 Won't Have in MVP

- 실제 앱스토어 배포.
- 결제.
- 전화번호 인증.
- 장기 그룹 운영 기능.
- 고도화 추천 알고리즘.
- 운영자 어드민.
- 푸시 알림.
- 영상통화.
- 실제 GPS 기반 정밀 위치/동네 매칭. 동네 기능은 UI/seed 데이터로만 제공한다.
- 실제 신고 처리 workflow. 신고는 데모용 UI만 제공한다.
- 실제 영상 편집/영상 합성. AI 합성은 영상 썸네일/대표 프레임을 활용한 이미지 기반으로만 처리.

### 5.4 UI-Only Demo Shortcuts

구현 시간을 줄이기 위해 아래 기능은 화면과 상태만 제공하고 실제 backend 기능은 만들지 않는다.

- 사용자 신고: 신고 버튼, 신고 완료 toast/modal만 제공.
- 동네 기반 매칭: 동네 선택 chip, 주변 필터, 동네 배지만 제공. 실제 좌표/거리 계산 없음.
- 방 카드 템플릿 커스터마이징: 제목/태그/썸네일 분위기 선택 UI만 제공. 저장된 추천 알고리즘 없음.
- 실시간성: WebSocket이 늦어지면 polling 또는 local optimistic UI로 대체 가능.
- 영상 길이 검사: 실제 metadata 파싱이 어려우면 업로드 UI에서 2~4초 안내와 seed duration 값으로 대체 가능.

## 6. Core User Flows

### 6.1 Public Setlog Discovery

1. 사용자가 웹 앱에 접속한다.
2. PC라도 모바일 앱 프레임으로 중앙 표시된다.
3. 사용자는 실명 없이 익명 닉네임 데모 계정으로 진입한다.
4. 첫 화면은 현재 시간대 공개 Setlog 피드다.
5. 사용자는 전체/친구/동성/주변/밥 번개 필터를 탭으로 전환한다.
6. 주변 필터는 실제 위치가 아니라 동네 라벨 기반 UI로만 동작한다.
7. 각 Setlog 카드에는 익명 닉네임, 시간, 동네, 상태, 짧은 캡션, 친구 추가 버튼이 있다.

성공 기준:

- 첫 화면에서 서비스의 핵심이 설명 없이 이해된다.
- 사용자는 "지금 혼자 있는 사람들이 보인다"는 느낌을 받는다.

### 6.2 Setlog Upload

1. 하단 탭 중앙의 만들기 버튼을 누른다.
2. 2~4초 짧은 영상을 선택한다. 데모 seed는 대표 프레임/썸네일로 대체 가능하다.
3. 한 줄 상태를 입력한다. 예: "혼밥 중", "편의점 다녀오는 길", "산책 갈 사람?"
4. 공개 범위를 선택한다: 공개, 친구만.
5. 업로드하면 Gemini 검사가 실행된다.
6. 통과 시 피드에 노출되고, 실패 시 차단 안내가 표시된다.

성공 기준:

- 업로드는 3단계 이내로 끝난다.
- 검사 실패가 데모 흐름을 끊지 않도록 mock 모드가 존재한다.

### 6.3 Flash Meet

1. 사용자가 번개 탭 또는 피드 상단에서 방 만들기를 누른다.
2. 방 카드 템플릿을 고른다: 혼밥방, 퇴근 후 수다방, 동네 산책방.
3. 만료 시간을 고른다: 1시간, 2시간, 3시간.
4. 동네 라벨과 한 줄 메시지를 입력한다.
5. 번개방 카드가 공개되고 피드 상단에 노출된다.
6. 다른 사용자가 참여를 누르면 방 또는 1:1 채팅방이 열린다.
7. 영상통화는 제공하지 않는다. 퇴근 후 수다방은 텍스트 채팅과 Setlog 공유만 제공한다.

성공 기준:

- 번개방은 "모집 글"이 아니라 "지금 같이 있을 사람"의 느낌이어야 한다.
- 만료 시간이 명확히 보인다.

### 6.4 Friend & Chat

1. 피드에서 마음이 가는 사용자를 친구 추가한다.
2. 친구 필터를 누르면 친구 Setlog만 보인다.
3. 채팅 탭에서 친구와 대화한다.
4. 채팅방 상단에서 사진첩으로 이동한다.

성공 기준:

- 친구 필터 전환이 매우 빠르게 보여야 한다.
- 친구 관계가 AI 사진 생성의 기반이 된다.

### 6.5 AI Group Memory Photo

1. 사진첩에서 친구 또는 그룹의 Setlog 영상 여러 개를 선택한다.
2. 각 영상의 대표 프레임/썸네일을 AI 입력 이미지로 사용한다.
3. 기준 장소가 될 Setlog를 하나 고른다.
4. "같이 있었던 사진 만들기"를 누른다.
5. 서버는 입력 이미지를 Gemini로 검사한다.
6. 통과하면 OpenAI `gpt-image-2`로 기준 장소에 인물들을 자연스럽게 합성한 이미지를 생성한다.
7. 생성 결과를 Gemini로 다시 검사한다.
8. 통과한 이미지만 사진첩에 저장된다.

성공 기준:

- AI가 "만남의 대체재"가 아니라 "함께한 기억의 보강재"로 느껴져야 한다.
- 결과 이미지는 해커톤 데모에서 가장 강한 장면이므로 mock fallback을 반드시 둔다.

## 7. Mobile Web UX Requirements

### 7.1 Layout

- 기준 viewport: 390px x 844px.
- 지원 폭: 360px 이상 430px 이하.
- PC 접속 시 앱 컨테이너는 `max-width: 430px`, `height: 100dvh`, `margin: 0 auto`.
- 앱 외부 배경은 단순 neutral color.
- 실제 UI는 모바일 프레임 내부에만 렌더링.
- 랜딩 페이지 없이 바로 앱 화면을 보여준다.

### 7.2 Navigation

하단 탭 5개:

- 피드
- 번개
- 만들기
- 채팅
- 사진첩

하단 탭은 `position: sticky` 또는 앱 컨테이너 내부 fixed로 고정한다.

### 7.3 Feed UI

- 상단: 현재 시간대, 익명 닉네임, 동네 라벨, 필터 chip, 프로필/알림.
- 중단: 번개 live strip.
- 본문: 시간대별 Setlog 카드.
- 카드 구성:
  - 미디어 썸네일.
  - 시간.
  - 익명 닉네임.
  - 동네.
  - 상태 캡션.
  - 친구 추가 또는 채팅 버튼.
  - 신고 버튼. MVP에서는 UI만 제공하고 실제 처리 로직은 없다.

### 7.4 Room Card UI

- 방 카드는 번개를 더 직관적으로 보여주는 템플릿 UI다.
- MVP 템플릿:
  - 혼밥방: "지금 밥 먹는 사람들", 식사/동네/만료 시간 강조.
  - 퇴근 후 수다방: "퇴근하고 잠깐 떠들 사람", 텍스트 채팅 중심. 영상통화 없음.
  - 동네 산책방: "가볍게 걷거나 동네 공원 갈 사람", 생활권 라벨 강조.
- 방 카드에는 방 제목, 익명 호스트 닉네임, 동네 라벨, 참여자 수, 만료 시간, 대표 Setlog 썸네일을 표시한다.
- 템플릿 커스터마이징은 데모에서 UI만 제공한다. 저장/추천 알고리즘은 구현하지 않는다.

### 7.5 Interaction

- 모든 주요 터치 영역은 최소 44px.
- 업로드, 번개 생성, AI 사진 생성은 bottom sheet 또는 full-screen modal.
- 텍스트는 버튼 내부에서 줄바꿈/overflow가 발생하지 않아야 한다.
- 모바일 한 손 사용을 위해 주요 액션은 하단 근처에 배치한다.

### 7.6 Visual Tone

- 운영 도구처럼 차갑지 않고, SNS처럼 과시적이지 않은 일상적 톤.
- 과한 히어로/마케팅 레이아웃 금지.
- 카드 radius는 8px 이하 중심.
- 팔레트는 특정 한 가지 색에 과도하게 의존하지 않는다.
- Setlog 피드는 영상/사진이 주인공이어야 하며 장식 그래픽을 남발하지 않는다.

## 8. Functional Requirements

### 8.1 Authentication

MVP는 데모 로그인만 제공한다.

- 사용자는 seed user 중 하나를 선택한다.
- 사용자는 실명 대신 익명 닉네임으로만 표시된다. 예: "성수밥친구", "퇴근러42".
- 서버는 demo session 또는 local token을 반환한다.
- 실제 인증은 후순위다.

### 8.2 Setlog

Setlog는 사용자의 시간대별 일상 미디어다.

필드:

- id
- userId
- mediaType: video
- mediaUrl
- thumbnailUrl
- caption
- visibility: public | friends
- cityLabel
- gender
- durationSeconds
- createdAt
- hourSlot
- moderationStatus: pending | approved | blocked

규칙:

- 공개 피드에는 `visibility=public` 및 `moderationStatus=approved`만 노출.
- 친구 피드에는 친구의 public/friends Setlog 중 승인된 것만 노출.
- 시간대별 정렬은 최신 시간대 우선.
- 영상 업로드는 MVP에서 2~4초로 제한한다.
- 동네 기반 노출은 `cityLabel`만 사용하며 GPS나 실제 거리 계산은 하지 않는다.
- AI 단체 사진 생성에는 영상 원본이 아니라 `thumbnailUrl` 또는 대표 프레임을 사용한다.

### 8.3 Filters

필터 정의:

- 전체: 승인된 공개 Setlog.
- 친구: 친구의 승인된 Setlog.
- 동성: 현재 사용자와 gender가 같은 공개 Setlog.
- 주변: 현재 사용자와 cityLabel이 같은 공개 Setlog.
- 밥 번개: 활성 상태의 `meal_room` 번개방 및 관련 Setlog.

MVP에서 주변은 실제 좌표가 아니라 동네 라벨 기반이다.

### 8.4 Flash Meet

Flash Meet은 N시간 후 자동 만료되는 가벼운 모집이다.

필드:

- id
- creatorId
- template: meal_room | after_work_chat_room | neighborhood_walk_room
- title
- message
- cityLabel
- expiresAt
- participantIds
- status: active | expired | closed

규칙:

- 생성 가능 만료 시간: 1시간, 2시간, 3시간.
- 만료된 번개는 참여 불가.
- 참여 시 creator와 participant의 chat room을 생성하거나 재사용.
- 피드 상단에는 active meet만 표시.
- 영상통화는 제공하지 않는다.
- 방 카드 템플릿 수정 UI는 제공하되, 템플릿 추천/저장 고도화는 MVP에서 구현하지 않는다.

### 8.5 Friend

MVP 친구 관계는 단방향 follow가 아니라 양방향 친구로 단순화한다.

규칙:

- 친구 추가 버튼을 누르면 즉시 친구 상태가 된다.
- 친구 상태가 되면 친구 피드와 채팅이 가능하다.
- 사용자 신고는 UI-only이며, 실제 사용자 차단/제외 로직은 MVP에서 구현하지 않는다.

### 8.6 Chat

MVP는 친구 또는 번개 참여자 간 1:1 채팅을 우선한다.

필드:

- roomId
- memberIds
- messages: text, optional imageUrl
- createdAt

규칙:

- FastAPI WebSocket 또는 REST polling으로 새 메시지를 반영한다.
- MVP에서는 polling만 구현해도 통과로 본다.
- 메시지는 최신순 room list에서 확인 가능하다.

### 8.7 Album

사진첩은 친구와 공유된 Setlog 및 AI 생성 이미지를 모아 보는 공간이다.

규칙:

- 친구별 사진첩과 그룹 사진첩 UI를 제공한다.
- 사용자는 여러 Setlog 영상을 선택할 수 있다.
- 영상 Setlog는 MVP에서 썸네일 또는 대표 프레임만 AI 생성 입력으로 사용한다.
- AI 생성 결과는 album item으로 저장한다.

### 8.8 AI Group Photo

입력:

- baseSetlogId: 기준 장소가 될 Setlog 영상의 대표 프레임.
- participantSetlogIds: 합성할 사람들의 Setlog 영상 대표 프레임 목록.
- style: realistic.

출력:

- generatedImageUrl
- sourceSetlogIds
- moderationStatus
- createdAt

생성 프롬프트 방향:

- 기준 이미지의 장소와 조명, 카메라 시점을 유지한다.
- 각 입력 이미지 속 사람을 같은 장소에 실제로 모여 있는 것처럼 배치한다.
- 음식/식탁/방 분위기를 자연스럽게 유지한다.
- 과도한 미화, 왜곡, 노출, 미성년자처럼 보이게 하는 변형을 하지 않는다.
- 결과는 실사 사진처럼 자연스러워야 한다.
- 영상통화나 실시간 화상 합성처럼 보이면 안 된다. 결과물은 하나의 정지 이미지다.

## 9. Safety, Privacy, and Moderation

### 9.1 Moderation Pipeline

업로드 전후로 아래 파이프라인을 적용한다.

1. 사용자가 이미지/영상을 업로드한다.
2. 서버가 Gemini API로 이미지/영상 안전 검사를 요청한다.
3. 위험 카테고리가 기준 이상이면 차단한다.
4. 통과한 Setlog만 공개 피드에 노출한다.
5. AI 이미지 생성에 들어가는 입력 이미지를 다시 검사한다.
6. `gpt-image-2` 생성 결과도 Gemini로 재검사한다.
7. 통과한 결과만 사진첩에 저장한다.
8. 사용자는 각 카드의 신고 버튼을 누를 수 있지만, MVP에서는 신고 접수 완료 UI만 표시하고 실제 backend 처리와 admin review는 구현하지 않는다.

Gemini API는 안전 설정을 통해 harassment, hate speech, sexually explicit, dangerous content 등 카테고리별 필터링을 제공하며, 비디오 입력도 처리할 수 있다.

### 9.2 MVP Blocking Rules

차단 대상:

- 성적 노출 또는 성적 행위.
- 폭력, 자해, 위험 행위 조장.
- 혐오 또는 괴롭힘.
- 개인정보 노출이 명확한 이미지.
- 타인의 얼굴을 악의적으로 합성하는 요청.
- 미성년자로 보이는 인물의 부적절한 맥락.

### 9.3 Privacy Defaults

- 정밀 위치는 수집하지 않는다.
- 동네는 사용자가 선택한 cityLabel만 사용한다.
- 전화번호, 실명, 주소는 받지 않는다.
- 화면에는 실명 대신 익명 닉네임만 표시한다.
- 공개 범위 기본값은 public이지만, 업로드 시 friends로 바꿀 수 있다.
- Gemini 자동 차단은 실제 wrapper 또는 mock으로 구현한다.
- 사용자 신고 버튼은 모든 사용자 카드에 제공하되 UI-only로 처리한다.

### 9.4 AI Consent Assumption

MVP에서는 친구 또는 그룹 사진첩에 포함된 Setlog만 AI 합성 대상으로 선택할 수 있다. 공개 피드의 모르는 사용자를 임의로 합성하는 기능은 제공하지 않는다.

## 10. Technical Requirements

### 10.1 Stack

Frontend:

- Vite
- React
- TypeScript
- Tailwind CSS
- Native WebSocket client 또는 REST polling

Backend:

- Python
- FastAPI
- Pydantic
- FastAPI WebSocket 또는 REST polling
- `UploadFile` for upload
- SQLite 또는 JSON file storage

AI:

- OpenAI Image API with `gpt-image-2`
- Gemini API for image/video moderation

### 10.2 Repository Structure

권장 구조:

```text
.
├── PRD_Jungwuk.md
├── README.md
├── package.json
├── .env.example
├── src
│   ├── client
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── api
│   │   ├── components
│   │   ├── screens
│   │   └── styles.css
│   ├── server
│   │   ├── main.py
│   │   ├── db.py
│   │   ├── seed.py
│   │   ├── schemas.py
│   │   ├── routes
│   │   └── services
│   │       ├── gemini_moderation.py
│   │       └── openai_image.py
│   └── shared
│       └── api-types.ts
└── uploads
    └── .gitkeep
```

### 10.3 Environment Variables

```text
API_PORT=8000
CLIENT_ORIGIN=http://localhost:5173
OPENAI_API_KEY=
GEMINI_API_KEY=
MOCK_AI=true
UPLOAD_DIR=uploads
```

`MOCK_AI=true`일 때:

- Gemini moderation은 기본 approved를 반환하되, filename 또는 caption에 `blocked`가 있으면 blocked를 반환한다.
- OpenAI image generation은 seed demo 이미지를 반환한다.

### 10.4 API Contract

#### Auth

`POST /api/auth/demo-login`

Request:

```json
{ "userId": "u_01" }
```

Response:

```json
{ "token": "demo-u_01", "user": {} }
```

#### Setlogs

`GET /api/setlogs?filter=all|friends|sameGender|nearby|mealRoom&userId=u_01`

Response:

```json
{
  "items": [
    {
      "id": "s_01",
      "userId": "u_02",
      "nickname": "성수밥친구",
      "mediaType": "video",
      "mediaUrl": "/uploads/seed/meal-01.mp4",
      "thumbnailUrl": "/uploads/seed/meal-01.jpg",
      "caption": "오늘도 혼밥 중",
      "cityLabel": "성수",
      "durationSeconds": 3,
      "hourSlot": "20:00",
      "createdAt": "2026-05-09T11:00:00.000Z",
      "isFriend": false
    }
  ]
}
```

`POST /api/setlogs`

- multipart/form-data.
- fields: userId, caption, visibility, cityLabel, media.
- validation: video duration should be 2~4 seconds. Demo seed may bypass with fixed duration metadata.
- response: created Setlog with moderationStatus.

#### Flash Meets

`GET /api/flash-meets?userId=u_01`

`POST /api/flash-meets`

Request:

```json
{
  "creatorId": "u_01",
  "template": "meal_room",
  "title": "혼밥방",
  "message": "성수에서 저녁 먹을 사람",
  "cityLabel": "성수",
  "expiresInHours": 2
}
```

`POST /api/flash-meets/:id/join`

Request:

```json
{ "userId": "u_02" }
```

Response:

```json
{ "chatRoomId": "c_01" }
```

#### Friends

`POST /api/friends/:targetUserId`

Request:

```json
{ "userId": "u_01" }
```

#### Chats

`GET /api/chats?userId=u_01`

`GET /api/chats/:roomId/messages`

`POST /api/chats/:roomId/messages`

Request:

```json
{ "senderId": "u_01", "text": "오늘 밥 먹었어?" }
```

WebSocket or polling events:

- `chat:join`
- `chat:message`
- `chat:new-message`
- `flash:new`
- `flash:joined`

#### AI Group Photo

`POST /api/ai/group-photo`

Request:

```json
{
  "userId": "u_01",
  "baseSetlogId": "s_01",
  "participantSetlogIds": ["s_02", "s_03"]
}
```

Response:

```json
{
  "id": "a_01",
  "generatedImageUrl": "/uploads/generated/group-a_01.jpg",
  "status": "approved"
}
```

## 11. Data Model

Backend model examples use FastAPI/Pydantic style. Implementers should import `BaseModel` from `pydantic` and `Literal` from `typing`.

### User

```python
class User(BaseModel):
    id: str
    nickname: str
    avatar_url: str
    gender: Literal["female", "male", "other"]
    city_label: str
    bio: str
```

### Setlog

```python
class Setlog(BaseModel):
    id: str
    user_id: str
    media_type: Literal["video"]
    media_url: str
    thumbnail_url: str | None = None
    caption: str
    visibility: Literal["public", "friends"]
    city_label: str
    duration_seconds: int
    hour_slot: str
    created_at: str
    moderation_status: Literal["pending", "approved", "blocked"]
```

### FlashMeet

```python
class FlashMeet(BaseModel):
    id: str
    creator_id: str
    template: Literal["meal_room", "after_work_chat_room", "neighborhood_walk_room"]
    title: str
    message: str
    city_label: str
    expires_at: str
    participant_ids: list[str]
    status: Literal["active", "expired", "closed"]
```

### ChatRoom

```python
class ChatRoom(BaseModel):
    id: str
    member_ids: list[str]
    created_at: str
    updated_at: str
```

### AlbumItem

```python
class AlbumItem(BaseModel):
    id: str
    owner_user_id: str
    member_ids: list[str]
    source_setlog_ids: list[str]
    image_url: str
    type: Literal["setlog_frame", "ai_group_photo"]
    created_at: str
```

## 12. AI Implementation Notes

### 12.1 OpenAI `gpt-image-2`

OpenAI 공식 모델 문서 기준 `gpt-image-2`는 이미지 생성 및 편집을 지원하는 이미지 모델이다. MVP에서는 Image API wrapper를 만들고, 실제 키가 없으면 mock image를 반환한다.

Implementation default:

- model: `gpt-image-2`
- endpoint: image generation/edit capable wrapper
- output: single image
- fallback: `/uploads/seed/generated-demo.jpg`

Prompt template:

```text
Create a realistic group photo using the first image as the base location.
Preserve the room, lighting, camera angle, table, and everyday atmosphere from the base image.
Place the people from the reference images naturally in the same place, as if they were actually eating together.
Keep faces and body shapes natural. Do not sexualize, age-transform, beautify excessively, or change identity.
The final image should look like a candid smartphone photo in a Korean one-person household room.
```

### 12.2 Gemini Moderation

Gemini API는 이미지 및 비디오 입력을 처리할 수 있고, safety settings를 통해 유해 콘텐츠 카테고리를 다룰 수 있다. MVP에서는 Gemini를 "분류/검사" 용도로 사용한다.

Moderation prompt:

```text
You are a strict safety reviewer for a public social app.
Classify whether this media is safe for a public feed and AI group-photo generation.
Return JSON only:
{
  "decision": "approved" | "blocked",
  "reasons": string[],
  "categories": string[]
}
Block sexual content, nudity, violence, self-harm, hate, harassment, dangerous acts, obvious private information, and non-consensual manipulation risk.
```

Implementation default:

- image: inline data or File API.
- video: File API for larger files, inline data for short files under request limits.
- default action: fail closed for real moderation failure, fail open only in explicit `MOCK_AI=true` demo mode.

## 13. 3-Hour Implementation Plan

### 13.1 Work Split

Local Environment A: Frontend owner

- Owns `src/client/**`.
- Owns mobile app frame, screens, components, styling.
- Does not edit server routes except generated type imports.
- Uses mock fetch shape until backend is ready.

Local Environment B: Backend owner

- Owns `src/server/**` and `src/shared/**`.
- Owns FastAPI routes, Pydantic models, DB/JSON storage, seed data, WebSocket or polling endpoints, AI wrappers.
- Does not edit frontend screens.
- Provides stable API responses matching `src/shared/api-types.ts`.

Shared files:

- `package.json`, backend dependency file, `.env.example`, `README.md` are edited by one person only in the final integration window.
- `PRD_Jungwuk.md` is source of truth and should not be reformatted during implementation.

### 13.2 Timeline

0:00 - 0:15 Setup

- Create Vite React app structure.
- Create FastAPI server structure.
- Add shared types.
- Add seed users/setlogs/flash meets.

0:15 - 1:15 Parallel Core Build

- A: mobile frame, feed, filters, bottom tabs, upload modal skeleton.
- B: auth, setlogs, flash meets, friends APIs, seed DB.

1:15 - 2:00 Social + Realtime

- A: chat UI, album UI, AI generation UI.
- B: chat APIs, FastAPI WebSocket or REST polling, join flash meet flow.

2:00 - 2:35 AI + Safety

- A: moderation/generation pending states.
- B: Gemini wrapper, OpenAI wrapper, mock fallback.

2:35 - 2:50 Integration

- Connect all fetch calls.
- Fix response shape mismatch.
- Confirm PC mobile frame behavior.

2:50 - 3:00 Demo Hardening

- Add README quick start.
- Add `.env.example`.
- Verify core demo path.
- Prepare 90-second pitch.

### 13.3 Merge Conflict Prevention

- Branch A: `feature/mobile-client`
- Branch B: `feature/server-api`
- First merge backend shared types, then frontend.
- If conflict occurs in `package.json`, preserve union of dependencies and scripts.
- No broad formatting pass before final merge.

## 14. Acceptance Criteria

### 14.1 Product

- 첫 화면이 모바일 앱처럼 보인다.
- PC 브라우저에서도 앱 폭이 430px 이하로 중앙 고정된다.
- 공개 Setlog 피드가 보인다.
- 화면에는 실명 없이 익명 닉네임만 보인다.
- 주변/동네 기능은 동네 라벨 UI와 seed 데이터로 표시된다.
- 전체/친구/동성/주변/밥 번개 필터가 동작한다.
- 2~4초 Setlog 영상 업로드 플로우가 있다.
- 혼밥방, 퇴근 후 수다방, 동네 산책방 카드 생성과 참여가 가능하다.
- 친구 추가 후 친구 피드로 전환 가능하다.
- 친구 채팅이 가능하다.
- 사진첩에서 친구/그룹 Setlog 영상 대표 프레임을 활용한 AI 단체 사진 생성 플로우가 가능하다.
- API 키 없이도 mock 모드로 데모가 끝까지 이어진다.

### 14.2 Safety

- 업로드 미디어에 moderationStatus가 존재한다.
- 차단된 미디어는 공개 피드에 나오지 않는다.
- AI 입력과 결과 모두 moderation step을 거친다.
- Gemini 자동 차단 flow가 있다.
- 신고 UI가 있다. 실제 신고 처리 기능은 구현하지 않는다.
- 실제 주소/전화번호/정밀 좌표를 요구하지 않는다.

### 14.3 Technical

- 프론트는 `npm install` 후 `npm run dev` 또는 명시된 script로 실행 가능하다.
- 백엔드는 FastAPI 실행 명령, 예: `uvicorn src.server.main:app --reload`, 으로 실행 가능하다.
- 프론트와 백엔드가 동시에 실행된다.
- TypeScript build와 Python import/runtime check가 통과한다.
- seed data로 데모가 가능하다.
- README에 실행 방법과 env 설명이 있다.

## 15. Demo Script

### 15.1 90-Second Pitch

1. "1인 가구의 외로움은 큰 이벤트가 아니라 매일 밥 먹는 순간에 옵니다."
2. "Setlog는 지금 이 시간 같은 동네에서 혼자 있는 사람들의 2~4초 일상 로그를 보여줍니다."
3. 익명 닉네임과 동네 라벨이 붙은 혼밥 Setlog를 보여준다.
4. 동성/주변/친구 필터를 전환한다.
5. 혼밥방, 퇴근 후 수다방, 동네 산책방 카드 중 하나를 만든다.
6. 다른 사용자가 참여하고 채팅방이 열린다. 영상통화는 제공하지 않는다.
7. 서로 다른 방에서 밥 먹는 Setlog 영상 대표 프레임들을 선택한다.
8. 기준 장소를 한 명의 자취방으로 고른다.
9. AI가 모두가 한 식탁에 모인 정지 이미지를 만든다.
10. Gemini 자동 차단과 신고 UI를 보여준다.
11. "만나지 못한 날도 같이 있었던 기억으로 남깁니다."

### 15.2 Judge-Facing Highlights

- 문제 적합성: 혼밥, 산책, 퇴근 후 수다 같은 실제 일상 문제.
- 매일성: 매시간 2~4초 짧은 로그와 만료 번개방.
- 연결성: 공개 피드에서 친구/채팅으로 자연스럽게 전환.
- AI 필수성: 각자 다른 공간의 Setlog 프레임을 하나의 기억 이미지로 합성.
- 안전성: Gemini 기반 자동 차단과 사용자 신고 UI.
- 구현성: 3시간 MVP에 맞춘 UI-only 범위, mock fallback, 분업 구조.

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 외부 AI API 지연 또는 실패 | 데모 중단 | `MOCK_AI=true` fallback |
| 유해 이미지 노출 | 신뢰 하락 | Gemini pre/post moderation |
| 위치 기반 기능 과범위 | 구현 지연, 개인정보 리스크 | 동네 라벨 기반 주변 필터 |
| 모바일 UI 깨짐 | 제품 완성도 하락 | 390px 기준, 430px max frame |
| 병렬 작업 merge conflict | 시간 손실 | client/server/shared ownership 분리 |
| 기능 과다 | 핵심 흐림 | 데모 path 중심으로 구현 |

## 17. Future Roadmap

Post-MVP:

- 실제 OAuth/전화번호 인증.
- 친구 요청 수락 모델.
- 그룹 채팅.
- 푸시 알림.
- 실제 위치 기반 거리 필터.
- recurring routine buddy.
- 운영자 moderation dashboard.
- AI 생성 이미지 consent flow 강화.
- Setlog streak 및 시간대별 회고.

## 18. References

- Setlog App Store: https://apps.apple.com/kr/app/setlog/id6587576438
- OpenAI GPT Image 2 model docs: https://developers.openai.com/api/docs/models/gpt-image-2
- OpenAI image generation guide: https://platform.openai.com/docs/guides/images/image-generation
- OpenAI Images API reference: https://platform.openai.com/docs/api-reference/images/overview
- Gemini safety settings: https://ai.google.dev/docs/safety_setting_gemini
- Gemini video understanding: https://ai.google.dev/gemini-api/docs/video-understanding
