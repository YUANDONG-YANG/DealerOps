import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiError, fieldErrorsOf } from '../api/http'
import { register } from '../auth/login'

const USERNAME_RX = /^(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}$/
const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE_RX = /^\+?[1-9][0-9]{6,14}$/

const TAKEN_FIELD: Record<string, string> = {
  USERNAME_TAKEN: 'username',
  DISPLAY_NAME_TAKEN: 'displayName',
  EMAIL_TAKEN: 'email',
  PHONE_TAKEN: 'phone',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', displayName: '', email: '', phone: '', password: '',
  })
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setServerErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!form.username.trim()) errors.username = 'Enter a username.'
    else if (!USERNAME_RX.test(form.username.trim()))
      errors.username = 'Use 3–64 letters, digits, dots, dashes or underscores, with at least one letter.'
    if (!form.displayName.trim()) errors.displayName = 'Enter your full name.'
    else if (form.displayName.trim().length > 120) errors.displayName = 'Full name can be at most 120 characters.'
    if (!form.email.trim() && !form.phone.trim())
      errors.email = errors.phone = 'Enter an email address or a phone number.'
    if (form.email.trim() && !EMAIL_RX.test(form.email.trim()))
      errors.email = 'Enter a valid email address.'
    if (form.phone.trim() && !PHONE_RX.test(form.phone.trim().replace(/[\s().-]/g, '')))
      errors.phone = 'Enter a valid phone number.'
    if (!form.password) errors.password = 'Enter a password.'
    else if (form.password.length < 8 || form.password.length > 72)
      errors.password = 'Password must be 8–72 characters.'
    return errors
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setServerErrors({})
    const clientErrors = validate()
    if (Object.keys(clientErrors).length) {
      setServerErrors(clientErrors)
      return
    }
    setLoading(true)
    try {
      await register(
        form.username.trim(), form.displayName.trim(),
        form.email.trim(), form.phone.trim(), form.password,
      )
      navigate('/')
    } catch (err) {
      const fields = fieldErrorsOf(err)
      const { code, message } = apiError(err)
      const newErrors: Record<string, string> = {}
      for (const [field, text] of Object.entries(fields)) {
        if (field in form) newErrors[field] = text
      }
      const taken = code ? TAKEN_FIELD[code] : undefined
      if (taken && !newErrors[taken]) newErrors[taken] = message || 'Already registered.'
      if (Object.keys(newErrors).length) {
        setServerErrors(newErrors)
      } else {
        setError(message || 'Could not create the account. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fieldError = (field: string) => serverErrors[field]

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">Dealer Ops</div>
        <h1>Create account</h1>
        <p className="muted">An administrator adds your account to a dealership before you can use it.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-item">
            <input className="input" placeholder="Username" autoComplete="username"
              value={form.username} onChange={e => set('username', e.target.value)} />
            {fieldError('username') && <div className="field-error">{fieldError('username')}</div>}
          </div>
          <div className="form-item">
            <input className="input" placeholder="Full name" autoComplete="name"
              value={form.displayName} onChange={e => set('displayName', e.target.value)} />
            {fieldError('displayName') && <div className="field-error">{fieldError('displayName')}</div>}
          </div>
          <div className="form-item">
            <input className="input" type="email" placeholder="Email" autoComplete="email"
              value={form.email} onChange={e => set('email', e.target.value)} />
            {fieldError('email') && <div className="field-error">{fieldError('email')}</div>}
          </div>
          <div className="form-item">
            <input className="input" type="tel" placeholder="Phone (email, phone, or both)" autoComplete="tel"
              value={form.phone} onChange={e => set('phone', e.target.value)} />
            {fieldError('phone') && <div className="field-error">{fieldError('phone')}</div>}
          </div>
          <div className="form-item">
            <input className="input" type="password" placeholder="Password (at least 8 characters)"
              autoComplete="new-password"
              value={form.password} onChange={e => set('password', e.target.value)} />
            {fieldError('password') && <div className="field-error">{fieldError('password')}</div>}
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
