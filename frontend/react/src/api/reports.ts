import { http } from './http';

export type FunnelStageCount = { stage: string; count: number; percentOfTotal: number };
/** wonRatePercent is won ÷ (won + lost): open leads are not counted as losses. */
/** months: leads that entered each stage per month (from the lead audit trail), newest first. */
export type SalesFunnelReport = {
  totalLeads: number; openLeads: number; stages: FunnelStageCount[]; wonRatePercent: number;
  months: { month: string; stages: FunnelStageCount[] }[];
};

export type MonthlySales = { month: string; soldCount: number; revenue: number; grossProfit: number };
export type SalesReport = {
  soldCount: number;
  revenue: number;
  grossProfit: number;
  averageDaysToSell: number | null;
  inStockCount: number;
  inventoryCost: number;
  months: MonthlySales[];
};

export type WorkshopSettlementReport = {
  openCount: number;
  inProgressCount: number;
  doneCount: number;
  settledCost: number;
  months: { month: string; doneCount: number; settledCost: number }[];
  assignees: { assigneeUsername: string | null; outstandingCount: number; doneCount: number; settledCost: number }[];
};

export const reportsApi = {
  salesFunnel: () => http.get<SalesFunnelReport>('/api/v1/leads/report/funnel'),
  sales: () => http.get<SalesReport>('/api/v1/vehicles/report/sales'),
  workshop: () => http.get<WorkshopSettlementReport>('/api/v1/work-orders/report/settlement'),
};
