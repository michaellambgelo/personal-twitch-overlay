import type { AlertEvent } from '../types';

interface Props {
  alert: AlertEvent | null;
}

const ICON: Record<AlertEvent['kind'], string> = {
  sub: '🎉',
  resub: '⭐',
  subgift: '🎁',
  raid: '📢',
  cheer: '💎',
};

function headline(alert: AlertEvent): string {
  switch (alert.kind) {
    case 'sub':
      return `${alert.user} subscribed${alert.detail ? ` (${alert.detail})` : ''}!`;
    case 'resub':
      return `${alert.user} resubscribed${alert.amount ? ` for ${alert.amount} months` : ''}${
        alert.detail ? ` (${alert.detail})` : ''
      }!`;
    case 'subgift':
      return alert.amount
        ? `${alert.user} gifted ${alert.amount} subs!`
        : `${alert.user} gifted a sub${alert.message ? ` ${alert.message}` : ''}!`;
    case 'raid':
      return `${alert.user} raided with ${alert.amount ?? 0} viewers!`;
    case 'cheer':
      return `${alert.user} cheered ${alert.amount ?? 0} bits!`;
  }
}

export function AlertOverlay({ alert }: Props) {
  if (!alert) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10">
      <div
        key={alert.id}
        className="animate-alert-in flex flex-col items-center gap-1 bg-black/70 backdrop-blur-sm rounded-xl px-6 py-3 text-white text-center shadow-lg ring-1 ring-white/10"
      >
        <span className="text-base font-semibold">
          <span className="mr-2">{ICON[alert.kind]}</span>
          {headline(alert)}
        </span>
        {alert.message && alert.kind !== 'subgift' && (
          <span className="text-sm text-white/70 max-w-sm break-words">{alert.message}</span>
        )}
      </div>
    </div>
  );
}
