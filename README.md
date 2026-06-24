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

- **Chat** (`ChatBox`) — last 50 messages (configurable). Renders Twitch badges,
  native emotes, and **third-party emotes** (BTTV / FFZ / 7TV), plus each user's
  chat color. Older messages fade out and the feed auto-scrolls to the newest.
  - **Moderation sync** — messages removed by a timeout, ban, single-message
    delete, or chat clear disappear from the overlay live, so banned content
    doesn't linger on stream.
  - **Polish** — bot accounts and `!commands` are filtered out; first-time
    chatters, `/me` actions, and messages that @-mention the broadcaster are
    visually highlighted.
- **Alerts** (`AlertOverlay`) — animated top-center toasts for subs, resubs, gift
  subs, raids, and cheers. Delivered over the same anonymous IRC connection
  (`USERNOTICE`), so they need **no EventSub and no user OAuth**. Shown one at a
  time with a short auto-expire.
- **Stream info** (`StreamInfo`) — top-left pill showing `🔴 LIVE | HH:MM:SS | N
  viewers`, plus the current **category and title**. The uptime timer ticks every
  second; hidden when the channel is offline.
- **Watermark** (`Watermark`) — michaellambgelo.github.io favicon in the
  bottom-left corner.

All of the above is **read-only** — the overlay never writes to Twitch and needs
no broadcaster credentials.

### Customization (URL query params)

Append these to the overlay URL alongside `?channel=`:

| Param | Values | Effect |
|-------|--------|--------|
| `maxMessages` | `1`–`200` (default `50`) | Max chat messages kept on screen |
| `chatPosition` | `br` `bl` `tr` `tl` (default `br`) | Chat corner |
| `fontScale` | `0.5`–`3` (default `1`) | Chat text size multiplier |
| `accent` | hex color (default `a855f7`) | Mention/first-chatter/alert accent |
| `hideChat` | `1` | Hide the chat panel |
| `hideInfo` | `1` | Hide the stream-info pill |
| `hideWatermark` | `1` | Hide the watermark |

Example: `…/?channel=michaellambgelo&chatPosition=tl&fontScale=1.25&accent=22d3ee`

## Architecture

Two independently deployed pieces:

| Part | Stack | Deploy target |
|------|-------|---------------|
| `frontend/` | React 18 + TypeScript + Vite + Tailwind | GitHub Pages |
| `worker/` | Cloudflare Worker (plain JS) | Cloudflare Workers |

Data flows along these paths:

- **Chat + alerts:** the browser opens a **single** anonymous Twitch IRC
  connection via `tmi.js` (`useTmiClient`) — no auth, no worker. `useChat` reads
  messages and moderation events off it; `useAlerts` reads sub/raid/cheer
  `USERNOTICE` events off the same connection.
- **Stream / badge data:** the browser calls the **worker**, which proxies the
  Twitch Helix API using an app-level OAuth token (Client Credentials grant,
  cached and refreshed in the worker). Badges are fetched once on mount; stream
  status is polled every 60 seconds.
- **Third-party emotes:** the browser resolves the channel's Twitch user-id via
  the worker's `/userid` route, then fetches BTTV / FFZ / 7TV emote sets directly
  from those providers' public (no-auth) APIs.

```
Browser ──(WebSocket, anonymous)─────► Twitch IRC              (chat, mod, alerts)
Browser ──(fetch /stream, /badges)───► Worker ──► Twitch Helix (stream data)
Browser ──(fetch /userid)────────────► Worker ──► Twitch Helix (channel user-id)
Browser ──(fetch emote sets)─────────► BTTV / FFZ / 7TV        (third-party emotes)
```

## Project structure

```
personal-twitch-overlay/
├── frontend/                 # React + Vite app
│   └── src/
│       ├── App.tsx           # Root; reads ?channel= + config, wires hooks
│       ├── config.ts         # parseConfig() for URL-param customization
│       ├── types.ts          # ChatMessage / AlertEvent / StreamData interfaces
│       ├── components/
│       │   ├── ChatBox.tsx
│       │   ├── StreamInfo.tsx
│       │   ├── AlertOverlay.tsx
│       │   └── Watermark.tsx
│       └── hooks/
│           ├── useTmiClient.ts      # the one shared anonymous IRC connection
│           ├── useChat.ts           # messages + moderation sync
│           ├── useAlerts.ts         # sub/raid/cheer alerts off the same client
│           ├── useThirdPartyEmotes.ts # BTTV/FFZ/7TV emote map
│           └── useStreamData.ts     # fetch /badges once, poll /stream every 60s
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
| `GET /userid?login=<channel>` | `{ id }` — the channel's Twitch user-id (used to fetch third-party emotes) |
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
