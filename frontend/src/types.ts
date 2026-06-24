export interface ChatMessage {
  id: string;
  username: string;
  usernameLower: string;
  color: string;
  badges: BadgeInstance[];
  emotes: EmoteInstance[];
  text: string;
  timestamp: number;
  /** First-ever message from this user in the channel. */
  firstMessage: boolean;
  /** Sent as a `/me` action — render italic in the user's color. */
  isAction: boolean;
  /** Mentions the broadcaster (@channel). */
  mentioned: boolean;
}

/** Third-party (BTTV/FFZ/7TV) emotes, keyed by exact emote word. */
export type ThirdPartyEmoteMap = Record<string, string>;

export interface BadgeInstance {
  imageUrl: string;
}

export interface EmoteInstance {
  id: string;
  start: number;
  end: number;
}

export interface StreamData {
  live: boolean;
  viewerCount: number;
  startedAt: string | null;
  title: string;
  gameName: string;
}

export type BadgeMap = Record<string, Record<string, string>>;

export type AlertKind = 'sub' | 'resub' | 'subgift' | 'raid' | 'cheer';

export interface AlertEvent {
  id: string;
  kind: AlertKind;
  user: string;
  /** User-supplied message (resub/cheer), when present. */
  message?: string;
  /** Bits (cheer), raider count (raid), or gifted-sub count (subgift). */
  amount?: number;
  /** Months (resub) or sub tier label, when relevant. */
  detail?: string;
  timestamp: number;
}
