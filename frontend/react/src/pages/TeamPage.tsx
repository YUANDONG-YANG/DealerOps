import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { joinRequestsApi } from '../api/joinRequests';
import { notificationsApi, type Notification, type JoinRequestPayload } from '../api/notifications';
import { messageOf } from '../api/http';

type JoinRequestRow = Notification & { kind: 'JOIN_REQUEST'; payload: JoinRequestPayload };

function isJoinRequest(n: Notification): n is JoinRequestRow {
  return n.kind === 'JOIN_REQUEST'
    && typeof (n.payload as Record<string, unknown>)?.username === 'string';
}

function statusLabel(n: Notification): { text: string; className: string } {
  if (n.resolvedAt == null) return { text: 'Pending', className: 'chip chip-review' };
  if (n.resolvedAction === 'APPROVED') return { text: 'Approved', className: 'chip chip-pass' };
  if (n.resolvedAction === 'REJECTED') return { text: 'Rejected', className: 'chip chip-block' };
  return { text: 'Resolved', className: 'chip' };
}

/**
 * Dealership inbox history: every notification scoped to the current tenant, newest first.
 * Pending rows still carry the Approve / Reject actions; resolved rows show who settled it
 * and when, so the dealership keeps an audit trail of its own membership decisions.
 */
export default function TeamPage() {
  const [rows, setRows] = useState<JoinRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const list = await notificationsApi.list(true);
      setRows(list.filter(isJoinRequest));
    } catch (err) {
      setError(messageOf(err, 'Could not load the inbox.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

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

  return (
    <AppLayout>
    <section className="page">
      <header className="page-header">
        <h1>Team</h1>
        <p className="muted">Google users who asked to join this dealership. Newest first.</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="state">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="state">No join requests yet.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Username</th>
              <th>Requested</th>
              <th>Status</th>
              <th>Resolved</th>
              <th style={{ width: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const status = statusLabel(r);
              const pending = r.resolvedAt == null;
              return (
                <tr key={r.id}>
                  <td>{r.payload.displayName}</td>
                  <td>{r.payload.email ?? '—'}</td>
                  <td>{r.payload.username}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td><span className={status.className}>{status.text}</span></td>
                  <td>
                    {r.resolvedAt
                      ? <>{new Date(r.resolvedAt).toLocaleString()}<br />
                          <span className="muted">by {r.resolvedBy}</span></>
                      : '—'}
                  </td>
                  <td>
                    {pending ? (
                      <>
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
                          style={{ marginLeft: 12 }}
                          disabled={acting === r.payload.username}
                          onClick={() => void act(r.payload.username, 'reject')}
                        >
                          Reject
                        </button>
                      </>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
    </AppLayout>
  );
}
