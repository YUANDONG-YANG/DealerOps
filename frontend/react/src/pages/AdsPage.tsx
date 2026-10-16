import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DataTable from '../components/DataTable';
import PageState from '../components/PageState';
import AdWorkspace from '../components/AdWorkspace';
import { vehiclesApi } from '../api/vehicles';
import {
  apiError, applyCheckToListing, checkStatusLabel, emptyListing,
  listingsApi, readyExportMessageAsync, saveMessage,
  type CheckStatus, type Listing,
} from '../api/listings';

function kindLabel(kind?: string) {
  if (kind === 'CASH') return 'Cash';
  if (kind === 'FINANCE') return 'Finance';
  if (kind === 'LEASE') return 'Lease';
  return '—';
}

function mediumLabel(medium?: string) {
  if (medium === 'ONLINE') return 'Online';
  if (medium === 'RADIO_TV_BILLBOARD') return 'Radio / TV / Billboard';
  return '—';
}

function contentKey(row: Listing) {
  return JSON.stringify([row.title ?? '', row.body ?? '', row.adKind, row.medium]);
}

export default function AdsPage() {
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<any>();
  const [listing, setListing] = useState<Listing>(emptyListing());
  const [summaries, setSummaries] = useState<Record<number, { adKind?: string; medium?: string; checkStatus?: CheckStatus | null }>>({});
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
  const [savedContent, setSavedContent] = useState(contentKey(emptyListing()));
  const vehicleListSeq = useRef(0);
  const listingLoadSeq = useRef(0);
  const loadedListingVehicleIdRef = useRef<number | null>(null);

  const unsaved = contentKey(listing) !== savedContent;
  const sold = selected?.status === 'SOLD';
  const canRunCheck = !!listing.id && !sold && !unsaved;
  const canMarkReady = !!listing.id && listing.checkStatus === 'PASSED' && !sold && !unsaved;
  const canExport = !!listing.id && listing.checkStatus === 'PASSED' && !sold && !unsaved;

  const rememberSummary = (row: Listing) => {
    if (!row.vehicleId) return;
    setSummaries((s) => ({ ...s, [row.vehicleId]: { adKind: row.adKind, medium: row.medium, checkStatus: row.checkStatus } }));
  };

  const loadVehicles = useCallback(async () => {
    const seq = ++vehicleListSeq.current;
    setListLoading(true); setListError(''); setListForbidden(false);
    try {
      const r = await vehiclesApi.list({ page, size: 10 });
      if (seq !== vehicleListSeq.current) return;
      setVehicles(r.data.items || []); setTotal(r.data.totalElements || 0);
    } catch (e) {
      if (seq !== vehicleListSeq.current) return;
      setVehicles([]);
      const { status, code } = apiError(e);
      if (status === 403 || code === 'FORBIDDEN') setListForbidden(true);
      else setListError('Could not load listing.');
    } finally {
      if (seq === vehicleListSeq.current) setListLoading(false);
    }
  }, [page]);

  useEffect(() => { void loadVehicles(); }, [loadVehicles]);

  const select = async (vehicle: any) => {
    const seq = ++listingLoadSeq.current;
    setSelected(vehicle); setListingError(''); setListingForbidden(false); setActionError('');
    setListingLoading(true); loadedListingVehicleIdRef.current = null;
    const empty = emptyListing(vehicle.id);
    setListing(empty); setSavedContent(contentKey(empty));
    try {
      const r = await listingsApi.get(vehicle.id);
      if (seq !== listingLoadSeq.current) return;
      const merged = { ...empty, ...r.data, vehicleId: vehicle.id };
      setListing(merged); setSavedContent(contentKey(merged));
      loadedListingVehicleIdRef.current = vehicle.id;
      rememberSummary(merged);
    } catch (e) {
      if (seq !== listingLoadSeq.current) return;
      const { status, code } = apiError(e);
      if (status === 403 || code === 'FORBIDDEN') setListingForbidden(true);
      else setListingError(status === 404 || code === 'NOT_FOUND' ? 'Vehicle not found' : 'Could not load listing.');
    } finally {
      if (seq === listingLoadSeq.current) setListingLoading(false);
    }
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
  };

  const save = async () => {
    if (!selected?.id || sold) return;
    const vehicleId = selected.id;
    if (listing.vehicleId !== vehicleId || loadedListingVehicleIdRef.current !== vehicleId) return;
    setSaving(true); setActionError('');
    try {
      const r = await listingsApi.save(vehicleId, {
        version: listing.version || 0, title: listing.title ?? '', body: listing.body ?? '',
        adKind: listing.adKind, medium: listing.medium,
      });
      if (selected?.id !== vehicleId) return;
      const merged = { ...emptyListing(vehicleId), ...r.data, vehicleId };
      setListing(merged); setSavedContent(contentKey(merged));
      loadedListingVehicleIdRef.current = vehicleId;
      rememberSummary(merged);
    } catch (e) {
      if (selected?.id !== vehicleId) return;
      setActionError(saveMessage(e));
    } finally { setSaving(false); }
  };

  const runCheck = async () => {
    if (!listing.id || sold || !selected?.id) return;
    const vehicleId = selected.id;
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
      // A timeout or a dropped connection carries no response at all. It is still an AI
      // failure (AD-09), so it must never leave a previous "Passed" badge on screen.
      const noResponse = !(e as { response?: unknown })?.response;
      if (status === 502 || code === 'AI_UNAVAILABLE' || noResponse) {
        if (listing.vehicleId !== vehicleId) return;
        setListing((l) => {
          const upd = { ...l, checkStatus: 'AI_UNAVAILABLE' as const, lastCheckId: null, lastCheck: null };
          rememberSummary(upd);
          return upd;
        });
        setActionError('AI review is unavailable. The advertisement did not pass; run the check again.');
      } else if (code === 'VERSION_CONFLICT') setActionError('Refresh and retry');
      else if (status === 404 || code === 'NOT_FOUND') setActionError('Vehicle not found');
      else if (status === 403 || code === 'FORBIDDEN') setActionError('You do not have access to Ad compliance.');
      else setActionError('Could not load listing.');
    } finally { setChecking(false); }
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
          <div><h1>Ad compliance</h1><span className="muted">Check an advertisement before export</span></div>
        </div>
        <AdWorkspace listing={listing} onChange={setListing} vehicle={selected} readOnly={sold}
          pickerSlot={
            <div className="card">
              <div className="card-header">Vehicles</div>
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
                    { label: 'Check status', render: (r: any) => checkStatusLabel(summaries[r.id]?.checkStatus) || '—' },
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
            </>
          }
        />
      </div>
    </AppLayout>
  );
}
