import { useState, useEffect } from 'react';
import type { ThirdPartyEmoteMap } from '../types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8788';

function withScheme(url: string): string {
  return url.startsWith('//') ? `https:${url}` : url;
}

async function fetchJson(url: string): Promise<unknown> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${url} -> ${resp.status}`);
  return resp.json();
}

// --- BetterTTV ---
async function bttv(userId: string): Promise<ThirdPartyEmoteMap> {
  const map: ThirdPartyEmoteMap = {};
  const add = (emotes: Array<{ id: string; code: string }> | undefined) => {
    for (const e of emotes || []) map[e.code] = `https://cdn.betterttv.net/emote/${e.id}/1x.webp`;
  };
  const [global, channel] = await Promise.allSettled([
    fetchJson('https://api.betterttv.net/3/cached/emotes/global'),
    fetchJson(`https://api.betterttv.net/3/cached/users/twitch/${userId}`),
  ]);
  if (global.status === 'fulfilled') add(global.value as Array<{ id: string; code: string }>);
  if (channel.status === 'fulfilled') {
    const data = channel.value as { channelEmotes?: []; sharedEmotes?: [] };
    add(data.channelEmotes);
    add(data.sharedEmotes);
  }
  return map;
}

// --- FrankerFaceZ ---
async function ffz(userId: string): Promise<ThirdPartyEmoteMap> {
  const map: ThirdPartyEmoteMap = {};
  const addSets = (data: { sets?: Record<string, { emoticons?: Array<{ name: string; urls: Record<string, string> }> }> }) => {
    for (const set of Object.values(data.sets || {})) {
      for (const e of set.emoticons || []) {
        const url = e.urls['1'] || Object.values(e.urls)[0];
        if (url) map[e.name] = withScheme(url);
      }
    }
  };
  const [global, room] = await Promise.allSettled([
    fetchJson('https://api.frankerfacez.com/v1/set/global'),
    fetchJson(`https://api.frankerfacez.com/v1/room/id/${userId}`),
  ]);
  if (global.status === 'fulfilled') addSets(global.value as never);
  if (room.status === 'fulfilled') addSets(room.value as never);
  return map;
}

// --- 7TV ---
type SevenTvEmote = { name: string; data?: { host?: { url?: string } } };
async function seventv(userId: string): Promise<ThirdPartyEmoteMap> {
  const map: ThirdPartyEmoteMap = {};
  const add = (emotes: SevenTvEmote[] | undefined) => {
    for (const e of emotes || []) {
      const host = e.data?.host?.url;
      if (host) map[e.name] = `${withScheme(host)}/1x.webp`;
    }
  };
  const [global, user] = await Promise.allSettled([
    fetchJson('https://7tv.io/v3/emote-sets/global'),
    fetchJson(`https://7tv.io/v3/users/twitch/${userId}`),
  ]);
  if (global.status === 'fulfilled') add((global.value as { emotes?: SevenTvEmote[] }).emotes);
  if (user.status === 'fulfilled') add((user.value as { emote_set?: { emotes?: SevenTvEmote[] } }).emote_set?.emotes);
  return map;
}

/**
 * Builds a name->image map of BTTV/FFZ/7TV emotes for the channel. All three
 * provider APIs are public (no auth); the channel's Twitch user-id comes from
 * the worker's /userid route. Failures degrade gracefully to fewer emotes.
 */
export function useThirdPartyEmotes(channel: string): ThirdPartyEmoteMap {
  const [emotes, setEmotes] = useState<ThirdPartyEmoteMap>({});

  useEffect(() => {
    let cancelled = false;
    setEmotes({});

    (async () => {
      try {
        const resp = await fetch(`${WORKER_URL}/userid?login=${channel}`);
        if (!resp.ok) return;
        const { id } = (await resp.json()) as { id: string };
        if (!id) return;

        const results = await Promise.all([bttv(id), ffz(id), seventv(id)]);
        if (cancelled) return;
        setEmotes(Object.assign({}, ...results));
      } catch {
        // third-party emotes are non-critical; leave the map empty
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channel]);

  return emotes;
}
