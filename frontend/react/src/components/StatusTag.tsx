import type { ReactNode } from 'react';

type StatusTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface Props {
  status: string;
  children?: ReactNode;
  tone?: StatusTone;
}

/** The colour tone of a known status value; unknown values are neutral. */
function defaultTone(status: string): StatusTone {
  const value = status.toUpperCase();
  if (['PASSED', 'IN_STOCK', 'DONE', 'ACTIVE'].includes(value)) return 'success';
  // AI_UNAVAILABLE is a failed check, so it shares the BLOCKED tone rather than the STALE one.
  if (['BLOCKED', 'AI_UNAVAILABLE', 'SOLD', 'FAILED', 'CANCELLED'].includes(value)) return 'danger';
  if (['STALE', 'REVIEW', 'PENDING'].includes(value)) return 'warning';
  if (['NEEDS_AI', 'RUNNING', 'IN_PROGRESS'].includes(value)) return 'info';
  return 'neutral';
}

/** A coloured status pill; the label defaults to the status with underscores as spaces. */
export default function StatusTag({ status, children, tone }: Props) {
  const label = children ?? status.replace(/_/g, ' ');
  return (
    <span className={`tag tag-${tone ?? defaultTone(status)}`} role="status">
      {label}
    </span>
  );
}
