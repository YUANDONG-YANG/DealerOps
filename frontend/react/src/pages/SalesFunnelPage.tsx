import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import PageState from '../components/PageState';
import { describeError } from '../api/errors';
import { reportsApi, type SalesFunnelReport, type SalesReport } from '../api/reports';
import { stageLabel } from '../api/leads';
import { cad } from '../format';

// Won and lost are outcomes; the three open stages share one neutral pipeline colour.
function stageTone(stage: string): string {
  if (stage === 'WON') return 'var(--success)';
  if (stage === 'LOST') return 'var(--danger)';
  return '#1f4e79';
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card" style={{ minWidth: 170, flex: '1 1 170px' }}>
      <div className="muted">{label}</div>
      <strong style={{ fontSize: 22 }}>{value}</strong>
      {hint && <div className="muted" style={{ fontSize: 12 }}>{hint}</div>}
    </div>
  );
}

/** Vehicle sales (units, revenue, gross profit, months) and the CRM lead funnel (CRM-15). */
export default function SalesFunnelPage() {
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [funnel, setFunnel] = useState<SalesFunnelReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([reportsApi.sales(), reportsApi.salesFunnel()])
      .then(([s, f]) => { setSales(s.data); setFunnel(f.data); })
      .catch((reason) => setError(describeError(reason, 'load sales report')))
      .finally(() => setLoading(false));
  }, []);

  const peak = Math.max(1, ...(funnel?.stages.map((s) => s.count) ?? [0]));

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <div><h1>Sales report</h1><span className="muted">Vehicle sales and the lead pipeline for this dealership</span></div>
        </div>
        <PageState loading={loading} error={error} loadingText="Loading sales report…">
          {sales && funnel && (
            <>
              <h2>Vehicle sales</h2>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <Kpi label="Vehicles sold" value={String(sales.soldCount)} />
                <Kpi label="Revenue" value={cad(sales.revenue)} />
                <Kpi label="Gross profit" value={cad(sales.grossProfit)} hint="Sold price − purchase − repair" />
                <Kpi label="Avg. days to sell" value={sales.averageDaysToSell == null ? '—' : String(sales.averageDaysToSell)} />
                <Kpi label="In stock" value={String(sales.inStockCount)} hint={`${cad(sales.inventoryCost)} invested`} />
              </div>
              {sales.months.length === 0 ? (
                <div className="state" style={{ marginBottom: 24 }}>No vehicles sold yet.</div>
              ) : (
                <div className="table-wrap" style={{ marginBottom: 24 }}>
                  <table className="table">
                    <thead><tr><th>Month</th><th>Sold</th><th>Revenue</th><th>Gross profit</th></tr></thead>
                    <tbody>{sales.months.map((m) => (
                      <tr key={m.month}>
                        <td>{m.month}</td><td>{m.soldCount}</td><td>{cad(m.revenue)}</td>
                        <td style={{ color: m.grossProfit < 0 ? 'var(--danger)' : undefined }}>{cad(m.grossProfit)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              <h2>Lead funnel</h2>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <Kpi label="Total leads" value={String(funnel.totalLeads)} />
                <Kpi label="Open pipeline" value={String(funnel.openLeads)} hint="New, contacted or qualified" />
                <Kpi label="Win rate" value={`${funnel.wonRatePercent}%`} hint="Won ÷ (won + lost)" />
              </div>
              {funnel.totalLeads === 0 ? (
                <div className="state">No leads to report yet.</div>
              ) : (
                <div className="card">
                  {funnel.stages.map((row) => (
                    <div key={row.stage} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                      <span>{stageLabel(row.stage)}</span>
                      <div style={{ background: 'var(--border)', borderRadius: 4, height: 14 }}>
                        <div style={{ width: `${(row.count / peak) * 100}%`, background: stageTone(row.stage), borderRadius: 4, height: '100%' }} />
                      </div>
                      <span className="muted" style={{ textAlign: 'right' }}>{row.count} · {row.percentOfTotal}%</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </PageState>
      </div>
    </AppLayout>
  );
}
