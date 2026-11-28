import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  rememberPostLoginRedirect, roleHome, signIn, signInWithGoogle, takePostLoginRedirect,
  signInWithFirebase,
} from '../auth/login'
import { renderGoogleButton } from '../auth/google'

/** Sign-in with a DealerOps password, Google, or a Firebase-owned password. */
export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleReady, setGoogleReady] = useState(false)
  const googleSlot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const notice = params.get('notice')
    if (notice === 'required') setError('Sign in required')
    else if (notice === 'profile') setError('Could not load profile')
    else if (notice === 'deleted') setError('Your account was deleted.')
  }, [params])

  useEffect(() => {
    const redirect = params.get('redirect')
    if (redirect) rememberPostLoginRedirect(redirect)
  }, [params])

  // Re-runs when the form returns after a failed attempt, because the spinner branch below
  // replaces the container the button was rendered into.
  useEffect(() => {
    if (loading || !googleSlot.current) return
    let cancelled = false
    renderGoogleButton(googleSlot.current, idToken => {
      if (!cancelled) void completeGoogleSignIn(idToken)
    })
      .then(() => { if (!cancelled) setGoogleReady(true) })
      .catch(() => { if (!cancelled) setGoogleReady(false) })
    return () => { cancelled = true }
  }, [loading])

  async function completeGoogleSignIn(idToken: string) {
    setError('')
    setLoading(true)
    try {
      const result = await signInWithGoogle(idToken)
      navigate(takePostLoginRedirect(result.login.role) || roleHome(result.login.role))
    } catch {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) {
      setError('Enter your email, username or phone number and password.')
      return
    }
    setLoading(true)
    try {
      const signInName = identifier.trim()
      // Local password accounts (admin-issued, self-registered, the seeded admin) sign in by
      // email too (AUTH-17); only a 401 there falls through to a Firebase-owned password.
      const result = await signIn(signInName, password).catch((err) => {
        if (!signInName.includes('@') || err?.response?.status !== 401) throw err
        return signInWithFirebase(signInName, password)
      })
      // A saved path is honoured only when this role may open it; otherwise the role home wins.
      navigate(takePostLoginRedirect(result.role) || roleHome(result.role))
    } catch {
      setError('Invalid email, sign-in name or password.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="state">Signing you in…</div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">Dealer Ops</div>
        <h1>Sign in</h1>
        <p className="muted">Dealer management, CRM and ad compliance.</p>
        {error && (
          <div className="alert alert-error">{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-item">
            <input
              type="text"
              className="input"
              placeholder="Email, username or phone number"
              aria-label="Email, username or phone number"
              autoComplete="username"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
          </div>
          <div className="form-item">
            <div className="input-password-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="btn-link password-toggle"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            Sign in
          </button>
        </form>
        <div className="auth-alt">
          <div className="auth-or"><span>or</span></div>
          <div className="auth-google" ref={googleSlot} />
          {googleReady && (
            <p className="auth-hint">
              A new Google account signs in without a dealership. From the no-access screen you can
              ask one dealership to approve you.
            </p>
          )}
        </div>
        <p className="auth-switch">
          New here? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  )
}
