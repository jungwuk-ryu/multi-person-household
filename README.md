# 다인가구 Mobile Web App

다인가구는 1인 가구의 외로움을 줄이기 위한 Vite + React + TypeScript 모바일 웹 앱입니다.

## Frontend Execution

Install dependencies:

```bash
npm install
```

Run the Vite dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview a production build:

```bash
npm run preview
```

The app is designed for mobile-first use. On desktop, the UI should remain constrained to a mobile app frame rather than expanding into a desktop layout.

## API Configuration

By default, the client calls same-origin `/api`, `/uploads`, and `/ws`. This avoids browser mixed-content blocking when the app is opened through an HTTPS Cloudflare Tunnel.

Default Vite proxy target:

```text
http://127.0.0.1:3021
```

Override the API base for local or alternate environments by creating `.env` from `.env.example`:

```bash
cp .env.example .env
```

Then edit:

```bash
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://127.0.0.1:3021
```

Only set `VITE_API_BASE_URL` to a full URL when that API URL is also HTTPS, such as `https://api.example.com`.

The remote server may be unavailable during demo or local development. The frontend is expected to remain demoable with mock fallback data and mock AI/moderation results when the server or API keys are not reachable.

## PRD / Design Compliance Summary

- Mobile optimized Vite web app with a centered mobile frame for PC access.
- No marketing landing page; the first screen is the 다인가구 app experience.
- Anonymous demo-user flow instead of real-name authentication.
- Public log feed with neighborhood label, filters, report UI, and seed data support.
- Flash meet room cards for meal, after-work chat, and neighborhood walk flows with visible expiration.
- Friend, chat, album, and AI group-memory-photo flows represented for the MVP demo.
- AI and safety flows are documented as Gemini moderation and OpenAI `gpt-image-2` wrappers, with mock fallback when keys or services are unavailable.
- Visual direction follows `DESIGN.md`: warm off-white surfaces, 다인가구 coral accent, rounded media-first cards, compact mobile navigation, and lightweight scrapbook-style interactions.
