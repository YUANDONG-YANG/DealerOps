import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageState from '../components/PageState';
import { vehiclesApi } from '../api/vehicles';
import { customersApi } from '../api/customers';
import { paymentsApi, type PaymentLedger } from '../api/payments';
import { describeError } from '../api/errors';
import { useSessionStore } from '../store/session';
import { cad, enumLabel, km } from '../format';

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <tr><th style={{ width: '38%', textAlign: 'left' }}>{label}</th><td>{value == null || value === '' ? 'Not recorded' : String(value)}</td></tr>
  );
}

/**
 * Printable bill of sale for a sold vehicle, filled from the DMS record, the linked CRM buyer,
 * and the payment ledger. It is a template, not a reviewed contract (see /disclaimer).
 * Staff cannot read the payment ledger (PAY-05), so their copy shows the sale price only.
 */
export default function BillOfSalePage() {
  const { vehicleId } = useParams();
  const dealer = useSessionStore();
  const isManager = dealer.dealerRole === 'MANAGER';
  const [vehicle, setVehicle] = useState<any>(null);
  const [buyer, setBuyer] = useState<any>(null);
  const [ledger, setLedger] = useState<PaymentLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = Number(vehicleId);
    let active = true;
    (async () => {
      try {
        const v = (await vehiclesApi.get(id)).data;
        if (v.status !== 'SOLD') throw new Error('Only a sold vehicle has a bill of sale.');
        const [c, p] = await Promise.all([
          v.linkedCustomer ? customersApi.get(v.linkedCustomer.id).then(r => r.data) : Promise.resolve(null),
          isManager ? paymentsApi.ledger(id).then(r => r.data) : Promise.resolve(null),
        ]);
        if (!active) return;
        setVehicle(v);
        setBuyer(c);
        setLedger(p);
      } catch (e) {
        if (active) setError(e instanceof Error && !('response' in e) ? e.message : describeError(e, 'load the bill of sale'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [vehicleId, isManager]);

  return (
    <div className="page bill-of-sale" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="no-print" style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <Link to={`/dms?vehicleId=${vehicleId}`} className="btn">Back to vehicle</Link>
        <button className="btn btn-primary" onClick={() => window.print()} disabled={!vehicle}>Print</button>
      </div>
      <PageState loading={loading} error={error} loadingText="Loading bill of sale…">
        {vehicle && (
          <article aria-label="Bill of sale">
            <h1>Bill of sale</h1>
            <p className="muted">Sale date {vehicle.soldOn}{vehicle.stockNumber ? ` · Stock ${vehicle.stockNumber}` : ''}</p>

            <h2>Seller</h2>
            <table className="table"><tbody>
              <Row label="Dealership" value={dealer.dealerLegalName} />
              <Row label="Address" value={dealer.dealerContactAddress} />
              <Row label="Phone" value={dealer.dealerContactPhone} />
              <Row label="Email" value={dealer.dealerContactEmail} />
            </tbody></table>

            <h2>Buyer</h2>
            {buyer ? (
              <table className="table"><tbody>
                <Row label="Name" value={buyer.name} />
                <Row label="Home address" value={buyer.homeAddress} />
                <Row label="Phone" value={buyer.phone} />
                <Row label="Email" value={buyer.email} />
              </tbody></table>
            ) : (
              <p className="warning-text">No buyer is linked to this vehicle. Link the buyer from CRM, or write the buyer&apos;s details in by hand.</p>
            )}

            <h2>Vehicle</h2>
            <table className="table"><tbody>
              <Row label="Year, make, model" value={`${vehicle.modelYear} ${vehicle.make} ${vehicle.model}`} />
              <Row label="VIN" value={vehicle.vin} />
              <Row label="Condition" value={enumLabel(vehicle.conditionCode)} />
              <Row label="Odometer" value={km(vehicle.mileageKm)} />
              <Row label="Exterior colour" value={vehicle.exteriorColor} />
              <Row label="Body type" value={enumLabel(vehicle.bodyType)} />
            </tbody></table>

            <h2>Price and payments</h2>
            <table className="table"><tbody>
              <Row label="Sale price" value={cad(vehicle.soldPrice)} />
              {ledger && (
                <>
                  {ledger.items.map(p => (
                    <Row key={p.id} label={`Paid ${p.paidOn} · ${enumLabel(p.method)}`} value={cad(p.amount)} />
                  ))}
                  <Row label="Total paid" value={cad(ledger.paidTotal)} />
                  <Row label="Balance due" value={cad(ledger.balanceDue)} />
                </>
              )}
            </tbody></table>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 48 }}>
              <div><div style={{ borderTop: '1px solid currentColor', paddingTop: 4 }}>Buyer signature and date</div></div>
              <div><div style={{ borderTop: '1px solid currentColor', paddingTop: 4 }}>Dealer signature and date</div></div>
            </div>

            <p className="muted" style={{ fontSize: 12, marginTop: 32 }}>
              Template generated by Dealer Ops from the dealership&apos;s records. It is not a reviewed legal contract and
              may not include every disclosure a bill of sale must carry; confirm current OMVIC requirements before
              signing. See the disclaimer at /disclaimer.
            </p>
          </article>
        )}
      </PageState>
    </div>
  );
}
