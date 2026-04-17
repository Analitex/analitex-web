import type { SalesRecord, MetricValue } from '../types';

export function calcProfit(r: SalesRecord): number {
  return r.revenue - r.logistics_cost - r.ads_spend - r.commission - r.storage_cost - r.taxes - r.other_costs;
}

export function calcTotalCosts(r: SalesRecord): number {
  return r.logistics_cost + r.ads_spend + r.commission + r.storage_cost + r.taxes + r.other_costs;
}

export function sumRecords(records: SalesRecord[]) {
  const base = {
    revenue: 0, orders: 0, sales: 0, returns: 0,
    logistics_cost: 0, ads_spend: 0, commission: 0,
    storage_cost: 0, taxes: 0, other_costs: 0,
    avg_price_sum: 0, avg_sale_price_sum: 0, count: 0,
  };
  for (const r of records) {
    base.revenue += r.revenue;
    base.orders += r.orders;
    base.sales += r.sales;
    base.returns += r.returns;
    base.logistics_cost += r.logistics_cost;
    base.ads_spend += r.ads_spend;
    base.commission += r.commission;
    base.storage_cost += r.storage_cost;
    base.taxes += r.taxes;
    base.other_costs += r.other_costs;
    base.avg_price_sum += r.avg_price;
    base.avg_sale_price_sum += r.avg_sale_price;
    base.count += 1;
  }
  const totalCosts = base.logistics_cost + base.ads_spend + base.commission + base.storage_cost + base.taxes + base.other_costs;
  const profit = base.revenue - totalCosts;
  return {
    ...base,
    totalCosts,
    profit,
    roi: totalCosts > 0 ? (profit / totalCosts) * 100 : 0,
    buyoutRate: base.orders > 0 ? (base.sales / base.orders) * 100 : 0,
    drr: base.revenue > 0 ? (base.ads_spend / base.revenue) * 100 : 0,
    avgPrice: base.count > 0 ? base.avg_price_sum / base.count : 0,
    avgSalePrice: base.count > 0 ? base.avg_sale_price_sum / base.count : 0,
    profitPerUnit: base.sales > 0 ? profit / base.sales : 0,
    margin: base.revenue > 0 ? (profit / base.revenue) * 100 : 0,
  };
}

export function buildMetricValue(
  current: number,
  previous: number,
  sparklineData: number[]
): MetricValue {
  const delta = current - previous;
  const deltaPercent = previous !== 0 ? (delta / Math.abs(previous)) * 100 : 0;
  return {
    current,
    previous,
    delta,
    deltaPercent,
    trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
    sparkline: sparklineData,
  };
}

export function groupByWeek(records: SalesRecord[]): Map<string, SalesRecord[]> {
  const map = new Map<string, SalesRecord[]>();
  for (const r of records) {
    const date = new Date(r.date);
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const key = monday.toISOString().split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}М ₽`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}К ₽`;
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}М`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}К`;
  }
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDelta(value: number, isCurrency = false): string {
  const sign = value >= 0 ? '+' : '';
  if (isCurrency) return `${sign}${formatCurrency(value, true)}`;
  return `${sign}${formatNumber(value, true)}`;
}

export function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')} – ${end.getDate()}.${String(end.getMonth() + 1).padStart(2, '0')}`;
}

export function getDaysInRange(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}

export function subDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
