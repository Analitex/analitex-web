import { useState, useEffect } from 'react';
import type { FilterState, InventorySummary, Product } from '../types';
import { inventoryRecords, salesRecords } from '../lib/localData';

export function useInventoryData(filters: FilterState, products: Map<string, Product>) {
  const [summaries, setSummaries] = useState<InventorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [avgTurnover, setAvgTurnover] = useState(0);

  useEffect(() => {
    if (products.size === 0) {
      setSummaries([]);
      setLoading(false);
      return;
    }

    const productIds = Array.from(products.keys());

    const fetchInventory = async () => {
      setLoading(true);
      const invData = inventoryRecords
        .filter(
          record =>
            productIds.includes(record.product_id) &&
            record.date >= filters.dateStart &&
            record.date <= filters.dateEnd
        )
        .sort((a, b) => b.date.localeCompare(a.date));

      const salesData = salesRecords.filter(
        record =>
          productIds.includes(record.product_id) &&
          record.date >= filters.dateStart &&
          record.date <= filters.dateEnd
      );

      const salesByProduct = new Map<string, number>();
      for (const s of salesData) {
        salesByProduct.set(s.product_id, (salesByProduct.get(s.product_id) ?? 0) + s.sales);
      }

      const invByProduct = new Map<string, { warehouse: string; quantity: number; date: string }[]>();
      for (const r of invData) {
        if (!invByProduct.has(r.product_id)) invByProduct.set(r.product_id, []);
        invByProduct.get(r.product_id)!.push({ warehouse: r.warehouse, quantity: r.stock_quantity, date: r.date });
      }

      const days = Math.max(1, Math.round((new Date(filters.dateEnd).getTime() - new Date(filters.dateStart).getTime()) / (1000 * 60 * 60 * 24)));

      const result: InventorySummary[] = [];
      let totalVal = 0;
      let turnoverSum = 0;
      let turnoverCount = 0;

      for (const [productId, product] of products) {
        const invRecords = invByProduct.get(productId) ?? [];
        const latestByWarehouse = new Map<string, number>();
        for (const r of invRecords) {
          if (!latestByWarehouse.has(r.warehouse)) {
            latestByWarehouse.set(r.warehouse, r.quantity);
          }
        }
        const warehouseBreakdown = Array.from(latestByWarehouse.entries()).map(([warehouse, quantity]) => ({ warehouse, quantity }));
        const totalStock = warehouseBreakdown.reduce((sum, w) => sum + w.quantity, 0);
        const inventoryValue = totalStock * product.cost_price;
        totalVal += inventoryValue;

        const totalSales = salesByProduct.get(productId) ?? 0;
        const avgDailySales = totalSales / days;
        const turnoverDays = avgDailySales > 0 ? totalStock / avgDailySales : 999;
        if (totalStock > 0 && avgDailySales > 0) {
          turnoverSum += turnoverDays;
          turnoverCount++;
        }

        result.push({
          productId,
          productName: product.name,
          sku: product.sku,
          brand: product.brand,
          category: product.category,
          totalStock,
          inventoryValue,
          turnoverDays: Math.round(turnoverDays),
          warehouseBreakdown,
          avgDailySales,
        });
      }

      setSummaries(result.sort((a, b) => b.inventoryValue - a.inventoryValue));
      setTotalValue(totalVal);
      setAvgTurnover(turnoverCount > 0 ? Math.round(turnoverSum / turnoverCount) : 0);
      setLoading(false);
    };

    fetchInventory();
  }, [filters, products]);

  return { summaries, loading, totalValue, avgTurnover };
}
