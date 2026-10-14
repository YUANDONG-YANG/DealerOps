import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '../api/http';

interface WorkOrder {
  id: number;
  description: string;
  estimatedCost: number | null;
  actualCost: number | null;
  status: string;
  createdAt: string;
}

interface Props {
  vehicleId: number;
  sold: boolean;
  onChanged: () => void;
}

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
function cad(v: unknown) {
  return v == null || v === '' ? '—' : CAD.format(Number(v));
}

export default function WorkOrderPanel({ vehicleId, sold, onChanged }: Props) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionBusy, setActionBusy] = useState<number | null>(null);
  const seqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const r = await http.get(`/api/v1/vehicles/${vehicleId}/work-orders`);
      if (seq !== seqRef.current) return;
      setOrders(r.data || []);
    } catch {
      if (seq !== seqRef.current) return;
      setError('Could not load work orders.');
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { void load(); }, [load]);

  async function create() {
    if (creating || !description.trim()) return;
    setCreateError('');
    setCreating(true);
    try {
      await http.post(`/api/v1/vehicles/${vehicleId}/work-orders`, {
        description: description.trim(),
        estimatedCost: estimatedCost.trim() ? Number(estimatedCost) : null,
      });
      setDescription('');
      setEstimatedCost('');
      await load();
      onChanged();
    } catch {
      setCreateError('Could not create work order.');
    } finally {
      setCreating(false);
    }
  }

  async function complete(id: number) {
    if (actionBusy != null) return;
    setActionBusy(id);
    try {
      await http.post(`/api/v1/vehicles/${vehicleId}/work-orders/${id}/complete`);
      await load();
      onChanged();
    } catch {
      setError('Could not complete work order.');
    } finally {
      setActionBusy(null);
    }
  }

  async function cancel(id: number) {
    if (actionBusy != null) return;
    setActionBusy(id);
    try {
      await http.post(`/api/v1/vehicles/${vehicleId}/work-orders/${id}/cancel`);
      await load();
      onChanged();
    } catch {
      setError('Could not cancel work order.');
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="muted" style={{ marginBottom: 8 }}>Work orders</div>
      {error && <p className="danger-text">{error}</p>}
      {loading && <p className="muted">Loading work orders…</p>}

      {!sold && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            className="form-input"
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <input
            className="form-input"
            placeholder="Estimated cost"
            value={estimatedCost}
            onChange={e => setEstimatedCost(e.target.value)}
            style={{ width: 130 }}
          />
          <button className="btn" onClick={create} disabled={creating || !description.trim()}>
            {creating ? 'Adding…' : 'Add'}
          </button>
          {createError && <span className="danger-text">{createError}</span>}
        </div>
      )}

      {orders.length === 0 && !loading && <p className="muted">No work orders.</p>}
      {orders.map(wo => (
        <div key={wo.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{wo.description}</strong>
              <span className="muted"> · Est. {cad(wo.estimatedCost)}</span>
              {wo.actualCost != null && <span className="muted"> · Actual {cad(wo.actualCost)}</span>}
            </div>
            <span className={`tag tag-${wo.status === 'OPEN' ? 'warning' : wo.status === 'COMPLETED' ? 'success' : 'default'}`}>
              {wo.status}
            </span>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>{wo.createdAt}</div>
          {wo.status === 'OPEN' && !sold && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn-link" onClick={() => complete(wo.id)} disabled={actionBusy === wo.id}>
                Complete
              </button>
              <button className="btn-link danger" onClick={() => cancel(wo.id)} disabled={actionBusy === wo.id}>
                Cancel
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
