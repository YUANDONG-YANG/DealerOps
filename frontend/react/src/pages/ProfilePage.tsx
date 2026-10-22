import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { useSessionStore } from '../store/session';
import { getMe, patchMe, deleteMe, type Profile } from '../api/me';
import { clearAccount, signOut } from '../auth/login';
import { fieldErrorsOf } from '../api/http';
import { enumLabel, initials } from '../format';
import { describeError } from '../api/errors';

/**
 * Account self-service: the signed-in user's own information, how they got in, and the
 * actions they alone may take on themselves (edit display name / phone, delete the account).
 * Username, role and dealer binding are read-only — those paths belong to sign-up and admin.
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const setProfile = useSessionStore((s) => s.setProfile);

  const [me, setMe] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedMessage, setSavedMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // A load that finishes after unmount (or after StrictMode's re-run) must not overwrite what the user typed.
    let cancelled = false;
    void (async () => {
      try {
        const data = await getMe();
        if (cancelled) return;
        setMe(data);
        setDisplayName(data.displayName);
        setPhone(data.phone ?? '');
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'load your profile'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setFieldErrors({}); setSavedMessage('');
    try {
      const updated = await patchMe({
        displayName: displayName.trim(),
        phone: phone.trim() || null,
      });
      setMe(updated);
      setProfile(updated);
      setSavedMessage('Profile saved.');
    } catch (err) {
      setFieldErrors(fieldErrorsOf(err));
      setError(describeError(err, 'save your profile'));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true); setError('');
    try {
      await deleteMe();
      clearAccount();
      navigate('/login?notice=deleted', { replace: true });
    } catch (err) {
      setError(describeError(err, 'delete your account'));
      setDeleting(false);
    }
  }

  if (loading) {
    return <AppLayout><div className="state">Loading…</div></AppLayout>;
  }
  if (!me) {
    return <AppLayout><div className="alert alert-error">{error || 'Profile unavailable.'}</div></AppLayout>;
  }

  const methodText = me.signInMethod === 'google'
    ? 'Google sign-in (no password set)'
    : 'Username / password sign-in';

  return (
    <AppLayout>
      <section className="page" style={{ maxWidth: 640 }}>
        <header className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0 }}>Profile</h1>
            <p className="muted" style={{ marginTop: 4 }}>Your account information and how you signed in.</p>
          </div>
          <button type="button" className="btn" onClick={() => signOut()}>Sign out</button>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {savedMessage && <div className="alert alert-success">{savedMessage}</div>}

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Account</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
            {me.avatarUrl ? (
              <img src={me.avatarUrl} alt="" referrerPolicy="no-referrer"
                style={{ width: 56, height: 56, borderRadius: '50%' }} />
            ) : (
              <div className="user-avatar user-avatar-lg" aria-hidden="true">
                {initials(me.displayName || me.username)}
              </div>
            )}
            <div>
              <strong style={{ fontSize: 16 }}>{me.displayName}</strong>
              <div className="muted">@{me.username}</div>
            </div>
          </div>
          <dl className="definition-list">
            <dt>Role</dt><dd>{me.role}</dd>
            <dt>Dealership</dt><dd>{me.dealerLegalName ?? 'No dealership'}</dd>
            {me.dealerRole && <><dt>Dealership role</dt><dd>{enumLabel(me.dealerRole)}</dd></>}
            <dt>Email</dt><dd>{me.email ?? 'Not provided'}</dd>
            <dt>Phone</dt><dd>{me.phone ?? 'Not provided'}</dd>
            <dt>Sign-in method</dt><dd>{methodText}</dd>
            {me.givenName && <><dt>Given name</dt><dd>{me.givenName}</dd></>}
            {me.familyName && <><dt>Family name</dt><dd>{me.familyName}</dd></>}
            {me.locale && <><dt>Locale</dt><dd>{me.locale}</dd></>}
          </dl>
        </div>

        <form onSubmit={onSave} className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Edit</h3>
          <div className="form-item">
            <label className="form-label" htmlFor="displayName">Display name</label>
            <input id="displayName" className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required maxLength={120} />
            {fieldErrors.displayName && <div className="form-error">{fieldErrors.displayName}</div>}
          </div>
          <div className="form-item">
            <label className="form-label" htmlFor="phone">Phone</label>
            <input id="phone" className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40} />
            {fieldErrors.phone && <div className="form-error">{fieldErrors.phone}</div>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <div className="card" style={{ padding: 20, borderColor: 'var(--danger)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--danger)' }}>Delete account</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Removes your membership and sign-in. Your email and phone are released so you can
            come back later through Google or a new username / password account.
          </p>
          {me.role === 'Platform.Admin' ? (
            <p className="muted">Platform admin accounts cannot delete themselves.</p>
          ) : !confirmDelete ? (
            <button type="button" className="btn btn-danger"
              onClick={() => setConfirmDelete(true)}>
              Delete my account
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <strong>Really delete? This signs you out immediately.</strong>
              <button type="button" className="btn btn-primary"
                style={{ background: 'var(--danger)' }}
                disabled={deleting}
                onClick={() => void onDelete()}>
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button type="button" className="btn-link"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
