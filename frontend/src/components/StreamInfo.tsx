import { useState, useEffect } from 'react';
import type { StreamData } from '../types';

function formatElapsed(startedAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface Props {
  streamData: StreamData;
}

export function StreamInfo({ streamData }: Props) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!streamData.live || !streamData.startedAt) return;
    setElapsed(formatElapsed(streamData.startedAt));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(streamData.startedAt!));
    }, 1000);
    return () => clearInterval(interval);
  }, [streamData.live, streamData.startedAt]);

  if (!streamData.live) return null;

  return (
    <div className="fixed top-4 left-4 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-mono">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        LIVE
      </span>
      <span className="text-white/40">|</span>
      <span>{elapsed}</span>
      <span className="text-white/40">|</span>
      <span>{streamData.viewerCount.toLocaleString()} viewers</span>
    </div>
  );
}
