# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minimal read-only Twitch stream overlay for OBS Browser Source. Displays chat (badges, native + BTTV/FFZ/7TV emotes, with moderation sync and bot/command filtering), sub/raid/cheer alert toasts, stream uptime/viewers/category/title, and a corner watermark. No bot functionality — read-only, no user OAuth, no EventSub.

## Development Commands

```bash
# Frontend (Vite on :5173)
cd frontend && npm install && npm run dev

# Worker (Wrangler on :8788)
cd worker && npm install && npx wrangler dev

# Build frontend
cd frontend && npm run build

# Lint frontend
cd frontend && npm run lint

# Deploy worker (production env — has the GitHub Pages CORS origin)
cd worker && npx wrangler deploy --env production
# (bare `npx wrangler deploy` hits the top-level env: localhost-only CORS, ad-hoc testing only)
```

Both must run simultaneously for full functionality. No test framework configured.

## Environment Setup

**Frontend** (`frontend/.env`):
```
VITE_WORKER_URL=http://localhost:8788
VITE_CHANNEL=michaellambgelo
```

**Worker secrets** (set via `wrangler secret put`):
```
TWITCH_CLIENT_ID
TWITCH_CLIENT_SECRET
```

Worker vars are in `worker/wrangler.toml` (`TWITCH_BROADCASTER_LOGIN`, `ALLOWED_ORIGINS`).

## Architecture

Two deploy targets: `frontend/` → GitHub Pages, `worker/` → Cloudflare Workers.

### Worker (`worker/worker.js`)

Plain JS Cloudflare Worker. Handles Twitch Helix API auth via Client Credentials grant (app-level, no user OAuth). Caches the access token in module scope, refreshes 60s before expiry.

Routes:
- `GET /stream?login=` — Returns `{ live, viewerCount, startedAt, title, gameName }` from Helix Get Streams
- `GET /badges?login=` — Returns merged global + channel badge map `{ set_id: { version_id: image_url } }`
- `GET /userid?login=` — Returns `{ id }` (channel Twitch user-id) so the frontend can fetch third-party emotes without its own Helix token. Reuses `getBroadcasterId()`.
- `GET /health` — Health check

### Frontend (`frontend/src/`)

- **`hooks/useTmiClient.ts`** — Owns the single anonymous tmi.js IRC connection for the channel. `useChat` and `useAlerts` attach their own listeners to it (one connection, not two).
- **`hooks/useChat.ts`** — Consumes the shared client. Parses messages (badges, emotes, colors, first-msg, `/me` action, @broadcaster mention); filters bots/`!commands`; syncs moderation (`timeout`/`ban`/`messagedeleted`/`clearchat` remove messages live). Configurable message cap (default 50).
- **`hooks/useAlerts.ts`** — Consumes the shared client; turns `subscription`/`resub`/`subgift`/`submysterygift`/`raided`/`cheer` USERNOTICE events into one-at-a-time alert toasts. No EventSub/OAuth.
- **`hooks/useThirdPartyEmotes.ts`** — Resolves the channel user-id via `/userid`, then fetches BTTV/FFZ/7TV global+channel emote sets (public APIs) into a `name → imageUrl` map. Fails soft.
- **`hooks/useStreamData.ts`** — Fetches `/badges` once on mount, polls `/stream` every 60s from the worker.
- **`config.ts`** — `parseConfig(searchParams)` → typed `OverlayConfig` for URL-param customization (`maxMessages`, `chatPosition`, `fontScale`, `accent`, `hideChat`/`hideInfo`/`hideWatermark`).
- **`components/ChatBox.tsx`** — Renders messages with badges, native Twitch emotes (index splice) + third-party emotes (word pass); first-chatter/`/me`/mention styling; configurable position/font-scale/accent.
- **`components/AlertOverlay.tsx`** — Animated top-center alert toast (keyframe `alert-in` in `index.css`).
- **`components/StreamInfo.tsx`** — `LIVE | HH:MM:SS | N viewers` pill + category/title line, hidden when offline.
- **`components/Watermark.tsx`** — michaellambgelo.github.io favicon, bottom-left corner.
- **`App.tsx`** — Reads `?channel=` + `parseConfig`, instantiates the shared client once, wires hooks to components.

### Data Flow

- **Chat + alerts**: Browser → one tmi.js anonymous WebSocket → Twitch IRC (messages, moderation, and sub/raid/cheer events; no worker involved)
- **Stream data**: Browser → Worker (proxies Helix API with cached app token) → polls every 60s
- **Third-party emotes**: Browser → Worker `/userid` → then directly to BTTV/FFZ/7TV public APIs

## Build & Deploy

- Vite `base: '/personal-twitch-overlay/'` for GitHub Pages
- TypeScript strict mode
- Tailwind CSS; `body { background: transparent }` for OBS compositing
- Worker follows same pattern as `grafana-faro-proxy` (plain JS, wrangler.toml, secrets via `wrangler secret put`)

## OBS Browser Source Settings

- URL: `https://michaellambgelo.github.io/personal-twitch-overlay/?channel=michaellambgelo`
- Width: 1920, Height: 1080
- Check "Shutdown source when not visible"

Optional URL params (see `config.ts` / README): `maxMessages`, `chatPosition` (`br`/`bl`/`tr`/`tl`), `fontScale`, `accent` (hex), `hideChat`, `hideInfo`, `hideWatermark`.
