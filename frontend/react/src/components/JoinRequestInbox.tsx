import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRequestsApi } from '../api/joinRequests';
import {
  JOIN_REQUESTS_CHANGED,
  emitJoinRequestsChanged,
  notificationsApi,
  type JoinRequestPayload,
  type Notification,
} from '../api/notifications';
import { codeOf, messageOf, statusOf } from '../api/http';
import { initials } from '../format';

type JoinRequestNotification = Notification & { kind: 'JOIN_REQUEST'; payload: JoinRequestPayload };

function isJoinRequest(n: Notification): n is JoinRequestNotification {
  return n.kind === 'JOIN_REQUEST'
    && typeof (n.payload as Record<string, unknown>)?.username === 'string';
}

const POLL_MS = 30_000;

/**
 * In-app inbox for Google join requests. Lives in the header so a Dealer.User sees new
 * requests the moment they sign in without having to open the Team page. One bell button, a
 * count badge, and a popover that lists each request with Approve / Reject right there — any
 * action refreshes the list so the badge stays truthful.
 *
 * Polls every 30s while mounted so a request that lands after sign-in still surfaces without
 * a page refresh. Silent on failure: an inbox that cannot load is an annoyance, not a reason
 * to shout at the user mid-work.
 */
export default function JoinRequestInbox() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<JoinRequestNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const list = await notificationsApi.list();
      setRows(list.filter(isJoinRequest));
      setError('');
    } catch { /* keep the stale list rather than clearing the badge on a transient blip */ }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    const onChanged = () => void load();
    window.addEventListener(JOIN_REQUESTS_CHANGED, onChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(JOIN_REQUESTS_CHANGED, onChanged);
    };
  }, []);

  // Close the popover when the next click lands outside it, so it doesn't trap focus.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  async function act(username: string, verb: 'approve' | 'reject') {
    setActing(username); setError('');
    try {
      if (verb === 'approve') await joinRequestsApi.approve(username);
      else await joinRequestsApi.reject(username);
    } catch (err) {
      // The request is already resolved (by another admin or in the Team page): drop it from
      // the list silently instead of surfacing an error for an action that no longer applies.
      const gone = statusOf(err) === 404 || codeOf(err) === 'NOT_FOUND';
      if (!gone) setError(messageOf(err, `Could not ${verb} the request.`));
    } finally {
      setActing(null);
    }
    await load();
    emitJoinRequestsChanged();
  }

  const count = rows.length;

  return (
    <div className="inbox" ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`inbox-bell${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-label={count > 0 ? `${count} join requests` : 'No join requests'}
        onClick={() => setOpen(o => !o)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z" />
          <path d="M10 20a2 2 0 004 0" />
        </svg>
        {count > 0 && <span className="inbox-badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="inbox-popover" onClick={(e) => e.stopPropagation()}>
          <div className="inbox-head">
            <div className="inbox-title">
              <strong>Join requests</strong>
              {count > 0 && <span className="inbox-count">{count}</span>}
            </div>
            <button type="button" className="btn-link inbox-team-link" onClick={() => { setOpen(false); navigate('/team'); }}>
              Open Team →
            </button>
          </div>
          {error && <div className="alert alert-error inbox-error">{error}</div>}
          {count === 0 ? (
            <div className="inbox-empty">
              <span className="inbox-empty-icon" aria-hidden="true">✓</span>
              <span>You're all caught up.</span>
            </div>
          ) : (
            <ul className="inbox-list">
              {rows.map(r => {
                const busy = acting === r.payload.username;
                return (
                  <li key={r.id} className="inbox-item">
                    <div className="inbox-who">
                      <span className="avatar avatar-sm" aria-hidden="true">{initials(r.payload.displayName)}</span>
                      <div className="inbox-text">
                        <div className="inbox-name" title={r.payload.displayName}>{r.payload.displayName}</div>
                        <div className="inbox-meta" title={r.payload.email ?? r.payload.username}>
                          {r.payload.email ?? r.payload.username}
                        </div>
                      </div>
                    </div>
                    <div className="inbox-actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() => void act(r.payload.username, 'reject')}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={busy}
                        onClick={() => void act(r.payload.username, 'approve')}
                      >
                        Approve
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
