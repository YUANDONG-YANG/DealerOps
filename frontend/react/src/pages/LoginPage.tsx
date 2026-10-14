import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { rememberPostLoginRedirect, signIn, takePostLoginRedirect } from '../auth/login'

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const notice = params.get('notice')
    if (notice === 'required') setError('Sign in required')
    else if (notice === 'profile') setError('Could not load profile')
  }, [params])

  useEffect(() => {
    const redirect = params.get('redirect')
    if (redirect) rememberPostLoginRedirect(redirect)
  }, [params])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) {
      setError('Enter your email, username or phone number and password.')
      return
    }
    setLoading(true)
    try {
      const redirect = params.get('redirect') || ''
      rememberPostLoginRedirect(redirect)
      await signIn(identifier.trim(), password)
      navigate(takePostLoginRedirect() || '/')
    } catch {
      setError('Invalid sign-in name or password.')
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
        <p className="auth-switch">
          New here? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  )
}
