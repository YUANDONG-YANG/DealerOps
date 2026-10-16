import { Link } from 'react-router-dom'
import { signOut } from '../auth/login'
import { useSessionStore } from '../store/session'

export default function NoAccessPage() {
  const username = useSessionStore((s) => s.username);
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="brand">Dealer Ops</div>
        <h1>No access</h1>
        <p className="muted">Not provisioned yet. Your account is not linked to a dealership.</p>
        <p className="muted">Contact your platform administrator to be added.</p>
        {username && <p className="muted">Signed in as <strong>@{username}</strong></p>}
        <Link className="btn" to="/profile" style={{ marginTop: 16, marginRight: 8 }}>
          Manage account
        </Link>
        <button className="btn btn-primary" onClick={signOut} style={{ marginTop: 16 }}>
          Sign out
        </button>
      </div>
    </div>
  )
}
