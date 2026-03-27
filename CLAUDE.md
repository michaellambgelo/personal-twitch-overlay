# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minimal read-only Twitch stream overlay for OBS Browser Source. Displays chat (with badges and emotes), stream uptime timer, viewer count, and a corner watermark. No bot functionality — read-only.

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

# Deploy worker
cd worker && npx wrangler deploy
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
- `GET /health` — Health check

### Frontend (`frontend/src/`)

- **`hooks/useChat.ts`** — tmi.js connects anonymously to Twitch IRC in the browser (no auth needed for read-only). Parses badges, emotes, and chat colors from IRC tags. 50-message cap.
- **`hooks/useStreamData.ts`** — Fetches `/badges` once on mount, polls `/stream` every 60s from the worker.
- **`components/ChatBox.tsx`** — Renders messages with inline badge images and Twitch CDN emote images. Older messages fade out.
- **`components/StreamInfo.tsx`** — `LIVE | HH:MM:SS | N viewers` pill, hidden when offline.
- **`components/Watermark.tsx`** — michaellambgelo.github.io favicon, bottom-left corner.
- **`App.tsx`** — Reads `?channel=` URL param, wires hooks to components.

### Data Flow

- **Chat**: Browser → tmi.js anonymous WebSocket → Twitch IRC (no worker involved)
- **Stream data**: Browser → Worker (proxies Helix API with cached app token) → polls every 60s

## Build & Deploy

- Vite `base: '/personal-twitch-overlay/'` for GitHub Pages
- TypeScript strict mode
- Tailwind CSS; `body { background: transparent }` for OBS compositing
- Worker follows same pattern as `grafana-faro-proxy` (plain JS, wrangler.toml, secrets via `wrangler secret put`)

## OBS Browser Source Settings

- URL: `https://michaellambgelo.github.io/personal-twitch-overlay/?channel=michaellambgelo`
- Width: 1920, Height: 1080
- Check "Shutdown source when not visible"
