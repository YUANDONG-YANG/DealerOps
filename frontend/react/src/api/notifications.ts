import { http } from './http';

/**
 * Dealer-wide inbox: every active member of the dealership sees the same unread list, and the
 * first to approve or reject takes a row off everyone else's screen. Payload is a kind-specific
 * JSON blob the frontend narrows by `kind`.
 */
export type Notification = {
  id: number;
  kind: string;
  createdAt: string;
  payload: Record<string, unknown>;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolvedAction: string | null;
};

export const notificationsApi = {
  /** Unread inbox (default) or the full history when includeResolved is true. */
  list: (includeResolved = false) =>
    http.get<Notification[]>('/api/v1/dealer/notifications',
      { params: includeResolved ? { includeResolved: true } : {} })
      .then(r => r.data),
};

/** Narrowed payload for kind=JOIN_REQUEST. */
export type JoinRequestPayload = {
  username: string;
  displayName: string;
  email: string | null;
};

// Fires whenever the inbox or the Team page changes a join request so that whichever other
// view is open refreshes without the user having to reload or switch tabs.
export const JOIN_REQUESTS_CHANGED = 'dealerops:join-requests-changed';

export function emitJoinRequestsChanged() {
  window.dispatchEvent(new CustomEvent(JOIN_REQUESTS_CHANGED));
}
