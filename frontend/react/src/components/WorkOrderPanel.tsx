import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '../api/http';

interface WorkOrder {
  id: number;
  vehicleId: number;
  task: string;
  assigneeUsername: string | null;
  status: string;
  dueOn: string | null;
  cost: number | null;
  completionNote: string | null;
  completedOn: string | null;
  createdAt: string;
  version: number;
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

const STATUS_TAG: Record<string, string> = {
  OPEN: 'tag-warning',
  IN_PROGRESS: 'tag-info',
  DONE: 'tag-success',
  CANCELLED: 'tag-default',
};

export default function WorkOrderPanel({ vehicleId, sold, onChanged }: Props) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [task, setTask] = useState('');
  const [assignee, setAssignee] = useState('');
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
    if (creating || !task.trim()) return;
    setCreateError('');
    setCreating(true);
    try {
      await http.post(`/api/v1/vehicles/${vehicleId}/work-orders`, {
        task: task.trim(),
        assigneeUsername: assignee.trim() || null,
      });
      setTask('');
      setAssignee('');
      await load();
      onChanged();
    } catch {
      setCreateError('Could not create work order.');
    } finally {
      setCreating(false);
    }
  }

  async function transition(wo: WorkOrder, newStatus: string) {
    if (actionBusy != null) return;
    setActionBusy(wo.id);
    try {
      await http.patch(`/api/v1/work-orders/${wo.id}`, {
        status: newStatus,
        task: wo.task,
        version: wo.version,
      });
      await load();
      onChanged();
    } catch {
      setError(`Could not update work order.`);
    } finally {
      setActionBusy(null);
    }
  }

  const isOpen = (s: string) => s === 'OPEN' || s === 'IN_PROGRESS';

  return (
    <div style={{ marginTop: 24 }}>
      <div className="muted" style={{ marginBottom: 8 }}>Work orders</div>
      {error && <p className="danger-text">{error}</p>}
      {loading && <p className="muted">Loading work orders…</p>}

      {!sold && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Task description"
            value={task}
            onChange={e => setTask(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <input
            className="input"
            placeholder="Assignee (optional)"
            value={assignee}
            onChange={e => setAssignee(e.target.value)}
            style={{ width: 140 }}
          />
          <button className="btn" onClick={create} disabled={creating || !task.trim()}>
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
              <strong>{wo.task}</strong>
              {wo.assigneeUsername && <span className="muted"> · {wo.assigneeUsername}</span>}
              {wo.cost != null && <span className="muted"> · {cad(wo.cost)}</span>}
              {wo.dueOn && <span className="muted"> · Due {wo.dueOn}</span>}
            </div>
            <span className={`tag ${STATUS_TAG[wo.status] || 'tag-default'}`}>
              {wo.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {wo.createdAt}
            {wo.completionNote && <> · {wo.completionNote}</>}
          </div>
          {isOpen(wo.status) && !sold && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {wo.status === 'OPEN' && (
                <button className="btn-link" onClick={() => transition(wo, 'IN_PROGRESS')} disabled={actionBusy === wo.id}>
                  Start
                </button>
              )}
              <button className="btn-link" onClick={() => transition(wo, 'DONE')} disabled={actionBusy === wo.id}>
                Complete
              </button>
              <button className="btn-link danger" onClick={() => transition(wo, 'CANCELLED')} disabled={actionBusy === wo.id}>
                Cancel
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
