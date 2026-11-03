import { useEffect, useState } from 'react';

export const DISCARD_MESSAGE = 'Discard unsaved changes?';

/**
 * Tracks whether a form differs from the values it was last loaded or reset with.
 * Call `reset(values)` (or `reset(prev => next)`) whenever the form is filled from the server.
 */
export function useFormBaseline<T>(value: T) {
  const [baseline, reset] = useState<T | null>(null);
  const dirty = baseline != null && JSON.stringify(value) !== JSON.stringify(baseline);
  return { dirty, reset };
}

/**
 * While `active`, warns before the tab is closed or reloaded, and asks before an in-app link
 * navigates away (the app uses BrowserRouter, which has no route blocker).
 */
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]');
      if (!link || link.getAttribute('target') === '_blank') return;
      if (!window.confirm(DISCARD_MESSAGE)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active]);
}
