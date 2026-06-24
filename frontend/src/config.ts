export type ChatPosition = 'br' | 'bl' | 'tr' | 'tl';

export interface OverlayConfig {
  hideWatermark: boolean;
  hideChat: boolean;
  hideInfo: boolean;
  maxMessages: number;
  fontScale: number;
  accent: string;
  chatPosition: ChatPosition;
}

const DEFAULTS: OverlayConfig = {
  hideWatermark: false,
  hideChat: false,
  hideInfo: false,
  maxMessages: 50,
  fontScale: 1,
  accent: '#a855f7',
  chatPosition: 'br',
};

const POSITIONS: Record<ChatPosition, string> = {
  br: 'bottom-4 right-4',
  bl: 'bottom-4 left-4',
  tr: 'top-4 right-4',
  tl: 'top-4 left-4',
};

export function chatPositionClasses(pos: ChatPosition): string {
  return POSITIONS[pos] ?? POSITIONS.br;
}

/** Convert #rrggbb to an rgba() string at the given alpha. Falls back to the value as-is. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Parse overlay customization from URL query params, falling back to defaults. */
export function parseConfig(params: URLSearchParams): OverlayConfig {
  const flag = (key: string) => {
    const v = params.get(key);
    return v === '1' || v === 'true';
  };
  const clampNum = (key: string, fallback: number, min: number, max: number) => {
    const v = Number(params.get(key));
    return Number.isFinite(v) && v > 0 ? Math.min(max, Math.max(min, v)) : fallback;
  };

  const position = params.get('chatPosition');
  const accent = params.get('accent');

  return {
    hideWatermark: flag('hideWatermark'),
    hideChat: flag('hideChat'),
    hideInfo: flag('hideInfo'),
    maxMessages: Math.round(clampNum('maxMessages', DEFAULTS.maxMessages, 1, 200)),
    fontScale: clampNum('fontScale', DEFAULTS.fontScale, 0.5, 3),
    accent: accent ? (accent.startsWith('#') ? accent : `#${accent}`) : DEFAULTS.accent,
    chatPosition: (position as ChatPosition) in POSITIONS ? (position as ChatPosition) : DEFAULTS.chatPosition,
  };
}
