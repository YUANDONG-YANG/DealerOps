import { useEffect, useState, type FormEvent } from 'react';
import AppLayout from '../layouts/AppLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import AuditLogPanel from '../components/AuditLogPanel';
import { auditApi } from '../api/audit';
import { joinRequestsApi } from '../api/joinRequests';
import { accountSourceLabel, membersApi, teamApi, type DealerProfileBody, type MemberOption } from '../api/members';
import { getMe } from '../api/me';
import { useSessionStore } from '../store/session';
import {
  JOIN_REQUESTS_CHANGED,
  emitJoinRequestsChanged,
  notificationsApi,
  type JoinRequestPayload,
  type Notification,
} from '../api/notifications';
import { codeOf, fieldErrorsOf, statusOf } from '../api/http';
import { dateTimeLocal, enumLabel } from '../format';
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

const PROFILE_FIELDS: { key: 'legalName' | 'contactPhone' | 'contactEmail' | 'contactAddress'; label: string }[] = [
  { key: 'legalName', label: 'Legal name' },
  { key: 'contactPhone', label: 'Contact phone' },
  { key: 'contactEmail', label: 'Contact email' },
  { key: 'contactAddress', label: 'Contact address' },
];

/**
 * The manager's page (AUTH-27), four tabs: this dealership's join-request history
 * (GET /api/v1/dealer/notifications?includeResolved=true) with Approve / Reject on pending rows,
 * its members with their dealership role and a Remove action on staff, and the dealership
 * profile that ads, the bill of sale and the buyer site show, and the dealership's audit log
 * (GET /api/v1/dealer/audit, AUD-11). Only the platform admin promotes or demotes managers.
 */
export default function TeamPage() {
  const setProfile = useSessionStore((s) => s.setProfile);
  const [rows, setRows] = useState<JoinRequestRow[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [tab, setTab] = useState<'requests' | 'members' | 'profile' | 'activity'>('requests');
  const [removeTarget, setRemoveTarget] = useState<MemberOption | null>(null);
  const [dealer, setDealer] = useState<DealerProfileBody | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileNotice, setProfileNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const [list, memberList, profile] = await Promise.all([notificationsApi.list(true), membersApi.list(), teamApi.profile()]);
      setRows(list.filter(isJoinRequest));
      setMembers(memberList.data);
      setDealer(profile);
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
      // Already resolved elsewhere (the header inbox or another manager): just refresh the list.
      const gone = statusOf(err) === 404 || codeOf(err) === 'NOT_FOUND';
      if (!gone) setError(describeError(err, `${verb} the request`));
    } finally {
      setActing(null);
    }
    await load();
    emitJoinRequestsChanged();
  }

  async function removeMember() {
    if (!removeTarget) return;
    setError('');
    try {
      await teamApi.remove(removeTarget.username);
    } catch (err) {
      setError(describeError(err, `remove ${removeTarget.username}`));
    }
    setRemoveTarget(null);
    await load();
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!dealer || saving) return;
    setSaving(true); setProfileErrors({}); setProfileNotice(''); setError('');
    try {
      const saved = await teamApi.saveProfile(dealer);
      setDealer(saved);
      // The header and ads read the dealership from the session profile.
      setProfile(await getMe());
      setProfileNotice('Dealership profile saved.');
    } catch (err) {
      const fields = fieldErrorsOf(err);
      setProfileErrors(fields);
      if (!Object.keys(fields).length) setError(describeError(err, 'save the dealership profile'));
    } finally {
      setSaving(false);
    }
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
          <p className="muted">Join requests to this dealership, its members, its profile and its activity. New members join as staff; the platform admin appoints managers.</p>
        </div>
      </header>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>Join requests</button>
        <button className={`tab-btn ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>Members</button>
        <button className={`tab-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Dealership profile</button>
        <button className={`tab-btn ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>Activity</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* The audit log loads and pages on its own, so it does not wait for the team data. */}
      {tab === 'activity' ? (
        <AuditLogPanel load={auditApi.dealershipLog} />
      ) : loading ? (
        <div className="state">Loading…</div>
      ) : tab === 'profile' ? (
        dealer && (
          <form className="card" style={{ maxWidth: 560 }} onSubmit={saveProfile}>
            {PROFILE_FIELDS.map(f => (
              <div className="form-item" key={f.key}>
                <label className="form-label form-required" htmlFor={`dealer-${f.key}`}>{f.label}</label>
                <input id={`dealer-${f.key}`} className="input" value={dealer[f.key]}
                  onChange={e => setDealer(d => d && { ...d, [f.key]: e.target.value })} />
                {profileErrors[f.key] && <div className="form-error">{profileErrors[f.key]}</div>}
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12 }}>
              Ad compliance checks, the bill of sale and the buyer site show these details.
            </p>
            {profileNotice && <p className="success-text" role="status">{profileNotice}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
          </form>
        )
      ) : tab === 'members' ? (
        members.length === 0 ? (
          <div className="state">No members yet.</div>
        ) : (
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Username</th>
              <th>Role</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.username}>
                <td style={{ whiteSpace: 'nowrap' }}>{m.displayName}</td>
                <td>{m.username}</td>
                <td><span className={`tag ${m.dealerRole === 'MANAGER' ? 'tag-success' : ''}`}>{enumLabel(m.dealerRole)}</span></td>
                <td><span className="tag">{accountSourceLabel(m.source)}</span></td>
                <td>
                  {m.dealerRole === 'STAFF'
                    ? <button type="button" className="btn-link danger" onClick={() => setRemoveTarget(m)}>Remove</button>
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        )
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
    <ConfirmDialog open={removeTarget != null} title="Remove staff member" confirmLabel="Remove"
      message={`Remove ${removeTarget?.username ?? ''} from this dealership? They lose access to its data right away. The account is kept, and it can ask to join again.`}
      onCancel={() => setRemoveTarget(null)} onConfirm={removeMember} />
    </section>
    </AppLayout>
  );
}
