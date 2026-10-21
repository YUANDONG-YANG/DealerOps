import { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { cad, enumLabel, MONEY_PATTERN } from '../format';
import { fieldErrorsOf } from '../api/http';
import { describeError } from '../api/errors';
import { PAYMENT_METHODS, paymentsApi, type PaymentItem, type PaymentLedger } from '../api/payments';
import { useSessionStore } from '../store/session';

interface Props {
  vehicleId: number;
  onChanged?: () => void;
}

/**
 * Payments received for a sold vehicle and the balance still due. This records money taken at
 * the dealership; it does not charge a card. Only a manager sees the ledger and can remove a
 * payment; staff see only the record form and a confirmation after each recorded payment.
 */
export default function PaymentPanel({ vehicleId, onChanged }: Props) {
  const isManager = useSessionStore().dealerRole === 'MANAGER';
  const [ledger, setLedger] = useState<PaymentLedger | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ amount: '', method: '', paidOn: '', note: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [recorded, setRecorded] = useState('');
  const [removeTarget, setRemoveTarget] = useState<PaymentItem | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setLedger((await paymentsApi.ledger(vehicleId)).data);
    } catch (e) {
      setError(describeError(e, 'load payments'));
    }
  }, [vehicleId]);

  useEffect(() => { if (isManager) void load(); }, [isManager, load]);

  async function add() {
    setFormError('');
    setRecorded('');
    if (!MONEY_PATTERN.test(form.amount.trim()) || Number(form.amount) <= 0) {
      setFormError('Amount must be more than 0 with at most 2 decimals.');
      return;
    }
    if (!form.method) { setFormError('Choose a payment method.'); return; }
    if (!form.paidOn) { setFormError('Enter the payment date.'); return; }
    setSaving(true);
    try {
      const r = await paymentsApi.create(vehicleId, {
        amount: Number(form.amount), method: form.method, paidOn: form.paidOn,
        note: form.note.trim() || null,
      });
      if ('items' in r.data) setLedger(r.data);
      else setRecorded(`Payment of ${cad(r.data.amount)} recorded.`);
      setForm({ amount: '', method: '', paidOn: '', note: '' });
      onChanged?.();
    } catch (e) {
      const fields = Object.values(fieldErrorsOf(e));
      setFormError(fields.length ? fields.join(' ') : describeError(e, 'record payment'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    try {
      setLedger((await paymentsApi.delete(vehicleId, removeTarget.id)).data);
      onChanged?.();
    } catch (e) {
      setError(describeError(e, 'remove payment'));
    } finally {
      setRemoveTarget(null);
    }
  }

  const settled = ledger?.balanceDue === 0;

  return (
    <section style={{ marginTop: 24 }} aria-label="Payments">
      <div className="muted" style={{ marginBottom: 8 }}>Payments</div>
      {error && <p className="danger-text">{error}</p>}
      {ledger && (
        <p>
          Sold for {cad(ledger.soldPrice)} · Paid {cad(ledger.paidTotal)} ·{' '}
          <strong className={settled ? '' : 'warning-text'}>Balance due {cad(ledger.balanceDue)}</strong>
        </p>
      )}
      {recorded && <p role="status">{recorded}</p>}
      {!settled && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input className="input" aria-label="Payment amount" placeholder="Amount" inputMode="decimal"
            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: 120 }} />
          <select className="select" aria-label="Payment method" value={form.method}
            onChange={e => setForm(f => ({ ...f, method: e.target.value }))} style={{ width: 150 }}>
            <option value="">Method</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{enumLabel(m)}</option>)}
          </select>
          <input className="input" type="date" aria-label="Payment date" lang="en" value={form.paidOn}
            onChange={e => setForm(f => ({ ...f, paidOn: e.target.value }))} style={{ width: 150 }} />
          <input className="input" aria-label="Payment note" placeholder="Note (optional)" maxLength={200}
            value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ flex: 1, minWidth: 140 }} />
          <button type="button" className="btn" onClick={add} disabled={saving}>{saving ? 'Recording…' : 'Record payment'}</button>
        </div>
      )}
      {formError && <p className="danger-text">{formError}</p>}
      {ledger && ledger.items.length === 0 && <p className="muted">No payments recorded.</p>}
      {/* Rendered in API order: newest payment first. */}
      {ledger?.items.map(p => (
        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span>
            <strong>{cad(p.amount)}</strong> · {enumLabel(p.method)} · {p.paidOn}
            {p.note && <span className="muted"> · {p.note}</span>}
            <span className="muted"> · {p.recordedBy}</span>
          </span>
          <button type="button" className="btn-link danger" onClick={() => setRemoveTarget(p)}>Remove</button>
        </div>
      ))}
      <p className="muted" style={{ fontSize: 12 }}>Records payments taken at the dealership. DealerOps does not process card payments.</p>

      <ConfirmDialog
        open={removeTarget != null}
        title="Remove payment"
        message={`Remove the ${cad(removeTarget?.amount)} payment from ${removeTarget?.paidOn ?? ''}? Use this only to correct a mistake.`}
        confirmLabel="Remove payment"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
      />
    </section>
  );
}
