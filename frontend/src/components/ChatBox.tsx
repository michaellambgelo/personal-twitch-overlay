import { useEffect, useRef } from 'react';
import type { ChatMessage, EmoteInstance } from '../types';

const EMOTE_CDN = 'https://static-cdn.jtvnw.net/emoticons/v2';

function renderMessageContent(text: string, emotes: EmoteInstance[]) {
  if (emotes.length === 0) return <span>{text}</span>;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const emote of emotes) {
    if (emote.start > lastIndex) {
      parts.push(
        <span key={`t-${lastIndex}`}>{text.slice(lastIndex, emote.start)}</span>
      );
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
    parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

interface Props {
  messages: ChatMessage[];
}

export function ChatBox({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[60vh] flex flex-col-reverse">
      <div className="overflow-y-auto space-y-1 p-3 bg-black/40 backdrop-blur-sm rounded-lg">
        {messages.map((msg, i) => {
          const age = messages.length - 1 - i;
          const opacity = age > 40 ? 0.3 : age > 25 ? 0.5 : age > 10 ? 0.7 : 1;

          return (
            <div
              key={msg.id}
              className="text-sm leading-relaxed break-words"
              style={{ opacity }}
            >
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
              <span className="text-white/60 mx-1">:</span>
              <span className="text-white">
                {renderMessageContent(msg.text, msg.emotes)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
