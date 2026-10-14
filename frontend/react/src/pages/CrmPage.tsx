import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DataTable from '../components/DataTable';
import FormDrawer from '../components/FormDrawer';
import PageState from '../components/PageState';
import ConfirmDialog from '../components/ConfirmDialog';
import AuditTrail from '../components/AuditTrail';
import { customersApi } from '../api/customers';
import { vehiclesApi, errorCode, errorStatus } from '../api/vehicles';
import { auditApi } from '../api/audit';
import { leadsApi, stageLabel } from '../api/leads';
import { fieldErrorsOf, messageOf } from '../api/http';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const PHONE_PATTERN = /^(?=(?:\D*\d){7,20}\D*$)[0-9+\-() ]+$/;

interface CustomerForm {
  name: string; email: string; phone: string; homeAddress: string;
}

function blankForm(): CustomerForm {
  return { name: '', email: '', phone: '', homeAddress: '' };
}

function linkedLabel(v: any) {
  if (!v) return '—';
  return `${v.modelYear} ${v.make} ${v.model}`;
}

type Validation = Record<string, string>;

function validateCustomer(form: CustomerForm): Validation {
  const e: Validation = {};
  if (!form.name.trim()) e.name = 'Check required fields';
  else if (form.name.length > 100) e.name = 'At most 100 characters';
  if (!form.email.trim()) e.email = 'Check required fields';
  else if (!EMAIL_PATTERN.test(form.email)) e.email = 'Enter a valid email';
  else if (form.email.length > 254) e.email = 'At most 254 characters';
  if (!form.phone.trim()) e.phone = 'Check required fields';
  else if (!PHONE_PATTERN.test(form.phone)) e.phone = 'Use 7 to 20 digits; only + - ( ) and spaces are allowed';
  else if (form.phone.length > 40) e.phone = 'At most 40 characters';
  if (!form.homeAddress.trim()) e.homeAddress = 'Check required fields';
  else if (form.homeAddress.length > 300) e.homeAddress = 'At most 300 characters';
  return e;
}

function mapCustomerWrite(e: unknown) {
  const code = errorCode(e);
  const status = errorStatus(e);
  if (code === 'VALIDATION') return messageOf(e, 'Check required fields');
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry';
  if (status === 404 || code === 'NOT_FOUND') return 'Customer not found';
  return 'Could not save customer.';
}

function mapLink(e: unknown) {
  const code = errorCode(e);
  const status = errorStatus(e);
  if (code === 'VEHICLE_ALREADY_LINKED') return 'Vehicle already linked';
  if (code === 'WRONG_DEALER_OR_SOLD') return 'Vehicle not available';
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found';
  return 'Could not link vehicle.';
}

function mapUnlink(e: unknown) {
  const code = errorCode(e);
  const status = errorStatus(e);
  if (code === 'SOLD_LOCKED') return 'Sold vehicles cannot be unlinked';
  if (status === 404 || code === 'NOT_FOUND') return 'Link not found';
  return 'Could not unlink vehicle.';
}

const CUSTOMER_FIELDS: { key: keyof CustomerForm; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'homeAddress', label: 'Home address' },
];

export default function CrmPage() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [filters, setFilters] = useState({ q: '', linked: '' });

  const [drawer, setDrawer] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<CustomerForm>(blankForm());
  const [formError, setFormError] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const [validationErrors, setValidationErrors] = useState<Validation>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [linkId, setLinkId] = useState<number | undefined>();
  const [linkError, setLinkError] = useState('');
  const [customerLeads, setCustomerLeads] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [unlinkVehicleId, setUnlinkVehicleId] = useState<number | null>(null);

  const listSeqRef = useRef(0);
  const editSeqRef = useRef(0);
  const deepLinkHandled = useRef(false);

  const load = useCallback(async (p?: number) => {
    const seq = ++listSeqRef.current;
    const usePage = p ?? page;
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const r = await customersApi.list({ ...filters, page: usePage, size: 10 });
      if (seq !== listSeqRef.current) return;
      setRows(r.data.items || []);
      setTotal(r.data.total || 0);
    } catch (e) {
      if (seq !== listSeqRef.current) return;
      if (errorStatus(e) === 403 || errorCode(e) === 'FORBIDDEN') setForbidden(true);
      else setError('Could not load customers.');
      setRows([]);
    } finally {
      if (seq === listSeqRef.current) setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (deepLinkHandled.current) return;
    const customerId = searchParams.get('customerId');
    if (customerId) {
      deepLinkHandled.current = true;
      const id = Number(customerId);
      if (Number.isFinite(id)) void openEdit(id);
    }
  }, [searchParams]);

  async function collectAllPages(loadPage: (p: number, size: number) => Promise<{ data: { items?: any[]; total?: number } }>) {
    const collected: any[] = [];
    let pageIndex = 0;
    let totalCount = Infinity;
    while (collected.length < totalCount) {
      const r = await loadPage(pageIndex, 10);
      const items = r.data.items || [];
      totalCount = Number(r.data.total) || 0;
      collected.push(...items);
      if (!items.length) break;
      pageIndex++;
    }
    return collected;
  }

  async function loadLinkOptions(seq: number) {
    try {
      const all = await collectAllPages((p, size) => vehiclesApi.list({ page: p, size }));
      if (seq !== editSeqRef.current) return;
      setVehicles(all.filter((x: any) => !x.linkedCustomer));
    } catch {
      if (seq !== editSeqRef.current) return;
      setVehicles([]);
    }
  }

  async function loadCustomerLeads(id: number, seq: number) {
    try {
      const r = await leadsApi.list({ customerId: id, size: 10 });
      if (seq === editSeqRef.current) setCustomerLeads(r.data.items || []);
    } catch {
      if (seq === editSeqRef.current) setCustomerLeads([]);
    }
  }

  async function loadAudit(id: number, seq: number) {
    try {
      const r = await auditApi.list({ entityType: 'CUSTOMER', entityId: id });
      if (seq !== editSeqRef.current) return;
      setAudit(r.data.items || []);
    } catch {
      if (seq !== editSeqRef.current) return;
      setAudit([]);
    }
  }

  function openCreate() {
    editSeqRef.current++;
    setSelected(null);
    setForm(blankForm());
    setFormError('');
    setEmailWarning('');
    setValidationErrors({});
    setServerErrors({});
    setLinkError('');
    setAudit([]);
    setVehicles([]);
    setLinkId(undefined);
    setCustomerLeads([]);
    setDrawer(true);
  }

  async function openEdit(id: number) {
    const seq = ++editSeqRef.current;
    setFormError('');
    setEmailWarning('');
    setValidationErrors({});
    setServerErrors({});
    setLinkError('');
    setAudit([]);
    setCustomerLeads([]);
    try {
      const r = await customersApi.get(id);
      if (seq !== editSeqRef.current) return;
      setSelected(r.data);
      setForm({ name: r.data.name ?? '', email: r.data.email ?? '', phone: r.data.phone ?? '', homeAddress: r.data.homeAddress ?? '' });
      setDrawer(true);
      loadLinkOptions(seq);
      loadCustomerLeads(id, seq);
      loadAudit(id, seq);
    } catch (e) {
      if (seq !== editSeqRef.current) return;
      setSelected(null);
      setForm(blankForm());
      setDrawer(false);
      const missing = errorStatus(e) === 404 || errorCode(e) === 'NOT_FOUND';
      setError(missing ? 'Customer not found' : 'Could not load customer.');
    }
  }

  async function checkSharedEmail() {
    const email = form.email.trim().toLowerCase();
    setEmailWarning('');
    if (!EMAIL_PATTERN.test(email)) return;
    try {
      const r = await customersApi.list({ q: email });
      const shared = (r.data.items || []).some(
        (c: { id: number; email?: string }) => c.email?.toLowerCase() === email && c.id !== selected?.id,
      );
      if (shared && form.email.trim().toLowerCase() === email) {
        setEmailWarning('Another customer at this dealership already uses this email. You can still save.');
      }
    } catch { /* advisory */ }
  }

  async function save() {
    setFormError('');
    setServerErrors({});
    const errors = validateCustomer(form);
    setValidationErrors(errors);
    if (Object.keys(errors).length || saving) return;

    setSaving(true);
    await checkSharedEmail();
    try {
      if (selected) {
        const saved = await customersApi.update(selected.id, { ...form, version: selected.version });
        setSelected({ ...selected, ...saved.data });
        await load();
        await openEdit(selected.id);
      } else {
        await customersApi.create(form);
        setDrawer(false);
        await load();
      }
    } catch (e) {
      if (errorCode(e) === 'VALIDATION') setServerErrors(fieldErrorsOf(e));
      setFormError(mapCustomerWrite(e));
    } finally {
      setSaving(false);
    }
  }

  async function link() {
    if (linkId === undefined || !selected) return;
    setLinkError('');
    try {
      await customersApi.link(selected.id, linkId);
      setLinkId(undefined);
      await load();
      await openEdit(selected.id);
    } catch (e) {
      setLinkError(mapLink(e));
    }
  }

  function requestUnlink(vehicleId: number) {
    setUnlinkVehicleId(vehicleId);
    setConfirmVisible(true);
  }

  async function unlink() {
    const vehicleId = unlinkVehicleId;
    const customerId = selected?.id;
    setConfirmVisible(false);
    setUnlinkVehicleId(null);
    if (vehicleId == null || !customerId) return;
    setLinkError('');
    try {
      await customersApi.unlink(customerId, vehicleId);
      await load();
      await openEdit(customerId);
    } catch (e) {
      setLinkError(mapUnlink(e));
    }
  }

  const updateForm = (key: keyof CustomerForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'linkedVehicle', label: 'Linked vehicle', render: (row: any) => linkedLabel(row.linkedVehicle) },
    { key: 'linkedVehicleCount', label: 'Vehicles purchased' },
  ];

  const actions = (row: any) => (
    <button className="btn-link" onClick={() => openEdit(row.id)}>Edit</button>
  );

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>CRM</h1>
            <span className="muted">Customers and linked vehicles</span>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>Add customer</button>
        </div>
        <div className="filters">
          <input className="form-input" placeholder="Name / Email / Phone" value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
          <select className="form-select" value={filters.linked} onChange={e => setFilters(f => ({ ...f, linked: e.target.value }))}>
            <option value="">Linked</option>
            <option value="true">Linked</option>
            <option value="false">Not linked</option>
          </select>
          <button className="btn" onClick={() => { setPage(0); void load(0); }}>Search</button>
          <button className="btn" onClick={() => { setFilters({ q: '', linked: '' }); setPage(0); }}>Reset</button>
        </div>
        <PageState loading={loading} error={error} forbidden={forbidden} empty={!loading && !error && !forbidden && !rows.length}
          emptyText="No customers match." loadingText="Loading customers…" forbiddenText="You do not have access to CRM.">
          <DataTable rows={rows} total={total} page={page} columns={columns} actions={actions}
            onPage={p => { setPage(p); void load(p); }} />
        </PageState>
      </div>

      <FormDrawer title="Customer" open={drawer} onClose={() => { editSeqRef.current++; setDrawer(false); }}>
        <form onSubmit={e => { e.preventDefault(); void save(); }}>
          {CUSTOMER_FIELDS.map(field => (
            <div className="form-item" key={field.key}>
              <label>{field.label}</label>
              <input
                className="form-input"
                value={form[field.key]}
                onChange={e => updateForm(field.key, e.target.value)}
                onBlur={field.key === 'email' ? checkSharedEmail : undefined}
              />
              {(validationErrors[field.key] || serverErrors[field.key]) && (
                <span className="danger-text" style={{ fontSize: 12 }}>{validationErrors[field.key] || serverErrors[field.key]}</span>
              )}
            </div>
          ))}
          {emailWarning && <p className="warning-text">{emailWarning}</p>}
          {formError && <p className="danger-text">{formError}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </form>

        {selected && (
          <>
            <hr />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="form-select" value={linkId ?? ''} onChange={e => setLinkId(e.target.value ? Number(e.target.value) : undefined)} style={{ flex: 1 }}>
                <option value="">Link vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{`${linkedLabel(v)} · ${v.vin}`}</option>)}
              </select>
              <button className="btn" type="button" onClick={link}>Link vehicle</button>
            </div>
            {linkError && <p className="danger-text">{linkError}</p>}

            {(selected.linkedVehicles || []).map((v: any) => (
              <div key={v.id} style={{ marginTop: 12 }}>
                <Link to={`/dms?vehicleId=${v.id}`}>{linkedLabel(v)}</Link>
                <span className="muted"> · {v.vin} · {v.status === 'SOLD' ? 'Sold' : 'In stock'}</span>
                {v.status !== 'SOLD' ? (
                  <button className="btn-link danger" onClick={() => requestUnlink(v.id)}>Unlink</button>
                ) : (
                  <span className="muted"> Sold vehicles cannot be unlinked</span>
                )}
              </div>
            ))}

            <hr />
            <div className="muted">Leads</div>
            {!customerLeads.length && <p className="muted">No leads for this customer.</p>}
            {customerLeads.map(l => (
              <div key={l.id} style={{ marginTop: 8 }}>
                <Link to={`/leads?leadId=${l.id}`}>
                  {stageLabel(l.stage)} · {l.vehicle ? linkedLabel(l.vehicle) : 'No vehicle'}
                </Link>
                <span className="muted"> · Follow-up {l.nextFollowUpOn || '—'}</span>
              </div>
            ))}

            <AuditTrail rows={audit} />
          </>
        )}
      </FormDrawer>

      <ConfirmDialog open={confirmVisible} title="Unlink vehicle" message="Remove this vehicle link?"
        onCancel={() => { setConfirmVisible(false); setUnlinkVehicleId(null); }} onConfirm={unlink} />
    </AppLayout>
  );
}
