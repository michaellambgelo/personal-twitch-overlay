import { useEffect, useRef } from 'react';
import type { ChatMessage, EmoteInstance, ThirdPartyEmoteMap } from '../types';
import { chatPositionClasses, withAlpha, type ChatPosition } from '../config';

const EMOTE_CDN = 'https://static-cdn.jtvnw.net/emoticons/v2';

// Replace any word that matches a 3rd-party (BTTV/FFZ/7TV) emote name with its image.
function renderText(text: string, thirdParty: ThirdPartyEmoteMap, keyPrefix: string) {
  if (!text) return null;
  const tokens = text.split(/(\s+)/);
  return tokens.map((tok, i) => {
    const url = thirdParty[tok];
    if (url) {
      return (
        <img
          key={`${keyPrefix}-${i}`}
          src={url}
          alt={tok}
          className="inline-block h-6 align-middle mx-0.5"
        />
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{tok}</span>;
  });
}

function renderMessageContent(text: string, emotes: EmoteInstance[], thirdParty: ThirdPartyEmoteMap) {
  if (emotes.length === 0) return <>{renderText(text, thirdParty, 't')}</>;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const emote of emotes) {
    if (emote.start > lastIndex) {
      parts.push(...(renderText(text.slice(lastIndex, emote.start), thirdParty, `t-${lastIndex}`) ?? []));
    }
    parts.push(
      <img
        key={`e-${emote.start}`}
        src={`${EMOTE_CDN}/${emote.id}/static/dark/1.0`}
        alt={text.slice(emote.start, emote.end + 1)}
        className="inline-block h-5 align-middle mx-0.5"
      />
    );
    lastIndex = emote.end + 1;
  }

  if (lastIndex < text.length) {
    parts.push(...(renderText(text.slice(lastIndex), thirdParty, `t-${lastIndex}`) ?? []));
  }

  return <>{parts}</>;
}

interface Props {
  messages: ChatMessage[];
  thirdPartyEmotes: ThirdPartyEmoteMap;
  position?: ChatPosition;
  fontScale?: number;
  accent?: string;
}

export function ChatBox({ messages, thirdPartyEmotes, position = 'br', fontScale = 1, accent = '#a855f7' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className={`fixed ${chatPositionClasses(position)} w-96 max-h-[60vh] flex flex-col-reverse`}
      style={{ fontSize: `calc(0.875rem * ${fontScale})` }}
    >
      <div className="overflow-y-auto space-y-1 p-3 bg-black/40 backdrop-blur-sm rounded-lg">
        {messages.map((msg, i) => {
          const age = messages.length - 1 - i;
          const opacity = age > 40 ? 0.3 : age > 25 ? 0.5 : age > 10 ? 0.7 : 1;
          const rowStyle: React.CSSProperties = { opacity };
          if (msg.mentioned) rowStyle.backgroundColor = withAlpha(accent, 0.22);
          if (msg.firstMessage) rowStyle.boxShadow = `inset 0 0 0 1px ${withAlpha(accent, 0.6)}`;

          return (
            <div key={msg.id} className="leading-relaxed break-words rounded px-1 -mx-1" style={rowStyle}>
              {msg.firstMessage && (
                <span
                  className="text-[10px] uppercase tracking-wide mr-1 align-middle"
                  style={{ color: accent }}
                >
                  first
                </span>
              )}
              {msg.badges.map((badge, bi) => (
                <img
                  key={bi}
                  src={badge.imageUrl}
                  alt=""
                  className="inline-block h-4 align-middle mr-1"
                />
              ))}
              <span className="font-semibold" style={{ color: msg.color }}>
                {msg.username}
              </span>
              {!msg.isAction && <span className="text-white/60 mx-1">:</span>}{' '}
              <span
                className={msg.isAction ? 'italic' : 'text-white'}
                style={msg.isAction ? { color: msg.color } : undefined}
              >
                {renderMessageContent(msg.text, msg.emotes, thirdPartyEmotes)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
