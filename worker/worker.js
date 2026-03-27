// Cached app access token (persists within a single Worker isolate)
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAppAccessToken(env) {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const resp = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token request failed: ${resp.status}`);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  return cachedToken;
}

async function twitchApi(path, env) {
  const token = await getAppAccessToken(env);
  const resp = await fetch(`https://api.twitch.tv/helix${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id': env.TWITCH_CLIENT_ID,
    },
  });
  if (!resp.ok) {
    throw new Error(`Twitch API ${path} failed: ${resp.status}`);
  }
  return resp.json();
}

// Cache broadcaster ID (rarely changes)
let cachedBroadcasterId = null;
let cachedBroadcasterLogin = null;

async function getBroadcasterId(login, env) {
  if (cachedBroadcasterId && cachedBroadcasterLogin === login) {
    return cachedBroadcasterId;
  }
  const data = await twitchApi(`/users?login=${login}`, env);
  if (!data.data || data.data.length === 0) {
    throw new Error(`User not found: ${login}`);
  }
  cachedBroadcasterId = data.data[0].id;
  cachedBroadcasterLogin = login;
  return cachedBroadcasterId;
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  if (!allowed.includes(origin)) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(data, request, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request, env),
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request, env),
      });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, request, env, 405);
    }

    try {
      const login = url.searchParams.get('login') || env.TWITCH_BROADCASTER_LOGIN;

      if (url.pathname === '/stream') {
        const data = await twitchApi(`/streams?user_login=${login}`, env);
        if (!data.data || data.data.length === 0) {
          return jsonResponse({ live: false }, request, env);
        }
        const stream = data.data[0];
        return jsonResponse({
          live: true,
          viewerCount: stream.viewer_count,
          startedAt: stream.started_at,
          title: stream.title,
          gameName: stream.game_name,
        }, request, env);
      }

      if (url.pathname === '/badges') {
        const broadcasterId = await getBroadcasterId(login, env);
        const [global, channel] = await Promise.all([
          twitchApi('/chat/badges/global', env),
          twitchApi(`/chat/badges?broadcaster_id=${broadcasterId}`, env),
        ]);

        // Merge into { set_id: { version_id: image_url } }
        const badgeMap = {};
        for (const badge of [...global.data, ...channel.data]) {
          if (!badgeMap[badge.set_id]) {
            badgeMap[badge.set_id] = {};
          }
          for (const version of badge.versions) {
            badgeMap[badge.set_id][version.id] = version.image_url_1x;
          }
        }
        return jsonResponse(badgeMap, request, env);
      }

      if (url.pathname === '/health') {
        return jsonResponse({ ok: true }, request, env);
      }

      return jsonResponse({ error: 'Not found' }, request, env, 404);
    } catch (err) {
      return jsonResponse({ error: err.message }, request, env, 500);
    }
  },
};
