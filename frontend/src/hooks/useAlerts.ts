import { useState, useEffect, useCallback, useRef } from 'react';
import type tmi from 'tmi.js';
import type { AlertEvent } from '../types';

const ALERT_DURATION = 6_000;

function tierLabel(plan: string | undefined): string {
  switch (plan) {
    case 'Prime':
      return 'Prime';
    case '2000':
      return 'Tier 2';
    case '3000':
      return 'Tier 3';
    default:
      return 'Tier 1';
  }
}

/**
 * Surfaces sub/resub/gift/raid/cheer events one at a time as transient
 * alerts. Rides the shared anonymous IRC connection (USERNOTICE) — no
 * EventSub or user OAuth required.
 */
export function useAlerts(client: tmi.Client | null) {
  const [current, setCurrent] = useState<AlertEvent | null>(null);
  const queueRef = useRef<AlertEvent[]>([]);
  const showingRef = useRef(false);

  const advance = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      showingRef.current = false;
      setCurrent(null);
      return;
    }
    showingRef.current = true;
    setCurrent(next);
    setTimeout(advance, ALERT_DURATION);
  }, []);

  const enqueue = useCallback(
    (alert: Omit<AlertEvent, 'id' | 'timestamp'>) => {
      const full: AlertEvent = {
        ...alert,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      queueRef.current.push(full);
      if (!showingRef.current) advance();
    },
    [advance]
  );

  useEffect(() => {
    if (!client) return;

    const onSub: tmi.Events['subscription'] = (_ch, username, methods, message) =>
      enqueue({ kind: 'sub', user: username, message: message || undefined, detail: tierLabel(methods.plan) });

    const onResub: tmi.Events['resub'] = (_ch, username, months, message, _userstate, methods) =>
      enqueue({
        kind: 'resub',
        user: username,
        message: message || undefined,
        amount: months,
        detail: tierLabel(methods.plan),
      });

    const onSubGift: tmi.Events['subgift'] = (_ch, username, _streak, recipient) =>
      enqueue({ kind: 'subgift', user: username, message: `→ ${recipient}` });

    const onMysteryGift: tmi.Events['submysterygift'] = (_ch, username, numbOfSubs) =>
      enqueue({ kind: 'subgift', user: username, amount: numbOfSubs });

    const onRaid: tmi.Events['raided'] = (_ch, username, viewers) =>
      enqueue({ kind: 'raid', user: username, amount: viewers });

    const onCheer: tmi.Events['cheer'] = (_ch, userstate, message) =>
      enqueue({ kind: 'cheer', user: userstate['display-name'] || userstate.username || 'anonymous', message, amount: Number(userstate.bits) || 0 });

    client.on('subscription', onSub);
    client.on('resub', onResub);
    client.on('subgift', onSubGift);
    client.on('submysterygift', onMysteryGift);
    client.on('raided', onRaid);
    client.on('cheer', onCheer);

    return () => {
      client.removeListener('subscription', onSub);
      client.removeListener('resub', onResub);
      client.removeListener('subgift', onSubGift);
      client.removeListener('submysterygift', onMysteryGift);
      client.removeListener('raided', onRaid);
      client.removeListener('cheer', onCheer);
    };
  }, [client, enqueue]);

  return { alert: current };
}
