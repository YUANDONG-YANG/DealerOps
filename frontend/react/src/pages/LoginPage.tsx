import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  rememberPostLoginRedirect, roleHome, signIn, signInWithGoogle, takePostLoginRedirect,
  signInWithFirebase,
} from '../auth/login'
import { renderGoogleButton } from '../auth/google'
import { listPublicDealers, type PublicDealer } from '../api/publicDealers'

type GoogleStage =
  | { kind: 'form' }
  | { kind: 'choose-dealer'; idToken: string; dealers: PublicDealer[] }
  | { kind: 'pending' }

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
  const [stage, setStage] = useState<GoogleStage>({ kind: 'form' })
  const [chosenDealer, setChosenDealer] = useState<number | ''>('')

  useEffect(() => {
    const notice = params.get('notice')
    if (notice === 'required') setError('Sign in required')
    else if (notice === 'profile') setError('Could not load profile')
  }, [params])

  useEffect(() => {
    const redirect = params.get('redirect')
    if (redirect) rememberPostLoginRedirect(redirect)
  }, [params])

  // Re-runs when the form returns after a failed attempt, because the spinner branch below
  // replaces the container the button was rendered into. Only the password-form stage mounts
  // the Google button slot, so the effect short-circuits once the user is picking a dealer or
  // waiting for approval.
  useEffect(() => {
    if (loading || stage.kind !== 'form' || !googleSlot.current) return
    let cancelled = false
    renderGoogleButton(googleSlot.current, idToken => {
      if (!cancelled) void completeGoogleSignIn(idToken)
    })
      .then(() => { if (!cancelled) setGoogleReady(true) })
      .catch(() => { if (!cancelled) setGoogleReady(false) })
    return () => { cancelled = true }
  }, [loading, stage.kind])

  async function completeGoogleSignIn(idToken: string, dealerId?: number) {
    setError('')
    setLoading(true)
    try {
      const result = await signInWithGoogle(idToken, dealerId)
      if (result.status === 'ok') {
        navigate(takePostLoginRedirect(result.login.role) || roleHome(result.login.role))
        return
      }
      if (result.status === 'pending_approval') {
        setStage({ kind: 'pending' })
        return
      }
      // needs_dealer: fetch the public dealer list and show the picker.
      const dealers = await listPublicDealers()
      setStage({ kind: 'choose-dealer', idToken, dealers })
    } catch {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function submitDealerChoice() {
    if (stage.kind !== 'choose-dealer' || typeof chosenDealer !== 'number') return
    await completeGoogleSignIn(stage.idToken, chosenDealer)
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

  if (stage.kind === 'pending') {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand">Dealer Ops</div>
          <h1>Waiting for approval</h1>
          <p className="muted">
            Your request to join a dealership has been sent. Any member of that dealership can
            approve it. You will be signed in next time you return after approval.
          </p>
          <button type="button" className="btn btn-primary btn-full"
            onClick={() => { setStage({ kind: 'form' }); setError(''); }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  if (stage.kind === 'choose-dealer') {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand">Dealer Ops</div>
          <h1>Choose your dealership</h1>
          <p className="muted">
            Pick the dealership you work at. A member of that dealership will see your request
            and can approve it.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-item">
            <select
              className="input"
              value={chosenDealer}
              onChange={e => setChosenDealer(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Select a dealership…</option>
              {stage.dealers.map(d => (
                <option key={d.id} value={d.id}>{d.legalName}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-full"
            disabled={typeof chosenDealer !== 'number'}
            onClick={() => void submitDealerChoice()}
          >
            Request to join
          </button>
          <button
            type="button"
            className="btn-link"
            style={{ marginTop: 12 }}
            onClick={() => { setStage({ kind: 'form' }); setChosenDealer(''); }}
          >
            Cancel
          </button>
        </div>
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
              A new Google account picks a dealership next; a member of that dealership approves
              the join before dealership data is visible.
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
