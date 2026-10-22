import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import AppLayout from '../layouts/AppLayout';
import DataTable from '../components/DataTable';
import PageState from '../components/PageState';
import AdWorkspace from '../components/AdWorkspace';
import PhotoStudioPanel from '../components/PhotoStudioPanel';
import StatusTag from '../components/StatusTag';
import AuditTrail, { type AuditRow } from '../components/AuditTrail';
import { auditApi } from '../api/audit';
import { vehiclesApi } from '../api/vehicles';
import { buyerSiteApi } from '../api/buyerSite';
import SearchSuggest, { SUGGEST_LIMIT, uniqueSuggestions } from '../components/SearchSuggest';
import {
  apiError, applyCheckToListing, checkStatusLabel, emptyListing,
  listingsApi, readyExportMessageAsync, saveMessage,
  type CheckStatus, type Listing,
} from '../api/listings';
import { describeError } from '../api/errors';

/** Table label of an ad type; `Unavailable` when the listing could not be loaded. */
function kindLabel(kind?: string) {
  if (kind === 'CASH') return 'Cash';
  if (kind === 'FINANCE') return 'Finance';
  if (kind === 'LEASE') return 'Lease';
  return 'Unavailable';
}

/** Table label of an ad medium; `Unavailable` when the listing could not be loaded. */
function mediumLabel(medium?: string) {
  if (medium === 'ONLINE') return 'Online';
  if (medium === 'RADIO_TV_BILLBOARD') return 'Radio / TV / Billboard';
  return 'Unavailable';
}

/** The editable ad fields as one string, compared with the saved copy to detect unsaved edits. */
/**
 * Whether the vehicle is on the buyer site, by the same rule the public inventory uses (SHOP-01):
 * in stock, ad ready, and its check passed on the current version.
 */
function buyerSiteLabel(vehicleStatus: string, ad?: { status?: string; checkStatus?: CheckStatus | null }) {
  if (vehicleStatus === 'SOLD') return <span className="muted">{ad?.status === 'READY' ? 'Taken down' : 'Not listed'}</span>;
  if (ad?.status === 'READY' && ad.checkStatus === 'PASSED') return <StatusTag status="PASSED">Listed</StatusTag>;
  if (ad?.checkStatus === 'PASSED') return <span className="muted">Mark ready</span>;
  return <span className="muted">Not listed</span>;
}

// One filter per table column: Vehicle, Type, Medium, Check status, Buyer site.
const EMPTY_AD_FILTERS = { q: '', adKind: '', medium: '', checkStatus: '', buyerSite: '' };
const CHECK_STATUSES: CheckStatus[] = ['NEEDS_AI', 'BLOCKED', 'PASSED', 'STALE', 'AI_UNAVAILABLE'];

function contentKey(row: Listing) {
  return JSON.stringify([row.title ?? '', row.body ?? '', row.adKind, row.medium, row.priorUse, row.warrantyTerms, row.annualKmAllowance]);
}

/** Ad compliance page: pick a vehicle, edit its ad, run the check, mark it ready and export it. */
export default function AdsPage() {
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  // Typed filters, and the ones the list was last searched with.
  const [filters, setFilters] = useState(EMPTY_AD_FILTERS);
  const [applied, setApplied] = useState(EMPTY_AD_FILTERS);
  const [selected, setSelected] = useState<any>();
  const [listing, setListing] = useState<Listing>(emptyListing());
  const [summaries, setSummaries] = useState<Record<number, { adKind?: string; medium?: string; status?: string; checkStatus?: CheckStatus | null }>>({});
  // How many vehicles the buyer site lists right now, read from the public inventory itself.
  const [listedCount, setListedCount] = useState<number | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [listForbidden, setListForbidden] = useState(false);
  const [listingLoading, setListingLoading] = useState(false);
  const [listingError, setListingError] = useState('');
  const [listingForbidden, setListingForbidden] = useState(false);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [readyBusy, setReadyBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const dealerId = useSessionStore((st) => st.dealerId);
  // Record history is manager only (AUD-17); staff never call the audit API.
  const isManager = useSessionStore((st) => st.dealerRole === 'MANAGER');
  const [publishPlatform, setPublishPlatform] = useState('Kijiji');
  const [demoPublish, setDemoPublish] = useState<{ platform: string; reference: string; publishedAt: string } | null>(null);
  const [savedContent, setSavedContent] = useState(contentKey(emptyListing()));
  const vehicleListSeq = useRef(0);
  const listingLoadSeq = useRef(0);
  const loadedListingVehicleIdRef = useRef<number | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);

  const unsaved = contentKey(listing) !== savedContent;
  const sold = selected?.status === 'SOLD';
  const canRunCheck = !!listing.id && !sold && !unsaved;
  const canMarkReady = !!listing.id && listing.checkStatus === 'PASSED' && !sold && !unsaved;
  const canExport = !!listing.id && listing.checkStatus === 'PASSED' && !sold && !unsaved;
  const canSimulatePublish = !!listing.id && listing.status === 'READY' && listing.checkStatus === 'PASSED' && !sold && !unsaved;

  const loadDemoPublish = (vehicleId: number) => {
    try {
      const value = localStorage.getItem(`dealerops-demo-publish-${vehicleId}`);
      setDemoPublish(value ? JSON.parse(value) : null);
    } catch { setDemoPublish(null); }
  };

  const rememberSummary = (row: Listing) => {
    if (!row.vehicleId) return;
    setSummaries((s) => ({ ...s, [row.vehicleId]: { adKind: row.adKind, medium: row.medium, status: row.status, checkStatus: row.checkStatus } }));
  };

  const loadVehicles = useCallback(async () => {
    const seq = ++vehicleListSeq.current;
    setListLoading(true); setListError(''); setListForbidden(false);
    try {
      const r = await vehiclesApi.list({ ...applied, page, size: 10 });
      if (seq !== vehicleListSeq.current) return;
      const items = r.data.items || [];
      setVehicles(items); setTotal(r.data.totalElements || 0);
      // The table shows each vehicle's ad type, medium and check status, so fetch the page's
      // listings up front. A vehicle without a saved ad gets the server's virtual draft (Cash,
      // Online, Needs AI review), the same values its form and the DMS detail show.
      const results = await Promise.allSettled(items.map((v: any) => listingsApi.get(v.id)));
      if (seq !== vehicleListSeq.current) return;
      setSummaries((s) => {
        const next = { ...s };
        results.forEach((res, i) => {
          if (res.status !== 'fulfilled') return;
          const l = res.value.data;
          next[items[i].id] = { adKind: l.adKind, medium: l.medium, status: l.status, checkStatus: l.checkStatus };
        });
        return next;
      });
    } catch (e) {
      if (seq !== vehicleListSeq.current) return;
      setVehicles([]);
      const { status, code } = apiError(e);
      if (status === 403 || code === 'FORBIDDEN') setListForbidden(true);
      else setListError(describeError(e, 'load vehicles'));
    } finally {
      if (seq === vehicleListSeq.current) setListLoading(false);
    }
  }, [page, applied]);

  function search(next = filters) { setFilters(next); setApplied(next); setPage(0); }

  useEffect(() => { void loadVehicles(); }, [loadVehicles]);

  // Any saved, checked, ready or sold change shows up in summaries; recount the buyer site then.
  useEffect(() => {
    if (dealerId == null) return;
    let active = true;
    buyerSiteApi.inventory(String(dealerId))
      .then((inv) => { if (active) setListedCount(inv.vehicles.length); })
      .catch(() => { if (active) setListedCount(null); });
    return () => { active = false; };
  }, [dealerId, summaries]);

  // The saved ad's LISTING history (managers only); a reply for an ad that is no longer open is ignored.
  async function loadAudit(listingId: number, seq: number, page = 0) {
    if (!isManager) return;
    try {
      const r = await auditApi.list({ entityType: 'LISTING', entityId: listingId, page, size: 10 });
      if (seq !== listingLoadSeq.current) return;
      setAudit(r.data.items || []);
      setAuditPage(r.data.page ?? page);
      setAuditTotal(r.data.totalElements ?? 0);
    } catch {
      if (seq !== listingLoadSeq.current) return;
      setAudit([]);
      setAuditTotal(0);
    }
  }

  const select = async (vehicle: any) => {
    const seq = ++listingLoadSeq.current;
    setSelected(vehicle); setListingError(''); setListingForbidden(false); setActionError('');
    setDemoPublish(null);
    loadDemoPublish(vehicle.id);
    setListingLoading(true); loadedListingVehicleIdRef.current = null;
    const empty = emptyListing(vehicle.id);
    setListing(empty); setSavedContent(contentKey(empty));
    setAudit([]); setAuditPage(0); setAuditTotal(0);
    try {
      const r = await listingsApi.get(vehicle.id);
      if (seq !== listingLoadSeq.current) return;
      const merged = { ...empty, ...r.data, vehicleId: vehicle.id };
      setListing(merged); setSavedContent(contentKey(merged));
      loadedListingVehicleIdRef.current = vehicle.id;
      rememberSummary(merged);
      if (merged.id) void loadAudit(merged.id, seq);
    } catch (e) {
      if (seq !== listingLoadSeq.current) return;
      const { status, code } = apiError(e);
      if (status === 403 || code === 'FORBIDDEN') setListingForbidden(true);
      else setListingError(status === 404 || code === 'NOT_FOUND' ? 'Vehicle not found. It may have been deleted; refresh the list.' : describeError(e, 'load the ad'));
    } finally {
      if (seq === listingLoadSeq.current) setListingLoading(false);
    }
  };

  const simulatePublish = () => {
    if (!selected?.id || !canSimulatePublish) return;
    const result = {
      platform: publishPlatform,
      reference: `DEMO-${selected.id}-${Date.now().toString(36).toUpperCase()}`,
      publishedAt: new Date().toISOString(),
    };
    localStorage.setItem(`dealerops-demo-publish-${selected.id}`, JSON.stringify(result));
    setDemoPublish(result);
  };

  const simulateUnpublish = () => {
    if (!selected?.id) return;
    localStorage.removeItem(`dealerops-demo-publish-${selected.id}`);
    setDemoPublish(null);
  };

  const refreshListing = async () => {
    if (!selected?.id) return;
    const seq = listingLoadSeq.current;
    const vehicleId = selected.id;
    const r = await listingsApi.get(vehicleId);
    if (seq !== listingLoadSeq.current || selected?.id !== vehicleId) return;
    const merged = { ...emptyListing(vehicleId), ...r.data, vehicleId };
    setListing(merged); setSavedContent(contentKey(merged));
    loadedListingVehicleIdRef.current = vehicleId;
    rememberSummary(merged);
    return merged;
  };

  const save = async () => {
    if (!selected?.id || sold) return;
    const vehicleId = selected.id;
    if (listing.vehicleId !== vehicleId || loadedListingVehicleIdRef.current !== vehicleId) return;
    setSaving(true); setActionError('');
    try {
      const r = await listingsApi.save(vehicleId, {
        version: listing.version || 0, title: listing.title ?? '', body: listing.body ?? '',
        adKind: listing.adKind, medium: listing.medium, priorUse: listing.priorUse,
        warrantyTerms: listing.warrantyTerms, annualKmAllowance: listing.annualKmAllowance,
      });
      if (selected?.id !== vehicleId) return;
      const merged = { ...emptyListing(vehicleId), ...r.data, vehicleId };
      setListing(merged); setSavedContent(contentKey(merged));
      loadedListingVehicleIdRef.current = vehicleId;
      rememberSummary(merged);
      if (merged.id) void loadAudit(merged.id, listingLoadSeq.current);
    } catch (e) {
      if (selected?.id !== vehicleId) return;
      setActionError(saveMessage(e));
    } finally { setSaving(false); }
  };

  const runCheck = async () => {
    if (!listing.id || sold || !selected?.id) return;
    const vehicleId = selected.id;
    const listingId = listing.id;
    if (listing.vehicleId !== vehicleId) return;
    setChecking(true); setActionError('');
    try {
      const check = (await listingsApi.check(listing.id, { version: listing.version })).data;
      if (selected?.id !== vehicleId) return;
      try { await refreshListing(); } catch {
        if (selected?.id !== vehicleId || listing.vehicleId !== vehicleId) return;
        setListing((l) => { const upd = applyCheckToListing(l, check); rememberSummary(upd); return upd; });
      }
    } catch (e) {
      if (selected?.id !== vehicleId) return;
      const { status, code } = apiError(e);
      // AD-09: a stored AI failure is never a pass. A dropped call that never reached Core must
      // not hide the check already on file, so reload that listing and keep its status.
      const noResponse = !(e as { response?: unknown })?.response;
      if ((status ?? 0) >= 500 || code === 'AI_UNAVAILABLE' || noResponse) {
        if (listing.vehicleId !== vehicleId) return;
        try {
          const stored = await refreshListing();
          if (stored && stored.checkStatus !== 'PASSED') {
            setActionError('AI review is unavailable. The advertisement did not pass; run the check again.');
          }
        } catch {
          if (listing.vehicleId !== vehicleId) return;
          setListing((l) => {
            if (l.vehicleId !== vehicleId || l.checkStatus !== 'PASSED') return l;
            const upd = { ...l, checkStatus: 'AI_UNAVAILABLE' as const, lastCheckId: null, lastCheck: null };
            rememberSummary(upd);
            return upd;
          });
          setActionError('AI review is unavailable. The advertisement did not pass; run the check again.');
        }
      } else if (code === 'VERSION_CONFLICT') setActionError('Refresh and retry: someone else changed this record after you opened it. Reopen it to load the latest version, then make your change again.');
      else if (status === 404 || code === 'NOT_FOUND') setActionError('Vehicle not found. It may have been deleted; refresh the list.');
      else if (status === 403 || code === 'FORBIDDEN') setActionError('You do not have access to Ad compliance.');
      else setActionError(describeError(e, 'run the compliance check'));
    } finally {
      setChecking(false);
      // A stored check is audited whether it passed or not.
      void loadAudit(listingId, listingLoadSeq.current);
    }
  };

  const markReady = async () => {
    if (!listing.id || listing.checkStatus !== 'PASSED' || !selected?.id) return;
    const vehicleId = selected.id;
    if (listing.vehicleId !== vehicleId) return;
    setReadyBusy(true); setActionError('');
    try {
      const r = await listingsApi.ready(listing.id, { version: listing.version });
      if (selected?.id !== vehicleId || listing.vehicleId !== vehicleId) return;
      const upd = { ...listing, ...r.data, id: listing.id, vehicleId };
      setListing(upd); rememberSummary(upd);
      void loadAudit(listing.id, listingLoadSeq.current);
    } catch (e) {
      if (selected?.id !== vehicleId) return;
      setActionError(await readyExportMessageAsync(e));
    } finally { setReadyBusy(false); }
  };

  const exportTxt = async () => {
    if (!listing.id || listing.checkStatus !== 'PASSED') return;
    setExportBusy(true); setActionError('');
    try {
      const r = await listingsApi.export(listing.id, { version: listing.version });
      const blob = r.data instanceof Blob ? r.data : new Blob([r.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'dealer-ad.txt'; a.click();
      URL.revokeObjectURL(url);
      void loadAudit(listing.id, listingLoadSeq.current);
    } catch (e) {
      setActionError(await readyExportMessageAsync(e));
    } finally { setExportBusy(false); }
  };

  useEffect(() => {
    const vehicleId = searchParams.get('vehicleId');
    if (vehicleId) {
      const id = Number(vehicleId);
      if (Number.isFinite(id) && id > 0) {
        const fromList = vehicles.find((v: any) => v.id === id);
        if (fromList) void select(fromList);
        else vehiclesApi.get(id).then((r) => select(r.data)).catch(() => setListingError('Vehicle not found'));
      }
    }
  }, [searchParams.get('vehicleId')]);

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <div><h1>Ad compliance</h1><span className="muted">Check and prepare an advertisement</span></div>
        </div>
        <AdWorkspace listing={listing} onChange={setListing} vehicle={selected} readOnly={sold}
          pickerSlot={
            <div className="card">
              <div className="card-header">Vehicles</div>
              <div className="filters ads-filters">
                <SearchSuggest value={filters.q} placeholder="VIN, make or model" ariaLabel="Search vehicles"
                  onChange={(v) => setFilters((f) => ({ ...f, q: v }))}
                  suggest={async (q) => {
                    const r = await vehiclesApi.list({ ...filters, q, size: SUGGEST_LIMIT });
                    return uniqueSuggestions((r.data.items || []).map((v: any) => ({
                      value: v.model, label: `${v.make} ${v.model}`, hint: `${v.modelYear} · ${v.vin}` })));
                  }}
                  onPick={(s) => search({ ...filters, q: s.value })}
                  onEnter={() => search()} />
                <select className="select" aria-label="Ad type" value={filters.adKind}
                  onChange={(e) => setFilters((f) => ({ ...f, adKind: e.target.value }))}>
                  <option value="">Ad type</option>
                  <option value="CASH">Cash</option>
                  <option value="FINANCE">Finance</option>
                  <option value="LEASE">Lease</option>
                </select>
                <select className="select" aria-label="Medium" value={filters.medium}
                  onChange={(e) => setFilters((f) => ({ ...f, medium: e.target.value }))}>
                  <option value="">Medium</option>
                  <option value="ONLINE">Online</option>
                  <option value="RADIO_TV_BILLBOARD">Radio / TV / Billboard</option>
                </select>
                <select className="select" aria-label="Check status" value={filters.checkStatus}
                  onChange={(e) => setFilters((f) => ({ ...f, checkStatus: e.target.value }))}>
                  <option value="">Check status</option>
                  {CHECK_STATUSES.map((s) => <option key={s} value={s}>{checkStatusLabel(s)}</option>)}
                </select>
                <select className="select" aria-label="Buyer site" value={filters.buyerSite}
                  onChange={(e) => setFilters((f) => ({ ...f, buyerSite: e.target.value }))}>
                  <option value="">Buyer site</option>
                  <option value="LISTED">Listed</option>
                  <option value="NOT_LISTED">Not listed</option>
                  <option value="TAKEN_DOWN">Taken down (sold)</option>
                </select>
                <button className="btn" onClick={() => search()}>Search</button>
                <button className="btn" onClick={() => search(EMPTY_AD_FILTERS)}>Reset</button>
              </div>
              {listedCount != null && dealerId != null && (
                <p className="muted" style={{ margin: '0 0 12px' }}>
                  <strong>{listedCount}</strong> {listedCount === 1 ? 'vehicle is' : 'vehicles are'} listed on your{' '}
                  <Link to={`/shop/${dealerId}`} target="_blank">buyer site</Link>. A sold vehicle is taken down automatically.
                </p>
              )}
              <PageState loading={listLoading} error={listError} forbidden={listForbidden}
                empty={!listLoading && !listError && !listForbidden && !vehicles.length}
                emptyText="No vehicles to advertise." loadingText="Loading listing…"
                forbiddenText="You do not have access to Ad compliance.">
                <DataTable rows={vehicles} total={total} page={page}
                  onPage={(p) => { setPage(p); }}
                  rowClassName={(r: any) => r.status === 'SOLD' ? 'sold-row' : ''}
                  columns={[
                    { label: 'Vehicle', render: (r: any) => `${r.modelYear} ${r.make} ${r.model}` },
                    { label: 'Type', render: (r: any) => kindLabel(summaries[r.id]?.adKind) },
                    { label: 'Medium', render: (r: any) => mediumLabel(summaries[r.id]?.medium) },
                    { label: 'Check status', render: (r: any) => {
                      const s = summaries[r.id]?.checkStatus;
                      return s ? <StatusTag status={s}>{checkStatusLabel(s)}</StatusTag> : <span className="muted">Unavailable</span>;
                    } },
                    { label: 'Buyer site', render: (r: any) => buyerSiteLabel(r.status, summaries[r.id]) },
                  ]}
                  actions={(r: any) => <button className="btn-link" onClick={() => select(r)}>Open</button>}
                />
              </PageState>
            </div>
          }
          actionsSlot={
            <>
              {listingLoading && <PageState loading loadingText="Loading listing…" />}
              {listingForbidden && <PageState forbidden forbiddenText="You do not have access to Ad compliance." />}
              {listingError && <p className="danger-text">{listingError}</p>}
              {actionError && <p className="danger-text">{actionError}</p>}
              {unsaved && listing.id && !sold && <p className="muted">Save the draft before running a check or exporting.</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <button className="btn" disabled={!selected || sold || saving} onClick={save}>{saving ? 'Saving…' : 'Save draft'}</button>
                <button className="btn" disabled={!canRunCheck || checking} onClick={runCheck}>{checking ? 'Checking…' : 'Run check'}</button>
                <button className="btn" disabled={!canMarkReady || readyBusy} onClick={markReady}>{readyBusy ? 'Marking…' : 'Mark ready'}</button>
                <button className="btn" disabled={!canExport || exportBusy} onClick={exportTxt}>{exportBusy ? 'Exporting…' : 'Export TXT'}</button>
              </div>
              <section className="card" style={{ marginTop: 16 }} aria-label="Demo publishing">
                <div className="card-header">Marketplace publishing demo</div>
                <p className="muted">This student project has no marketplace account or publishing authorization. Actions here are simulated in this browser; no ad is sent to Kijiji or another external platform.</p>
                {dealerId != null && (
                  <p className="muted">
                    Ready ads with a current passed check are listed on your dealership&apos;s{' '}
                    <Link to={`/shop/${dealerId}`} target="_blank">buyer site</Link>.
                  </p>
                )}
                {demoPublish ? (
                  <div>
                    <p><strong>Simulated status:</strong> Published to {demoPublish.platform} (demo)</p>
                    <p className="muted">Reference: {demoPublish.reference} · {new Date(demoPublish.publishedAt).toLocaleString()}</p>
                    <button className="btn" disabled={!selected || sold} onClick={simulateUnpublish}>Simulate unpublish</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <label htmlFor="demo-publish-platform">Target platform</label>
                    <select id="demo-publish-platform" value={publishPlatform} onChange={(e) => setPublishPlatform(e.target.value)}>
                      <option value="Kijiji">Kijiji (simulation)</option>
                      <option value="AutoTrader.ca">AutoTrader.ca (simulation)</option>
                      <option value="Other marketplace">Other marketplace (simulation)</option>
                    </select>
                    <button className="btn" disabled={!canSimulatePublish} onClick={simulatePublish}>Simulate publish</button>
                    {!canSimulatePublish && <span className="muted">Save the ad, pass the compliance check, and mark it ready first.</span>}
                  </div>
                )}
              </section>
              {/* The ad's photos: the same Image Studio as the DMS vehicle drawer. */}
              {selected && (
                <section className="card" style={{ marginTop: 16 }} aria-label="Image Studio">
                  <PhotoStudioPanel key={selected.id} vehicleId={selected.id} />
                </section>
              )}
              {isManager && listing.id && (
                <AuditTrail
                  rows={audit}
                  page={auditPage}
                  total={auditTotal}
                  onPage={(p) => { if (listing.id) void loadAudit(listing.id, listingLoadSeq.current, p); }}
                />
              )}
            </>
          }
        />
      </div>
    </AppLayout>
  );
}
