import { http } from './http';

export type FunnelStageCount = { stage: string; count: number; percentOfTotal: number };
/** wonRatePercent is won ÷ (won + lost): open leads are not counted as losses. */
export type SalesFunnelReport = { totalLeads: number; openLeads: number; stages: FunnelStageCount[]; wonRatePercent: number };

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

export const reportsApi = {
  salesFunnel: () => http.get<SalesFunnelReport>('/api/v1/leads/report/funnel'),
  sales: () => http.get<SalesReport>('/api/v1/vehicles/report/sales'),
};
