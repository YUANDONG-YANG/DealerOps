import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '../api/http';
import { memberLabel, membersApi, type MemberOption } from '../api/members';
import ConfirmDialog from './ConfirmDialog';
import { cad, dateTimeLocal } from '../format';
import { workOrdersApi, type PatchWorkOrderBody, type WorkOrder } from '../api/workOrders';
import { describeError } from '../api/errors';

interface Props {
  vehicleId: number;
  sold: boolean;
  onChanged: () => void;
}

interface EditForm {
  task: string;
  assignee: string;
  dueOn: string;
}

const STATUS_TAG: Record<string, string> = {
  OPEN: 'tag-warning',
  IN_PROGRESS: 'tag-info',
  DONE: 'tag-success',
  CANCELLED: 'tag-default',
};

const EMPTY_EDIT: EditForm = { task: '', assignee: '', dueOn: '' };

function currentState(wo: WorkOrder): PatchWorkOrderBody {
  return {
    status: wo.status,
    task: wo.task,
    assigneeUsername: wo.assigneeUsername,
    dueOn: wo.dueOn,
    cost: wo.cost,
    completionNote: wo.completionNote,
    version: wo.version,
  };
}

function trimToNull(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

export default function WorkOrderPanel({ vehicleId, sold, onChanged }: Props) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<EditForm>(EMPTY_EDIT);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionBusy, setActionBusy] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT);
  const [doneTarget, setDoneTarget] = useState<WorkOrder | null>(null);
  const [doneCost, setDoneCost] = useState('');
  const [doneNote, setDoneNote] = useState('');
  const [doneError, setDoneError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<WorkOrder | null>(null);
  const [page, setPage] = useState(0);
  const seqRef = useRef(0);
  const pageSize = 10;

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const r = await workOrdersApi.list(vehicleId);
      if (seq !== seqRef.current) return;
      setOrders(r.data || []);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(describeError(e, 'load work orders'));
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { setPage(0); void load(); }, [load]);

  useEffect(() => {
    let active = true;
    membersApi.list()
      .then(r => { if (active) setMembers(r.data || []); })
      .catch(() => { if (active) setMembers([]); });
    return () => { active = false; };
  }, []);

  function assigneeLabel(username: string) {
    const member = members.find(m => m.username === username);
    return member ? memberLabel(member) : username;
  }

  async function create() {
    if (creating || !form.task.trim()) return;
    setCreateError('');
    setCreating(true);
    try {
      await workOrdersApi.create(vehicleId, {
        task: form.task.trim(),
        assigneeUsername: trimToNull(form.assignee),
        dueOn: trimToNull(form.dueOn),
      });
      setForm(EMPTY_EDIT);
      setPage(0); // the new work order is listed first
      await load();
      onChanged();
    } catch (e) {
      setCreateError(describeError(e, 'create work order'));
    } finally {
      setCreating(false);
    }
  }

  // Returns '' when the work order was updated, otherwise the message to show.
  async function patch(wo: WorkOrder, payload: PatchWorkOrderBody): Promise<string> {
    if (actionBusy != null) return 'Another work order change is still running.';
    setActionBusy(wo.id);
    setError('');
    try {
      await workOrdersApi.patch(wo.id, payload);
      await load();
      onChanged();
      return '';
    } catch (e) {
      const message = describeError(e, 'update work order');
      setError(message);
      return message;
    } finally {
      setActionBusy(null);
    }
  }

  function startEdit(wo: WorkOrder) {
    setEditId(wo.id);
    setEditForm({
      task: wo.task,
      assignee: wo.assigneeUsername || '',
      dueOn: wo.dueOn || '',
    });
  }

  async function saveEdit(wo: WorkOrder) {
    if (!editForm.task.trim()) return;
    const failure = await patch(wo, {
      ...currentState(wo),
      task: editForm.task.trim(),
      assigneeUsername: trimToNull(editForm.assignee),
      dueOn: trimToNull(editForm.dueOn),
    });
    if (!failure) setEditId(null);
  }

  function openDone(wo: WorkOrder) {
    setDoneTarget(wo);
    setDoneCost('');
    setDoneNote('');
    setDoneError('');
  }

  // WO-03: DONE needs a completion note (1-500) and a cost >= 0.
  async function confirmDone() {
    if (!doneTarget) return;
    const note = doneNote.trim();
    const cost = Number(doneCost);
    if (!note) {
      setDoneError('A completion note is required.');
      return;
    }
    if (!doneCost.trim() || !Number.isFinite(cost) || cost < 0) {
      setDoneError('Enter a cost of 0 or more.');
      return;
    }
    const failure = await patch(doneTarget, {
      ...currentState(doneTarget),
      status: 'DONE',
      cost,
      completionNote: note,
    });
    if (failure) setDoneError(failure);
    else setDoneTarget(null);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    await patch(cancelTarget, { ...currentState(cancelTarget), status: 'CANCELLED' });
    setCancelTarget(null);
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
            maxLength={200}
            value={form.task}
            onChange={e => setForm(f => ({ ...f, task: e.target.value }))}
            style={{ flex: 1, minWidth: 160 }}
          />
          <select
            className="select"
            value={form.assignee}
            onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
            style={{ width: 160 }}
          >
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.username} value={m.username}>{memberLabel(m)}</option>)}
          </select>
          <input
            className="input"
            type="date"
            aria-label="Due date"
            value={form.dueOn}
            onChange={e => setForm(f => ({ ...f, dueOn: e.target.value }))}
            style={{ width: 150 }}
          />
          <button className="btn" onClick={create} disabled={creating || !form.task.trim()}>
            {creating ? 'Adding…' : 'Add'}
          </button>
          {createError && <span className="danger-text">{createError}</span>}
        </div>
      )}

      {orders.length === 0 && !loading && <p className="muted">No work orders.</p>}
      {orders.slice(page * pageSize, page * pageSize + pageSize).map(wo => (
        <div key={wo.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{wo.task}</strong>
              {wo.assigneeUsername && <span className="muted"> · {assigneeLabel(wo.assigneeUsername)}</span>}
              {wo.cost != null && <span className="muted"> · {cad(wo.cost)}</span>}
              {wo.dueOn && <span className="muted"> · Due {wo.dueOn}</span>}
            </div>
            <span className={`tag ${STATUS_TAG[wo.status] || 'tag-default'}`}>
              {wo.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {dateTimeLocal(wo.createdAt)}
            {wo.completionNote && <> · {wo.completionNote}</>}
          </div>

          {editId === wo.id && isOpen(wo.status) && !sold && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
              <input
                className="input"
                placeholder="Task description"
                maxLength={200}
                value={editForm.task}
                onChange={e => setEditForm(f => ({ ...f, task: e.target.value }))}
                style={{ flex: 1, minWidth: 160 }}
              />
              <select
                className="select"
                value={editForm.assignee}
                onChange={e => setEditForm(f => ({ ...f, assignee: e.target.value }))}
                style={{ width: 160 }}
              >
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.username} value={m.username}>{memberLabel(m)}</option>)}
              </select>
              <input
                className="input"
                type="date"
                aria-label="Due date"
                value={editForm.dueOn}
                onChange={e => setEditForm(f => ({ ...f, dueOn: e.target.value }))}
                style={{ width: 150 }}
              />
              <button
                className="btn"
                onClick={() => saveEdit(wo)}
                disabled={actionBusy === wo.id || !editForm.task.trim()}
              >
                Save
              </button>
              <button className="btn-link" onClick={() => setEditId(null)}>Cancel edit</button>
            </div>
          )}

          {isOpen(wo.status) && !sold && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {wo.status === 'OPEN' && (
                <button
                  className="btn-link"
                  onClick={() => patch(wo, { ...currentState(wo), status: 'IN_PROGRESS' })}
                  disabled={actionBusy === wo.id}
                >
                  Start
                </button>
              )}
              {editId !== wo.id && (
                <button className="btn-link" onClick={() => startEdit(wo)} disabled={actionBusy === wo.id}>
                  Edit
                </button>
              )}
              <button className="btn-link" onClick={() => openDone(wo)} disabled={actionBusy === wo.id}>
                Done
              </button>
              <button className="btn-link danger" onClick={() => setCancelTarget(wo)} disabled={actionBusy === wo.id}>
                Cancel
              </button>
            </div>
          )}
        </div>
      ))}
      {orders.length > pageSize && (
        <div className="toolbar">
          <span className="muted">{orders.length} work orders</span>
          <div className="pagination">
            <button type="button" disabled={page <= 0} onClick={() => setPage(p => p - 1)}>&lsaquo;</button>
            <span className="muted">{page + 1} / {Math.ceil(orders.length / pageSize)}</span>
            <button type="button" disabled={(page + 1) * pageSize >= orders.length} onClick={() => setPage(p => p + 1)}>&rsaquo;</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={doneTarget != null}
        title="Complete work order"
        confirmLabel="Mark done"
        onCancel={() => setDoneTarget(null)}
        onConfirm={confirmDone}
      >
        <p className="muted">{doneTarget?.task}</p>
        <div className="form-item">
          <label className="form-label">Cost (CAD)</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={doneCost}
            onChange={e => setDoneCost(e.target.value)}
          />
        </div>
        <div className="form-item">
          <label className="form-label">Completion note</label>
          <textarea
            className="input"
            rows={3}
            maxLength={500}
            value={doneNote}
            onChange={e => setDoneNote(e.target.value)}
          />
        </div>
        <p className="muted">The cost is added to the vehicle's repair cost.</p>
        {doneError && <p className="danger-text">{doneError}</p>}
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelTarget != null}
        title="Cancel work order"
        message={`Cancel "${cancelTarget?.task ?? ''}"? A cancelled work order cannot be changed again.`}
        confirmLabel="Cancel work order"
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
