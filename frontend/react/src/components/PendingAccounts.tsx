import { useEffect, useState } from 'react';
import { adminApi, adminErrorCode, type Dealer, type PendingUser } from '../api/admin';
import { apiError, collectAllPages } from '../api/http';
import { dateTimeLocal } from '../format';
import { describeError } from '../api/errors';

interface Props {
  /** When set, a pending account binds straight to this dealership and no picker is shown. */
  dealerId?: number;
  onBound?: () => void;
}

export default function PendingAccounts({ dealerId, onBound }: Props) {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

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
    setBusy(user.username); setError('');
    try {
      await adminApi.bind(target, { username: user.username });
      setPending((list) => list.filter((u) => u.username !== user.username));
      onBound?.();
    } catch (e) {
      if (adminErrorCode(e) === 'DUP_MEMBER') setError(apiError(e).message || `${user.username} is already bound to a dealership.`);
      else setError(describeError(e, `bind ${user.username}`));
    } finally { setBusy(''); }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div className="muted" style={{ marginBottom: 8 }}>
        Pending self-registered accounts — they already chose a password, so binding one does not change it.
      </div>
      {error && <p className="danger-text">{error}</p>}
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
                  <div className="muted">{[u.email, u.phone].filter(Boolean).join(' · ') || '—'}</div>
                  <div className="muted">Registered {dateTimeLocal(u.createdAt)}</div>
                </td>
                <td>
                  <button className="btn-link" disabled={busy === u.username} onClick={() => bindPending(u)}>
                    {busy === u.username ? 'Binding…' : 'Bind without password'}
                  </button>
                </td>
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
              <th>Registered</th>
              {dealerId == null && <th>Dealership</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((u) => (
              <tr key={u.username}>
                <td>{u.username}</td>
                <td>{u.displayName}</td>
                <td>{u.email || '—'}</td>
                <td>{u.phone || '—'}</td>
                <td>{dateTimeLocal(u.createdAt)}</td>
                {dealerId == null && (
                  <td>
                    <select className="select" value={selectedDealer[u.username] ?? ''}
                      onChange={(e) => setSelectedDealer((s) => ({ ...s, [u.username]: Number(e.target.value) }))}>
                      <option value="">Select dealership</option>
                      {dealers.map((d) => <option key={d.id} value={d.id}>{d.legalName}</option>)}
                    </select>
                  </td>
                )}
                <td>
                  <button className="btn-link" disabled={busy === u.username} onClick={() => bindPending(u)}>
                    {busy === u.username ? 'Binding…' : 'Bind without password'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
