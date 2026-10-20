import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fileJoinRequest, myJoinRequest } from '../api/me'
import { listPublicDealers, type PublicDealer } from '../api/publicDealers'
import { describeError } from '../api/errors'
import { signOut } from '../auth/login'
import { useSessionStore } from '../store/session'

export default function NoAccessPage() {
  const username = useSessionStore((s) => s.username);
  const [dealers, setDealers] = useState<PublicDealer[]>([]);
  const [dealerId, setDealerId] = useState<number | ''>('');
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [pending, directory] = await Promise.all([
          myJoinRequest(),
          listPublicDealers(),
        ]);
        if (cancelled) return;
        setDealers(directory);
        if (pending) {
          setPendingName(pending.legalName || 'the dealership you chose');
          setDealerId(pending.dealerId);
        }
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'load dealerships'));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function requestJoin() {
    if (typeof dealerId !== 'number' || sending) return;
    setSending(true);
    setError('');
    try {
      const saved = await fileJoinRequest(dealerId);
      setPendingName(saved.legalName || 'that dealership');
    } catch (err) {
      setError(describeError(err, 'request to join'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="brand">Dealer Ops</div>
        <h1>No access</h1>
        <p className="muted">Your account is not provisioned yet. Contact your administrator.</p>
        {username && <p className="muted">Signed in as <strong>@{username}</strong></p>}
        {pendingName ? (
          <p className="muted">
            Your request to join {pendingName} is waiting for a member of that dealership to approve it.
          </p>
        ) : (
          <>
            <p className="muted">Or ask to join one dealership. A member there can approve the request.</p>
            <div className="form-item" style={{ textAlign: 'left' }}>
              <select
                className="input"
                aria-label="Dealership"
                value={dealerId}
                onChange={e => setDealerId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Select a dealership…</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.legalName}</option>)}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={typeof dealerId !== 'number' || sending}
              onClick={() => void requestJoin()}
            >
              {sending ? 'Sending…' : 'Request to join'}
            </button>
          </>
        )}
        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
        <div>
          <Link className="btn" to="/profile" style={{ marginTop: 16, marginRight: 8 }}>
            Manage account
          </Link>
          <button className="btn btn-primary" onClick={signOut} style={{ marginTop: 16 }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
