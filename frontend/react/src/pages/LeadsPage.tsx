import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DataTable from '../components/DataTable';
import FormDrawer from '../components/FormDrawer';
import PageState from '../components/PageState';
import AuditTrail from '../components/AuditTrail';
import { fieldErrorsOf, messageOf } from '../api/http';
import { customersApi } from '../api/customers';
import { errorCode, errorStatus, vehiclesApi } from '../api/vehicles';
import { auditApi } from '../api/audit';
import { LEAD_STAGES, isClosedStage, leadsApi, stageLabel, type LeadStage } from '../api/leads';
import { memberLabel, membersApi, type MemberOption } from '../api/members';
import { describeError } from '../api/errors';

function vehicleLabel(v: Record<string, unknown> | null | undefined) {
  if (!v) return '—';
  return `${v.modelYear} ${v.make} ${v.model}`;
}

function mapWrite(e: unknown, fallback: string) {
  const code = errorCode(e);
  if (code === 'VALIDATION') return messageOf(e, 'Check required fields: some fields are missing or invalid.');
  if (code === 'WRONG_DEALER_OR_SOLD') return 'Vehicle must be in stock at this dealership. Pick a vehicle that is not sold.';
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry: someone else changed this record after you opened it. Reopen it to load the latest version, then make your change again.';
  if (code === 'LEAD_CLOSED') return 'Won and lost leads cannot be changed. Create a new lead to follow up again.';
  if (errorStatus(e) === 404 || code === 'NOT_FOUND') return 'Lead not found';
  return describeError(e, fallback);
}

export default function LeadsPage() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [filters, setFilters] = useState({ q: '', stage: '', owner: '', overdue: false });
  const [owners, setOwners] = useState<MemberOption[]>([]);
  const listSeq = useRef(0);
  const detailSeq = useRef(0);

  // Create drawer
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [createForm, setCreateForm] = useState({
    customerId: undefined as number | undefined,
    name: '', email: '', phone: '', homeAddress: '',
    vehicleId: undefined as number | undefined,
    ownerUsername: '', nextFollowUpOn: '', note: '',
  });
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<any[]>([]);

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [edit, setEdit] = useState({
    stage: 'NEW' as LeadStage, ownerUsername: '', nextFollowUpOn: '',
    vehicleId: undefined as number | undefined, lostReason: '',
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [audit, setAudit] = useState<any[]>([]);

  const load = useCallback(async (p = page, f = filters) => {
    const seq = ++listSeq.current;
    setLoading(true); setError(''); setForbidden(false);
    try {
      const r = await leadsApi.list({ ...f, page: p, size: 10 });
      if (seq !== listSeq.current) return;
      setRows(r.data.items || []); setTotal(r.data.totalElements || 0);
    } catch (e) {
      if (seq !== listSeq.current) return;
      if (errorStatus(e) === 403 || errorCode(e) === 'FORBIDDEN') setForbidden(true);
      else setError(describeError(e, 'load leads'));
      setRows([]);
    } finally {
      if (seq === listSeq.current) setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { void load(); }, [page]);
  useEffect(() => {
    membersApi.list().then((r) => setOwners(r.data || [])).catch(() => {});
  }, []);

  const searchCustomers = async (q: string) => {
    try { setCustomerOptions((await customersApi.list({ q, size: 10 })).data.items || []); }
    catch { setCustomerOptions([]); }
  };

  const searchVehicles = async (q: string) => {
    try { setVehicleOptions((await vehiclesApi.list({ q, status: 'IN_STOCK', size: 10 })).data.items || []); }
    catch { setVehicleOptions([]); }
  };

  const openCreate = () => {
    setCreateForm({
      customerId: undefined, name: '', email: '', phone: '', homeAddress: '',
      vehicleId: undefined, ownerUsername: '', nextFollowUpOn: '', note: '',
    });
    setCustomerMode('existing');
    setCreateError(''); setCreateFieldErrors({}); setCreateOpen(true);
    void searchCustomers(''); void searchVehicles('');
  };

  const create = async () => {
    setCreateError(''); setCreateFieldErrors({});
    const f = createForm;
    if (customerMode === 'existing' && f.customerId == null) { setCreateError('Choose a customer'); return; }
    if (customerMode === 'new' && ![f.name, f.email, f.phone, f.homeAddress].every((v) => v.trim())) {
      setCreateError('Check required fields'); return;
    }
    if (creating) return;
    setCreating(true);
    try {
      await leadsApi.create({
        customerId: customerMode === 'existing' ? f.customerId : undefined,
        newCustomer: customerMode === 'new' ? { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), homeAddress: f.homeAddress.trim() } : undefined,
        vehicleId: f.vehicleId, ownerUsername: f.ownerUsername, nextFollowUpOn: f.nextFollowUpOn, note: f.note,
      });
      setCreateOpen(false); await load();
    } catch (e) {
      setCreateFieldErrors(fieldErrorsOf(e));
      setCreateError(mapWrite(e, 'save lead'));
    } finally { setCreating(false); }
  };

  const loadAudit = async (id: number, seq: number) => {
    try {
      const r = await auditApi.list({ entityType: 'LEAD', entityId: id });
      if (seq === detailSeq.current) setAudit(r.data.items || []);
    } catch { if (seq === detailSeq.current) setAudit([]); }
  };

  const fillEdit = (lead: any) => {
    setSelected(lead);
    setEdit({
      stage: lead.stage, ownerUsername: lead.ownerUsername ?? '',
      nextFollowUpOn: lead.nextFollowUpOn ?? '', vehicleId: lead.vehicle?.id,
      lostReason: lead.lostReason ?? '',
    });
    setVehicleOptions(lead.vehicle ? [lead.vehicle] : []);
  };

  const openDetail = async (id: number) => {
    const seq = ++detailSeq.current;
    setEditError(''); setNoteError(''); setNoteText(''); setAudit([]);
    try {
      const r = await leadsApi.get(id);
      if (seq !== detailSeq.current) return;
      fillEdit(r.data); setDetailOpen(true);
      await loadAudit(id, seq);
    } catch (e) {
      if (seq !== detailSeq.current) return;
      setDetailOpen(false);
      const missing = errorStatus(e) === 404 || errorCode(e) === 'NOT_FOUND';
      alert(missing ? 'Lead not found. It may have been deleted; refresh the list.' : describeError(e, 'load lead'));
    }
  };

  const saveDetail = async () => {
    if (!selected || saving) return;
    setEditError('');
    if (edit.stage === 'LOST' && !edit.lostReason.trim()) { setEditError('A lost lead needs a reason'); return; }
    setSaving(true);
    try {
      const r = await leadsApi.update(selected.id, {
        stage: edit.stage, ownerUsername: edit.ownerUsername || null,
        nextFollowUpOn: edit.nextFollowUpOn || null, vehicleId: edit.vehicleId ?? null,
        lostReason: edit.stage === 'LOST' ? edit.lostReason.trim() : null, version: selected.version,
      });
      fillEdit(r.data); await load(); await loadAudit(r.data.id, detailSeq.current);
    } catch (err) { setEditError(mapWrite(err, 'save lead')); }
    finally { setSaving(false); }
  };

  const addNote = async () => {
    const text = noteText.trim();
    if (!selected || !text || addingNote) return;
    setNoteError(''); setAddingNote(true);
    try {
      const r = await leadsApi.addNote(selected.id, text);
      setSelected((s: any) => ({ ...s, notes: [r.data, ...(s.notes || [])] }));
      setNoteText('');
      await loadAudit(selected.id, detailSeq.current);
    } catch (e) { setNoteError(mapWrite(e, 'add note')); }
    finally { setAddingNote(false); }
  };

  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (leadId) { const id = Number(leadId); if (Number.isFinite(id)) void openDetail(id); }
  }, [searchParams.get('leadId')]);

  const stageColor = (stage: string) => {
    if (stage === 'WON') return 'tag-success';
    if (stage === 'LOST') return 'tag-info';
    return '';
  };

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <div><h1>Leads</h1><span className="muted">Sales opportunities and follow-ups</span></div>
          <button className="btn btn-primary" onClick={openCreate}>Add lead</button>
        </div>
        <div className="filters">
          <input className="input" value={filters.q} placeholder="Customer name" aria-label="Customer name"
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && load(0)} />
          <select className="select" aria-label="Stage" value={filters.stage}
            onChange={(e) => setFilters((f) => ({ ...f, stage: e.target.value }))}>
            <option value="">Stage</option>
            {LEAD_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="select" aria-label="Owner" value={filters.owner}
            onChange={(e) => setFilters((f) => ({ ...f, owner: e.target.value }))}>
            <option value="">Owner</option>
            {owners.map((o) => <option key={o.username} value={o.username}>{memberLabel(o)}</option>)}
          </select>
          <label className="checkbox-label">
            <input type="checkbox" checked={filters.overdue}
              onChange={(e) => setFilters((f) => ({ ...f, overdue: e.target.checked }))} />
            Overdue only
          </label>
          <button className="btn" onClick={() => { setPage(0); load(0); }}>Search</button>
          <button className="btn" onClick={() => { setFilters({ q: '', stage: '', owner: '', overdue: false }); setPage(0); load(0, { q: '', stage: '', owner: '', overdue: false }); }}>Reset</button>
        </div>
        <PageState loading={loading} error={error} forbidden={forbidden}
          empty={!loading && !error && !forbidden && !rows.length}
          emptyText="No leads match." loadingText="Loading leads…"
          forbiddenText="You do not have access to leads.">
          <DataTable rows={rows} total={total} page={page} onPage={(p) => { setPage(p); }}
            columns={[
              { label: 'Customer', render: (r: any) => r.customerName },
              { label: 'Vehicle of interest', render: (r: any) => vehicleLabel(r.vehicle) },
              { label: 'Stage', width: '120px', render: (r: any) => <span className={`tag ${stageColor(r.stage)}`}>{stageLabel(r.stage)}</span> },
              { label: 'Owner', width: '140px', render: (r: any) => r.ownerUsername || '—' },
              { label: 'Next follow-up', width: '150px', render: (r: any) => (
                <><span className={r.overdue ? 'danger-text' : ''}>{r.nextFollowUpOn || '—'}</span>
                  {r.overdue && <span className="danger-text"> · Overdue</span>}</>
              )},
            ]}
            actions={(r: any) => <button className="btn-link" onClick={() => openDetail(r.id)}>Open</button>}
          />
        </PageState>
      </div>

      <FormDrawer title="Add lead" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="form-item" style={{ marginBottom: 16 }}>
          <label className="radio-label">
            <input type="radio" checked={customerMode === 'existing'} onChange={() => setCustomerMode('existing')} /> Existing customer
          </label>
          <label className="radio-label">
            <input type="radio" checked={customerMode === 'new'} onChange={() => setCustomerMode('new')} /> New customer
          </label>
        </div>
        {customerMode === 'existing' ? (
          <div className="form-item">
            <label className="form-label">Customer</label>
            <select className="select" value={createForm.customerId ?? ''}
              onChange={(e) => setCreateForm((f) => ({ ...f, customerId: e.target.value ? Number(e.target.value) : undefined }))}>
              <option value="">Select customer</option>
              {customerOptions.map((c: any) => <option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}
            </select>
            <input className="input" placeholder="Search customers" onChange={(e) => searchCustomers(e.target.value)} />
          </div>
        ) : (
          <>
            <div className="form-item"><label className="form-label">Name</label>
              <input className="input" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
              {createFieldErrors['newCustomer.name'] && <div className="form-error">{createFieldErrors['newCustomer.name']}</div>}
            </div>
            <div className="form-item"><label className="form-label">Email</label>
              <input className="input" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
              {createFieldErrors['newCustomer.email'] && <div className="form-error">{createFieldErrors['newCustomer.email']}</div>}
            </div>
            <div className="form-item"><label className="form-label">Phone</label>
              <input className="input" value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} />
              {createFieldErrors['newCustomer.phone'] && <div className="form-error">{createFieldErrors['newCustomer.phone']}</div>}
            </div>
            <div className="form-item"><label className="form-label">Home address</label>
              <input className="input" value={createForm.homeAddress} onChange={(e) => setCreateForm((f) => ({ ...f, homeAddress: e.target.value }))} />
              {createFieldErrors['newCustomer.homeAddress'] && <div className="form-error">{createFieldErrors['newCustomer.homeAddress']}</div>}
            </div>
          </>
        )}
        <div className="form-item"><label className="form-label">Vehicle of interest (in stock)</label>
          <select className="select" value={createForm.vehicleId ?? ''}
            onChange={(e) => setCreateForm((f) => ({ ...f, vehicleId: e.target.value ? Number(e.target.value) : undefined }))}>
            <option value="">None</option>
            {vehicleOptions.map((v: any) => <option key={v.id} value={v.id}>{vehicleLabel(v)} · {v.vin}</option>)}
          </select>
          <input className="input" placeholder="Search vehicles" onChange={(e) => searchVehicles(e.target.value)} />
        </div>
        <div className="form-item"><label className="form-label">Owner</label>
          <select className="select" value={createForm.ownerUsername}
            onChange={(e) => setCreateForm((f) => ({ ...f, ownerUsername: e.target.value }))}>
            <option value="">Unassigned</option>
            {owners.map((o) => <option key={o.username} value={o.username}>{memberLabel(o)}</option>)}
          </select>
        </div>
        <div className="form-item"><label className="form-label">Next follow-up</label>
          <input type="date" className="input" value={createForm.nextFollowUpOn}
            onChange={(e) => setCreateForm((f) => ({ ...f, nextFollowUpOn: e.target.value }))} />
        </div>
        <div className="form-item"><label className="form-label">First note</label>
          <textarea className="input" rows={3} maxLength={2000} value={createForm.note}
            onChange={(e) => setCreateForm((f) => ({ ...f, note: e.target.value }))} />
        </div>
        {createError && <p className="danger-text">{createError}</p>}
        <button className="btn btn-primary" disabled={creating} onClick={create}>{creating ? 'Saving…' : 'Save'}</button>
      </FormDrawer>

      <FormDrawer title="Lead" open={detailOpen} onClose={() => { detailSeq.current++; setDetailOpen(false); }}>
        {selected && (
          <>
            <p>
              <Link to={`/crm?customerId=${selected.customerId}`}>{selected.customerName}</Link>
              {selected.vehicle && (
                <span className="muted"> · <Link to={`/dms?vehicleId=${selected.vehicle.id}`}>{vehicleLabel(selected.vehicle)}</Link></span>
              )}
            </p>
            <div className="form-item"><label className="form-label">Stage</label>
              <select className="select" value={edit.stage} disabled={isClosedStage(selected.stage)}
                onChange={(e) => setEdit((ed) => ({ ...ed, stage: e.target.value as LeadStage }))}>
                {LEAD_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {edit.stage === 'LOST' && (
              <div className="form-item"><label className="form-label">Lost reason</label>
                <input className="input" value={edit.lostReason} disabled={isClosedStage(selected.stage)} maxLength={300}
                  onChange={(e) => setEdit((ed) => ({ ...ed, lostReason: e.target.value }))} />
              </div>
            )}
            <div className="form-item"><label className="form-label">Owner</label>
              <select className="select" value={edit.ownerUsername} disabled={isClosedStage(selected.stage)}
                onChange={(e) => setEdit((ed) => ({ ...ed, ownerUsername: e.target.value }))}>
                <option value="">Unassigned</option>
                {owners.map((o) => <option key={o.username} value={o.username}>{memberLabel(o)}</option>)}
              </select>
            </div>
            <div className="form-item"><label className="form-label">Next follow-up</label>
              <input type="date" className="input" value={edit.nextFollowUpOn} disabled={isClosedStage(selected.stage)}
                onChange={(e) => setEdit((ed) => ({ ...ed, nextFollowUpOn: e.target.value }))} />
            </div>
            <div className="form-item"><label className="form-label">Vehicle of interest (in stock)</label>
              <select className="select" value={edit.vehicleId ?? ''} disabled={isClosedStage(selected.stage)}
                onChange={(e) => setEdit((ed) => ({ ...ed, vehicleId: e.target.value ? Number(e.target.value) : undefined }))}>
                <option value="">None</option>
                {vehicleOptions.map((v: any) => <option key={v.id} value={v.id}>{vehicleLabel(v)} · {v.vin}</option>)}
              </select>
              {!isClosedStage(selected.stage) && (
                <input className="input" placeholder="Search vehicles" style={{ marginTop: 4 }}
                  onChange={(e) => searchVehicles(e.target.value)} />
              )}
            </div>
            {isClosedStage(selected.stage) && <p className="muted">This lead is closed. You can still add notes.</p>}
            {editError && <p className="danger-text">{editError}</p>}
            {!isClosedStage(selected.stage) && (
              <button className="btn btn-primary" disabled={saving} onClick={saveDetail}>{saving ? 'Saving…' : 'Save'}</button>
            )}

            <hr className="divider" />
            <div className="muted">Notes</div>
            <textarea className="input" rows={3} maxLength={2000} placeholder="Add a follow-up note"
              value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            <button className="btn" style={{ marginTop: 8 }} disabled={!noteText.trim() || addingNote} onClick={addNote}>
              {addingNote ? 'Adding…' : 'Add note'}
            </button>
            {noteError && <p className="danger-text">{noteError}</p>}
            {!(selected.notes || []).length && <p className="muted">No notes yet.</p>}
            {(selected.notes || []).map((n: any) => (
              <div key={n.id} className="lead-note">
                <div className="muted">{n.authorUsername} · {n.createdAt}</div>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{n.body}</div>
              </div>
            ))}

            <AuditTrail rows={audit} />
          </>
        )}
      </FormDrawer>
    </AppLayout>
  );
}
