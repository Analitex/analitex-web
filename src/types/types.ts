export interface FilterState {
  dateStart: string;
  dateEnd: string;
  marketplace: string[];
  store: string[];
  brand: string[];
  category: string[];
  sku: string[];
}

export interface MetricValue {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number;
  trend: 'up' | 'down' | 'neutral';
  sparkline: number[];
}

export interface DashboardMetrics {
  realisation: MetricValue;
  orders: MetricValue;
  sales: MetricValue;
  profit: MetricValue;
  roi: MetricValue;
  buyoutRate: MetricValue;
  logisticsCost: MetricValue;
  adsSpend: MetricValue;
  commission: MetricValue;
  storageCost: MetricValue;
  tax: MetricValue;
  returns: MetricValue;
  cogs: MetricValue;
  avgSalePrice: MetricValue;
  profitPerUnit: MetricValue;
  inventoryValue: MetricValue;
  inventoryTurnover: MetricValue;
  drr: MetricValue;
}

export interface SummaryRow {
  period: string;
  periodLabel: string;
  avgPriceBeforeDiscount: number;
  avgSalePrice: number;
  realisation: number;
  sales: number;
  payouts: number;
  returns: number;
  operationalCosts: number;
  profit: number;
  orders: number;
  buyoutRate: number;
  productId?: string;
  productName?: string;
  brand?: string;
  category?: string;
}

export interface InventorySummary {
  productId: string;
  productName: string;
  sku: string;
  brand: string;
  category: string;
  totalStock: number;
  inventoryValue: number;
  turnoverDays: number;
  warehouseBreakdown: { warehouse: string; quantity: number }[];
  avgDailySales: number;
}

export interface PlanFactRow {
  productId: string;
  productName: string;
  sku: string;
  brand: string;
  category: string;
  period: string;
  plannedRevenue: number;
  actualRevenue: number;
  revenueDeviation: number;
  revenueDeviationPct: number;
  plannedProfit: number;
  actualProfit: number;
  profitDeviation: number;
  profitDeviationPct: number;
  plannedOrders: number;
  actualOrders: number;
}

export type Page =
  | 'home'
  | 'auth'
  | 'organizations'
  | 'connections'
  | 'analytics'
  | 'docs'
  | 'history'
  | 'settings'
  | 'accept-invite'
  | 'verify-email'
  | 'reset-password'
  | 'dashboard'
  | 'summary'
  | 'finance'
  | 'inventory'
  | 'external-traffic'
  | 'search-phrases'
  | 'planfact'
  | 'ai';

export type GroupBy = 'week' | 'day' | 'month' | 'sku' | 'brand' | 'category';

