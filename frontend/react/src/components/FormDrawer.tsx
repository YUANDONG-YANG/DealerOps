import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { DISCARD_MESSAGE, useLeaveWarning } from './unsavedChanges';

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  /** Shows it as a wide centred modal instead of a side drawer, for content that needs the width. */
  modal?: boolean;
  /** When true, closing asks to discard unsaved changes and leaving the page warns first. */
  dirty?: boolean;
}

/** Side drawer, or a wide centred modal, that closes when Escape is pressed. */
export default function FormDrawer({ title, open, onClose, children, modal, dirty = false }: Props) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const requestClose = () => { if (dirty) setConfirmDiscard(true); else onClose(); };

  useLeaveWarning(open && dirty);
  useEffect(() => { if (!open) setConfirmDiscard(false); }, [open]);

  // Registered once per open so it runs before any dialog opened on top; Escape then belongs to that dialog.
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.dialog-overlay')) closeRef.current();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={requestClose} />
      <div className={`drawer${modal ? ' drawer-modal' : ''}`} role="dialog" aria-label={title}>
        <div className="drawer-header">
          <span>{title}</span>
          <button className="drawer-close" onClick={requestClose} aria-label="Close">&times;</button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
      <ConfirmDialog open={confirmDiscard} title="Unsaved changes" message={DISCARD_MESSAGE} confirmLabel="Discard"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); onClose(); }} />
    </>
  );
}
