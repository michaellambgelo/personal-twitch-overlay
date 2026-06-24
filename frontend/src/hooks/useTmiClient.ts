import { useState, useEffect } from 'react';
import tmi from 'tmi.js';

/**
 * Owns the single anonymous tmi.js connection for a channel. Consumers
 * (useChat, useAlerts) attach their own listeners to the returned client
 * instead of opening their own IRC connections.
 */
export function useTmiClient(channel: string) {
  const [client, setClient] = useState<tmi.Client | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const c = new tmi.Client({
      connection: { reconnect: true, secure: true },
      channels: [channel],
    });

    const onConnected = () => setConnected(true);
    const onDisconnected = () => setConnected(false);
    c.on('connected', onConnected);
    c.on('disconnected', onDisconnected);

    c.connect().catch(() => {});
    setClient(c);

    return () => {
      setClient(null);
      setConnected(false);
      c.disconnect().catch(() => {});
    };
  }, [channel]);

  return { client, connected };
}
