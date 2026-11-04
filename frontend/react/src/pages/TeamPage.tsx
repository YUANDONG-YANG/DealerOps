import { useEffect, useState, type FormEvent } from 'react';
import AppLayout from '../layouts/AppLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import FormDrawer from '../components/FormDrawer';
import { useFormBaseline, useLeaveWarning } from '../components/unsavedChanges';
import AuditLogPanel from '../components/AuditLogPanel';
import { SortableTh, useSort } from '../components/TableSort';
import { auditApi } from '../api/audit';
import { joinRequestsApi } from '../api/joinRequests';
import {
  accountSourceLabel, memberLabel, membersApi, teamApi, type DealerProfileBody, type MemberPatchBody, type MemberRecord,
} from '../api/members';
import type { DealerRole } from '../api/me';
import { SUGGEST_LIMIT, matchesAny } from '../components/SearchSuggest';
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

// Sort values of the Members and Join request tables: what the column shows, dates as ISO text.
function memberSortValue(m: MemberRecord, key: string) {
  if (key === 'dealerRole') return enumLabel(m.dealerRole);
  if (key === 'source') return accountSourceLabel(m.source);
  return m.joinedAt;
}

function requestSortValue(r: JoinRequestRow, key: string) {
  if (key === 'status') return statusLabel(r).text;
  if (key === 'resolvedAt') return r.resolvedAt;
  return r.createdAt;
}

/** Role chip colour: the owner stands out, a manager is highlighted, sales keeps the plain chip. */
const ROLE_TAG: Record<DealerRole, string> = { OWNER: 'tag-success', MANAGER: 'tag-info', SALES: '' };

const PROFILE_FIELDS:{ key: 'legalName' | 'contactPhone' | 'contactEmail' | 'contactAddress'; label: string }[] = [
  { key: 'legalName', label: 'Legal name' },
  { key: 'contactPhone', label: 'Contact phone' },
  { key: 'contactEmail', label: 'Contact email' },
  { key: 'contactAddress', label: 'Contact address' },
];

/**
 * The team page (AUTH-27), open to the dealership's owner and managers.
 *
 * The owner sees four tabs: this dealership's join requests
 * (GET /api/v1/dealer/notifications?includeResolved=true) split into Pending, with Approve / Reject,
 * and History; its members with their dealership role and joined date; the dealership profile that
 * ads, the bill of sale and the buyer site show; and the dealership's audit log
 * (GET /api/v1/dealer/audit, AUD-11).
 *
 * A manager sees Members and Activity only: the dealership profile and the join requests, with their
 * approve / reject actions, are the owner's. On the members table the owner acts on every member
 * below owner, a manager only on sales members, and nobody on the owner row or their own row.
 */
export default function TeamPage() {
  const setProfile = useSessionStore((s) => s.setProfile);
  const isOwner = useSessionStore((s) => s.dealerRole === 'OWNER');
  const [rows, setRows] = useState<JoinRequestRow[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  // Join requests are the owner's, so a manager opens on Members.
  const [tab, setTab] = useState<'requests' | 'members' | 'profile' | 'activity'>(isOwner ? 'requests' : 'members');
  const [removeTarget, setRemoveTarget] = useState<MemberRecord | null>(null);
  const signedInUser = useSessionStore((s) => s.username);
  const [roleTarget, setRoleTarget] = useState<{ member: MemberRecord; role: DealerRole } | null>(null);
  const [editTarget, setEditTarget] = useState<MemberRecord | null>(null);
  const [editForm, setEditForm] = useState<MemberPatchBody>({ displayName: '', phone: null });
  const editBaseline = useFormBaseline(editForm);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [dealer, setDealer] = useState<DealerProfileBody | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileNotice, setProfileNotice] = useState('');
  const profileBaseline = useFormBaseline(dealer);
  const [confirmProfileSave, setConfirmProfileSave] = useState(false);
  useLeaveWarning(profileBaseline.dirty);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      // The dealership profile is owner-only, so a manager never asks for it.
      const [list, memberList, profile] = await Promise.all([
        notificationsApi.list(true),
        membersApi.listRecords(),
        isOwner ? teamApi.profile() : Promise.resolve(null),
      ]);
      setRows(list.filter(isJoinRequest));
      setMembers(memberList.data);
      setDealer(profile);
      if (profile) profileBaseline.reset(profile);
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
      // Already resolved elsewhere (the header inbox or the platform admin): just refresh the list.
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

  async function changeRole() {
    if (!roleTarget) return;
    const { member, role } = roleTarget;
    setError('');
    try {
      await teamApi.setRole(member.username, role);
    } catch (err) {
      setError(describeError(err, `change the role of ${member.username}`));
    }
    setRoleTarget(null);
    await load();
  }

  /**
   * Whether the signed-in member may edit, re-role and remove this row: the owner acts on every
   * member below owner, a manager only on sales members, and nobody on the owner row.
   */
  function canActOn(m: MemberRecord) {
    if (m.dealerRole === 'OWNER') return false;
    return isOwner || m.dealerRole === 'SALES';
  }

  function openEdit(m: MemberRecord) {
    setEditTarget(m);
    const values = { displayName: m.displayName, phone: m.phone };
    setEditForm(values); editBaseline.reset(values);
    setEditErrors({});
  }

  async function saveMember(e: FormEvent) {
    e.preventDefault();
    if (!editTarget || editSaving) return;
    setEditSaving(true); setEditErrors({}); setError('');
    try {
      await teamApi.update(editTarget.username, {
        displayName: editForm.displayName.trim(),
        phone: editForm.phone?.trim() || null,
      });
      setEditTarget(null);
      await load();
    } catch (err) {
      const fields = fieldErrorsOf(err);
      setEditErrors(fields);
      if (!Object.keys(fields).length) setError(describeError(err, `save ${editTarget.username}`));
    } finally {
      setEditSaving(false);
    }
  }

  function requestProfileSave(e: FormEvent) {
    e.preventDefault();
    if (dealer && !saving) setConfirmProfileSave(true);
  }

  async function saveProfile() {
    setConfirmProfileSave(false);
    if (!dealer || saving) return;
    setSaving(true); setProfileErrors({}); setProfileNotice(''); setError('');
    try {
      const saved = await teamApi.saveProfile(dealer);
      setDealer(saved);
      profileBaseline.reset(saved);
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

  // Pending requests need a decision and are always shown in full; resolved ones page as history.
  const memberSort = useSort(members, memberSortValue);
  const pendingSort = useSort(rows.filter(r => r.resolvedAt == null), requestSortValue);
  const historySort = useSort(rows.filter(r => r.resolvedAt != null), requestSortValue);
  const pending = pendingSort.sorted;
  const history = historySort.sorted;
  const pageCount = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = history.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <AppLayout>
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Team</h1>
          <p className="muted">
            {isOwner
              ? 'Join requests to this dealership, its members, its profile and its activity. New members join as sales; the owner appoints managers and sales.'
              : 'This dealership\'s members and its activity. New members join as sales; a manager can make a sales member a manager.'}
          </p>
        </div>
      </header>

      <div className="tab-bar">
        {isOwner && (
          <button className={`tab-btn ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>Join requests</button>
        )}
        <button className={`tab-btn ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>Members</button>
        {isOwner && (
          <button className={`tab-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Dealership profile</button>
        )}
        <button className={`tab-btn ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>Activity</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* The audit log loads and pages on its own, so it does not wait for the team data. */}
      {tab === 'activity' ? (
        <AuditLogPanel load={auditApi.dealershipLog}
          suggestActors={async (q) => members
            .filter((m) => matchesAny(q, m.username, m.displayName))
            .slice(0, SUGGEST_LIMIT)
            .map((m) => ({ value: m.username, label: memberLabel(m) }))} />
      ) : loading ? (
        <div className="state">Loading…</div>
      ) : tab === 'profile' ? (
        isOwner && dealer && (
          <form className="card" style={{ maxWidth: 560 }} onSubmit={requestProfileSave}>
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
              <SortableTh label="Role" sortKey="dealerRole" sort={memberSort.sort} onSort={memberSort.toggle} />
              <SortableTh label="Source" sortKey="source" sort={memberSort.sort} onSort={memberSort.toggle} />
              <SortableTh label="Joined" sortKey="joinedAt" sort={memberSort.sort} onSort={memberSort.toggle} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {memberSort.sorted.map(m => (
              <tr key={m.username}>
                <td style={{ whiteSpace: 'nowrap' }}>{m.displayName}</td>
                <td>{m.username}</td>
                <td><span className={`tag ${ROLE_TAG[m.dealerRole]}`}>{enumLabel(m.dealerRole)}</span></td>
                <td><span className="tag">{accountSourceLabel(m.source)}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>{dateTimeLocal(m.joinedAt)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {m.username === signedInUser ? (
                    <span className="muted">You</span>
                  ) : canActOn(m) ? (
                    <>
                      <button type="button" className="btn-link" onClick={() => openEdit(m)}>Edit</button>
                      <button type="button" className="btn-link" style={{ marginLeft: 12 }}
                        onClick={() => setRoleTarget({ member: m, role: m.dealerRole === 'MANAGER' ? 'SALES' : 'MANAGER' })}>
                        {m.dealerRole === 'MANAGER' ? 'Make sales' : 'Make manager'}
                      </button>
                      <button type="button" className="btn-link danger" style={{ marginLeft: 12 }}
                        onClick={() => setRemoveTarget(m)}>Remove</button>
                    </>
                  ) : (
                    <span className="muted">{m.dealerRole === 'OWNER' ? 'Owner, set by the platform admin' : 'Owner only'}</span>
                  )}
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
        <h2 style={{ fontSize: 18 }}>Pending</h2>
        {pending.length === 0 ? (
          <div className="state">No pending join requests.</div>
        ) : (
        <div className="table-wrap">
        <table className="table" aria-label="Pending join requests">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Username</th>
              <th>Source</th>
              <SortableTh label="Requested" sortKey="createdAt" sort={pendingSort.sort} onSort={pendingSort.toggle} />
              <th style={{ width: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(r => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{r.payload.displayName}</td>
                <td>{r.payload.email ?? <span className="muted">Not provided</span>}</td>
                <td>{r.payload.username}</td>
                <td><span className="tag">{accountSourceLabel(r.payload.source)}</span></td>
                <td>{dateTimeLocal(r.createdAt)}</td>
                <td>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        )}
        <h2 style={{ fontSize: 18, marginTop: 24 }}>History</h2>
        {history.length === 0 ? (
          <div className="state">No resolved join requests yet.</div>
        ) : (
        <>
        <div className="table-wrap">
        <table className="table" aria-label="Join request history">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Username</th>
              <th>Source</th>
              <SortableTh label="Requested" sortKey="createdAt" sort={historySort.sort} onSort={historySort.toggle} />
              <SortableTh label="Status" sortKey="status" sort={historySort.sort} onSort={historySort.toggle} />
              <SortableTh label="Resolved" sortKey="resolvedAt" sort={historySort.sort} onSort={historySort.toggle} />
            </tr>
          </thead>
          <tbody>
            {visible.map(r => {
              const status = statusLabel(r);
              return (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.payload.displayName}</td>
                  <td>{r.payload.email ?? <span className="muted">Not provided</span>}</td>
                  <td>{r.payload.username}</td>
                  <td><span className="tag">{accountSourceLabel(r.payload.source)}</span></td>
                  <td>{dateTimeLocal(r.createdAt)}</td>
                  <td><span className={status.className}>{status.text}</span></td>
                  <td>
                    {dateTimeLocal(r.resolvedAt)}<br />
                    <span className="muted">by {r.resolvedBy}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {history.length > PAGE_SIZE && (
          <div className="toolbar">
            <span className="muted">{history.length} requests</span>
            <div className="pagination">
              <button type="button" disabled={safePage <= 0} onClick={() => setPage(p => Math.max(0, p - 1))}>&lsaquo;</button>
              <span className="muted">{safePage + 1} / {pageCount}</span>
              <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(p => p + 1)}>&rsaquo;</button>
            </div>
          </div>
        )}
        </>
        )}
        </>
      )}
    <ConfirmDialog open={removeTarget != null} title="Remove member" confirmLabel="Remove"
      message={`Remove ${removeTarget?.username ?? ''} from this dealership? They lose access to its data right away. The account is kept, and it can ask to join again.`}
      onCancel={() => setRemoveTarget(null)} onConfirm={removeMember} />
    <ConfirmDialog open={roleTarget != null}
      title={roleTarget?.role === 'MANAGER' ? 'Make manager' : 'Make sales'}
      confirmLabel={roleTarget?.role === 'MANAGER' ? 'Make manager' : 'Make sales'}
      message={roleTarget?.role === 'MANAGER'
        ? `Make ${roleTarget.member.username} a manager? Managers open the Team page, appoint sales members and see the dealership activity.`
        : `Make ${roleTarget?.member.username ?? ''} a sales member? They lose access to the Team page.`}
      onCancel={() => setRoleTarget(null)} onConfirm={changeRole} />
    <ConfirmDialog open={confirmProfileSave} title="Save dealership profile" confirmLabel="Save"
      message="Save changes to the dealership profile?"
      onCancel={() => setConfirmProfileSave(false)} onConfirm={() => void saveProfile()} />
    <FormDrawer title={`Edit ${editTarget?.username ?? ''}`} open={editTarget != null} dirty={editBaseline.dirty} onClose={() => setEditTarget(null)}>
      <form onSubmit={saveMember}>
        <div className="form-item">
          <label className="form-label form-required" htmlFor="member-displayName">Full name</label>
          <input id="member-displayName" className="input" maxLength={120} value={editForm.displayName}
            onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))} />
          {editErrors.displayName && <div className="form-error">{editErrors.displayName}</div>}
        </div>
        <div className="form-item">
          <label className="form-label" htmlFor="member-phone">Phone</label>
          <input id="member-phone" className="input" maxLength={40} value={editForm.phone ?? ''}
            onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          {editErrors.phone && <div className="form-error">{editErrors.phone}</div>}
        </div>
        <button type="submit" className="btn btn-primary" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save member'}</button>
      </form>
    </FormDrawer>
    </section>
    </AppLayout>
  );
}
