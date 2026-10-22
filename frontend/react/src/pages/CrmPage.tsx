import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DataTable from '../components/DataTable';
import FormDrawer from '../components/FormDrawer';
import PageState from '../components/PageState';
import ConfirmDialog from '../components/ConfirmDialog';
import AuditTrail from '../components/AuditTrail';
import { customersApi } from '../api/customers';
import { vehiclesApi } from '../api/vehicles';
import { auditApi } from '../api/audit';
import { isClosedStage, leadsApi, stageLabel } from '../api/leads';
import { codeOf, collectAllPages, fieldErrorsOf, messageOf, statusOf } from '../api/http';
import { describeError } from '../api/errors';
import { enumLabel } from '../format';
import { useSessionStore } from '../store/session';
import SearchSuggest, { SUGGEST_LIMIT } from '../components/SearchSuggest';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const PHONE_PATTERN = /^(?=(?:\D*\d){7,20}\D*$)[0-9+\-() ]+$/;
const SEARCH_DEBOUNCE_MS = 300;
// 100 is the largest page size the API accepts.
const LINK_OPTION_PAGE_SIZE = 100;

interface CustomerForm {
  name: string; email: string; phone: string; homeAddress: string;
}

function blankForm(): CustomerForm {
  return { name: '', email: '', phone: '', homeAddress: '' };
}

function linkedLabel(v: any) {
  return `${v.modelYear} ${v.make} ${v.model}`;
}

function vehicleOptionLabel(v: any) {
  return `${linkedLabel(v)} · ${v.vin} · ${enumLabel(v.status)}`;
}

// UI-33: the picker filters the loaded options on VIN or model (make and year also match).
function matchesVehicleQuery(v: any, query: string) {
  if (!query) return true;
  return `${v.modelYear ?? ''} ${v.make ?? ''} ${v.model ?? ''} ${v.vin ?? ''}`
    .toLowerCase()
    .includes(query.toLowerCase());
}

type Validation = Record<string, string>;

// Surrounding whitespace is never part of a stored value, so it is removed before
// the length rules run and before the payload is sent.
function trimForm(form: CustomerForm): CustomerForm {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    homeAddress: form.homeAddress.trim(),
  };
}

// Expects an already trimmed form (see trimForm).
function validateCustomer(form: CustomerForm): Validation {
  const e: Validation = {};
  if (!form.name) e.name = 'Check required fields';
  else if (form.name.length > 100) e.name = 'At most 100 characters';
  if (!form.email) e.email = 'Check required fields';
  else if (!EMAIL_PATTERN.test(form.email)) e.email = 'Enter a valid email';
  else if (form.email.length > 254) e.email = 'At most 254 characters';
  if (!form.phone) e.phone = 'Check required fields';
  else if (!PHONE_PATTERN.test(form.phone)) e.phone = 'Use 7 to 20 digits; only + - ( ) and spaces are allowed';
  else if (form.phone.length > 40) e.phone = 'At most 40 characters';
  if (!form.homeAddress) e.homeAddress = 'Check required fields';
  else if (form.homeAddress.length > 300) e.homeAddress = 'At most 300 characters';
  return e;
}

function mapCustomerWrite(e: unknown) {
  const code = codeOf(e);
  const status = statusOf(e);
  if (code === 'VALIDATION') return messageOf(e, 'Check required fields: some fields are missing or invalid.');
  if (code === 'PHONE_TAKEN') return `${messageOf(e, 'That phone number is already used by another customer.')} Search CRM for this number to open the existing customer.`;
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry: someone else changed this record after you opened it. Reopen it to load the latest version, then make your change again.';
  if (status === 404 || code === 'NOT_FOUND') return 'Customer not found. It may have been deleted by a colleague; refresh the list.';
  return describeError(e, 'save customer');
}

function mapLink(e: unknown) {
  const code = codeOf(e);
  const status = statusOf(e);
  if (code === 'VEHICLE_ALREADY_LINKED') return 'Vehicle already linked to another customer. Unlink it from that customer first.';
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found in your inventory. Check the VIN or refresh the list.';
  return describeError(e, 'link vehicle');
}

function mapUnlink(e: unknown) {
  const code = codeOf(e);
  const status = statusOf(e);
  if (code === 'SOLD_LOCKED') return 'Sold vehicles cannot be unlinked: the sale record keeps its buyer.';
  if (status === 404 || code === 'NOT_FOUND') return 'Link not found. It may already have been removed; refresh the customer.';
  return describeError(e, 'unlink vehicle');
}

const CUSTOMER_FIELDS: { key: keyof CustomerForm; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'homeAddress', label: 'Home address' },
];

export default function CrmPage() {
  const [searchParams] = useSearchParams();
  const session = useSessionStore();
  // Record history is manager only (AUD-17); staff never call the audit API.
  const isManager = session.dealerRole === 'MANAGER';
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [filters, setFilters] = useState({ q: '', linked: '' });
  // Filters actually sent to the API; updated from `filters` after the debounce.
  const [applied, setApplied] = useState({ q: '', linked: '' });

  const [drawer, setDrawer] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<CustomerForm>(blankForm());
  const [formError, setFormError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Validation>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [linkId, setLinkId] = useState<number | undefined>();
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [linkError, setLinkError] = useState('');
  const [customerLeads, setCustomerLeads] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const [emailWarning, setEmailWarning] = useState('');
  const [leadPage, setLeadPage] = useState(0);
  const [leadTotal, setLeadTotal] = useState(0);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [unlinkVehicleId, setUnlinkVehicleId] = useState<number | null>(null);

  const listSeqRef = useRef(0);
  const editSeqRef = useRef(0);

  const load = useCallback(async (p: number, f: { q: string; linked: string }) => {
    const seq = ++listSeqRef.current;
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const r = await customersApi.list({ ...f, page: p, size: 10 });
      if (seq !== listSeqRef.current) return;
      setRows(r.data.items || []);
      setTotal(r.data.totalElements || 0);
    } catch (e) {
      if (seq !== listSeqRef.current) return;
      if (statusOf(e) === 403 || codeOf(e) === 'FORBIDDEN') setForbidden(true);
      else setError(describeError(e, 'load customers'));
      setRows([]);
    } finally {
      if (seq === listSeqRef.current) setLoading(false);
    }
  }, []);

  const reload = useCallback(() => load(page, applied), [load, page, applied]);

  // Typing only moves `filters`; the request waits until typing pauses.
  useEffect(() => {
    const q = filters.q.trim();
    const linked = filters.linked;
    const timer = setTimeout(() => {
      setApplied(prev => (prev.q === q && prev.linked === linked ? prev : { q, linked }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.q, filters.linked]);

  useEffect(() => { void load(page, applied); }, [load, page, applied]);

  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (customerId) {
      const id = Number(customerId);
      if (Number.isFinite(id)) void openEdit(id);
    }
  }, [searchParams.get('customerId')]);

  async function loadLinkOptions(seq: number) {
    try {
      const all = await collectAllPages<any>((p) => vehiclesApi.list({
        page: p, size: LINK_OPTION_PAGE_SIZE, unlinkedOnly: true,
      }));
      if (seq !== editSeqRef.current) return;
      setVehicles(all);
    } catch {
      if (seq !== editSeqRef.current) return;
      setVehicles([]);
    }
  }

  async function loadCustomerLeads(id: number, seq: number, page = 0) {
    try {
      const r = await leadsApi.list({ customerId: id, page, size: 10 });
      if (seq !== editSeqRef.current) return;
      setCustomerLeads(r.data.items || []);
      setLeadPage(r.data.page ?? page);
      setLeadTotal(r.data.totalElements ?? 0);
    } catch {
      if (seq !== editSeqRef.current) return;
      setCustomerLeads([]);
      setLeadTotal(0);
    }
  }

  async function loadAudit(id: number, seq: number, page = 0) {
    try {
      const r = await auditApi.list({ entityType: 'CUSTOMER', entityId: id, page, size: 10 });
      if (seq !== editSeqRef.current) return;
      setAudit(r.data.items || []);
      setAuditPage(r.data.page ?? page);
      setAuditTotal(r.data.totalElements ?? 0);
    } catch {
      if (seq !== editSeqRef.current) return;
      setAudit([]);
      setAuditTotal(0);
    }
  }

  function openCreate() {
    const seq = ++editSeqRef.current;
    setSelected(null);
    setForm(blankForm());
    setFormError('');
    setValidationErrors({});
    setServerErrors({});
    setLinkError('');
    setEmailWarning('');
    setAudit([]);
    setVehicles([]);
    setLinkId(undefined);
    setVehicleQuery('');
    setCustomerLeads([]);
    setDrawer(true);
    void loadLinkOptions(seq);
  }

  async function openEdit(id: number) {
    const seq = ++editSeqRef.current;
    setFormError('');
    setValidationErrors({});
    setServerErrors({});
    setLinkError('');
    setEmailWarning('');
    setAudit([]);
    setCustomerLeads([]);
    setLinkId(undefined);
    setVehicleQuery('');
    try {
      const r = await customersApi.get(id);
      if (seq !== editSeqRef.current) return;
      setSelected(r.data);
      setForm({ name: r.data.name ?? '', email: r.data.email ?? '', phone: r.data.phone ?? '', homeAddress: r.data.homeAddress ?? '' });
      setDrawer(true);
      loadLinkOptions(seq);
      loadCustomerLeads(id, seq);
      if (isManager) loadAudit(id, seq);
    } catch (e) {
      if (seq !== editSeqRef.current) return;
      setSelected(null);
      setForm(blankForm());
      setDrawer(false);
      const missing = statusOf(e) === 404 || codeOf(e) === 'NOT_FOUND';
      setError(missing ? 'Customer not found. It may have been deleted; refresh the list.' : describeError(e, 'load customer'));
    }
  }

  async function save() {
    setFormError('');
    setServerErrors({});
    const payload = trimForm(form);
    const errors = validateCustomer(payload);
    setValidationErrors(errors);
    if (Object.keys(errors).length || saving) return;

    setSaving(true);
    try {
      if (selected) {
        const saved = await customersApi.update(selected.id, { ...payload, version: selected.version });
        setSelected({ ...selected, ...saved.data });
        await reload();
        await openEdit(selected.id);
        // openEdit clears the form state, so the CRM-13 warning is set after it.
        setEmailWarning(saved.data.emailWarning || '');
      } else {
        const created = await customersApi.create(payload);
        if (linkId !== undefined) {
          try {
            await customersApi.link(created.data.id, linkId);
          } catch (e) {
            await reload();
            await openEdit(created.data.id);
            setEmailWarning(created.data.emailWarning || '');
            setLinkError(`Customer was created, but vehicle linking failed: ${mapLink(e)}`);
            return;
          }
        }
        await reload();
        if (created.data.emailWarning) {
          // Keep the drawer open on the new customer so the shared-email warning is seen (CRM-13).
          await openEdit(created.data.id);
          setEmailWarning(created.data.emailWarning);
        } else {
          setDrawer(false);
        }
      }
    } catch (e) {
      const code = codeOf(e);
      // VALIDATION and PHONE_TAKEN carry fieldErrors; show them inline on the field.
      if (code === 'VALIDATION' || code === 'PHONE_TAKEN') {
        setServerErrors(fieldErrorsOf(e));
      }
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
      await reload();
      // openEdit clears the picker selection and reloads the linkable vehicles.
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
      await reload();
      await openEdit(customerId);
    } catch (e) {
      setLinkError(mapUnlink(e));
    }
  }

  async function removeCustomer() {
    if (!selected || !window.confirm('Delete this customer from active CRM lists? Their sales and audit history will be retained.')) return;
    try {
      await customersApi.delete(selected.id);
      setDrawer(false);
      setSelected(null);
      await reload();
    } catch (e) {
      setFormError(describeError(e, 'delete customer'));
    }
  }

  const updateForm = (key: keyof CustomerForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const vehicleOptions = vehicles.filter(v => matchesVehicleQuery(v, vehicleQuery.trim()));

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'homeAddress', label: 'Home address' },
    {
      key: 'linkedVehicle',
      label: 'Linked vehicles',
      render: (row: any) => {
        const extra = Number(row.linkedVehicleCount ?? 0) - 1;
        return (
          <>
            {row.linkedVehicle ? linkedLabel(row.linkedVehicle) : <span className="muted">None</span>}
            {extra > 0 && <span className="muted"> +{extra} more</span>}
          </>
        );
      },
    },
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
          <SearchSuggest placeholder="Name / Email / Phone" ariaLabel="Name / Email / Phone" value={filters.q}
            onChange={v => { setFilters(f => ({ ...f, q: v })); setPage(0); }}
            suggest={async q => {
              const r = await customersApi.list({ q, linked: filters.linked, size: SUGGEST_LIMIT });
              return (r.data.items || []).map((c: any) => ({ value: c.name, label: c.name, hint: [c.email, c.phone].filter(Boolean).join(' · ') }));
            }}
            onPick={s => { setFilters(f => ({ ...f, q: s.value })); setPage(0); setApplied({ q: s.value, linked: filters.linked }); }}
            onEnter={() => { setPage(0); setApplied({ q: filters.q.trim(), linked: filters.linked }); }} />
          <select className="select" aria-label="Link status" value={filters.linked}
            onChange={e => { setFilters(f => ({ ...f, linked: e.target.value })); setPage(0); }}>
            <option value="">Any</option>
            <option value="true">Linked</option>
            <option value="false">Not linked</option>
          </select>
          <button className="btn" onClick={() => { setPage(0); setApplied({ q: filters.q.trim(), linked: filters.linked }); }}>Search</button>
          <button className="btn" onClick={() => { setFilters({ q: '', linked: '' }); setPage(0); }}>Reset</button>
        </div>
        <PageState loading={loading} error={error} forbidden={forbidden} empty={!loading && !error && !forbidden && !rows.length}
          emptyText="No customers match." loadingText="Loading customers…" forbiddenText="You do not have access to CRM.">
          <DataTable rows={rows} total={total} page={page} columns={columns} actions={actions}
            onPage={p => setPage(p)} />
        </PageState>
      </div>

      <FormDrawer title="Customer" open={drawer} onClose={() => { editSeqRef.current++; setDrawer(false); }}>
        <form onSubmit={e => { e.preventDefault(); void save(); }}>
          {CUSTOMER_FIELDS.map(field => (
            <div className="form-item" key={field.key}>
              <label className="form-label form-required" htmlFor={`customer-${field.key}`}>{field.label}</label>
              <input
                id={`customer-${field.key}`}
                className="input"
                aria-required="true"
                value={form[field.key]}
                onChange={e => updateForm(field.key, e.target.value)}
              />
              {(validationErrors[field.key] || serverErrors[field.key]) && (
                <div className="form-error">{validationErrors[field.key] || serverErrors[field.key]}</div>
              )}
            </div>
          ))}
          {!selected && <div className="form-item">
            <label className="form-label" htmlFor="customer-purchased-vehicle">Car(s) purchased</label>
            <select id="customer-purchased-vehicle" className="select" value={linkId ?? ''}
              onChange={e => setLinkId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">No vehicle linked yet</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{vehicleOptionLabel(v)}</option>)}
            </select>
            <span className="muted">Optional for customers who have not purchased a vehicle.</span>
          </div>}
          {emailWarning && <div className="alert">{emailWarning}</div>}
          {formError && <p className="danger-text">{formError}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          {selected && <button type="button" className="btn danger" style={{ marginLeft: 8 }} onClick={() => void removeCustomer()}>Delete customer</button>}
        </form>

        {selected && (
          <>
            <hr className="divider" />
            <div className="form-item">
              <label className="form-label" htmlFor="vehicle-search">Link vehicle</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  id="vehicle-search"
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="Search by VIN or model"
                  value={vehicleQuery}
                  onChange={e => setVehicleQuery(e.target.value)}
                />
                <button className="btn" type="button" onClick={link} disabled={linkId === undefined}>Link vehicle</button>
              </div>
              <div role="listbox" aria-label="Unlinked vehicles"
                style={{ marginTop: 8, maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}>
                {!vehicleOptions.length && (
                  <p className="muted" style={{ margin: 0, padding: '8px 10px' }}>No unlinked vehicles match.</p>
                )}
                {vehicleOptions.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    role="option"
                    aria-selected={linkId === v.id}
                    className="btn-link"
                    onClick={() => setLinkId(v.id)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px',
                      background: linkId === v.id ? 'var(--grad-soft)' : 'transparent',
                    }}
                  >
                    {vehicleOptionLabel(v)}
                  </button>
                ))}
              </div>
            </div>
            {linkError && <p className="danger-text">{linkError}</p>}

            {(selected.linkedVehicles || []).map((v: any) => (
              <div key={v.id} style={{ marginTop: 12 }}>
                <Link to={`/dms?vehicleId=${v.id}`}>{linkedLabel(v)}</Link>
                <span className="muted"> · {v.vin} · {enumLabel(v.status)}</span>
                {v.status !== 'SOLD' ? (
                  <button className="btn-link danger" onClick={() => requestUnlink(v.id)}>Unlink</button>
                ) : (
                  <span className="muted"> Sold vehicles cannot be unlinked</span>
                )}
              </div>
            ))}

            <hr className="divider" />
            <div className="muted">Leads</div>
            {!customerLeads.length && <p className="muted">No leads for this customer.</p>}
            {customerLeads.map(l => (
              <div key={l.id} style={{ marginTop: 8 }}>
                <Link to={`/leads?leadId=${l.id}`}>
                  {stageLabel(l.stage)} · {l.vehicle ? linkedLabel(l.vehicle) : 'No vehicle'}
                </Link>
                <span className="muted"> · Follow-up {isClosedStage(l.stage) ? 'not needed' : l.nextFollowUpOn || 'not scheduled'}</span>
              </div>
            ))}
            {leadTotal > 10 && selected && (
              <div className="toolbar">
                <button type="button" className="btn" disabled={leadPage <= 0}
                  onClick={() => void loadCustomerLeads(selected.id, editSeqRef.current, leadPage - 1)}>Previous</button>
                <span className="muted">{leadPage + 1} / {Math.ceil(leadTotal / 10)}</span>
                <button type="button" className="btn" disabled={(leadPage + 1) * 10 >= leadTotal}
                  onClick={() => void loadCustomerLeads(selected.id, editSeqRef.current, leadPage + 1)}>Next</button>
              </div>
            )}

            {isManager && (
              <AuditTrail
                rows={audit}
                page={auditPage}
                total={auditTotal}
                onPage={(p) => selected && void loadAudit(selected.id, editSeqRef.current, p)}
              />
            )}
          </>
        )}
      </FormDrawer>

      <ConfirmDialog open={confirmVisible} title="Unlink vehicle" message="Remove this vehicle link?"
        onCancel={() => { setConfirmVisible(false); setUnlinkVehicleId(null); }} onConfirm={unlink} />
    </AppLayout>
  );
}
