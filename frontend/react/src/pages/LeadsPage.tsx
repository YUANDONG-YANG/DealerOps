import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DataTable from '../components/DataTable';
import FormDrawer from '../components/FormDrawer';
import { useFormBaseline } from '../components/unsavedChanges';
import PageState from '../components/PageState';
import AuditTrail from '../components/AuditTrail';
import { codeOf, fieldErrorsOf, messageOf, statusOf } from '../api/http';
import { customersApi, duplicateCustomerMessage } from '../api/customers';
import ConfirmDialog from '../components/ConfirmDialog';
import { vehiclesApi } from '../api/vehicles';
import { auditApi } from '../api/audit';
import { LEAD_STAGES, isClosedStage, leadsApi, stageLabel, type LeadStage } from '../api/leads';
import { memberLabel, membersApi, type MemberOption } from '../api/members';
import { describeError } from '../api/errors';
import { dateTimeLocal } from '../format';
import { isTeamAdmin, useSessionStore } from '../store/session';
import SearchSuggest, { SUGGEST_LIMIT, uniqueSuggestions } from '../components/SearchSuggest';
import { sortParam, type SortState } from '../components/TableSort';

function vehicleLabel(v: Record<string, unknown> | null | undefined) {
  if (!v) return 'None';
  return `${v.modelYear} ${v.make} ${v.model}`;
}

function mapWrite(e: unknown, fallback: string) {
  const code = codeOf(e);
  if (code === 'VALIDATION') return messageOf(e, 'Check required fields: some fields are missing or invalid.');
  // Reopen sends its own wording for a vehicle that has since been sold, so the server message wins.
  if (code === 'WRONG_DEALER_OR_SOLD') return messageOf(e, 'Vehicle must be in stock at this dealership. Pick a vehicle that is not sold.');
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry: someone else changed this record after you opened it. Reopen it to load the latest version, then make your change again.';
  if (code === 'LEAD_CLOSED') return messageOf(e, 'Won and lost leads cannot be changed. Reopen the lead first.');
  if (code === 'LEAD_DUPLICATE') return 'This customer already has an open lead for this vehicle. Open that lead instead of adding another.';
  if (statusOf(e) === 404 || code === 'NOT_FOUND') return 'Lead not found';
  return describeError(e, fallback);
}

// Text filters reload the list once typing pauses, like the DMS and CRM lists (L2).
const FILTER_DEBOUNCE_MS = 300;
const BLANK_FILTERS = { q: '', vehicle: '', stage: '', owner: '', overdue: false };
const OPEN_STAGES = LEAD_STAGES.filter((s) => !isClosedStage(s.value));

const suggestCustomers = async (q: string) =>
  ((await customersApi.list({ q, size: SUGGEST_LIMIT })).data.items || [])
    .map((c: any) => ({ value: String(c.id), label: c.name, hint: c.email }));

const suggestVehicles = async (q: string) =>
  ((await vehiclesApi.list({ q, status: 'IN_STOCK', size: SUGGEST_LIMIT })).data.items || [])
    .map((v: any) => ({ value: String(v.id), label: vehicleLabel(v), hint: v.vin }));

/** Sales leads: filter the list, create a lead, and update its stage, owner, vehicle, and notes. */
export default function LeadsPage() {
  // Record history is for the owner and managers (AUD-17); a sales member never calls the audit API.
  const session = useSessionStore();
  const canManage = isTeamAdmin(session.dealerRole);
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  // Server-side sort across all pages (CR-012); null is newest first.
  const [sort, setSort] = useState<SortState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [filters, setFilters] = useState(BLANK_FILTERS);
  // Filters of the last list request, so the debounce does not reload what is already shown.
  const loadedFilters = useRef('');
  const [owners, setOwners] = useState<MemberOption[]>([]);
  const [ownersError, setOwnersError] = useState('');
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
  const createBaseline = useFormBaseline({ ...createForm, customerMode });
  const [duplicateMessage, setDuplicateMessage] = useState('');
  // Text shown in the Customer and Vehicle of interest pickers (L3); the picked ids live in the forms.
  const [customerText, setCustomerText] = useState('');
  const [vehicleText, setVehicleText] = useState('');
  const [editVehicleText, setEditVehicleText] = useState('');

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [edit, setEdit] = useState({
    stage: 'NEW' as LeadStage, ownerUsername: '', nextFollowUpOn: '',
    vehicleId: undefined as number | undefined, lostReason: '',
  });
  const editBaseline = useFormBaseline(edit);
  // Won and lost are final, so closing a lead asks first.
  const [confirmClose, setConfirmClose] = useState(false);
  const [reopenStage, setReopenStage] = useState<LeadStage>('CONTACTED');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  // Success line after a save: in the Lead drawer after an edit, on the page after an add closes its drawer.
  const [saveNotice, setSaveNotice] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [audit, setAudit] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  // Server-side sort of the whole record history (CR-020); null is newest first.
  const [auditSort, setAuditSort] = useState<SortState | null>(null);

  const load = useCallback(async (p = page, f = filters) => {
    const seq = ++listSeq.current;
    loadedFilters.current = JSON.stringify(f);
    setLoading(true); setError(''); setForbidden(false);
    try {
      const r = await leadsApi.list({ ...f, sort: sortParam(sort), page: p, size: 10 });
      if (seq !== listSeq.current) return;
      setRows(r.data.items || []); setTotal(r.data.totalElements || 0);
    } catch (e) {
      if (seq !== listSeq.current) return;
      if (statusOf(e) === 403 || codeOf(e) === 'FORBIDDEN') setForbidden(true);
      else setError(describeError(e, 'load leads'));
      setRows([]);
    } finally {
      if (seq === listSeq.current) setLoading(false);
    }
  }, [page, filters, sort]);

  useEffect(() => { void load(); }, [page, sort]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(filters) === loadedFilters.current) return;
      setPage(0); void load(0, filters);
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.q, filters.vehicle]);
  useEffect(() => {
    membersApi.list()
      .then((r) => setOwners(r.data || []))
      .catch((e) => setOwnersError(describeError(e, 'load owners')));
  }, []);

  // `customer` preselects an existing customer, as the CRM "New lead" action does (CR R2).
  const openCreate = (customer?: { id: number; name: string; email: string }) => {
    const blank = {
      customerId: customer?.id, name: '', email: '', phone: '', homeAddress: '',
      // The creator owns a new lead by default and can change it (L1).
      vehicleId: undefined, ownerUsername: session.username, nextFollowUpOn: '', note: '',
    };
    setCreateForm(blank);
    setCustomerMode('existing');
    createBaseline.reset({ ...blank, customerMode: 'existing' });
    setCreateError(''); setCreateFieldErrors({}); setSaveNotice(''); setCreateOpen(true);
    setCustomerText(customer?.name ?? ''); setVehicleText('');
  };

  const create = async () => {
    setCreateError(''); setCreateFieldErrors({});
    const f = createForm;
    if (customerMode === 'existing' && f.customerId == null) { setCreateError('Choose a customer'); return; }
    if (customerMode === 'new' && ![f.name, f.email, f.phone, f.homeAddress].every((v) => v.trim())) {
      setCreateError('Check required fields'); return;
    }
    if (creating) return;
    if (customerMode === 'new') {
      // Customer fields are not unique (CR R4): a match asks for confirmation first.
      setCreating(true);
      try {
        const { data } = await customersApi.duplicates({
          name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), homeAddress: f.homeAddress.trim(),
        });
        if (data.fields.length) { setDuplicateMessage(duplicateCustomerMessage(data.fields)); return; }
      } catch (e) {
        setCreateError(describeError(e, 'check for duplicate customers')); return;
      } finally { setCreating(false); }
    }
    await submitCreate();
  };

  const submitCreate = async () => {
    const f = createForm;
    setDuplicateMessage('');
    if (creating) return;
    setCreating(true);
    try {
      await leadsApi.create({
        customerId: customerMode === 'existing' ? f.customerId : undefined,
        newCustomer: customerMode === 'new' ? { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), homeAddress: f.homeAddress.trim() } : undefined,
        vehicleId: f.vehicleId, ownerUsername: f.ownerUsername, nextFollowUpOn: f.nextFollowUpOn, note: f.note,
      });
      setCreateOpen(false); setSaveNotice('Lead added.'); await load();
    } catch (e) {
      setCreateFieldErrors(fieldErrorsOf(e));
      setCreateError(mapWrite(e, 'save lead'));
    } finally { setCreating(false); }
  };

  const loadAudit = async (id: number, seq: number, page = 0, sort = auditSort) => {
    if (!canManage) return;
    try {
      const r = await auditApi.list({ entityType: 'LEAD', entityId: id, page, size: 10, sort: sortParam(sort) });
      if (seq !== detailSeq.current) return;
      setAudit(r.data.items || []);
      setAuditPage(r.data.page ?? page);
      setAuditTotal(r.data.totalElements ?? 0);
    } catch {
      if (seq !== detailSeq.current) return;
      setAudit([]);
      setAuditTotal(0);
    }
  };

  const fillEdit = (lead: any) => {
    setSelected(lead);
    const loaded = {
      stage: lead.stage as LeadStage, ownerUsername: lead.ownerUsername ?? '',
      nextFollowUpOn: lead.nextFollowUpOn ?? '', vehicleId: lead.vehicle?.id as number | undefined,
      lostReason: lead.lostReason ?? '',
    };
    setEdit(loaded);
    editBaseline.reset(loaded);
    setEditVehicleText(lead.vehicle ? vehicleLabel(lead.vehicle) : '');
    setReopenStage('CONTACTED');
  };

  const openDetail = async (id: number) => {
    const seq = ++detailSeq.current;
    setEditError(''); setSaveNotice(''); setNoteError(''); setNoteText(''); setAudit([]); setAuditTotal(0);
    try {
      const r = await leadsApi.get(id);
      if (seq !== detailSeq.current) return;
      fillEdit(r.data); setDetailOpen(true);
      await loadAudit(id, seq);
    } catch (e) {
      if (seq !== detailSeq.current) return;
      setDetailOpen(false);
      const missing = statusOf(e) === 404 || codeOf(e) === 'NOT_FOUND';
      alert(missing ? 'Lead not found. It may have been deleted; refresh the list.' : describeError(e, 'load lead'));
    }
  };

  const saveDetail = async () => {
    if (!selected || saving) return;
    setEditError(''); setSaveNotice('');
    if (edit.stage === 'LOST' && !edit.lostReason.trim()) { setEditError('A lost lead needs a reason'); return; }
    if (isClosedStage(edit.stage) && !confirmClose) { setConfirmClose(true); return; }
    setConfirmClose(false);
    setSaving(true);
    try {
      const r = await leadsApi.update(selected.id, {
        stage: edit.stage, ownerUsername: edit.ownerUsername || null,
        nextFollowUpOn: edit.nextFollowUpOn || null, vehicleId: edit.vehicleId ?? null,
        lostReason: edit.stage === 'LOST' ? edit.lostReason.trim() : null, version: selected.version,
      });
      fillEdit(r.data); setSaveNotice('Lead saved.'); await load(); await loadAudit(r.data.id, detailSeq.current);
    } catch (err) { setEditError(mapWrite(err, 'save lead')); }
    finally { setSaving(false); }
  };

  const reopen = async () => {
    if (!selected || saving) return;
    setEditError(''); setSaving(true);
    try {
      const r = await leadsApi.reopen(selected.id, reopenStage, selected.version);
      fillEdit(r.data); await load(); await loadAudit(r.data.id, detailSeq.current);
    } catch (err) { setEditError(mapWrite(err, 'reopen lead')); }
    finally { setSaving(false); }
  };

  const addNote = async () => {
    const text = noteText.trim();
    if (!selected || !text || addingNote) return;
    setNoteError(''); setAddingNote(true);
    try {
      const r = await leadsApi.addNote(selected.id, text);
      // Notes are listed newest first, as the API returns them.
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

  // /leads?newLeadFor=<customerId> opens "Add lead" for that customer (CR R2).
  useEffect(() => {
    const customerId = Number(searchParams.get('newLeadFor'));
    if (!customerId) return;
    customersApi.get(customerId)
      .then((r) => openCreate(r.data))
      .catch((e) => alert(describeError(e, 'load customer')));
  }, [searchParams.get('newLeadFor')]);

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
          <button className="btn btn-primary" onClick={() => openCreate()}>Add lead</button>
        </div>
        <div className="filters">
          <SearchSuggest value={filters.q} placeholder="Customer name" ariaLabel="Customer name"
            onChange={(v) => setFilters((f) => ({ ...f, q: v }))}
            suggest={async (q) => {
              const r = await leadsApi.list({ ...filters, q, size: SUGGEST_LIMIT });
              return uniqueSuggestions((r.data.items || []).map((l: any) => ({ value: l.customerName, label: l.customerName })));
            }}
            onPick={(s) => { const next = { ...filters, q: s.value }; setFilters(next); setPage(0); load(0, next); }}
            onEnter={() => { setPage(0); load(0); }} />
          <SearchSuggest value={filters.vehicle} placeholder="Vehicle" ariaLabel="Vehicle"
            onChange={(v) => setFilters((f) => ({ ...f, vehicle: v }))}
            suggest={async (vehicle) => {
              const r = await leadsApi.list({ ...filters, vehicle, size: SUGGEST_LIMIT });
              return uniqueSuggestions((r.data.items || []).filter((l: any) => l.vehicle)
                .map((l: any) => ({ value: vehicleLabel(l.vehicle), label: vehicleLabel(l.vehicle) })));
            }}
            onPick={(s) => { const next = { ...filters, vehicle: s.value }; setFilters(next); setPage(0); load(0, next); }}
            onEnter={() => { setPage(0); load(0); }} />
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
          <button className="btn" onClick={() => { setFilters(BLANK_FILTERS); setPage(0); load(0, BLANK_FILTERS); }}>Reset</button>
        </div>
        {ownersError && <p className="warning-text">{ownersError}</p>}
        {saveNotice && !createOpen && !detailOpen && <p className="success-text" role="status">{saveNotice}</p>}
        <PageState loading={loading} error={error} forbidden={forbidden}
          empty={!loading && !error && !forbidden && !rows.length}
          emptyText="No leads match." loadingText="Loading leads…"
          forbiddenText="You do not have access to leads.">
          <DataTable rows={rows} total={total} page={page} onPage={(p) => { setPage(p); }}
            sort={sort} onSort={(key, dir) => { setSort({ key, dir }); setPage(0); }}
            columns={[
              { key: 'customerName', label: 'Customer', sortable: true, render: (r: any) => r.customerName },
              { key: 'vehicle', label: 'Vehicle of interest', sortable: true, render: (r: any) => vehicleLabel(r.vehicle) },
              { key: 'stage', label: 'Stage', width: '120px', sortable: true, render: (r: any) => <span className={`tag ${stageColor(r.stage)}`}>{stageLabel(r.stage)}</span> },
              { key: 'ownerUsername', label: 'Owner', width: '140px', sortable: true, render: (r: any) => r.ownerUsername || <span className="muted">Unassigned</span> },
              // A won or lost lead is final and never overdue (LEAD-03, LEAD-06), so its stored date is not shown.
              { key: 'nextFollowUpOn', label: 'Next follow-up', width: '150px', sortable: true, render: (r: any) => isClosedStage(r.stage)
                ? <span className="muted">Not needed</span>
                : !r.nextFollowUpOn ? <span className="muted">Not scheduled</span>
                : <><span className={r.overdue ? 'danger-text' : ''}>{r.nextFollowUpOn}</span>
                  {r.overdue && <span className="danger-text"> · Overdue</span>}</>
              },
            ]}
            actions={(r: any) => <button className="btn-link" onClick={() => openDetail(r.id)}>Open</button>}
          />
        </PageState>
      </div>

      <FormDrawer title="Add lead" open={createOpen} dirty={createBaseline.dirty} onClose={() => setCreateOpen(false)}>
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
            <SearchSuggest value={customerText} placeholder="Search customers" ariaLabel="Customer"
              onChange={(v) => { setCustomerText(v); setCreateForm((f) => ({ ...f, customerId: undefined })); }}
              suggest={suggestCustomers}
              onPick={(s) => { setCustomerText(s.label); setCreateForm((f) => ({ ...f, customerId: Number(s.value) })); }} />
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
          <SearchSuggest value={vehicleText} placeholder="Search vehicles (blank for none)" ariaLabel="Vehicle of interest"
            onChange={(v) => { setVehicleText(v); setCreateForm((f) => ({ ...f, vehicleId: undefined })); }}
            suggest={suggestVehicles}
            onPick={(s) => { setVehicleText(s.label); setCreateForm((f) => ({ ...f, vehicleId: Number(s.value) })); }} />
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

      <FormDrawer title="Lead" open={detailOpen} dirty={editBaseline.dirty || noteText.trim() !== ''} onClose={() => { detailSeq.current++; setDetailOpen(false); }}>
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
              {isClosedStage(selected.stage) ? (
                <input className="input" aria-label="Vehicle of interest" value={editVehicleText || 'None'} disabled />
              ) : (
                <SearchSuggest value={editVehicleText} placeholder="Search vehicles (blank for none)" ariaLabel="Vehicle of interest"
                  onChange={(v) => { setEditVehicleText(v); setEdit((ed) => ({ ...ed, vehicleId: undefined })); }}
                  suggest={suggestVehicles}
                  onPick={(s) => { setEditVehicleText(s.label); setEdit((ed) => ({ ...ed, vehicleId: Number(s.value) })); }} />
              )}
            </div>
            {isClosedStage(selected.stage) && (
              <>
                <p className="muted">This lead is closed. Reopen it to change it; you can still add notes.</p>
                {/* L4: a closed lead goes back to an open stage; the server checks the sale (D7). */}
                <div className="form-item"><label className="form-label">Reopen as</label>
                  <select className="select" aria-label="Reopen as" value={reopenStage}
                    onChange={(e) => setReopenStage(e.target.value as LeadStage)}>
                    {OPEN_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <button className="btn" disabled={saving} onClick={reopen}>{saving ? 'Reopening…' : 'Reopen lead'}</button>
              </>
            )}
            {editError && <p className="danger-text">{editError}</p>}
            {saveNotice && !editBaseline.dirty && <p className="success-text" role="status">{saveNotice}</p>}
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
                <div className="muted">{n.authorUsername} · {dateTimeLocal(n.createdAt)}</div>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{n.body}</div>
              </div>
            ))}

            {canManage && (
              <AuditTrail
                rows={audit}
                page={auditPage}
                total={auditTotal}
                onPage={(p) => selected && void loadAudit(selected.id, detailSeq.current, p)}
                sort={auditSort}
                onSort={(s) => { setAuditSort(s); if (selected) void loadAudit(selected.id, detailSeq.current, 0, s); }}
              />
            )}
          </>
        )}
      </FormDrawer>
      <ConfirmDialog open={!!duplicateMessage} title="Possible duplicate customer" message={duplicateMessage}
        confirmLabel="Create anyway"
        onCancel={() => setDuplicateMessage('')} onConfirm={() => void submitCreate()} />
      <ConfirmDialog open={confirmClose} title="Close lead"
        message={`Close this lead as ${stageLabel(edit.stage)}? Won and lost leads are locked until someone reopens them.`}
        confirmLabel="Close lead"
        onCancel={() => setConfirmClose(false)} onConfirm={() => void saveDetail()} />
    </AppLayout>
  );
}
