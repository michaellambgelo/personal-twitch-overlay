import { useState, useEffect } from 'react';
import type { StreamData, BadgeMap } from '../types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8788';
const POLL_INTERVAL = 60_000;

export function useStreamData(channel: string) {
  const [streamData, setStreamData] = useState<StreamData>({
    live: false,
    viewerCount: 0,
    startedAt: null,
    title: '',
    gameName: '',
  });
  const [badgeMap, setBadgeMap] = useState<BadgeMap>({});

  useEffect(() => {
    let cancelled = false;

    async function fetchBadges() {
      try {
        const resp = await fetch(`${WORKER_URL}/badges?login=${channel}`);
        if (resp.ok && !cancelled) {
          setBadgeMap(await resp.json());
        }
      } catch {
        // badges are non-critical, silently fail
      }
    }

    async function fetchStream() {
      try {
        const resp = await fetch(`${WORKER_URL}/stream?login=${channel}`);
        if (resp.ok && !cancelled) {
          setStreamData(await resp.json());
        }
      } catch {
        // will retry on next poll
      }
    }

    fetchBadges();
    fetchStream();
    const interval = setInterval(fetchStream, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [channel]);

  return { streamData, badgeMap };
}
