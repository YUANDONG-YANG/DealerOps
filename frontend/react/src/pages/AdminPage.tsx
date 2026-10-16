import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import DataTable from '../components/DataTable';
import FormDrawer from '../components/FormDrawer';
import ConfirmDialog from '../components/ConfirmDialog';
import PageState from '../components/PageState';
import PendingAccounts from '../components/PendingAccounts';
import { adminApi, adminErrorCode, adminErrorStatus, type Dealer, type Member } from '../api/admin';
import { apiError, collectAllPages, fieldErrorsOf } from '../api/http';

type FlatMember = Member & { dealerId: number; legalName: string };

function isForbidden(e: unknown) {
  return adminErrorCode(e) === 'FORBIDDEN' || adminErrorStatus(e) === 403;
}

function serverDetail(error: unknown): string | undefined {
  const parts: string[] = [];
  const message = apiError(error).message?.trim();
  if (message) parts.push(message);
  for (const [field, text] of Object.entries(fieldErrorsOf(error))) parts.push(`${field}: ${text}`);
  return parts.length ? parts.join(' ') : undefined;
}

const LOGO_MAX_PX = 160;

// What to do when a new staff account collides with an existing one (409 *_TAKEN, per field).
const TAKEN_HINTS: Record<string, string> = {
  username: 'This username is already in use. Try another one, e.g. add a number or the dealership name.',
  displayName: 'Another account already uses this display name. Add a middle initial or a surname.',
  email: 'This email is already used by another account. Use a different email, or leave it blank and enter a phone number.',
  phone: 'This phone number is already used by another account. Use a different number, or leave it blank and enter an email.',
};

export default function AdminPage() {
  const [tab, setTab] = useState<'dealers' | 'members'>('dealers');
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
  const [memberDrawer, setMemberDrawer] = useState(false);
  const [drawerMembers, setDrawerMembers] = useState<Member[]>([]);
  const [drawerError, setDrawerError] = useState('');
  const [member, setMember] = useState({ username: '', displayName: '', password: '', email: '', phone: '' });
  const [bindError, setBindError] = useState('');
  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({});
  const [binding, setBinding] = useState(false);
  const [statusBusy, setStatusBusy] = useState('');

  const [confirm, setConfirm] = useState(false);
  const [pendingUnbind, setPendingUnbind] = useState<{ dealerId: number; username: string } | null>(null);
  const [unbindError, setUnbindError] = useState('');
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
      if (!isForbidden(e)) setError('Could not load dealerships.');
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
      if (!isForbidden(e)) setMembersError('Could not load dealerships.');
    } finally {
      if (seq === membersLoadSeq.current) setMembersLoading(false);
    }
  };

  const openMembers = async (row: Dealer) => {
    const seq = ++drawerMembersLoadSeq.current;
    setStaffDealer(row); setMemberDrawer(true); setBindError('');
    setMemberErrors({}); setDrawerError(''); setDrawerMembers([]);
    try {
      const items = await fetchDealerMembers(row.id, '');
      if (seq !== drawerMembersLoadSeq.current) return;
      setDrawerMembers(items);
    } catch (e) {
      if (seq !== drawerMembersLoadSeq.current) return;
      if (isForbidden(e)) setDrawerError('You do not have access to Admin.');
      else setDrawerError('Could not load dealerships.');
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
    if (!form.legalName || !form.contactPhone || !form.contactEmail || !form.contactAddress) {
      setFormError('Check required contact fields'); return;
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
        setFormError(serverDetail(e) || 'Check required contact fields');
      else if (code === 'VERSION_CONFLICT' || adminErrorStatus(e) === 409) {
        setFormError('This dealership changed elsewhere. Close and reopen Edit.');
        await loadDealers();
      } else if (isForbidden(e)) setFormError('You do not have access to Admin.');
      else setFormError(serverDetail(e) || (editingDealer ? 'Could not save dealership.' : 'Could not create dealership.'));
    } finally { setCreating(false); }
  };

  const bind = async () => {
    setBindError(''); setMemberErrors({});
    if (!staffDealer) return;
    if (!member.username || !member.displayName || !member.password
      || (!member.email.trim() && !member.phone.trim())) {
      setBindError('Enter the account details and an email or phone number.'); return;
    }
    if (binding) return; setBinding(true);
    try {
      await adminApi.bind(staffDealer.id, member);
      setMember({ username: '', displayName: '', password: '', email: '', phone: '' });
      await refreshMemberships(staffDealer.id);
    } catch (e) {
      const code = adminErrorCode(e);
      const fields = fieldErrorsOf(e);
      if (Object.keys(fields).length) {
        const conflict = adminErrorStatus(e) === 409;
        setMemberErrors(Object.fromEntries(Object.entries(fields)
          .map(([field, text]) => [field, conflict && TAKEN_HINTS[field] ? TAKEN_HINTS[field] : text])));
        // The username field is off-screen when the drawer is scrolled to the button.
        setBindError('Some details need changing — see the highlighted fields above.');
      }
      else if (code === 'DUP_MEMBER') {
        // One login belongs to exactly one dealership (AUTH-03), so the username itself is the problem.
        setBindError('Staff already bound');
        setMemberErrors({ username: 'This username already belongs to a dealership or the platform admin. Choose another username.' });
      }
      else if (code === 'VALIDATION' || adminErrorStatus(e) === 400) setBindError(apiError(e).message || 'Check the account details.');
      else if (isForbidden(e)) setBindError('You do not have access to Admin.');
      else setBindError(serverDetail(e) || 'Could not bind staff.');
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
      if (adminErrorCode(e) === 'DUP_MEMBER') alert('Already active at another dealership. Deactivate it there first.');
      else if (isForbidden(e)) alert('You do not have access to Admin.');
      else alert(serverDetail(e) || 'Could not activate staff.');
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
      if (adminErrorCode(e) === 'NOT_FOUND') setUnbindError('Member not found');
      else if (isForbidden(e)) setUnbindError('You do not have access to Admin.');
      else setUnbindError(serverDetail(e) || 'Could not unbind staff.');
    }
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
        </div>

        {tab === 'dealers' && (
          <>
            <div className="filters">
              <input className="input" value={q} placeholder="Dealership name" onChange={(e) => setQ(e.target.value)} />
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
              <input className="input" value={memberQ} placeholder="Username" onChange={(e) => setMemberQ(e.target.value)} />
              <button className="btn" onClick={() => { setMemberPage(0); loadFlatMembers(); }}>Search</button>
              <button className="btn" onClick={() => { setMemberQ(''); setMemberPage(0); loadFlatMembers(); }}>Reset</button>
            </div>
            <PageState loading={membersLoading} error={membersError} forbidden={membersForbidden}
              empty={!membersLoading && !membersError && !membersForbidden && !flatMembers.length}
              emptyText="No members yet." loadingText="Loading members…"
              forbiddenText="You do not have access to Admin.">
              <DataTable rows={pagedMembers} total={flatMembers.length} page={memberPage} onPage={setMemberPage}
                columns={[
                  { label: 'Username', render: (r) => r.username },
                  { key: 'legalName', label: 'Dealership' },
                  { label: 'Status', render: (r) => (
                    <label className="switch-label">
                      <input type="checkbox" key={`${r.dealerId}:${r.username}:${statusRevert}`}
                        checked={r.active}
                        disabled={statusBusy === `${r.dealerId}:${r.username}`}
                        onChange={(e) => setStatus(r.dealerId, r.username, e.target.checked)} />
                      {r.active ? 'Active' : 'Inactive'}
                    </label>
                  )},
                ]}
              />
            </PageState>
            <PendingAccounts key={pendingReload} onBound={() => { void loadFlatMembers(); void loadDealers(); }} />
          </>
        )}
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
          further down without one.
        </div>
        <div className="form-item"><label className="form-label form-required">Username</label>
          <input className="input" value={member.username}
            onChange={(e) => setMember((m) => ({ ...m, username: e.target.value }))} />
          {memberErrors.username && <div className="form-error">{memberErrors.username}</div>}
        </div>
        <div className="form-item"><label className="form-label form-required">Display name</label>
          <input className="input" value={member.displayName}
            onChange={(e) => setMember((m) => ({ ...m, displayName: e.target.value }))} />
          {memberErrors.displayName && <div className="form-error">{memberErrors.displayName}</div>}
        </div>
        <div className="form-item"><label className="form-label form-required">Temporary password</label>
          <input className="input" type="password" value={member.password}
            onChange={(e) => setMember((m) => ({ ...m, password: e.target.value }))} />
          {memberErrors.password && <div className="form-error">{memberErrors.password}</div>}
        </div>
        <div className="form-item"><label className="form-label">Login email</label>
          <input className="input" type="email" value={member.email}
            onChange={(e) => setMember((m) => ({ ...m, email: e.target.value }))} />
          {memberErrors.email
            ? <div className="form-error">{memberErrors.email}</div>
            : <div className="muted form-hint">Used to sign in. Each email address can belong to only one account.</div>}
        </div>
        <div className="form-item"><label className="form-label">Login phone (email, phone, or both)</label>
          <input className="input" type="tel" value={member.phone}
            onChange={(e) => setMember((m) => ({ ...m, phone: e.target.value }))} />
          {memberErrors.phone
            ? <div className="form-error">{memberErrors.phone}</div>
            : <div className="muted form-hint">Include the country code, e.g. +1 416 555 0123. Each number can belong to only one account.</div>}
        </div>
        {/* Shown next to the button: the drawer is usually scrolled down when the error arrives. */}
        {bindError && <p className="danger-text">{bindError}</p>}
        <button className="btn btn-primary" disabled={binding} onClick={bind}>
          {binding ? 'Binding…' : 'Create and bind'}
        </button>
        <div style={{ marginTop: 20 }}>
          <table className="table">
            <thead><tr><th>Username</th><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {drawerMembers.map((m) => (
                <tr key={m.username}>
                  <td>{m.username}</td>
                  <td>{m.displayName}</td>
                  <td><span className={`tag ${m.active ? 'tag-success' : ''}`}>{m.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    {staffDealer && m.active && (
                      <button className="btn-link danger" onClick={() => setStatus(staffDealer.id, m.username, false)}>Unbind</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {staffDealer && (
          <PendingAccounts key={pendingReload} dealerId={staffDealer.id}
            onBound={() => { void refreshDrawerMembers(); void loadDealers(); }} />
        )}
      </FormDrawer>

      <ConfirmDialog open={confirm} title="Unbind staff" confirmLabel="Unbind"
        message={unbindError || 'Unbind this staff member from the dealership? They lose access to its data right away. The account and its audit history are kept, and you can bind it again later.'}
        onCancel={() => { setConfirm(false); setPendingUnbind(null); setStatusRevert((n) => n + 1); }}
        onConfirm={unbind}
      />
    </AppLayout>
  );
}
