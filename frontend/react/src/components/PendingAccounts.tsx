import { useEffect, useState } from 'react';
import { adminApi, adminErrorCode, adminErrorStatus, type Dealer, type PendingUser } from '../api/admin';
import { apiError, fieldErrorsOf } from '../api/http';

interface Props {
  onBound?: () => void;
}

export default function PendingAccounts({ onBound }: Props) {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const loadPending = async () => {
    try {
      const r = await adminApi.pendingUsers();
      setPending(r.data.items || []);
    } catch { setPending([]); }
  };

  const loadDealers = async () => {
    try {
      const all: Dealer[] = [];
      let p = 0, n = 0;
      do {
        const r = await adminApi.dealers({ page: p, size: 10 });
        all.push(...(r.data.items || []));
        n = r.data.total || 0; p++;
      } while (all.length < n);
      setDealers(all);
    } catch { setDealers([]); }
  };

  useEffect(() => { void loadPending(); void loadDealers(); }, []);

  const approve = async (user: PendingUser) => {
    const dealerId = selectedDealer[user.username];
    if (!dealerId) { setError('Select a dealership'); return; }
    setBusy(user.username); setError('');
    try {
      await adminApi.bind(dealerId, { username: user.username });
      await loadPending();
      onBound?.();
    } catch (e) {
      const code = adminErrorCode(e);
      if (code === 'DUP_MEMBER') setError('Already bound to a dealership');
      else setError(apiError(e).message || 'Could not approve account.');
    } finally { setBusy(''); }
  };

  if (!pending.length) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="muted" style={{ marginBottom: 8 }}>Pending accounts</div>
      {error && <p className="danger-text">{error}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Username</th><th>Name</th><th>Created</th><th>Dealership</th><th>Actions</th></tr></thead>
          <tbody>
            {pending.map((u) => (
              <tr key={u.username}>
                <td>{u.username}</td>
                <td>{u.displayName}</td>
                <td>{u.createdAt}</td>
                <td>
                  <select className="select" value={selectedDealer[u.username] ?? ''}
                    onChange={(e) => setSelectedDealer((s) => ({ ...s, [u.username]: Number(e.target.value) }))}>
                    <option value="">Select dealership</option>
                    {dealers.map((d) => <option key={d.id} value={d.id}>{d.legalName}</option>)}
                  </select>
                </td>
                <td>
                  <button className="btn-link" disabled={busy === u.username} onClick={() => approve(u)}>
                    {busy === u.username ? 'Approving…' : 'Approve'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
