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
import PaymentPanel from '../components/PaymentPanel';
import StatusTag from '../components/StatusTag';
import { vehiclesApi } from '../api/vehicles';
import { customersApi } from '../api/customers';
import { cad, dateTimeLocal, enumLabel, MONEY_PATTERN } from '../format';
import { catalogApi, vinDecodeError } from '../api/catalog';
import { listingsApi, checkStatusLabel } from '../api/listings';
import { auditApi } from '../api/audit';
import { codeOf, collectAllPages, fieldErrorsOf, messageOf, statusOf } from '../api/http';
import { describeError } from '../api/errors';
import { useSessionStore } from '../store/session';

const SOURCES = ['TRADE_IN', 'AUCTION', 'PRIVATE_PURCHASE', 'OTHER'] as const;
const CONDITIONS = ['CERTIFIED', 'AS_IS', 'UNFIT', 'IRREPARABLE'] as const;
const BODY_TYPES = ['SEDAN', 'SUV', 'TRUCK', 'MOTORCYCLE', 'COUPE', 'HATCHBACK', 'VAN', 'OTHER'] as const;
const FUEL_TYPES = ['GASOLINE', 'DIESEL', 'HYBRID', 'PLUGIN_HYBRID', 'ELECTRIC', 'OTHER'] as const;

function profit(v: { soldPrice?: unknown; purchaseCost?: unknown; repairCost?: unknown }) {
  if (v.soldPrice == null || v.soldPrice === '' || v.purchaseCost == null || v.purchaseCost === '') return null;
  return Number(v.soldPrice) - Number(v.purchaseCost) - Number(v.repairCost || 0);
}

// Today's date in the viewer's local zone, as YYYY-MM-DD.
function todayIso() {
  return dateTimeLocal(new Date().toISOString()).slice(0, 10);
}

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;
const MILEAGE_PATTERN = /^\d{1,7}$/;

type Validation = Record<string, string>;

function validateForm(form: VehicleForm, isSold: boolean): Validation {
  const e: Validation = {};
  if (isSold) {
    if (!form.conditionCode) e.conditionCode = 'Required';
    return e;
  }
  if (form.mileageKm && (!MILEAGE_PATTERN.test(form.mileageKm) || Number(form.mileageKm) > 2_000_000)) {
    e.mileageKm = 'Mileage must be a whole number from 0 to 2,000,000 km';
  }
  if (form.exteriorColor.length > 40) e.exteriorColor = 'At most 40 characters';
  if (form.stockNumber.length > 20) e.stockNumber = 'At most 20 characters';
  if (form.listPrice && !MONEY_PATTERN.test(form.listPrice)) e.listPrice = 'Must be an amount of 0 or more with at most 2 decimals';
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
  conditionCode: string; bodyType: string; repairCost: string; carfaxUrl: string;
  stockNumber: string; mileageKm: string; exteriorColor: string; fuelType: string; listPrice: string;
}

interface Filters {
  make: string; model: string; modelYear: string;
  q: string; status: string; condition: string; bodyType: string;
}

function blankFilters(): Filters {
  return { make: '', model: '', modelYear: '', q: '', status: '', condition: '', bodyType: '' };
}

// Filters the user types rather than picks; they are held as a draft until typing pauses.
type TextFilters = Pick<Filters, 'make' | 'model' | 'q'>;

function blankDrafts(): TextFilters {
  return { make: '', model: '', q: '' };
}

function draftsPending(drafts: TextFilters, filters: Filters) {
  return (Object.keys(drafts) as (keyof TextFilters)[]).some(key => drafts[key] !== filters[key]);
}

const ALL_TOUCHED: Record<string, boolean> = {
  make: true, model: true, modelYear: true, vin: true, source: true,
  purchaseCost: true, addedOn: true, conditionCode: true, bodyType: true, repairCost: true, carfaxUrl: true,
  stockNumber: true, mileageKm: true, exteriorColor: true, fuelType: true, listPrice: true,
};

// Typed filters fire a request only after the user pauses typing (UI-20).
const FILTER_DEBOUNCE_MS = 350;

function blankForm(): VehicleForm {
  return {
    make: '', model: '', modelYear: '', vin: '', source: '', purchaseCost: '', addedOn: '', conditionCode: '', bodyType: '', repairCost: '', carfaxUrl: '',
    stockNumber: '', mileageKm: '', exteriorColor: '', fuelType: '', listPrice: '',
  };
}

function vehicleToForm(data: any): VehicleForm {
  return {
    make: data.make ?? '', model: data.model ?? '', modelYear: data.modelYear != null ? String(data.modelYear) : '',
    vin: data.vin ?? '', source: data.source ?? '', purchaseCost: data.purchaseCost != null ? String(data.purchaseCost) : '',
    addedOn: data.addedOn ?? '', conditionCode: data.conditionCode ?? '', bodyType: data.bodyType ?? 'OTHER',
    repairCost: data.repairCost != null ? String(data.repairCost) : '', carfaxUrl: data.carfaxUrl ?? '',
    stockNumber: data.stockNumber ?? '', mileageKm: data.mileageKm != null ? String(data.mileageKm) : '',
    exteriorColor: data.exteriorColor ?? '', fuelType: data.fuelType ?? '',
    listPrice: data.listPrice != null ? String(data.listPrice) : '',
  };
}

function mapWrite(e: unknown) {
  const code = codeOf(e);
  const status = statusOf(e);
  if (code === 'VIN_DUP') return 'VIN already in this dealership. Search the inventory for this VIN and edit that vehicle instead.';
  if (code === 'VALIDATION') return messageOf(e, 'Check required fields: some fields are missing or invalid.');
  if (code === 'SOLD_LOCKED') return 'This vehicle is sold. Make, model, year, VIN, source, purchase cost, date added, repair cost, the Carfax link, and the listing details are locked, and it cannot be sold again.';
  if (code === 'VERSION_CONFLICT') return 'Refresh and retry: someone else changed this record after you opened it. Reopen it to load the latest version, then make your change again.';
  if (code === 'SOLD_PAIR_REQUIRED') return 'Sold date and price are required together. Enter both, with a price above $0.';
  if (code === 'WORK_ORDERS_OPEN') return 'Finish or cancel open work orders before selling. Open the vehicle\'s Work orders section to close them.';
  if (status === 404 || code === 'NOT_FOUND') return 'Vehicle not found. It may have been deleted by a colleague; refresh the list.';
  return describeError(e, 'save vehicle');
}

const yearOptions = Array.from({ length: new Date().getFullYear() + 2 - 1900 }, (_, i) => new Date().getFullYear() + 1 - i);

export default function DmsPage() {
  // Record history is manager only (AUD-17); staff never call the audit API.
  const isManager = useSessionStore().dealerRole === 'MANAGER';
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [filters, setFilters] = useState<Filters>(blankFilters());
  const [drafts, setDrafts] = useState<TextFilters>(blankDrafts());
  const [makeOptions, setMakeOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [catalogError, setCatalogError] = useState('');

  const [drawer, setDrawer] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState<VehicleForm>(blankForm());
  const [formError, setFormError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Validation>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [vinFacts, setVinFacts] = useState('');
  const [decoding, setDecoding] = useState(false);
  const [adStatus, setAdStatus] = useState('');
  const [audit, setAudit] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);

  const [formModelOptions, setFormModelOptions] = useState<string[]>([]);

  const [sellOpen, setSellOpen] = useState(false);
  const [sellForm, setSellForm] = useState({ soldOn: '', soldPrice: '', buyerId: '' });
  const [buyers, setBuyers] = useState<any[]>([]);
  const [sellError, setSellError] = useState('');

  const listSeqRef = useRef(0);
  const detailSeqRef = useRef(0);
  const modelsSeqRef = useRef(0);

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
      setTotal(r.data.totalElements || 0);
    } catch (e) {
      if (seq !== listSeqRef.current) return;
      if (statusOf(e) === 403 || codeOf(e) === 'FORBIDDEN') setForbidden(true);
      else setError(describeError(e, 'load vehicles'));
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
    if (!draftsPending(drafts, filters)) return;
    const timer = setTimeout(() => {
      setFilters(f => ({ ...f, ...drafts }));
      setPage(0);
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [drafts, filters]);

  useEffect(() => {
    const vehicleId = searchParams.get('vehicleId');
    if (vehicleId) {
      const id = Number(vehicleId);
      if (Number.isFinite(id)) void openEdit(id);
    }
  }, [searchParams.get('vehicleId')]);

  // Any filter change restarts at the first page, otherwise the new result set is queried at an
  // offset that no longer exists and the table looks empty (UI-20).
  function changeFilter(patch: Partial<Filters>) {
    setFilters(f => ({ ...f, ...patch }));
    setPage(0);
  }

  async function onMakeChange(make: string) {
    setDrafts(d => ({ ...d, make, model: '' }));
    changeFilter({ make, model: '' });
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

  function applySearch() {
    setPage(0);
    if (draftsPending(drafts, filters)) setFilters(f => ({ ...f, ...drafts }));
    else void load(0);
  }

  function resetFilters() {
    setFilters(blankFilters());
    setDrafts(blankDrafts());
    setModelOptions([]);
    setPage(0);
  }

  async function onFormMakeChange(make: string) {
    applyForm({ ...form, make, model: '' }, { ...touched, make: true });
    setFormModelOptions([]);
    if (!make) return;
    try {
      const models = (await catalogApi.models(make)).data;
      setFormModelOptions(models);
    } catch { /* ignore */ }
  }

  function openCreate() {
    detailSeqRef.current++;
    setEdit(null);
    setForm(blankForm());
    setFormModelOptions([]);
    setVinFacts('');
    setFormError('');
    setValidationErrors({});
    setTouched({});
    setServerErrors({});
    setAudit([]);
    setAdStatus('');
    setDrawer(true);
  }

  async function openEdit(id: number) {
    const seq = ++detailSeqRef.current;
    setFormError('');
    setValidationErrors({});
    setTouched({});
    setServerErrors({});
    setAudit([]);
    setAdStatus('');
    try {
      const r = await vehiclesApi.get(id);
      if (seq !== detailSeqRef.current) return;
      setEdit(r.data);
      setForm(vehicleToForm(r.data));
      setFormModelOptions([]);
      if (r.data.make) {
        catalogApi.models(r.data.make).then(mr => setFormModelOptions(mr.data)).catch(() => {});
      }
      setDrawer(true);
      loadAdStatus(id, seq);
      loadAudit(id, seq);
    } catch (e) {
      if (seq !== detailSeqRef.current) return;
      setEdit(null);
      setForm(blankForm());
      setDrawer(false);
      const missing = statusOf(e) === 404 || codeOf(e) === 'NOT_FOUND';
      setError(missing ? 'Vehicle not found. It may have been deleted; refresh the list.' : describeError(e, 'load vehicle'));
    }
  }

  async function loadAdStatus(id: number, seq: number) {
    try {
      const r = await listingsApi.get(id);
      if (seq !== detailSeqRef.current) return;
      setAdStatus(r.data.checkStatus || 'NOT_CHECKED');
    } catch {
      if (seq !== detailSeqRef.current) return;
      setAdStatus('');
    }
  }

  async function loadAudit(id: number, seq: number, page = 0) {
    if (!isManager) return;
    try {
      const r = await auditApi.list({ entityType: 'VEHICLE', entityId: id, page, size: 10 });
      if (seq !== detailSeqRef.current) return;
      setAudit(r.data.items || []);
      setAuditPage(r.data.page ?? page);
      setAuditTotal(r.data.totalElements ?? 0);
    } catch {
      if (seq !== detailSeqRef.current) return;
      setAudit([]);
      setAuditTotal(0);
    }
  }

  async function save() {
    setFormError('');
    setServerErrors({});
    const isSold = edit?.status === 'SOLD';
    const errors = validateForm(form, isSold);
    setTouched(ALL_TOUCHED);
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
      if (codeOf(e) === 'VALIDATION') setServerErrors(fieldErrorsOf(e));
      // VIN_DUP carries no fieldErrors, but it is about one field and belongs under it (UI-21).
      if (codeOf(e) === 'VIN_DUP') setServerErrors({ vin: mapWrite(e) });
      setFormError(mapWrite(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeVehicle() {
    if (!edit || !window.confirm('Delete this vehicle from active inventory? Its listing, closed work orders, and audit history are kept.')) return;
    try {
      await vehiclesApi.delete(edit.id);
      setDrawer(false);
      setEdit(null);
      await load();
    } catch (e) {
      setFormError(describeError(e, 'delete vehicle'));
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

  function beginSell() {
    setSellError('');
    setSellForm({ soldOn: '', soldPrice: '', buyerId: '' });
    setSellOpen(true);
    // The buyer list is optional help for linking the sale to a CRM customer.
    collectAllPages<any>((p) => customersApi.list({ page: p, size: 100 }))
      .then(setBuyers).catch(() => setBuyers([]));
  }

  async function openSell(id: number) {
    const seq = ++detailSeqRef.current;
    try {
      const r = await vehiclesApi.get(id);
      if (seq !== detailSeqRef.current) return;
      setEdit(r.data);
      setForm(vehicleToForm(r.data));
      setValidationErrors({});
      setTouched({});
      beginSell();
    } catch (e) {
      if (seq !== detailSeqRef.current) return;
      const missing = statusOf(e) === 404 || codeOf(e) === 'NOT_FOUND';
      setError(missing ? 'Vehicle not found. It may have been deleted; refresh the list.' : describeError(e, 'open sale'));
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
      if (sellForm.buyerId) {
        try {
          await customersApi.link(Number(sellForm.buyerId), edit.id);
        } catch (e) {
          setError(`Vehicle sold, but linking the buyer failed: ${describeError(e, 'link buyer')} Link it from the CRM page.`);
        }
      }
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
      applyForm({
        ...form,
        make: d.make,
        model: d.model || form.model,
        modelYear: d.modelYear ? String(d.modelYear) : form.modelYear,
        bodyType: d.bodyType || form.bodyType,
      }, { ...touched, make: true, model: true, modelYear: true, bodyType: true });
      if (d.make) {
        catalogApi.models(d.make).then(r => setFormModelOptions(r.data)).catch(() => {});
      }
      setVinFacts([d.bodyClass, d.engine, d.country, d.manufacturer].filter(Boolean).join(' · '));
    } catch (err) {
      setFormError(vinDecodeError(err));
    } finally {
      setDecoding(false);
    }
  }

  // Shows only the errors of fields the user has already left (or of a rejected save), so a field
  // being typed into stays quiet while a field that is done is checked straight away (UI-21).
  function showErrors(next: VehicleForm, visible: Record<string, boolean>) {
    const all = validateForm(next, edit?.status === 'SOLD');
    const shown: Validation = {};
    for (const key of Object.keys(all)) if (visible[key]) shown[key] = all[key];
    setValidationErrors(shown);
  }

  function applyForm(next: VehicleForm, visible: Record<string, boolean>) {
    setForm(next);
    setTouched(visible);
    showErrors(next, visible);
  }

  // `settled` marks controls whose value is complete as soon as it changes (dropdowns, date
  // pickers); free-text fields wait for blur so the error does not flicker while typing.
  const updateForm = (key: keyof VehicleForm, value: string, settled = false) => {
    applyForm({ ...form, [key]: value }, settled ? { ...touched, [key]: true } : touched);
    setServerErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const blurForm = (key: keyof VehicleForm) => applyForm(form, { ...touched, [key]: true });

  const isSold = edit?.status === 'SOLD';
  // With no catalog makes the dropdowns would be empty and no vehicle could be entered at all,
  // so make and model fall back to free text.
  const catalogUnavailable = !makeOptions.length;
  const sellTitle = edit
    ? `Sell ${edit.modelYear} ${edit.make} ${edit.model} · VIN ${edit.vin}`
    : 'Sell vehicle';

  const columns = [
    { key: 'ymm', label: 'Year Make Model', render: (row: any) => `${row.modelYear} ${row.make} ${row.model}` },
    { key: 'vin', label: 'VIN' },
    { key: 'stockNumber', label: 'Stock #', render: (row: any) => row.stockNumber || '—' },
    { key: 'bodyType', label: 'Body', render: (row: any) => enumLabel(row.bodyType) },
    { key: 'source', label: 'Source', render: (row: any) => enumLabel(row.source) },
    { key: 'conditionCode', label: 'Condition', render: (row: any) => enumLabel(row.conditionCode) },
    { key: 'purchaseCost', label: 'Cost', render: (row: any) => cad(row.purchaseCost) },
    { key: 'listPrice', label: 'List price', render: (row: any) => cad(row.listPrice) },
    { key: 'addedOn', label: 'Date added' },
    { key: 'openWorkOrders', label: 'Open WOs', render: (row: any) => row.openWorkOrders || '—' },
    { key: 'status', label: 'Status', render: (row: any) => <StatusTag status={row.status}>{enumLabel(row.status)}</StatusTag> },
  ];

  const actions = (row: any) => (
    <>
      <button className="btn-link" onClick={() => openEdit(row.id)}>Edit</button>
      {row.status !== 'SOLD' && <button className="btn-link" onClick={() => openSell(row.id)}>Sell</button>}
    </>
  );

  const purchaseFields = [
    { key: 'make' as const, label: 'Make', required: true },
    { key: 'model' as const, label: 'Model', required: true },
    { key: 'modelYear' as const, label: 'Model year', required: true },
    { key: 'vin' as const, label: 'VIN', required: true },
    { key: 'purchaseCost' as const, label: 'Purchase cost', required: true },
    { key: 'addedOn' as const, label: 'Added on', required: true },
    { key: 'repairCost' as const, label: 'Repair cost', required: false },
    { key: 'carfaxUrl' as const, label: 'Carfax URL', required: false },
  ];

  // Optional listing details; the buyer site shows mileage, colour and fuel type.
  const detailFields = [
    { key: 'stockNumber' as const, label: 'Stock number' },
    { key: 'mileageKm' as const, label: 'Mileage (km)' },
    { key: 'exteriorColor' as const, label: 'Exterior colour' },
    { key: 'listPrice' as const, label: 'List price' },
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
          {catalogUnavailable ? (
            <input className="input" placeholder="Make" aria-label="Make" value={drafts.make} onChange={e => setDrafts(d => ({ ...d, make: e.target.value }))} />
          ) : (
            <select className="select" aria-label="Make" value={filters.make} onChange={e => onMakeChange(e.target.value)}>
              <option value="">Make</option>
              {makeOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <input className="input" placeholder="Model" aria-label="Model" list="dms-filter-models" value={drafts.model}
            onChange={e => setDrafts(d => ({ ...d, model: e.target.value }))} />
          <datalist id="dms-filter-models">
            {modelOptions.map(m => <option key={m} value={m} />)}
          </datalist>
          <select className="select" aria-label="Year" value={filters.modelYear} onChange={e => changeFilter({ modelYear: e.target.value })}>
            <option value="">Year</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <input className="input" placeholder="Search VIN, make or model" aria-label="Search VIN, make or model" value={drafts.q}
            onChange={e => setDrafts(d => ({ ...d, q: e.target.value }))} />
          <select className="select" aria-label="Status" value={filters.status} onChange={e => changeFilter({ status: e.target.value })}>
            <option value="">Status</option>
            <option value="IN_STOCK">In stock</option>
            <option value="SOLD">Sold</option>
          </select>
          <select className="select" aria-label="Condition" value={filters.condition} onChange={e => changeFilter({ condition: e.target.value })}>
            <option value="">Condition</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{enumLabel(c)}</option>)}
          </select>
          <select className="select" aria-label="Body type" value={filters.bodyType} onChange={e => changeFilter({ bodyType: e.target.value })}>
            <option value="">Body type</option>
            {BODY_TYPES.map(b => <option key={b} value={b}>{enumLabel(b)}</option>)}
          </select>
          <button className="btn" onClick={applySearch}>Search</button>
          <button className="btn" onClick={resetFilters}>Reset</button>
        </div>
        {catalogError && <p className="warning-text">{catalogError}</p>}
        <PageState loading={loading} error={error} forbidden={forbidden} empty={!loading && !error && !forbidden && !rows.length}
          emptyText="No vehicles match." loadingText="Loading vehicles…" forbiddenText="You do not have access to DMS.">
          <DataTable rows={rows} total={total} page={page} columns={columns} actions={actions}
            rowClassName={row => row.status === 'SOLD' ? 'sold-row' : ''} onPage={p => { setPage(p); void load(p); }} />
        </PageState>
      </div>

      <FormDrawer title={edit ? 'Edit vehicle' : 'Add vehicle'} open={drawer} onClose={() => { if (!sellOpen) setDrawer(false); }}>
        <form onSubmit={e => { e.preventDefault(); void save(); }}>
          {purchaseFields.map(field => (
            <div className="form-item" key={field.key}>
              <label className={field.required ? 'form-label form-required' : 'form-label'}>{field.label}</label>
              <div>
                {field.key === 'make' ? (
                  catalogUnavailable ? (
                    <input className="input" value={form.make} onChange={e => updateForm('make', e.target.value)}
                      onBlur={() => blurForm('make')} disabled={isSold} />
                  ) : (
                    <select className="select" value={form.make} onChange={e => onFormMakeChange(e.target.value)} disabled={isSold}>
                      <option value="">Select make</option>
                      {/* The catalog returns ALL CAPS but stored makes may be title case
                          (and models may still be loading). Pin the current value as a
                          virtual option so a controlled <select> can always display it. */}
                      {form.make && !makeOptions.includes(form.make) && (
                        <option value={form.make}>{form.make}</option>
                      )}
                      {makeOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )
                ) : field.key === 'model' ? (
                  catalogUnavailable ? (
                    <input className="input" value={form.model} onChange={e => updateForm('model', e.target.value)}
                      onBlur={() => blurForm('model')} disabled={isSold} />
                  ) : (
                    <select className="select" value={form.model} onChange={e => updateForm('model', e.target.value, true)} disabled={isSold || !form.make}>
                      <option value="">Select model</option>
                      {/* Same guard as make: the options list may lag the loaded value by one
                          async hop, or carry a different casing than the stored row. */}
                      {form.model && !formModelOptions.includes(form.model) && (
                        <option value={form.model}>{form.model}</option>
                      )}
                      {formModelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )
                ) : field.key === 'modelYear' ? (
                  <select className="select" value={form.modelYear} onChange={e => updateForm('modelYear', e.target.value, true)} disabled={isSold}>
                    <option value="">Select year</option>
                    {/* Pin the stored year if it is outside the current year window
                        (e.g. a very old vehicle or a VIN-decoded future model year). */}
                    {form.modelYear && !yearOptions.some(y => String(y) === form.modelYear) && (
                      <option value={form.modelYear}>{form.modelYear}</option>
                    )}
                    {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                ) : field.key === 'vin' && !edit ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" value={form[field.key]} onChange={e => updateForm(field.key, e.target.value)}
                      onBlur={() => blurForm(field.key)} disabled={isSold} style={{ flex: 1 }} />
                    <button type="button" className="btn" onClick={decodeVin} disabled={decoding}>{decoding ? 'Decoding…' : 'Decode'}</button>
                  </div>
                ) : field.key === 'addedOn' ? (
                  <input className="input" type="date" value={form[field.key]} onChange={e => updateForm(field.key, e.target.value, true)} disabled={isSold} lang="en" />
                ) : (
                  <input className="input" value={form[field.key]} onChange={e => updateForm(field.key, e.target.value)}
                    onBlur={() => blurForm(field.key)} disabled={isSold} />
                )}
                {field.key === 'vin' && !edit && vinFacts && <div className="muted" style={{ marginTop: 4 }}>{vinFacts}</div>}
                {field.key === 'carfaxUrl' && URL_PATTERN.test(form.carfaxUrl) && (
                  <a href={form.carfaxUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 4 }}>Open Carfax report</a>
                )}
              </div>
              {(validationErrors[field.key] || serverErrors[field.key]) && (
                <div className="form-error">{validationErrors[field.key] || serverErrors[field.key]}</div>
              )}
            </div>
          ))}

          <div className="form-item">
            <label className="form-label form-required">Source</label>
            <select className="select" value={form.source} onChange={e => updateForm('source', e.target.value, true)} disabled={isSold}>
              {!form.source && <option value="">Select source</option>}
              {/* Virtual option for a value the backend already knows but the frontend enum
                  does not list yet — stops the stored row from silently flipping on save. */}
              {form.source && !SOURCES.includes(form.source as (typeof SOURCES)[number]) && (
                <option value={form.source}>{enumLabel(form.source)}</option>
              )}
              {SOURCES.map(v => <option key={v} value={v}>{enumLabel(v)}</option>)}
            </select>
            {(validationErrors.source || serverErrors.source) && <div className="form-error">{validationErrors.source || serverErrors.source}</div>}
          </div>

          <div className="form-item">
            <label className="form-label form-required">Condition</label>
            <select className="select" value={form.conditionCode} onChange={e => updateForm('conditionCode', e.target.value, true)}>
              {!form.conditionCode && <option value="">Select condition</option>}
              {form.conditionCode && !CONDITIONS.includes(form.conditionCode as (typeof CONDITIONS)[number]) && (
                <option value={form.conditionCode}>{enumLabel(form.conditionCode)}</option>
              )}
              {CONDITIONS.map(v => <option key={v} value={v}>{enumLabel(v)}</option>)}
            </select>
            {(validationErrors.conditionCode || serverErrors.conditionCode) && <div className="form-error">{validationErrors.conditionCode || serverErrors.conditionCode}</div>}
          </div>

          <div className="form-item">
            <label className="form-label">Body type</label>
            <select className="select" value={form.bodyType} onChange={e => updateForm('bodyType', e.target.value, true)} disabled={isSold}>
              {!edit?.id && <option value="">Not set</option>}
              {form.bodyType && !BODY_TYPES.includes(form.bodyType as (typeof BODY_TYPES)[number]) && (
                <option value={form.bodyType}>{enumLabel(form.bodyType)}</option>
              )}
              {BODY_TYPES.map(v => <option key={v} value={v}>{enumLabel(v)}</option>)}
            </select>
            {(validationErrors.bodyType || serverErrors.bodyType) && <div className="form-error">{validationErrors.bodyType || serverErrors.bodyType}</div>}
          </div>

          {detailFields.map(field => (
            <div className="form-item" key={field.key}>
              <label className="form-label">{field.label}</label>
              <input className="input" value={form[field.key]} onChange={e => updateForm(field.key, e.target.value)}
                onBlur={() => blurForm(field.key)} disabled={isSold} inputMode={field.key === 'mileageKm' ? 'numeric' : undefined} />
              {(validationErrors[field.key] || serverErrors[field.key]) && (
                <div className="form-error">{validationErrors[field.key] || serverErrors[field.key]}</div>
              )}
            </div>
          ))}

          <div className="form-item">
            <label className="form-label">Fuel type</label>
            <select className="select" value={form.fuelType} onChange={e => updateForm('fuelType', e.target.value, true)} disabled={isSold}>
              <option value="">Not set</option>
              {FUEL_TYPES.map(v => <option key={v} value={v}>{enumLabel(v)}</option>)}
            </select>
          </div>

          {edit?.id && !isSold && (
            <>
              {/* Optional fields set by the sell action; an in-stock vehicle shows them empty. */}
              <div className="form-item"><label className="form-label">Sold date</label><span>—</span></div>
              <div className="form-item"><label className="form-label">Sold price</label><span>—</span></div>
            </>
          )}

          {isSold && (
            <>
              <div className="form-item"><label className="form-label">Sold date</label><span>{edit.soldOn}</span></div>
              <div className="form-item"><label className="form-label">Sold price</label><span>{cad(edit.soldPrice)}</span></div>
              <div className="form-item">
                <label className="form-label">Profit (sold price − purchase cost − repair cost)</label>
                <span className={((profit(edit) ?? 0) < 0) ? 'danger-text' : ''}>{cad(profit(edit))}</span>
              </div>
              <div className="form-item">
                <label className="form-label">Bill of sale</label>
                <Link to={`/dms/${edit.id}/bill-of-sale`}>Open printable bill of sale</Link>
              </div>
            </>
          )}

          {edit?.id && (
            <div className="form-item">
              <label className="form-label">Status</label>
              <StatusTag status={edit.status}>{enumLabel(edit.status)}</StatusTag>
            </div>
          )}

          {edit?.id && (
            <div className="form-item">
              <label className="form-label">Linked customer</label>
              {edit.linkedCustomer ? (
                <Link to={`/crm?customerId=${edit.linkedCustomer.id}`}>{edit.linkedCustomer.name}</Link>
              ) : <span>—</span>}
            </div>
          )}

          {edit?.id && (
            <div className="form-item">
              <label className="form-label">Ad check status</label>
              {adStatus
                ? <StatusTag status={adStatus}>{checkStatusLabel(adStatus) || 'Not checked'}</StatusTag>
                : <span>—</span>}
            </div>
          )}

          {formError && <p className="danger-text">{formError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            {edit && edit.status !== 'SOLD' && <button type="button" className="btn danger" style={{ marginLeft: 8 }} onClick={() => void removeVehicle()}>Delete vehicle</button>}
            {edit?.id && !isSold && (
              <button type="button" className="btn" onClick={beginSell}>Mark as sold</button>
            )}
          </div>
        </form>

        {isSold && <PaymentPanel vehicleId={edit.id} onChanged={() => loadAudit(edit.id, detailSeqRef.current)} />}
        {edit?.id && <WorkOrderPanel vehicleId={edit.id} sold={isSold} onChanged={refreshAfterWorkOrder} />}
        {edit?.id && <PhotoStudioPanel vehicleId={edit.id} onChanged={() => loadAudit(edit.id, detailSeqRef.current)} />}
        {edit?.id && isManager && (
          <AuditTrail
            rows={audit}
            page={auditPage}
            total={auditTotal}
            onPage={(p) => void loadAudit(edit.id, detailSeqRef.current, p)}
          />
        )}
      </FormDrawer>

      <ConfirmDialog open={sellOpen} title={sellTitle} confirmLabel="Confirm sale" onCancel={() => setSellOpen(false)} onConfirm={sell}>
        <div className="form-item">
          <label className="form-label form-required">Sold date</label>
          <input className="input" type="date" value={sellForm.soldOn} onChange={e => setSellForm(f => ({ ...f, soldOn: e.target.value }))} lang="en" />
        </div>
        <div className="form-item">
          <label className="form-label form-required">Sold price</label>
          <input className="input" value={sellForm.soldPrice} onChange={e => setSellForm(f => ({ ...f, soldPrice: e.target.value }))} />
        </div>
        <div className="form-item">
          <label className="form-label">Buyer (CRM customer)</label>
          {edit?.linkedCustomer ? (
            <span>{edit.linkedCustomer.name}</span>
          ) : (
            <select className="select" aria-label="Buyer" value={sellForm.buyerId} onChange={e => setSellForm(f => ({ ...f, buyerId: e.target.value }))}>
              <option value="">Not linked yet</option>
              {buyers.map(c => <option key={c.id} value={String(c.id)}>{c.name} · {c.phone}</option>)}
            </select>
          )}
        </div>
        {sellError && <p className="danger-text">{sellError}</p>}
      </ConfirmDialog>
    </AppLayout>
  );
}
