import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}

export default function FormDrawer({ title, open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label={title}>
        <div className="drawer-header">
          <span>{title}</span>
          <button className="drawer-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </>
  );
}
