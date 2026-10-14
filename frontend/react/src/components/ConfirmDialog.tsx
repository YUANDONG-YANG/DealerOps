import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel, onConfirm, onCancel, children,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">{title || 'Confirm'}</div>
        <div className="dialog-body">
          {children || <p>{message || 'Are you sure?'}</p>}
        </div>
        <div className="dialog-footer">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>{confirmLabel || 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
