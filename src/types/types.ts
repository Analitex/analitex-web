export interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  marketplace: string;
  store: string;
  cost_price: number;
  created_at: string;
}

export interface SalesRecord {
  id: string;
  product_id: string;
  date: string;
  revenue: number;
  orders: number;
  sales: number;
  returns: number;
  logistics_cost: number;
  ads_spend: number;
  commission: number;
  storage_cost: number;
  taxes: number;
  other_costs: number;
  avg_price: number;
  avg_sale_price: number;
}

export interface InventoryRecord {
  id: string;
  product_id: string;
  date: string;
  stock_quantity: number;
  warehouse: string;
}

export interface PlanRecord {
  id: string;
  product_id: string;
  period_start: string;
  period_end: string;
  planned_revenue: number;
  planned_profit: number;
  planned_orders: number;
}

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
  revenue: MetricValue;
  orders: MetricValue;
  sales: MetricValue;
  profit: MetricValue;
  roi: MetricValue;
  buyoutRate: MetricValue;
  logisticsCost: MetricValue;
  adsSpend: MetricValue;
  commission: MetricValue;
  storageCost: MetricValue;
  taxes: MetricValue;
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
  revenue: number;
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

export type Page = 'dashboard' | 'summary' | 'finance' | 'inventory' | 'planfact' | 'ai' | 'settings';

export type GroupBy = 'week' | 'day' | 'month' | 'sku' | 'brand' | 'category';
