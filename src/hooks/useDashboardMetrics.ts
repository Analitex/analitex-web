import { useMemo } from 'react';
import type { SalesRecord, DashboardMetrics } from '../types';
import { sumRecords, buildMetricValue, groupByWeek } from '../lib/calculations';

export function useDashboardMetrics(
  records: SalesRecord[],
  prevRecords: SalesRecord[],
  inventoryValue: number,
  inventoryTurnoverDays: number
): DashboardMetrics {
  return useMemo(() => {
    const cur = sumRecords(records);
    const prev = sumRecords(prevRecords);

    const weeklyGroups = groupByWeek(records);
    const weekKeys = [...weeklyGroups.keys()].sort();
    const weeklySpark = (metric: (s: ReturnType<typeof sumRecords>) => number) =>
      weekKeys.map(k => metric(sumRecords(weeklyGroups.get(k)!)));

    const prevWeeklyGroups = groupByWeek(prevRecords);
    const prevWeekKeys = [...prevWeeklyGroups.keys()].sort();
    const prevWeeklySpark = (metric: (s: ReturnType<typeof sumRecords>) => number) =>
      prevWeekKeys.map(k => metric(sumRecords(prevWeeklyGroups.get(k)!)));

    const spark = (metric: (s: ReturnType<typeof sumRecords>) => number) =>
      [...weeklySpark(metric), ...prevWeeklySpark(metric).slice(-1)];

    return {
      revenue: buildMetricValue(cur.revenue, prev.revenue, spark(s => s.revenue)),
      orders: buildMetricValue(cur.orders, prev.orders, spark(s => s.orders)),
      sales: buildMetricValue(cur.sales, prev.sales, spark(s => s.sales)),
      profit: buildMetricValue(cur.profit, prev.profit, spark(s => s.profit)),
      roi: buildMetricValue(cur.roi, prev.roi, spark(s => s.roi)),
      buyoutRate: buildMetricValue(cur.buyoutRate, prev.buyoutRate, spark(s => s.buyoutRate)),
      logisticsCost: buildMetricValue(cur.logistics_cost, prev.logistics_cost, spark(s => s.logistics_cost)),
      adsSpend: buildMetricValue(cur.ads_spend, prev.ads_spend, spark(s => s.ads_spend)),
      commission: buildMetricValue(cur.commission, prev.commission, spark(s => s.commission)),
      storageCost: buildMetricValue(cur.storage_cost, prev.storage_cost, spark(s => s.storage_cost)),
      taxes: buildMetricValue(cur.taxes, prev.taxes, spark(s => s.taxes)),
      returns: buildMetricValue(cur.returns, prev.returns, spark(s => s.returns)),
      cogs: buildMetricValue(
        cur.sales * 0,
        prev.sales * 0,
        spark(_ => 0)
      ),
      avgSalePrice: buildMetricValue(cur.avgSalePrice, prev.avgSalePrice, spark(s => s.avgSalePrice)),
      profitPerUnit: buildMetricValue(cur.profitPerUnit, prev.profitPerUnit, spark(s => s.profitPerUnit)),
      inventoryValue: buildMetricValue(inventoryValue, inventoryValue * 0.9, []),
      inventoryTurnover: buildMetricValue(inventoryTurnoverDays, inventoryTurnoverDays * 1.1, []),
      drr: buildMetricValue(cur.drr, prev.drr, spark(s => s.drr)),
    };
  }, [records, prevRecords, inventoryValue, inventoryTurnoverDays]);
}
