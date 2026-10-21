import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import PageState from '../components/PageState';
import KpiCard from '../components/KpiCard';
import { describeError } from '../api/errors';
import { reportsApi, type SalesFunnelReport, type SalesReport, type WorkshopSettlementReport } from '../api/reports';
import { leadsApi } from '../api/leads';
import { useSessionStore } from '../store/session';
import { cad } from '../format';

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** The dealership's KPIs on one page: inventory, sales, leads, and the workshop. */
export default function DashboardPage() {
  const dealerId = useSessionStore((s) => s.dealerId);
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [funnel, setFunnel] = useState<SalesFunnelReport | null>(null);
  const [workshop, setWorkshop] = useState<WorkshopSettlementReport | null>(null);
  const [overdue, setOverdue] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([reportsApi.sales(), reportsApi.salesFunnel(), reportsApi.workshop(), leadsApi.list({ overdue: true, size: 1 })])
      .then(([s, f, w, o]) => { setSales(s.data); setFunnel(f.data); setWorkshop(w.data); setOverdue(o.data.totalElements ?? 0); })
      .catch((reason) => setError(describeError(reason, 'load the dashboard')))
      .finally(() => setLoading(false));
  }, []);

  const month = sales?.months.find((m) => m.month === thisMonth());

  return (
    <AppLayout>
      <div className="page">
        <div className="page-header">
          <div><h1>Dashboard</h1><span className="muted">Key numbers for this dealership</span></div>
          {dealerId != null && <Link to={`/shop/${dealerId}`} target="_blank" className="btn">Open buyer site</Link>}
        </div>
        <PageState loading={loading} error={error} loadingText="Loading dashboard…">
          {sales && funnel && workshop && (
            <>
              <h2>Inventory</h2>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <KpiCard label="In stock" value={String(sales.inStockCount)} hint={`${cad(sales.inventoryCost)} invested`} />
                <KpiCard label="Outstanding work orders" value={String(workshop.openCount + workshop.inProgressCount)}
                  hint={`${workshop.openCount} open · ${workshop.inProgressCount} in progress`} />
                <KpiCard label="Workshop cost settled" value={cad(workshop.settledCost)} hint={`${workshop.doneCount} work order${workshop.doneCount === 1 ? '' : 's'} done`} />
              </div>

              <h2>Sales</h2>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <KpiCard label="Sold this month" value={String(month?.soldCount ?? 0)} hint={cad(month?.revenue ?? 0)} />
                <KpiCard label="Vehicles sold" value={String(sales.soldCount)} hint={`${cad(sales.revenue)} revenue`} />
                <KpiCard label="Gross profit" value={cad(sales.grossProfit)} hint="Sold price − purchase − repair" />
                <KpiCard label="Avg. days to sell" value={sales.averageDaysToSell == null ? '—' : String(sales.averageDaysToSell)} />
              </div>

              <h2>Leads</h2>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <KpiCard label="Open pipeline" value={String(funnel.openLeads)} hint="New, contacted or qualified" />
                <KpiCard label="Overdue follow-ups" value={String(overdue)} hint="Open leads past their follow-up date" />
                <KpiCard label="Win rate" value={`${funnel.wonRatePercent}%`} hint="Won ÷ (won + lost)" />
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/dms">Inventory</Link>
                <Link to="/leads">Leads</Link>
                <Link to="/reports/sales-funnel">Full sales report</Link>
              </div>
            </>
          )}
        </PageState>
      </div>
    </AppLayout>
  );
}
