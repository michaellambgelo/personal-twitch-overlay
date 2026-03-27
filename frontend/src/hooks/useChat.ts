import { useState, useEffect, useCallback, useRef } from 'react';
import tmi from 'tmi.js';
import type { ChatMessage, EmoteInstance, BadgeInstance, BadgeMap } from '../types';

const MAX_MESSAGES = 50;

function parseEmotes(emotesTag: Record<string, string[]> | undefined): EmoteInstance[] {
  if (!emotesTag) return [];
  const emotes: EmoteInstance[] = [];
  for (const [id, positions] of Object.entries(emotesTag)) {
    for (const pos of positions) {
      const [start, end] = pos.split('-').map(Number);
      emotes.push({ id, start, end });
    }
  }
  return emotes.sort((a, b) => a.start - b.start);
}

function parseBadges(
  badgesTag: Record<string, string> | undefined,
  badgeMap: BadgeMap
): BadgeInstance[] {
  if (!badgesTag) return [];
  const badges: BadgeInstance[] = [];
  for (const [setId, version] of Object.entries(badgesTag)) {
    const url = badgeMap[setId]?.[version];
    if (url) {
      badges.push({ imageUrl: url });
    }
  }
  return badges;
}

export function useChat(channel: string, badgeMap: BadgeMap) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const badgeMapRef = useRef(badgeMap);
  badgeMapRef.current = badgeMap;

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      const next = [...prev, msg];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
  }, []);

  useEffect(() => {
    const client = new tmi.Client({
      connection: { reconnect: true, secure: true },
      channels: [channel],
    });

    client.on('connected', () => setConnected(true));
    client.on('disconnected', () => setConnected(false));

    client.on('message', (_channel, userstate, text, self) => {
      if (self) return;
      addMessage({
        id: userstate.id || crypto.randomUUID(),
        username: userstate['display-name'] || userstate.username || 'anonymous',
        color: userstate.color || '#ffffff',
        badges: parseBadges(userstate.badges as Record<string, string> | undefined, badgeMapRef.current),
        emotes: parseEmotes(userstate.emotes as Record<string, string[]> | undefined),
        text,
        timestamp: Date.now(),
      });
    });

    client.connect().catch(() => {});

    return () => {
      client.disconnect().catch(() => {});
    };
  }, [channel, addMessage]);

  return { messages, connected };
}
