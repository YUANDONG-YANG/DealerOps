import { signOut } from '../auth/login'

export default function NoAccessPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="brand">Dealer Ops</div>
        <h1>No access</h1>
        <p className="muted">Your account is not linked to a dealership yet.</p>
        <p className="muted">Ask your platform administrator to add you.</p>
        <button className="btn btn-primary" onClick={signOut} style={{ marginTop: 16 }}>
          Sign out
        </button>
      </div>
    </div>
  )
}
