# personal-twitch-overlay

A minimal, **read-only** Twitch stream overlay for OBS Browser Source. It renders
a live chat feed (with badges and emotes), a `LIVE | uptime | viewers` status
pill, and a small corner watermark — all on a transparent background so OBS can
composite it over your scene. No bot, no chat commands, no writes to Twitch.

## Live overlay

The frontend is deployed to GitHub Pages:

```
https://michaellambgelo.github.io/personal-twitch-overlay/?channel=michaellambgelo
```

The `?channel=` query parameter selects which Twitch channel to display. Without
it, the page shows an "add a `?channel=` parameter" prompt.

### OBS Browser Source settings

- **URL:** the live URL above (with your `?channel=`)
- **Width:** 1920 · **Height:** 1080
- Enable **"Shutdown source when not visible"**

## Features

- **Chat** (`ChatBox`) — last 50 messages, bottom-right. Renders Twitch badges,
  emotes, and each user's chat color. Older messages fade out and the feed
  auto-scrolls to the newest message.
- **Stream info** (`StreamInfo`) — top-left pill showing `🔴 LIVE | HH:MM:SS | N
  viewers`. The uptime timer ticks every second; the pill is hidden when the
  channel is offline.
- **Watermark** (`Watermark`) — michaellambgelo.github.io favicon in the
  bottom-left corner.

## Architecture

Two independently deployed pieces:

| Part | Stack | Deploy target |
|------|-------|---------------|
| `frontend/` | React 18 + TypeScript + Vite + Tailwind | GitHub Pages |
| `worker/` | Cloudflare Worker (plain JS) | Cloudflare Workers |

Data flows along two separate paths:

- **Chat:** the browser connects **directly** to Twitch IRC via `tmi.js` as an
  anonymous user — no auth and no worker involved. Badges, emotes, and colors are
  parsed from the IRC message tags.
- **Stream / badge data:** the browser calls the **worker**, which proxies the
  Twitch Helix API using an app-level OAuth token (Client Credentials grant,
  cached and refreshed in the worker). Badges are fetched once on mount; stream
  status is polled every 60 seconds.

```
Browser ──(WebSocket, anonymous)──► Twitch IRC          (chat)
Browser ──(fetch /stream, /badges)─► Worker ──► Twitch Helix API   (stream data)
```

## Project structure

```
personal-twitch-overlay/
├── frontend/                 # React + Vite app
│   └── src/
│       ├── App.tsx           # Root; reads ?channel=, wires hooks to components
│       ├── types.ts          # ChatMessage / StreamData / BadgeMap interfaces
│       ├── components/
│       │   ├── ChatBox.tsx
│       │   ├── StreamInfo.tsx
│       │   └── Watermark.tsx
│       └── hooks/
│           ├── useChat.ts        # tmi.js anonymous IRC client (50-msg cap)
│           └── useStreamData.ts  # fetch /badges once, poll /stream every 60s
├── worker/                   # Cloudflare Worker — Twitch Helix proxy
│   └── worker.js
└── .github/workflows/deploy.yml   # GitHub Pages auto-deploy on push to main
```

## Local development

The frontend and worker run as two processes; both are needed for the stream
pill and badges to work (chat works without the worker).

```bash
# Frontend — Vite dev server on http://localhost:5173
cd frontend && npm install && npm run dev

# Worker — Wrangler dev server on http://localhost:8788
cd worker && npm install && npx wrangler dev
```

Other frontend scripts:

```bash
npm run build     # tsc -b && vite build  → frontend/dist
npm run lint      # eslint
npm run preview   # preview the production build
```

There is no test framework configured.

## Configuration

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` and adjust:

```
VITE_WORKER_URL=http://localhost:8788
VITE_CHANNEL=michaellambgelo
```

In CI these are supplied as the `VITE_WORKER_URL` and `VITE_CHANNEL` GitHub
Actions secrets (injected at build time — see `.github/workflows/deploy.yml`).

### Worker

Non-secret vars live in `worker/wrangler.toml`:

- `TWITCH_BROADCASTER_LOGIN` — default channel login
- `ALLOWED_ORIGINS` — CORS allowlist (localhost in dev, the GitHub Pages origin
  in `[env.production.vars]`)

Secrets are set with Wrangler (never committed):

```bash
cd worker
npx wrangler secret put TWITCH_CLIENT_ID
npx wrangler secret put TWITCH_CLIENT_SECRET
```

### Worker routes

| Route | Response |
|-------|----------|
| `GET /stream?login=<channel>` | `{ live, viewerCount, startedAt, title, gameName }` from Helix Get Streams |
| `GET /badges?login=<channel>` | Merged global + channel badge map `{ set_id: { version_id: image_url } }` |
| `GET /health` | Health check |

## Build & deploy

- **Frontend → GitHub Pages:** auto-deploys on every push to `main` via
  `.github/workflows/deploy.yml` (`npm ci` + `npm run build`, then publishes
  `frontend/dist`). Vite is configured with `base: '/personal-twitch-overlay/'`.
- **Worker → Cloudflare Workers:** deployed manually:

  ```bash
  cd worker && npx wrangler deploy
  ```

## Tech stack

- React 18, TypeScript 5.5 (strict mode), Vite 5
- Tailwind CSS 3 (transparent `body` background for OBS compositing)
- `tmi.js` 1.8 for Twitch IRC chat
- Cloudflare Workers + Wrangler 4 for the Helix API proxy
