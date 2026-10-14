import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DataTable from '../components/DataTable';
import FormDrawer from '../components/FormDrawer';
import PageState from '../components/PageState';
import ConfirmDialog from '../components/ConfirmDialog';
import AuditTrail from '../components/AuditTrail';
import WorkOrderPanel from '../components/WorkOrderPanel';
import PhotoStudioPanel from '../components/PhotoStudioPanel';
import { vehiclesApi, errorCode, errorStatus } from '../api/vehicles';
import { catalogApi, vinDecodeError } from '../api/catalog';
import { listingsApi, checkStatusLabel } from '../api/listings';
import { auditApi } from '../api/audit';
import { fieldErrorsOf, messageOf } from '../api/http';

const SOURCES = ['TRADE_IN', 'AUCTION', 'PRIVATE_PURCHASE', 'OTHER'] as const;
const CONDITIONS = ['CERTIFIED', 'AS_IS', 'UNFIT', 'IRREPARABLE'] as const;

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
function cad(value: unknown) {
  return value == null || value === '' ? '—' : CAD.format(Number(value));
}

function enumLabel(v: string) {
  const s = String(v || '').split('_').join(' ').toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function profit(v: { soldPrice?: unknown; purchaseCost?: unknown; repairCost?: unknown }) {
  if (v.soldPrice == null || v.soldPrice === '' || v.purchaseCost == null || v.purchaseCost === '') return null;
  return Number(v.soldPrice) - Number(v.purchaseCost) - Number(v.repairCost || 0);
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;

type Validation = Record<string, string>;

function validateForm(form: VehicleForm, isSold: boolean): Validation {
  const e: Validation = {};
  if (isSold) {
    if (!form.conditionCode) e.conditionCode = 'Required';
    return e;
  }
  if (!form.make?.trim() || form.make.length > 50) e.make = form.make ? 'At most 50 characters' : 'Required';
  if (!form.model?.trim() || form.model.length > 50) e.model = form.model ? 'At most 50 characters' : 'Required';
  const year = Number(form.modelYear);
  const maxYear = new Date().getFullYear() + 1;
  if (!Number.isInteger(year) || year < 1900 || year > maxYear) e.modelYear = `Year must be 1900 to ${maxYear}`;
  if (!VIN_PATTERN.test((form.vin || '').toUpperCase())) e.vin = 'VIN must be 17 letters or digits, without I, O or Q';
  if (!form.purchaseCost || !MONEY_PATTERN.test(form.purchaseCost)) e.purchaseCost = 'Must be an amount of 0 or more with at most 2 decimals';
  if (!form.addedOn || !DATE_PATTERN.test(form.addedOn) || Number.isNaN(Date.parse(form.addedOn))) {
    e.addedOn = 'Use the format YYYY-MM-DD';
  } else if (form.addedOn > todayIso()) {
    e.addedOn = 'Date cannot be in the future';
  }
  if (form.repairCost && !MONEY_PATTERN.test(form.repairCost)) e.repairCost = 'Must be an amount of 0 or more with at most 2 decimals';
  if (form.carfaxUrl && (form.carfaxUrl.length > 500 || !URL_PATTERN.test(form.carfaxUrl))) {
    e.carfaxUrl = 'Must be an http(s) URL of at most 500 characters';
  }
  if (!form.source) e.source = 'Required';
  if (!form.conditionCode) e.conditionCode = 'Required';
  return e;
}

interface VehicleForm {
  make: string; model: string; modelYear: string; vin: string;
  source: string; purchaseCost: string; addedOn: string;
  conditionCode: string; repairCost: string; carfaxUrl: string;
}

function blankForm(): VehicleForm {
  return { make: '', model: '', modelYear: '', vin: '', source: 'AUCTION', purchaseCost: '', addedOn: '', conditionCode: 'AS_IS', repairCost: '', carfaxUrl: '' };
}

function vehicleToForm(data: any): VehicleForm {
  return {
    make: data.make ?? '', model: data.model ?? '', modelYear: data.modelYear != null ? String(data.modelYear) : '',
    vin: data.vin ?? '', source: data.source ?? 'AUCTION', purchaseCost: data.purchaseCost != null ? String(data.purchaseCost) : '',
    addedOn: data.addedOn ?? '', conditionCode: data.conditionCode ?? 'AS_IS',
    repairCost: data.repairCost != null ? String(data.repairCost) : '', carfaxUrl: data.carfaxUrl ?? '',
  };
}

function mapWrite(e: unknown) {
  const code = errorCode(e);
  const status = errorStatus(e);
  if (code === 'VIN_DUP') return 'VIN already in this dealership';
  if (code === 'VALIDATION') return messageOf(e, 'Check required fields');
  if (code === 'SOLD_LOCKED') return 'Purchase fields are locked';
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry';
  if (code === 'SOLD_PAIR_REQUIRED') return 'Sold date and price are required together';
  if (code === 'WORK_ORDERS_OPEN') return 'Finish or cancel open work orders before selling';
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found';
  return 'Could not save vehicle.';
}

const yearOptions = Array.from({ length: new Date().getFullYear() + 2 - 1900 }, (_, i) => new Date().getFullYear() + 1 - i);

export default function DmsPage() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [filters, setFilters] = useState({ make: '', model: '', modelYear: '' as string | number, q: '', status: '', condition: '' });
  const [makeOptions, setMakeOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [catalogError, setCatalogError] = useState('');

  const [drawer, setDrawer] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState<VehicleForm>(blankForm());
  const [formError, setFormError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Validation>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [vinFacts, setVinFacts] = useState('');
  const [decoding, setDecoding] = useState(false);
  const [adStatus, setAdStatus] = useState('');
  const [audit, setAudit] = useState<any[]>([]);

  const [sellOpen, setSellOpen] = useState(false);
  const [sellForm, setSellForm] = useState({ soldOn: '', soldPrice: '' });
  const [sellError, setSellError] = useState('');

  const listSeqRef = useRef(0);
  const detailSeqRef = useRef(0);
  const modelsSeqRef = useRef(0);
  const deepLinkHandled = useRef(false);

  const load = useCallback(async (p?: number) => {
    const seq = ++listSeqRef.current;
    const usePage = p ?? page;
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const r = await vehiclesApi.list({ ...filters, page: usePage, size: 10 });
      if (seq !== listSeqRef.current) return;
      setRows(r.data.items || []);
      setTotal(r.data.total || 0);
    } catch (e) {
      if (seq !== listSeqRef.current) return;
      if (errorStatus(e) === 403 || errorCode(e) === 'FORBIDDEN') setForbidden(true);
      else setError('Could not load vehicles.');
      setRows([]);
    } finally {
      if (seq === listSeqRef.current) setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    catalogApi.makes().then(r => setMakeOptions(r.data)).catch(() => setCatalogError('Vehicle catalog unavailable; type a make and model instead.'));
  }, []);

  useEffect(() => {
    if (deepLinkHandled.current) return;
    const vehicleId = searchParams.get('vehicleId');
    if (vehicleId) {
      deepLinkHandled.current = true;
      const id = Number(vehicleId);
      if (Number.isFinite(id)) void openEdit(id);
    }
  }, [searchParams]);

  async function onMakeChange(make: string) {
    setFilters(f => ({ ...f, make, model: '', modelYear: '' }));
    setModelOptions([]);
    if (!make) return;
    const seq = ++modelsSeqRef.current;
    try {
      const models = (await catalogApi.models(make)).data;
      if (seq === modelsSeqRef.current) setModelOptions(models);
    } catch {
      if (seq === modelsSeqRef.current) setCatalogError('Vehicle catalog unavailable; type a make and model instead.');
    }
  }

  function resetFilters() {
    setFilters({ make: '', model: '', modelYear: '', q: '', status: '', condition: '' });
    setModelOptions([]);
    setPage(0);
  }

  function openCreate() {
    detailSeqRef.current++;
    setEdit(null);
    setForm(blankForm());
    setVinFacts('');
    setFormError('');
    setValidationErrors({});
    setServerErrors({});
    setAudit([]);
    setAdStatus('');
    setDrawer(true);
  }

  async function openEdit(id: number) {
    const seq = ++detailSeqRef.current;
    setFormError('');
    setValidationErrors({});
    setServerErrors({});
    setAudit([]);
    setAdStatus('');
    try {
      const r = await vehiclesApi.get(id);
      if (seq !== detailSeqRef.current) return;
      setEdit(r.data);
      setForm(vehicleToForm(r.data));
      setDrawer(true);
      loadAdStatus(id, seq);
      loadAudit(id, seq);
    } catch (e) {
      if (seq !== detailSeqRef.current) return;
      setEdit(null);
      setForm(blankForm());
      setDrawer(false);
      const missing = errorStatus(e) === 404 || errorCode(e) === 'NOT_FOUND';
      setError(missing ? 'Vehicle not found' : 'Could not load vehicle.');
    }
  }

  async function loadAdStatus(id: number, seq: number) {
    try {
      const r = await listingsApi.get(id);
      if (seq !== detailSeqRef.current) return;
      setAdStatus(checkStatusLabel(r.data.checkStatus) || 'Not checked');
    } catch {
      if (seq !== detailSeqRef.current) return;
      setAdStatus('');
    }
  }

  async function loadAudit(id: number, seq: number) {
    try {
      const r = await auditApi.list({ entityType: 'VEHICLE', entityId: id });
      if (seq !== detailSeqRef.current) return;
      setAudit(r.data.items || []);
    } catch {
      if (seq !== detailSeqRef.current) return;
      setAudit([]);
    }
  }

  async function save() {
    setFormError('');
    setServerErrors({});
    const isSold = edit?.status === 'SOLD';
    const errors = validateForm(form, isSold);
    setValidationErrors(errors);
    if (Object.keys(errors).length) return;

    if (saving) return;
    setSaving(true);
    const seq = detailSeqRef.current;
    const payload = isSold ? { ...form } : { ...form, vin: form.vin.trim().toUpperCase() };
    try {
      if (edit) {
        const saved = await vehiclesApi.update(edit.id, { ...payload, version: edit.version });
        if (seq !== detailSeqRef.current) { await load(); return; }
        setEdit(saved.data);
        setForm(vehicleToForm(saved.data));
        loadAdStatus(saved.data.id, seq);
        loadAudit(saved.data.id, seq);
      } else {
        await vehiclesApi.create(payload);
        if (seq !== detailSeqRef.current) { await load(); return; }
        setDrawer(false);
      }
      await load();
    } catch (e) {
      if (seq !== detailSeqRef.current) return;
      if (errorCode(e) === 'VALIDATION') setServerErrors(fieldErrorsOf(e));
      setFormError(mapWrite(e));
    } finally {
      setSaving(false);
    }
  }

  async function refreshAfterWorkOrder() {
    const seq = detailSeqRef.current;
    const id = edit?.id;
    if (!id) return;
    try {
      const r = await vehiclesApi.get(id);
      if (seq !== detailSeqRef.current) return;
      setEdit(r.data);
      setForm(prev => ({ ...prev, repairCost: r.data.repairCost != null ? String(r.data.repairCost) : '' }));
      loadAudit(id, seq);
    } catch { /* panel shows its own error */ }
    await load();
  }

  async function openSell(id: number) {
    const seq = ++detailSeqRef.current;
    setSellError('');
    setSellForm({ soldOn: '', soldPrice: '' });
    try {
      const r = await vehiclesApi.get(id);
      if (seq !== detailSeqRef.current) return;
      setEdit(r.data);
      setForm(vehicleToForm(r.data));
      setSellOpen(true);
    } catch (e) {
      if (seq !== detailSeqRef.current) return;
      const missing = errorStatus(e) === 404 || errorCode(e) === 'NOT_FOUND';
      setError(missing ? 'Vehicle not found' : 'Could not open sale.');
    }
  }

  async function sell() {
    setSellError('');
    const soldOn = sellForm.soldOn.trim();
    const priceText = sellForm.soldPrice.trim();
    const price = Number(priceText);
    if (!soldOn || !priceText) { setSellError('Sold date and price are required together'); return; }
    if (!MONEY_PATTERN.test(priceText) || price <= 0) { setSellError('Sold price must be more than 0 with at most 2 decimals'); return; }
    if (!DATE_PATTERN.test(soldOn) || Number.isNaN(Date.parse(soldOn))) { setSellError('Use the format YYYY-MM-DD'); return; }
    if (soldOn > todayIso()) { setSellError('Date cannot be in the future'); return; }
    if (edit?.addedOn && soldOn < String(edit.addedOn)) { setSellError('Sold date cannot be before the date added'); return; }

    const seq = detailSeqRef.current;
    try {
      await vehiclesApi.sell(edit.id, { soldOn, soldPrice: price, version: edit.version });
      if (seq === detailSeqRef.current) { setSellOpen(false); setDrawer(false); }
      await load();
    } catch (e) {
      if (seq !== detailSeqRef.current) return;
      setSellError(mapWrite(e));
    }
  }

  async function decodeVin() {
    if (decoding) return;
    setDecoding(true);
    setVinFacts('');
    try {
      const d = (await catalogApi.decodeVin(form.vin.trim())).data;
      setForm(prev => ({
        ...prev,
        make: d.make,
        model: d.model || prev.model,
        modelYear: d.modelYear ? String(d.modelYear) : prev.modelYear,
      }));
      setVinFacts([d.bodyClass, d.engine, d.country, d.manufacturer].filter(Boolean).join(' · '));
    } catch (err) {
      setFormError(vinDecodeError(err));
    } finally {
      setDecoding(false);
    }
  }

  const updateForm = (key: keyof VehicleForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const isSold = edit?.status === 'SOLD';

  const columns = [
    { key: 'ymm', label: 'Year Make Model', render: (row: any) => `${row.modelYear} ${row.make} ${row.model}` },
    { key: 'vin', label: 'VIN' },
    { key: 'source', label: 'Source', render: (row: any) => enumLabel(row.source) },
    { key: 'conditionCode', label: 'Condition', render: (row: any) => enumLabel(row.conditionCode) },
    { key: 'purchaseCost', label: 'Cost', render: (row: any) => cad(row.purchaseCost) },
    { key: 'addedOn', label: 'Date added' },
    { key: 'openWorkOrders', label: 'Open WOs', render: (row: any) => row.openWorkOrders || '—' },
    { key: 'status', label: 'Status', render: (row: any) => <span className="tag">{enumLabel(row.status)}</span> },
  ];

  const actions = (row: any) => (
    <>
      <button className="btn-link" onClick={() => openEdit(row.id)}>Edit</button>
      {row.status !== 'SOLD' && <button className="btn-link" onClick={() => openSell(row.id)}>Sell</button>}
    </>
  );

  const purchaseFields = [
    { key: 'make' as const, label: 'Make' },
    { key: 'model' as const, label: 'Model' },
    { key: 'modelYear' as const, label: 'Model year' },
    { key: 'vin' as const, label: 'VIN' },
    { key: 'purchaseCost' as const, label: 'Purchase cost' },
    { key: 'addedOn' as const, label: 'Added on' },
    { key: 'repairCost' as const, label: 'Repair cost' },
    { key: 'carfaxUrl' as const, label: 'Carfax URL' },
  ];

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>DMS</h1>
            <span className="muted">Vehicle inventory</span>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>Add vehicle</button>
        </div>
        <div className="filters">
          <select className="form-select" value={filters.make} onChange={e => onMakeChange(e.target.value)}>
            <option value="">Make</option>
            {makeOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="form-select" value={filters.model} onChange={e => setFilters(f => ({ ...f, model: e.target.value, modelYear: '' }))} disabled={!filters.make}>
            <option value="">Model</option>
            {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="form-select" value={filters.modelYear} onChange={e => setFilters(f => ({ ...f, modelYear: e.target.value }))} disabled={!filters.model}>
            <option value="">Year</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <input className="form-input" placeholder="VIN" value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
          <select className="form-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">Status</option>
            <option value="IN_STOCK">In stock</option>
            <option value="SOLD">Sold</option>
          </select>
          <select className="form-select" value={filters.condition} onChange={e => setFilters(f => ({ ...f, condition: e.target.value }))}>
            <option value="">Condition</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{enumLabel(c)}</option>)}
          </select>
          <button className="btn" onClick={() => { setPage(0); void load(0); }}>Search</button>
          <button className="btn" onClick={resetFilters}>Reset</button>
        </div>
        {catalogError && <p className="warning-text">{catalogError}</p>}
        <PageState loading={loading} error={error} forbidden={forbidden} empty={!loading && !error && !forbidden && !rows.length}
          emptyText="No vehicles match." loadingText="Loading vehicles…" forbiddenText="You do not have access to DMS.">
          <DataTable rows={rows} total={total} page={page} columns={columns} actions={actions}
            rowClassName={row => row.status === 'SOLD' ? 'sold-row' : ''} onPage={p => { setPage(p); void load(p); }} />
        </PageState>
      </div>

      <FormDrawer title={edit ? 'Edit vehicle' : 'Add vehicle'} open={drawer} onClose={() => setDrawer(false)}>
        <form onSubmit={e => { e.preventDefault(); void save(); }}>
          {purchaseFields.map(field => (
            <div className="form-item" key={field.key}>
              <label>{field.label}</label>
              <div>
                {field.key === 'vin' && !edit ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" value={form[field.key]} onChange={e => updateForm(field.key, e.target.value)} disabled={isSold} style={{ flex: 1 }} />
                    <button type="button" className="btn" onClick={decodeVin} disabled={decoding}>{decoding ? 'Decoding…' : 'Decode'}</button>
                  </div>
                ) : field.key === 'addedOn' ? (
                  <input className="form-input" type="date" value={form[field.key]} onChange={e => updateForm(field.key, e.target.value)} disabled={isSold} />
                ) : (
                  <input className="form-input" value={form[field.key]} onChange={e => updateForm(field.key, e.target.value)} disabled={isSold} />
                )}
                {field.key === 'vin' && !edit && vinFacts && <div className="muted" style={{ marginTop: 4 }}>{vinFacts}</div>}
              </div>
              {(validationErrors[field.key] || serverErrors[field.key]) && (
                <span className="danger-text" style={{ fontSize: 12 }}>{validationErrors[field.key] || serverErrors[field.key]}</span>
              )}
            </div>
          ))}

          <div className="form-item">
            <label>Source</label>
            <select className="form-select" value={form.source} onChange={e => updateForm('source', e.target.value)} disabled={isSold}>
              {SOURCES.map(v => <option key={v} value={v}>{enumLabel(v)}</option>)}
            </select>
            {(validationErrors.source || serverErrors.source) && <span className="danger-text" style={{ fontSize: 12 }}>{validationErrors.source || serverErrors.source}</span>}
          </div>

          <div className="form-item">
            <label>Condition</label>
            <select className="form-select" value={form.conditionCode} onChange={e => updateForm('conditionCode', e.target.value)}>
              {CONDITIONS.map(v => <option key={v} value={v}>{enumLabel(v)}</option>)}
            </select>
            {(validationErrors.conditionCode || serverErrors.conditionCode) && <span className="danger-text" style={{ fontSize: 12 }}>{validationErrors.conditionCode || serverErrors.conditionCode}</span>}
          </div>

          {isSold && (
            <>
              <div className="form-item"><label>Sold date</label><span>{edit.soldOn}</span></div>
              <div className="form-item"><label>Sold price</label><span>{cad(edit.soldPrice)}</span></div>
              <div className="form-item">
                <label>Profit (sold price − purchase cost − repair cost)</label>
                <span className={((profit(edit) ?? 0) < 0) ? 'danger-text' : ''}>{cad(profit(edit))}</span>
              </div>
            </>
          )}

          {edit?.id && (
            <div className="form-item">
              <label>Linked customer</label>
              {edit.linkedCustomer ? (
                <Link to={`/crm?customerId=${edit.linkedCustomer.id}`}>{edit.linkedCustomer.name}</Link>
              ) : <span>—</span>}
            </div>
          )}

          {edit?.id && (
            <div className="form-item">
              <label>Ad check status</label>
              <span>{adStatus || '—'}</span>
            </div>
          )}

          {formError && <p className="danger-text">{formError}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </form>

        {edit?.id && <WorkOrderPanel vehicleId={edit.id} sold={isSold} onChanged={refreshAfterWorkOrder} />}
        {edit?.id && <PhotoStudioPanel vehicleId={edit.id} />}
        {edit?.id && <AuditTrail rows={audit} />}
      </FormDrawer>

      <ConfirmDialog open={sellOpen} title="Sell vehicle" confirmLabel="Confirm sale" onCancel={() => setSellOpen(false)} onConfirm={sell}>
        <div className="form-item">
          <label>Sold date</label>
          <input className="form-input" type="date" value={sellForm.soldOn} onChange={e => setSellForm(f => ({ ...f, soldOn: e.target.value }))} />
        </div>
        <div className="form-item">
          <label>Sold price</label>
          <input className="form-input" value={sellForm.soldPrice} onChange={e => setSellForm(f => ({ ...f, soldPrice: e.target.value }))} />
        </div>
        {sellError && <p className="danger-text">{sellError}</p>}
      </ConfirmDialog>
    </AppLayout>
  );
}
