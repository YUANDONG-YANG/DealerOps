import { signOut } from '../auth/login'
import { useSessionStore } from '../store/session'

export default function NoAccessPage() {
  const username = useSessionStore((s) => s.username);
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="brand">Dealer Ops</div>
        <h1>No access</h1>
        <p className="muted">Your account is not linked to a dealership yet.</p>
        <p className="muted">Ask your platform administrator to add you.</p>
        {username && <p className="muted">Signed in as <strong>@{username}</strong></p>}
        <button className="btn btn-primary" onClick={signOut} style={{ marginTop: 16 }}>
          Sign out
        </button>
      </div>
    </div>
  )
}
