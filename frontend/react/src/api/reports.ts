import { http } from './http';

export type FunnelStageCount = { stage: string; count: number; percentOfTotal: number };
/**
 * wonRatePercent is won ÷ (won + lost): open leads are not counted as losses.
 * months: leads that entered each stage per month (from the lead audit trail), newest first.
 */
export type SalesFunnelReport = {
  totalLeads: number; openLeads: number; stages: FunnelStageCount[]; wonRatePercent: number;
  months: { month: string; stages: FunnelStageCount[] }[];
};

export type MonthlySales = { month: string; soldCount: number; revenue: number; grossProfit: number };
/** A calendar period ending today: today, this week from Monday, this month, this year. */
export type SalesPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR';
export const SALES_PERIODS: { value: SalesPeriod; label: string }[] = [
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEK', label: 'This week' },
  { value: 'MONTH', label: 'This month' },
  { value: 'YEAR', label: 'This year' },
];
export type PeriodSales = { period: SalesPeriod; from: string; to: string; soldCount: number; revenue: number; grossProfit: number };
/** One salesperson's sales in the period; openLeads is the current open pipeline they own. */
export type SalespersonSales = {
  username: string; displayName: string; activeMember: boolean;
  soldCount: number; revenue: number; grossProfit: number; openLeads: number; wonLeads: number;
};
/** period is set only when one was requested; salespeople cover that period, or all time without one. */
export type SalesReport = {
  soldCount: number;
  revenue: number;
  grossProfit: number;
  averageDaysToSell: number | null;
  inStockCount: number;
  inventoryCost: number;
  months: MonthlySales[];
  period: PeriodSales | null;
  salespeople: SalespersonSales[];
};

export type WorkshopSettlementReport = {
  openCount: number;
  inProgressCount: number;
  doneCount: number;
  settledCost: number;
  months: { month: string; doneCount: number; settledCost: number }[];
  assignees: { assigneeUsername: string | null; outstandingCount: number; doneCount: number; settledCost: number }[];
};

/** Dashboard figures: lead funnel, vehicle sales, and workshop settlement. */
export const reportsApi = {
  salesFunnel: () => http.get<SalesFunnelReport>('/api/v1/leads/report/funnel'),
  sales: (period?: SalesPeriod) => http.get<SalesReport>('/api/v1/vehicles/report/sales', { params: period ? { period } : undefined }),
  workshop: () => http.get<WorkshopSettlementReport>('/api/v1/work-orders/report/settlement'),
};
