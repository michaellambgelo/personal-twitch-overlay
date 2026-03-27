export interface ChatMessage {
  id: string;
  username: string;
  color: string;
  badges: BadgeInstance[];
  emotes: EmoteInstance[];
  text: string;
  timestamp: number;
}

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
