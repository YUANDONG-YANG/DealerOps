import type { ReactNode } from 'react';

type StatusTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface Props {
  status: string;
  children?: ReactNode;
  tone?: StatusTone;
}

function defaultTone(status: string): StatusTone {
  const value = status.toUpperCase();
  if (['PASSED', 'IN_STOCK', 'DONE', 'ACTIVE'].includes(value)) return 'success';
  if (['BLOCKED', 'SOLD', 'FAILED', 'CANCELLED'].includes(value)) return 'danger';
  if (['STALE', 'AI_UNAVAILABLE', 'NEEDS_AI', 'REVIEW', 'PENDING'].includes(value)) return 'warning';
  if (['RUNNING', 'IN_PROGRESS'].includes(value)) return 'info';
  return 'neutral';
}

export default function StatusTag({ status, children, tone }: Props) {
  const label = children ?? status.replace(/_/g, ' ');
  return (
    <span className={`tag tag-${tone ?? defaultTone(status)}`} role="status">
      {label}
    </span>
  );
}
