import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRequestsApi } from '../api/joinRequests';
import { notificationsApi, type Notification, type JoinRequestPayload } from '../api/notifications';
import { messageOf } from '../api/http';

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
    return () => window.clearInterval(timer);
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
      await load();
    } catch (err) {
      setError(messageOf(err, `Could not ${verb} the request.`));
    } finally {
      setActing(null);
    }
  }

  const count = rows.length;

  return (
    <div className="inbox" ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="inbox-bell"
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
            <strong>Join requests</strong>
            <button type="button" className="btn-link" onClick={() => { setOpen(false); navigate('/team'); }}>
              Open Team
            </button>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {count === 0 ? (
            <div className="inbox-empty">No pending requests.</div>
          ) : (
            <ul className="inbox-list">
              {rows.map(r => (
                <li key={r.id} className="inbox-item">
                  <div>
                    <div><strong>{r.payload.displayName}</strong> asked to join</div>
                    <div className="muted">{r.payload.email ?? r.payload.username}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="inbox-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={acting === r.payload.username}
                      onClick={() => void act(r.payload.username, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-link"
                      disabled={acting === r.payload.username}
                      onClick={() => void act(r.payload.username, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
