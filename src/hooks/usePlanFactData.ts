import { useState, useEffect } from 'react';
import type { FilterState, PlanFactRow, Product } from '../types';
import { calcProfit } from '../lib/calculations';
import { planRecords, salesRecords } from '../lib/localData';

export function usePlanFactData(filters: FilterState, products: Map<string, Product>) {
  const [rows, setRows] = useState<PlanFactRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (products.size === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const productIds = Array.from(products.keys());

    const fetchData = async () => {
      setLoading(true);
      const filteredPlanRecords = planRecords.filter(
        record =>
          productIds.includes(record.product_id) &&
          record.period_start >= filters.dateStart &&
          record.period_end <= filters.dateEnd
      );
      const filteredSalesRecords = salesRecords.filter(
        record =>
          productIds.includes(record.product_id) &&
          record.date >= filters.dateStart &&
          record.date <= filters.dateEnd
      );

      const salesByProduct = new Map<string, { revenue: number; orders: number; profit: number }>();
      for (const s of filteredSalesRecords) {
        const cur = salesByProduct.get(s.product_id) ?? { revenue: 0, orders: 0, profit: 0 };
        cur.revenue += s.revenue;
        cur.orders += s.orders;
        cur.profit += calcProfit(s);
        salesByProduct.set(s.product_id, cur);
      }

      const planByProduct = new Map<string, { revenue: number; profit: number; orders: number }>();
      for (const p of filteredPlanRecords) {
        const cur = planByProduct.get(p.product_id) ?? { revenue: 0, profit: 0, orders: 0 };
        cur.revenue += p.planned_revenue;
        cur.profit += p.planned_profit;
        cur.orders += p.planned_orders;
        planByProduct.set(p.product_id, cur);
      }

      const result: PlanFactRow[] = [];
      for (const [productId, product] of products) {
        const plan = planByProduct.get(productId) ?? { revenue: 0, profit: 0, orders: 0 };
        const actual = salesByProduct.get(productId) ?? { revenue: 0, orders: 0, profit: 0 };

        const revDev = actual.revenue - plan.revenue;
        const profDev = actual.profit - plan.profit;

        result.push({
          productId,
          productName: product.name,
          sku: product.sku,
          brand: product.brand,
          category: product.category,
          period: `${filters.dateStart} – ${filters.dateEnd}`,
          plannedRevenue: plan.revenue,
          actualRevenue: actual.revenue,
          revenueDeviation: revDev,
          revenueDeviationPct: plan.revenue > 0 ? (revDev / plan.revenue) * 100 : 0,
          plannedProfit: plan.profit,
          actualProfit: actual.profit,
          profitDeviation: profDev,
          profitDeviationPct: plan.profit > 0 ? (profDev / plan.profit) * 100 : 0,
          plannedOrders: plan.orders,
          actualOrders: actual.orders,
        });
      }

      setRows(result.sort((a, b) => Math.abs(b.revenueDeviationPct) - Math.abs(a.revenueDeviationPct)));
      setLoading(false);
    };

    fetchData();
  }, [filters, products]);

  return { rows, loading };
}
