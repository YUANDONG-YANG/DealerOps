import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import DataTable from '../components/DataTable';
import FormDrawer from '../components/FormDrawer';
import ConfirmDialog from '../components/ConfirmDialog';
import PageState from '../components/PageState';
import PendingAccounts from '../components/PendingAccounts';
import ComplianceRulesPanel from '../components/ComplianceRulesPanel';
import { adminApi, adminErrorCode, adminErrorStatus, type Dealer, type Member } from '../api/admin';
import { apiError, collectAllPages, fieldErrorsOf } from '../api/http';
import { describeError, errorReason } from '../api/errors';

type FlatMember = Member & { dealerId: number; legalName: string };

const memberContact = (m: Member) => [m.email, m.phone].filter(Boolean).join(' / ') || '—';

function isForbidden(e: unknown) {
  return adminErrorCode(e) === 'FORBIDDEN' || adminErrorStatus(e) === 403;
}

const DEALER_FIELDS = [
  ['legalName', 'Legal name'], ['contactPhone', 'Contact phone'],
  ['contactEmail', 'Contact email'], ['contactAddress', 'Contact address'],
] as const;
const DEALER_LABELS: Record<string, string> = Object.fromEntries(DEALER_FIELDS);

// Field errors name what to fix; the generic "Validation failed." message is shown only without them.
function serverDetail(error: unknown): string | undefined {
  const parts = Object.entries(fieldErrorsOf(error)).map(([field, text]) => `${DEALER_LABELS[field] ?? field}: ${text}`);
  const message = apiError(error).message?.trim();
  if (!parts.length && message) parts.push(message);
  return parts.length ? parts.join(' ') : undefined;
}

const LOGO_MAX_PX = 160;

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', firebase: 'Firebase' };

function SignInTag({ method }: { method: Member['signInMethod'] }) {
  return method === 'password'
    ? <span className="tag">Password</span>
    : <span className="tag tag-info">{PROVIDER_NAMES[method]} sign-in</span>;
}

// What to do when a new staff account collides with an existing one (409 *_TAKEN, per field).
const FIELD_LABELS: Record<string, string> = {
  username: 'Username', displayName: 'Display name', password: 'Temporary password', email: 'Login email', phone: 'Login phone',
};

const TAKEN_HINTS: Record<string, string> = {
  username: 'Pick another username, e.g. add a number or the dealership name (kevin.ng2, kevin.parkway).',
  displayName: 'Display names are unique across the platform. Add a middle initial or the full surname.',
  email: 'Use a different email, or leave this blank and enter a phone number instead.',
  phone: 'Use a different number, or leave this blank and enter an email instead.',
};

export default function AdminPage() {
  const [tab, setTab] = useState<'dealers' | 'members' | 'pending' | 'rules'>('dealers');
  const [rows, setRows] = useState<Dealer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [memberQ, setMemberQ] = useState('');
  const [flatMembers, setFlatMembers] = useState<FlatMember[]>([]);
  const [memberPage, setMemberPage] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [membersForbidden, setMembersForbidden] = useState(false);

  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState({ legalName: '', contactPhone: '', contactEmail: '', contactAddress: '' });
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const [staffDealer, setStaffDealer] = useState<Dealer | null>(null);
  // One table at a time in the staff drawer: its members or the accounts waiting to be bound.
  const [staffTab, setStaffTab] = useState<'staff' | 'pending'>('staff');
  const [memberDrawer, setMemberDrawer] = useState(false);
  const [drawerMembers, setDrawerMembers] = useState<Member[]>([]);
  const [drawerError, setDrawerError] = useState('');
  const [member, setMember] = useState({ username: '', displayName: '', password: '', email: '', phone: '' });
  const [bindError, setBindError] = useState('');
  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({});
  const [memberHints, setMemberHints] = useState<Record<string, string>>({});
  const [binding, setBinding] = useState(false);
  const [statusBusy, setStatusBusy] = useState('');

  const [confirm, setConfirm] = useState(false);
  const [pendingUnbind, setPendingUnbind] = useState<{ dealerId: number; username: string } | null>(null);
  const [unbindError, setUnbindError] = useState('');
  const [resetTarget, setResetTarget] = useState<{ dealerId: number; username: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [resetting, setResetting] = useState(false);
  // Bumped to remount the status checkboxes so a cancelled confirm snaps back to the stored state.
  const [statusRevert, setStatusRevert] = useState(0);
  // Bumped to remount the pending lists after a membership change adds or removes a pending account.
  const [pendingReload, setPendingReload] = useState(0);

  const dealersLoadSeq = useRef(0);
  const membersLoadSeq = useRef(0);
  const drawerMembersLoadSeq = useRef(0);

  const pagedMembers = flatMembers.slice(memberPage * 10, memberPage * 10 + 10);

  const loadDealers = useCallback(async () => {
    const seq = ++dealersLoadSeq.current;
    setLoading(true); setError(''); setForbidden(false);
    try {
      const r = await adminApi.dealers({ q, page, size: 10 });
      if (seq !== dealersLoadSeq.current) return;
      setRows(r.data.items || []); setTotal(r.data.totalElements || 0);
    } catch (e) {
      if (seq !== dealersLoadSeq.current) return;
      setRows([]); setTotal(0);
      setForbidden(isForbidden(e));
      if (!isForbidden(e)) setError(describeError(e, 'load dealerships'));
    } finally {
      if (seq === dealersLoadSeq.current) setLoading(false);
    }
  }, [q, page]);

  useEffect(() => { void loadDealers(); }, [loadDealers]);

  const fetchAllDealers = () => collectAllPages<Dealer>((p) => adminApi.dealers({ page: p, size: 10 }));

  const fetchDealerMembers = async (dealerId: number, filterQ: string) => {
    const items: Member[] = [];
    let p = 0, n = 0;
    do {
      const r = await adminApi.members(dealerId, { q: filterQ, page: p, size: 10 });
      items.push(...(r.data.items || [])); n = r.data.totalElements || 0; p++;
    } while (items.length < n);
    return items;
  };

  const loadFlatMembers = async () => {
    const seq = ++membersLoadSeq.current;
    setMembersLoading(true); setMembersError(''); setMembersForbidden(false);
    try {
      const dealers = await fetchAllDealers();
      if (seq !== membersLoadSeq.current) return;
      const flat: FlatMember[] = [];
      for (const d of dealers) {
        const items = await fetchDealerMembers(d.id, memberQ);
        if (seq !== membersLoadSeq.current) return;
        for (const m of items) flat.push({ ...m, dealerId: d.id, legalName: d.legalName });
      }
      setFlatMembers(flat);
      if (memberPage * 10 >= flat.length) setMemberPage(0);
    } catch (e) {
      if (seq !== membersLoadSeq.current) return;
      setFlatMembers([]);
      setMembersForbidden(isForbidden(e));
      if (!isForbidden(e)) setMembersError(describeError(e, 'load members'));
    } finally {
      if (seq === membersLoadSeq.current) setMembersLoading(false);
    }
  };

  const openMembers = async (row: Dealer) => {
    const seq = ++drawerMembersLoadSeq.current;
    setStaffDealer(row); setStaffTab('staff'); setMemberDrawer(true); setBindError('');
    setMemberErrors({}); setDrawerError(''); setDrawerMembers([]);
    try {
      const items = await fetchDealerMembers(row.id, '');
      if (seq !== drawerMembersLoadSeq.current) return;
      setDrawerMembers(items);
    } catch (e) {
      if (seq !== drawerMembersLoadSeq.current) return;
      if (isForbidden(e)) setDrawerError('You do not have access to Admin.');
      else setDrawerError(describeError(e, 'load this dealership\'s staff'));
    }
  };

  const refreshDrawerMembers = async () => {
    if (!staffDealer) return;
    const seq = ++drawerMembersLoadSeq.current;
    try {
      const items = await fetchDealerMembers(staffDealer.id, '');
      if (seq === drawerMembersLoadSeq.current) setDrawerMembers(items);
    } catch {}
  };

  const refreshMemberships = async (dealerId: number) => {
    if (staffDealer?.id === dealerId) await refreshDrawerMembers();
    await loadDealers();
    if (tab === 'members') await loadFlatMembers();
    setPendingReload((n) => n + 1);
  };

  const openDealer = () => {
    setEditingDealer(null);
    setForm({ legalName: '', contactPhone: '', contactEmail: '', contactAddress: '' });
    setFormError(''); setLogoDataUrl(null); setDrawer(true);
  };

  const openEdit = (row: Dealer) => {
    setEditingDealer(row);
    setForm({ legalName: row.legalName, contactPhone: row.contactPhone, contactEmail: row.contactEmail, contactAddress: row.contactAddress });
    setLogoDataUrl(row.logoDataUrl); setFormError(''); setDrawer(true);
  };

  const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFormError('Logo must be an image file'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, LOGO_MAX_PX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      setLogoDataUrl(canvas.toDataURL('image/png'));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { setFormError('Could not read that image'); URL.revokeObjectURL(url); };
    img.src = url;
  };

  const createDealer = async () => {
    setFormError('');
    const empty = DEALER_FIELDS.filter(([key]) => !form[key].trim()).map(([, label]) => label);
    if (empty.length) {
      setFormError(`Check required contact fields: ${empty.join(', ')} ${empty.length > 1 ? 'are' : 'is'} empty.`); return;
    }
    if (creating) return; setCreating(true);
    try {
      if (editingDealer) {
        await adminApi.patchDealer(editingDealer.id, {
          ...form, version: editingDealer.version, active: editingDealer.active, logoDataUrl,
        });
      } else {
        await adminApi.createDealer(form);
      }
      setDrawer(false); setEditingDealer(null); setTab('dealers');
      if (!editingDealer) setPage(0);
      await loadDealers();
    } catch (e) {
      const code = adminErrorCode(e);
      if (code === 'VALIDATION' || adminErrorStatus(e) === 400)
        setFormError(serverDetail(e) || errorReason(e));
      else if (code === 'VERSION_CONFLICT' || adminErrorStatus(e) === 409) {
        setFormError('This dealership was changed by someone else after you opened it. Close this form and click Edit again to load the latest details.');
        await loadDealers();
      } else if (isForbidden(e)) setFormError('You do not have access to Admin.');
      else setFormError(describeError(e, editingDealer ? 'save the dealership' : 'create the dealership'));
    } finally { setCreating(false); }
  };

  const bind = async () => {
    setBindError(''); setMemberErrors({}); setMemberHints({});
    if (!staffDealer) return;
    const missing: Record<string, string> = {};
    if (!member.username.trim()) missing.username = 'Enter a username.';
    if (!member.displayName.trim()) missing.displayName = 'Enter the display name.';
    if (!member.password) missing.password = 'Enter a temporary password.';
    if (!member.email.trim() && !member.phone.trim()) {
      missing.email = 'Enter an email address or a phone number.';
      missing.phone = 'Enter an email address or a phone number.';
    }
    if (Object.keys(missing).length) {
      setMemberErrors(missing);
      setBindError(`Fill in: ${Object.keys(missing).map((f) => FIELD_LABELS[f]).join(', ')}.`);
      return;
    }
    if (binding) return; setBinding(true);
    try {
      await adminApi.bind(staffDealer.id, {
        ...member,
        username: member.username.trim(),
        displayName: member.displayName.trim(),
        email: member.email.trim() || undefined,
        phone: member.phone.trim() || undefined,
      });
      setMember({ username: '', displayName: '', password: '', email: '', phone: '' });
      await refreshMemberships(staffDealer.id);
    } catch (e) {
      const code = adminErrorCode(e);
      const fields = fieldErrorsOf(e);
      setMemberErrors(fields);
      if (code === 'DUP_MEMBER') {
        // The server names the dealership that already owns this login (AUTH-03).
        setBindError(apiError(e).message || 'Staff already bound');
      } else if (Object.keys(fields).length) {
        if (adminErrorStatus(e) === 409) {
          setMemberHints(Object.fromEntries(Object.keys(fields).filter((f) => TAKEN_HINTS[f]).map((f) => [f, TAKEN_HINTS[f]])));
        }
        // The drawer is usually scrolled to the button, so name the fields here as well.
        setBindError(`Fix: ${Object.keys(fields).map((f) => FIELD_LABELS[f] ?? f).join(', ')} — see the messages under each field.`);
      }
      else if (isForbidden(e)) setBindError('You do not have access to Admin.');
      else setBindError(describeError(e, 'create the staff account'));
    } finally { setBinding(false); }
  };

  const setStatus = async (dealerId: number, username: string, active: boolean) => {
    if (!active) { setPendingUnbind({ dealerId, username }); setUnbindError(''); setConfirm(true); return; }
    setStatusBusy(`${dealerId}:${username}`);
    try {
      await adminApi.bind(dealerId, { username });
      await refreshMemberships(dealerId);
    } catch (e) {
      setStatusRevert((n) => n + 1);
      if (adminErrorCode(e) === 'DUP_MEMBER') alert(apiError(e).message || 'This login is already active at another dealership. Unbind it there first.');
      else if (isForbidden(e)) alert('You do not have access to Admin.');
      else alert(describeError(e, `reactivate ${username}`));
    } finally { setStatusBusy(''); }
  };

  const unbind = async () => {
    if (!pendingUnbind) return;
    const { dealerId, username } = pendingUnbind;
    try {
      await adminApi.unbind(dealerId, username);
      setConfirm(false); setPendingUnbind(null);
      await refreshMemberships(dealerId);
    } catch (e) {
      if (adminErrorCode(e) === 'NOT_FOUND') setUnbindError(`Member not found: ${username} is no longer on this dealership's staff. Refresh the list.`);
      else if (isForbidden(e)) setUnbindError('You do not have access to Admin.');
      else setUnbindError(describeError(e, `unbind ${username}`));
    }
  };

  const openReset = (dealerId: number, username: string) => {
    setResetTarget({ dealerId, username }); setResetPassword(''); setResetConfirm(''); setResetError(''); setResetNotice('');
  };

  const submitReset = async () => {
    if (!resetTarget || resetting) return;
    const { dealerId, username } = resetTarget;
    if (resetPassword.length < 8 || resetPassword.length > 72) {
      setResetError('Use 8-72 characters for the new password.'); return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError('The two passwords do not match. Type the same password in both fields.'); return;
    }
    setResetting(true); setResetError('');
    try {
      await adminApi.resetPassword(dealerId, username, resetPassword);
      setResetTarget(null); setResetPassword(''); setResetConfirm('');
      setResetNotice(`Password for ${username} was reset. Give the new password to them directly; it is not emailed.`);
    } catch (e) {
      if (adminErrorCode(e) === 'NOT_FOUND') setResetError(`${username} is no longer active staff at this dealership. Refresh the list.`);
      else setResetError(describeError(e, `reset the password for ${username}`));
    } finally { setResetting(false); }
  };

  // Google and Firebase accounts sign in with a password held by that provider, so there is
  // nothing for the admin to reset here.
  const passwordAction = (dealerId: number, m: Member) => {
    if (!m.active) return null;
    if (m.signInMethod === 'password')
      return <button className="btn-link" onClick={() => openReset(dealerId, m.username)}>Reset password</button>;
    const provider = PROVIDER_NAMES[m.signInMethod];
    return (
      <span className="muted" title={`${m.username} signs in with ${provider}. Ask them to use ${provider}'s password recovery.`}>
        Password managed by {provider}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <div><h1>Admin</h1><span className="muted">Dealerships and members</span></div>
          <button className="btn btn-primary" onClick={openDealer}>New dealership</button>
        </div>
        <div className="tab-bar">
          <button className={`tab-btn ${tab === 'dealers' ? 'active' : ''}`} onClick={() => setTab('dealers')}>Dealerships</button>
          <button className={`tab-btn ${tab === 'members' ? 'active' : ''}`} onClick={() => { setTab('members'); loadFlatMembers(); }}>Members</button>
          <button className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Pending accounts</button>
          <button className={`tab-btn ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>Ad rules</button>
        </div>

        {tab === 'dealers' && (
          <>
            <div className="filters">
              <input className="input" value={q} placeholder="Dealership name" aria-label="Dealership name" onChange={(e) => setQ(e.target.value)} />
              <button className="btn" onClick={() => { setPage(0); loadDealers(); }}>Search</button>
              <button className="btn" onClick={() => { setQ(''); setPage(0); }}>Reset</button>
            </div>
            <PageState loading={loading} error={error} forbidden={forbidden}
              empty={!loading && !error && !forbidden && !rows.length}
              emptyText="No dealerships yet." loadingText="Loading dealerships…"
              forbiddenText="You do not have access to Admin.">
              <DataTable rows={rows} total={total} page={page} onPage={setPage}
                columns={[
                  { label: 'Name', render: (r) => (
                    <>{r.logoDataUrl && <img src={r.logoDataUrl} alt="" className="dealer-logo-sm" />}{r.legalName}</>
                  )},
                  { label: 'Contact', render: (r) => `${r.contactPhone} / ${r.contactEmail}` },
                  { label: 'Staff count', render: (r) => r.staffCount == null ? '—' : String(r.staffCount) },
                ]}
                actions={(r) => (
                  <>
                    <button className="btn-link" onClick={() => openEdit(r)}>Edit</button>
                    <button className="btn-link" onClick={() => openMembers(r)}>Staff</button>
                  </>
                )}
              />
            </PageState>
          </>
        )}

        {tab === 'members' && (
          <>
            <div className="filters">
              <input className="input" value={memberQ} placeholder="Username, name, email or phone" aria-label="Search members" onChange={(e) => setMemberQ(e.target.value)} />
              <button className="btn" onClick={() => { setMemberPage(0); loadFlatMembers(); }}>Search</button>
              <button className="btn" onClick={() => { setMemberQ(''); setMemberPage(0); loadFlatMembers(); }}>Reset</button>
            </div>
            {resetNotice && !memberDrawer && <p className="success-text">{resetNotice}</p>}
            <PageState loading={membersLoading} error={membersError} forbidden={membersForbidden}
              empty={!membersLoading && !membersError && !membersForbidden && !flatMembers.length}
              emptyText="No members yet." loadingText="Loading members…"
              forbiddenText="You do not have access to Admin.">
              <DataTable rows={pagedMembers} total={flatMembers.length} page={memberPage} onPage={setMemberPage}
                columns={[
                  { label: 'Username', render: (r) => r.username },
                  { key: 'legalName', label: 'Dealership' },
                  { label: 'Contact', render: (r) => memberContact(r) },
                  { label: 'Sign-in', render: (r) => <SignInTag method={r.signInMethod} /> },
                  { label: 'Status', render: (r) => (
                    <label className="checkbox-label">
                      <input type="checkbox" key={`${r.dealerId}:${r.username}:${statusRevert}`}
                        checked={r.active}
                        disabled={statusBusy === `${r.dealerId}:${r.username}`}
                        onChange={(e) => setStatus(r.dealerId, r.username, e.target.checked)} />
                      {r.active ? 'Active' : 'Inactive'}
                    </label>
                  )},
                  { label: 'Password', render: (r) => passwordAction(r.dealerId, r) },
                ]}
              />
            </PageState>
          </>
        )}
        {tab === 'pending' && (
          <PendingAccounts key={pendingReload} onBound={() => { void loadFlatMembers(); void loadDealers(); }} />
        )}
        {tab === 'rules' && <ComplianceRulesPanel />}
      </div>

      <FormDrawer title={editingDealer ? 'Edit dealership' : 'New dealership'} open={drawer} onClose={() => setDrawer(false)}>
        {formError && <p className="danger-text">{formError}</p>}
        <div className="form-item"><label className="form-label form-required">Legal name</label>
          <input className="input" value={form.legalName} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />
        </div>
        <div className="form-item"><label className="form-label form-required">Contact phone</label>
          <input className="input" value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
        </div>
        <div className="form-item"><label className="form-label form-required">Contact email</label>
          <input className="input" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
        </div>
        <div className="form-item"><label className="form-label form-required">Contact address</label>
          <input className="input" value={form.contactAddress} onChange={(e) => setForm((f) => ({ ...f, contactAddress: e.target.value }))} />
        </div>
        {editingDealer && (
          <div className="form-item"><label className="form-label">Logo</label>
            <div className="logo-field">
              {logoDataUrl && <img src={logoDataUrl} alt="Dealership logo" className="dealer-logo" />}
              <label className="btn btn-sm upload-btn">
                {logoDataUrl ? 'Replace logo' : 'Upload logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickLogo} />
              </label>
              {logoDataUrl && <button className="btn-link danger" onClick={() => setLogoDataUrl(null)}>Remove</button>}
            </div>
          </div>
        )}
        <button className="btn btn-primary" disabled={creating} onClick={createDealer}>
          {creating ? 'Saving…' : editingDealer ? 'Save' : 'Create'}
        </button>
      </FormDrawer>

      <FormDrawer title={staffDealer ? `Staff · ${staffDealer.legalName}` : 'Staff'}
        open={memberDrawer} onClose={() => setMemberDrawer(false)}>
        {drawerError && <p className="danger-text">{drawerError}</p>}
        <div className="muted" style={{ marginBottom: 8 }}>
          Create a new staff account — a temporary password is required. An account that registered itself is bound
          from the Pending accounts tab below, without one.
        </div>
        <div className="form-item"><label className="form-label form-required">Username</label>
          <input className="input" value={member.username}
            onChange={(e) => setMember((m) => ({ ...m, username: e.target.value }))} />
          {memberErrors.username && <div className="form-error">{memberErrors.username}</div>}
          {memberHints.username && <div className="muted form-hint">{memberHints.username}</div>}
        </div>
        <div className="form-item"><label className="form-label form-required">Display name</label>
          <input className="input" value={member.displayName}
            onChange={(e) => setMember((m) => ({ ...m, displayName: e.target.value }))} />
          {memberErrors.displayName && <div className="form-error">{memberErrors.displayName}</div>}
          {memberHints.displayName && <div className="muted form-hint">{memberHints.displayName}</div>}
        </div>
        <div className="form-item"><label className="form-label form-required">Temporary password</label>
          <input className="input" type="password" value={member.password}
            onChange={(e) => setMember((m) => ({ ...m, password: e.target.value }))} />
          {memberErrors.password && <div className="form-error">{memberErrors.password}</div>}
        </div>
        <div className="form-item"><label className="form-label">Login email</label>
          <input className="input" type="email" value={member.email}
            onChange={(e) => setMember((m) => ({ ...m, email: e.target.value }))} />
          {memberErrors.email && <div className="form-error">{memberErrors.email}</div>}
          <div className="muted form-hint">{memberHints.email
            ?? 'Used to sign in. Each email address can belong to only one account.'}</div>
        </div>
        <div className="form-item"><label className="form-label">Login phone (email, phone, or both)</label>
          <input className="input" type="tel" value={member.phone}
            onChange={(e) => setMember((m) => ({ ...m, phone: e.target.value }))} />
          {memberErrors.phone && <div className="form-error">{memberErrors.phone}</div>}
          <div className="muted form-hint">{memberHints.phone
            ?? 'Include the country code, e.g. +1 416 555 0123. Each number can belong to only one account.'}</div>
        </div>
        {/* Shown next to the button: the drawer is usually scrolled down when the error arrives. */}
        {bindError && <p className="danger-text">{bindError}</p>}
        <button className="btn btn-primary" disabled={binding} onClick={bind}>
          {binding ? 'Binding…' : 'Create and bind'}
        </button>
        <div className="tab-bar" style={{ marginTop: 20 }}>
          <button className={`tab-btn ${staffTab === 'staff' ? 'active' : ''}`} onClick={() => setStaffTab('staff')}>Staff</button>
          <button className={`tab-btn ${staffTab === 'pending' ? 'active' : ''}`} onClick={() => setStaffTab('pending')}>Pending accounts</button>
        </div>
        {staffTab === 'staff' && <div>
          {resetNotice && <p className="success-text">{resetNotice}</p>}
          <table className="table staff-table">
            {/* The drawer is narrow: name and sign-in method sit under the username so Actions stays visible. */}
            <thead><tr><th>Account</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {drawerMembers.map((m) => (
                <tr key={m.username}>
                  <td>
                    <div className="staff-account">
                      <span className="staff-username">{m.username}</span>
                      {m.displayName !== m.username && <span className="muted">{m.displayName}</span>}
                      <span className="muted">{memberContact(m)}</span>
                      <SignInTag method={m.signInMethod} />
                    </div>
                  </td>
                  <td><span className={`tag ${m.active ? 'tag-success' : ''}`}>{m.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    {staffDealer && m.active && (
                      <div className="row-actions">
                        {passwordAction(staffDealer.id, m)}
                        <button className="btn-link danger" onClick={() => setStatus(staffDealer.id, m.username, false)}>Unbind</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
        {staffTab === 'pending' && staffDealer && (
          <PendingAccounts key={pendingReload} dealerId={staffDealer.id}
            onBound={() => { void refreshDrawerMembers(); void loadDealers(); }} />
        )}
      </FormDrawer>

      <ConfirmDialog open={confirm} title="Unbind staff" confirmLabel="Unbind"
        message={unbindError || 'Unbind this staff member from the dealership? They lose access to its data right away. The account and its audit history are kept, and you can bind it again later.'}
        onCancel={() => { setConfirm(false); setPendingUnbind(null); setStatusRevert((n) => n + 1); }}
        onConfirm={unbind}
      />

      <ConfirmDialog open={resetTarget != null} title={`Reset password for ${resetTarget?.username ?? ''}`}
        confirmLabel={resetting ? 'Saving…' : 'Set password'}
        onCancel={() => { if (!resetting) setResetTarget(null); }}
        onConfirm={submitReset}>
        <label className="form-label" htmlFor="reset-password">New password</label>
        {/* Plain text with autofill off: the admin must see exactly what they typed, and the
            browser must not drop the admin's own saved password into this field. */}
        <input id="reset-password" className="input" type="text" autoComplete="off" autoFocus
          data-lpignore="true" spellCheck={false}
          value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
        <label className="form-label" htmlFor="reset-password-confirm" style={{ marginTop: 12 }}>Type it again</label>
        <input id="reset-password-confirm" className="input" type="text" autoComplete="off"
          data-lpignore="true" spellCheck={false}
          value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submitReset(); }} />
        <p className="muted form-hint">
          8-72 characters. Their old password stops working right away. Give the new one to them directly; DealerOps does not email it.
        </p>
        {resetError && <p className="danger-text">{resetError}</p>}
      </ConfirmDialog>
    </AppLayout>
  );
}
