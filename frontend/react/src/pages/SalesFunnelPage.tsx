import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import PageState from '../components/PageState';
import KpiCard from '../components/KpiCard';
import { describeError } from '../api/errors';
import { reportsApi, SALES_PERIODS, type SalesFunnelReport, type SalesPeriod, type SalesReport, type WorkshopSettlementReport } from '../api/reports';
import { stageLabel } from '../api/leads';
import { cad } from '../format';

// Won and lost are outcomes; the three open stages share one neutral pipeline colour.
function stageTone(stage: string): string {
  if (stage === 'WON') return 'var(--success)';
  if (stage === 'LOST') return 'var(--danger)';
  return 'var(--accent)';
}

/**
 * Vehicle sales (units, revenue, gross profit, months), the CRM lead funnel with its monthly stage
 * history (CRM-15), and the workshop settlement from work orders.
 */
export default function SalesFunnelPage() {
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [funnel, setFunnel] = useState<SalesFunnelReport | null>(null);
  const [workshop, setWorkshop] = useState<WorkshopSettlementReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<SalesPeriod>('MONTH');

  useEffect(() => {
    Promise.all([reportsApi.salesFunnel(), reportsApi.workshop()])
      .then(([f, w]) => { setFunnel(f.data); setWorkshop(w.data); })
      .catch((reason) => setError(describeError(reason, 'load sales report')))
      .finally(() => setLoading(false));
  }, []);

  // The sales section reloads on its own when the period changes; the rest of the page stays.
  useEffect(() => {
    reportsApi.sales(period)
      .then((s) => setSales(s.data))
      .catch((reason) => setError(describeError(reason, 'load sales report')));
  }, [period]);

  const periodLabel = SALES_PERIODS.find((p) => p.value === period)?.label ?? '';

  const peak = Math.max(1, ...(funnel?.stages.map((s) => s.count) ?? [0]));

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <div><h1>Sales report</h1><span className="muted">Vehicle sales and the lead pipeline for this dealership</span></div>
        </div>
        <PageState loading={loading || (!sales && !error)} error={error} loadingText="Loading sales report…">
          {sales && funnel && workshop && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ marginRight: 'auto' }}>Sales for {periodLabel.toLowerCase()}</h2>
                <select className="select" aria-label="Sales period" value={period}
                  onChange={(e) => setPeriod(e.target.value as SalesPeriod)}>
                  {SALES_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {sales.period && (
                <>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                    <KpiCard label="Vehicles sold" value={String(sales.period.soldCount)} hint={`${sales.period.from} to ${sales.period.to}`} />
                    <KpiCard label="Revenue" value={cad(sales.period.revenue)} />
                    <KpiCard label="Gross profit" value={cad(sales.period.grossProfit)} hint="Sold price − purchase − repair" />
                  </div>
                  <div className="table-wrap" style={{ marginBottom: 24 }}>
                    <table className="table" aria-label="Sales by salesperson">
                      <thead><tr><th>Salesperson</th><th>Vehicles sold</th><th>Revenue</th><th>Gross profit</th><th>Open leads</th><th>Won leads</th></tr></thead>
                      <tbody>{sales.salespeople.length === 0 ? (
                        <tr><td colSpan={6} className="muted">No sales employees yet.</td></tr>
                      ) : sales.salespeople.map((p) => (
                        <tr key={p.username}>
                          <td>{p.displayName}{!p.activeMember && <span className="muted"> (former member)</span>}</td>
                          <td>{p.soldCount}</td><td>{cad(p.revenue)}</td>
                          <td style={{ color: p.grossProfit < 0 ? 'var(--danger)' : undefined }}>{cad(p.grossProfit)}</td>
                          <td>{p.openLeads}</td><td>{p.wonLeads}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
              )}

              <h2>All-time vehicle sales</h2>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <KpiCard label="Total vehicles sold" value={String(sales.soldCount)} />
                <KpiCard label="Total revenue" value={cad(sales.revenue)} />
                <KpiCard label="Total gross profit" value={cad(sales.grossProfit)} hint="Sold price − purchase − repair" />
                <KpiCard label="Avg. days to sell" value={sales.averageDaysToSell == null ? 'No sales yet' : String(sales.averageDaysToSell)} />
                <KpiCard label="In stock" value={String(sales.inStockCount)} hint={`${cad(sales.inventoryCost)} invested`} />
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
                <KpiCard label="Total leads" value={String(funnel.totalLeads)} />
                <KpiCard label="Open pipeline" value={String(funnel.openLeads)} hint="New, contacted or qualified" />
                <KpiCard label="Win rate" value={`${funnel.wonRatePercent}%`} hint="Won ÷ (won + lost)" />
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

              <h2 style={{ marginTop: 24 }}>Stage history</h2>
              <p className="muted">Leads that entered each stage, by month.</p>
              {funnel.months.length === 0 ? (
                <div className="state">No stage changes yet.</div>
              ) : (
                <div className="table-wrap">
                  <table className="table" aria-label="Lead stage history">
                    <thead><tr><th>Month</th>{funnel.months[0].stages.map(s => <th key={s.stage}>{stageLabel(s.stage)}</th>)}</tr></thead>
                    <tbody>{funnel.months.map(m => (
                      <tr key={m.month}><td>{m.month}</td>{m.stages.map(s => <td key={s.stage}>{s.count}</td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              <h2 style={{ marginTop: 24 }}>Workshop settlement</h2>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <KpiCard label="Settled cost" value={cad(workshop.settledCost)} hint={`${workshop.doneCount} work order${workshop.doneCount === 1 ? '' : 's'} done`} />
                <KpiCard label="Outstanding work" value={String(workshop.openCount + workshop.inProgressCount)}
                  hint={`${workshop.openCount} open · ${workshop.inProgressCount} in progress`} />
              </div>
              {workshop.months.length === 0 ? (
                <div className="state">No work orders completed yet.</div>
              ) : (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div className="table-wrap" style={{ flex: '1 1 300px' }}>
                    <table className="table" aria-label="Workshop settlement by month">
                      <thead><tr><th>Month</th><th>Done</th><th>Settled cost</th></tr></thead>
                      <tbody>{workshop.months.map(m => (
                        <tr key={m.month}><td>{m.month}</td><td>{m.doneCount}</td><td>{cad(m.settledCost)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <div className="table-wrap" style={{ flex: '1 1 300px' }}>
                    <table className="table" aria-label="Workshop settlement by assignee">
                      <thead><tr><th>Assignee</th><th>Outstanding</th><th>Done</th><th>Settled cost</th></tr></thead>
                      <tbody>{workshop.assignees.map(a => (
                        <tr key={a.assigneeUsername ?? ''}>
                          <td>{a.assigneeUsername ?? 'Unassigned'}</td><td>{a.outstandingCount}</td><td>{a.doneCount}</td><td>{cad(a.settledCost)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </PageState>
      </div>
    </AppLayout>
  );
}
