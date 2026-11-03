import { useEffect, useState } from 'react';
import { adminApi, isJoinRequestSent, type Dealer, type PendingUser } from '../api/admin';
import { apiError, codeOf, collectAllPages, fieldErrorsOf } from '../api/http';
import ConfirmDialog from './ConfirmDialog';
import { dateTimeLocal } from '../format';
import { describeError } from '../api/errors';
import { SortableTh, useSort } from './TableSort';

interface Props {
  /** When set, a pending account binds straight to this dealership and no picker is shown. */
  dealerId?: number;
  onBound?: () => void;
}

/**
 * Self-registered accounts waiting for a dealership. Binding keeps the password they chose; once
 * the dealership has a manager, binding sends a join request instead (AUTH-28). The admin can
 * also edit a pending account's username, email and phone, or delete it.
 * Used on the Admin tab (with a dealership picker) and in the staff drawer (fixed dealership).
 */
export default function PendingAccounts({ dealerId, onBound }: Props) {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [editing, setEditing] = useState<PendingUser | null>(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', phone: '' });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState('');
  const [deleting, setDeleting] = useState<PendingUser | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const loadPending = async () => {
      try {
        const r = await adminApi.pendingUsers();
        setPending(r.data.items || []);
      } catch { setPending([]); }
    };
    const loadDealers = async () => {
      try {
        setDealers(await collectAllPages<Dealer>((p) => adminApi.dealers({ page: p, size: 10 })));
      } catch { setDealers([]); }
    };
    void loadPending();
    if (dealerId == null) void loadDealers();
  }, [dealerId]);

  const bindPending = async (user: PendingUser) => {
    const target = dealerId ?? selectedDealer[user.username];
    if (!target) { setError('Select a dealership'); return; }
    setBusy(user.username); setError(''); setNotice('');
    try {
      const r = await adminApi.bind(target, { username: user.username });
      if (isJoinRequestSent(r.data)) {
        // Still pending until a manager approves, so the row stays and shows the request.
        const dealerName = dealers.find((d) => d.id === target)?.legalName ?? null;
        setPending((list) => list.map((u) => (u.username === user.username
          ? { ...u, requestedDealerId: target, requestedDealerName: dealerName ?? u.requestedDealerName } : u)));
        setNotice(`${user.username}: ${r.data.message}`);
      } else {
        setPending((list) => list.filter((u) => u.username !== user.username));
        setNotice(`${user.username} is bound as the dealership's first manager.`);
      }
      onBound?.();
    } catch (e) {
      if (codeOf(e) === 'DUP_MEMBER') setError(apiError(e).message || `${user.username} is already bound to a dealership.`);
      else setError(describeError(e, `bind ${user.username}`));
    } finally { setBusy(''); }
  };

  const openEdit = (user: PendingUser) => {
    setEditing(user); setEditErrors({}); setEditError('');
    setEditForm({ username: user.username, email: user.email ?? '', phone: user.phone ?? '' });
  };

  const saveEdit = async () => {
    if (!editing || busy) return;
    if (!editForm.email.trim() && !editForm.phone.trim()) {
      const msg = 'Enter an email address or a phone number.';
      setEditErrors({ email: msg, phone: msg }); return;
    }
    setBusy(editing.username); setEditErrors({}); setEditError('');
    try {
      const r = await adminApi.updatePending(editing.username, {
        username: editForm.username.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
      });
      setPending((list) => list.map((u) => (u.username === editing.username ? r.data : u)));
      setNotice(`${r.data.username} updated.`);
      setEditing(null);
    } catch (e) {
      const fields = fieldErrorsOf(e);
      setEditErrors(fields);
      if (!Object.keys(fields).length) setEditError(describeError(e, `update ${editing.username}`));
    } finally { setBusy(''); }
  };

  const confirmDelete = async () => {
    if (!deleting || busy) return;
    setBusy(deleting.username); setDeleteError('');
    try {
      await adminApi.deletePending(deleting.username);
      setPending((list) => list.filter((u) => u.username !== deleting.username));
      setNotice(`${deleting.username} deleted.`);
      setDeleting(null);
    } catch (e) {
      setDeleteError(describeError(e, `delete ${deleting.username}`));
    } finally { setBusy(''); }
  };

  const rowActions = (u: PendingUser) => (
    <>
      <button className="btn-link" disabled={busy === u.username} onClick={() => bindPending(u)}>
        {busy === u.username ? 'Binding…' : 'Bind without password'}
      </button>{' '}
      <button className="btn-link" disabled={busy === u.username} onClick={() => openEdit(u)}>Edit</button>{' '}
      <button className="btn-link danger" disabled={busy === u.username}
        onClick={() => { setDeleting(u); setDeleteError(''); }}>Delete</button>
    </>
  );

  const requestLabel = (u: PendingUser) => (u.requestedDealerId == null ? null
    : `Join request sent to ${u.requestedDealerName ?? 'a dealership'}`);

  const pendingSort = useSort(pending);

  return (
    <div style={{ marginTop: 24 }}>
      <div className="muted" style={{ marginBottom: 8 }}>
        Pending self-registered accounts — they already chose a password, so binding one does not change it.
      </div>
      {error && <p className="danger-text">{error}</p>}
      {notice && <p className="success-text">{notice}</p>}
      {pending.length === 0 ? (
        <p className="muted">No accounts are waiting to be bound.</p>
      ) : dealerId != null ? (
        // The staff drawer is narrow, so contact details sit under the name instead of in columns.
        <table className="table">
          <thead><tr><th>Account</th><th>Actions</th></tr></thead>
          <tbody>
            {pending.map((u) => (
              <tr key={u.username}>
                <td>
                  <div>{u.displayName} <span className="muted">({u.username})</span></div>
                  <div className="muted">{[u.email, u.phone].filter(Boolean).join(' · ') || 'No contact provided'}</div>
                  <div className="muted">Registered {dateTimeLocal(u.createdAt)}</div>
                  {requestLabel(u) && <div className="muted">{requestLabel(u)}</div>}
                </td>
                <td>{rowActions(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Login email</th>
              <th>Login phone</th>
              <SortableTh label="Registered" sortKey="createdAt" sort={pendingSort.sort} onSort={pendingSort.toggle} />
              {dealerId == null && <th>Dealership</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingSort.sorted.map((u) => (
              <tr key={u.username}>
                <td>{u.username}</td>
                <td>{u.displayName}</td>
                <td>{u.email || 'Not provided'}</td>
                <td>{u.phone || 'Not provided'}</td>
                <td>
                  {dateTimeLocal(u.createdAt)}
                  {requestLabel(u) && <div className="muted">{requestLabel(u)}</div>}
                </td>
                {dealerId == null && (
                  <td>
                    <select className="select" value={selectedDealer[u.username] ?? ''}
                      onChange={(e) => setSelectedDealer((s) => ({ ...s, [u.username]: Number(e.target.value) }))}>
                      <option value="">Select dealership</option>
                      {dealers.map((d) => <option key={d.id} value={d.id}>{d.legalName}</option>)}
                    </select>
                  </td>
                )}
                <td>{rowActions(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmDialog open={editing != null} title={`Edit pending account ${editing?.username ?? ''}`}
        confirmLabel={busy ? 'Saving…' : 'Save'}
        onCancel={() => { if (!busy) setEditing(null); }}
        onConfirm={saveEdit}>
        <div className="form-item"><label className="form-label form-required" htmlFor="pending-username">Username</label>
          <input id="pending-username" className="input" value={editForm.username}
            onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} />
          {editErrors.username && <div className="form-error">{editErrors.username}</div>}
        </div>
        <div className="form-item"><label className="form-label" htmlFor="pending-email">Login email</label>
          <input id="pending-email" className="input" type="email" value={editForm.email}
            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
          {editErrors.email && <div className="form-error">{editErrors.email}</div>}
        </div>
        <div className="form-item"><label className="form-label" htmlFor="pending-phone">Login phone (email, phone, or both)</label>
          <input id="pending-phone" className="input" type="tel" value={editForm.phone}
            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
          {editErrors.phone && <div className="form-error">{editErrors.phone}</div>}
          <div className="muted form-hint">Include the country code, e.g. +1 416 555 0123.</div>
        </div>
        {editError && <p className="danger-text">{editError}</p>}
      </ConfirmDialog>

      <ConfirmDialog open={deleting != null} title="Delete pending account" confirmLabel={busy ? 'Deleting…' : 'Delete'}
        message={deleteError || `Delete the pending account ${deleting?.username ?? ''}? It can no longer sign in, and its email and phone become free for a new sign-up. Its audit history is kept.`}
        onCancel={() => { if (!busy) setDeleting(null); }}
        onConfirm={confirmDelete} />
    </div>
  );
}
