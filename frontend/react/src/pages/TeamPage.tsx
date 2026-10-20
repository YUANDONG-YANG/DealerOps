import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { joinRequestsApi } from '../api/joinRequests';
import { accountSourceLabel, membersApi, type MemberOption } from '../api/members';
import {
  JOIN_REQUESTS_CHANGED,
  emitJoinRequestsChanged,
  notificationsApi,
  type JoinRequestPayload,
  type Notification,
} from '../api/notifications';
import { codeOf, statusOf } from '../api/http';
import { dateTimeLocal } from '../format';
import { describeError } from '../api/errors';

const PAGE_SIZE = 10;

type JoinRequestRow = Notification & { kind: 'JOIN_REQUEST'; payload: JoinRequestPayload };

function isJoinRequest(n: Notification): n is JoinRequestRow {
  return n.kind === 'JOIN_REQUEST'
    && typeof (n.payload as Record<string, unknown>)?.username === 'string';
}

function statusLabel(n: Notification): { text: string; className: string } {
  if (n.resolvedAt == null) return { text: 'Pending', className: 'chip chip-review' };
  if (n.resolvedAction === 'APPROVED') return { text: 'Approved', className: 'chip chip-pass' };
  if (n.resolvedAction === 'REJECTED') return { text: 'Rejected', className: 'chip chip-block' };
  if (n.resolvedAction === 'CANCELLED') return { text: 'Cancelled', className: 'chip' };
  return { text: 'Resolved', className: 'chip' };
}

/**
 * This dealership's current members (with how each account was created) and its join-request history (GET /api/v1/dealer/notifications?includeResolved=true).
 * Pending rows carry Approve / Reject for any active member; resolved rows show who settled
 * them and when. Newest first, 10 per page.
 */
export default function TeamPage() {
  const [rows, setRows] = useState<JoinRequestRow[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const [list, memberList] = await Promise.all([notificationsApi.list(true), membersApi.list()]);
      setRows(list.filter(isJoinRequest));
      setMembers(memberList.data);
    } catch (err) {
      setError(describeError(err, 'load join requests'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const onChanged = () => void load();
    window.addEventListener(JOIN_REQUESTS_CHANGED, onChanged);
    return () => window.removeEventListener(JOIN_REQUESTS_CHANGED, onChanged);
  }, []);

  async function act(username: string, verb: 'approve' | 'reject') {
    setActing(username); setError('');
    try {
      if (verb === 'approve') await joinRequestsApi.approve(username);
      else await joinRequestsApi.reject(username);
    } catch (err) {
      const gone = statusOf(err) === 404 || codeOf(err) === 'NOT_FOUND';
      if (!gone) setError(describeError(err, `${verb} the request`));
    } finally {
      setActing(null);
    }
    await load();
    emitJoinRequestsChanged();
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <AppLayout>
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Team</h1>
          <p className="muted">Current members and how each joined, then everyone who asked to join this dealership, newest first.</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {!loading && members.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Username</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.username}>
                <td style={{ whiteSpace: 'nowrap' }}>{m.displayName}</td>
                <td>{m.username}</td>
                <td><span className="tag">{accountSourceLabel(m.source)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {loading ? (
        <div className="state">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="state">No join requests yet.</div>
      ) : (
        <>
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Username</th>
              <th>Source</th>
              <th>Requested</th>
              <th>Status</th>
              <th>Resolved</th>
              <th style={{ width: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => {
              const status = statusLabel(r);
              return (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.payload.displayName}</td>
                  <td>{r.payload.email ?? '—'}</td>
                  <td>{r.payload.username}</td>
                  <td><span className="tag">{accountSourceLabel(r.payload.source)}</span></td>
                  <td>{dateTimeLocal(r.createdAt)}</td>
                  <td><span className={status.className}>{status.text}</span></td>
                  <td>
                    {r.resolvedAt
                      ? <>{dateTimeLocal(r.resolvedAt)}<br />
                          <span className="muted">by {r.resolvedBy}</span></>
                      : '—'}
                  </td>
                  <td>
                    {r.resolvedAt == null ? (
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
        </div>
        {rows.length > PAGE_SIZE && (
          <div className="toolbar">
            <span className="muted">{rows.length} requests</span>
            <div className="pagination">
              <button type="button" disabled={safePage <= 0} onClick={() => setPage(p => Math.max(0, p - 1))}>&lsaquo;</button>
              <span className="muted">{safePage + 1} / {pageCount}</span>
              <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(p => p + 1)}>&rsaquo;</button>
            </div>
          </div>
        )}
        </>
      )}
    </section>
    </AppLayout>
  );
}
