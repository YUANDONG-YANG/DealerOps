import type { ReactNode } from 'react';

interface Props {
  loading?: boolean;
  error?: string;
  forbidden?: boolean;
  empty?: boolean;
  loadingText?: string;
  emptyText?: string;
  forbiddenText?: string;
  children?: ReactNode;
}

export default function PageState({
  loading, error, forbidden, empty,
  loadingText, emptyText, forbiddenText, children,
}: Props) {
  if (loading) return <div className="state">{loadingText || 'Loading…'}</div>;
  if (forbidden) return <div className="state danger-text">{forbiddenText || 'You do not have access.'}</div>;
  if (error) return <div className="state danger-text">{error}</div>;
  if (empty) return <div className="state">{emptyText || 'No records found.'}</div>;
  return <>{children}</>;
}
