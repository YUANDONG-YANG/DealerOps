import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isClosedStage, leadsApi, stageLabel } from '../api/leads';
import { describeError } from '../api/errors';

const PAGE_SIZE = 10;

/** The leads on one vehicle in the DMS vehicle drawer, each linking to the lead (D-11). */
export default function VehicleLeadsPanel({ vehicleId }: { vehicleId: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    leadsApi.list({ vehicleId, page, size: PAGE_SIZE })
      .then((r) => { if (active) { setRows(r.data.items || []); setTotal(r.data.totalElements || 0); } })
      .catch((e) => { if (active) { setRows([]); setError(describeError(e, 'load leads')); } });
    return () => { active = false; };
  }, [vehicleId, page]);

  return (
    <div style={{ marginTop: 24 }}>
      <div className="muted" style={{ marginBottom: 8 }}>Leads</div>
      {error && <p className="danger-text">{error}</p>}
      {!error && !rows.length && <p className="muted">No leads for this vehicle.</p>}
      {rows.map((l) => (
        <div key={l.id} style={{ marginTop: 8 }}>
          <Link to={`/leads?leadId=${l.id}`}>{l.customerName} · {stageLabel(l.stage)}</Link>
          <span className="muted"> · {l.ownerUsername || 'Unassigned'}
            {' · Follow-up '}{isClosedStage(l.stage) ? 'not needed' : l.nextFollowUpOn || 'not scheduled'}</span>
        </div>
      ))}
      {total > PAGE_SIZE && (
        <div className="toolbar">
          <button type="button" className="btn" disabled={page <= 0} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="muted">{page + 1} / {Math.ceil(total / PAGE_SIZE)}</span>
          <button type="button" className="btn" disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
