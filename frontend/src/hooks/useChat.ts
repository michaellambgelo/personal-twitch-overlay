import { useState, useEffect, useCallback, useRef } from 'react';
import type tmi from 'tmi.js';
import type { ChatMessage, EmoteInstance, BadgeInstance, BadgeMap } from '../types';

const MAX_MESSAGES = 50;

// Common chat bots whose output is noise on an overlay.
const BOT_USERNAMES = new Set(['nightbot', 'streamelements', 'streamlabs', 'moobot', 'soundalerts']);

function isBotOrCommand(usernameLower: string, text: string): boolean {
  return text.startsWith('!') || BOT_USERNAMES.has(usernameLower);
}

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

export function useChat(client: tmi.Client | null, badgeMap: BadgeMap, channel: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const badgeMapRef = useRef(badgeMap);
  badgeMapRef.current = badgeMap;
  const mentionRef = useRef(`@${channel.toLowerCase()}`);
  mentionRef.current = `@${channel.toLowerCase()}`;

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      const next = [...prev, msg];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
  }, []);

  const removeById = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const removeByUser = useCallback((username: string) => {
    const lower = username.toLowerCase();
    setMessages(prev => prev.filter(m => m.usernameLower !== lower));
  }, []);

  useEffect(() => {
    if (!client) return;

    const onMessage: tmi.Events['message'] = (_channel, userstate, text, self) => {
      if (self) return;
      const username = userstate['display-name'] || userstate.username || 'anonymous';
      const usernameLower = (userstate.username || username).toLowerCase();
      if (isBotOrCommand(usernameLower, text)) return;
      addMessage({
        id: userstate.id || crypto.randomUUID(),
        username,
        usernameLower,
        color: userstate.color || '#ffffff',
        badges: parseBadges(userstate.badges as Record<string, string> | undefined, badgeMapRef.current),
        emotes: parseEmotes(userstate.emotes as Record<string, string[]> | undefined),
        text,
        timestamp: Date.now(),
        firstMessage: userstate['first-msg'] === true,
        isAction: userstate['message-type'] === 'action',
        mentioned: text.toLowerCase().includes(mentionRef.current),
      });
    };

    // Moderation sync — keep the overlay clear of removed content
    const onDeleted: tmi.Events['messagedeleted'] = (_channel, _username, _deletedMessage, userstate) => {
      const targetId = userstate['target-msg-id'];
      if (targetId) removeById(targetId);
    };
    const onTimeout: tmi.Events['timeout'] = (_channel, username) => removeByUser(username);
    const onBan: tmi.Events['ban'] = (_channel, username) => removeByUser(username);
    const onClear: tmi.Events['clearchat'] = () => setMessages([]);

    client.on('message', onMessage);
    client.on('messagedeleted', onDeleted);
    client.on('timeout', onTimeout);
    client.on('ban', onBan);
    client.on('clearchat', onClear);

    return () => {
      client.removeListener('message', onMessage);
      client.removeListener('messagedeleted', onDeleted);
      client.removeListener('timeout', onTimeout);
      client.removeListener('ban', onBan);
      client.removeListener('clearchat', onClear);
    };
  }, [client, addMessage, removeById, removeByUser]);

  return { messages };
}
