import { useState, useMemo } from 'react';
import { useFilters } from '../context/FilterContext';
import { useSalesData } from '../hooks/useSalesData';
import { SummaryTable } from '../components/table/SummaryTable';
import { sumRecords, groupByWeek, getWeekLabel, calcProfit } from '../lib/calculations';
import type { SummaryRow, GroupBy } from '../types';
import type { SalesRecord } from '../types';

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'week', label: 'По неделям' },
  { value: 'day', label: 'По дням' },
  { value: 'sku', label: 'По SKU' },
  { value: 'brand', label: 'По бренду' },
  { value: 'category', label: 'По категории' },
];

function buildRows(
  records: SalesRecord[],
  groupBy: GroupBy,
  products: Map<string, import('../types').Product>
): SummaryRow[] {
  const groupFn = (r: SalesRecord): string => {
    switch (groupBy) {
      case 'week': {
        const d = new Date(r.date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
      }
      case 'day': return r.date;
      case 'sku': return r.product_id;
      case 'brand': return products.get(r.product_id)?.brand ?? 'Неизвестно';
      case 'category': return products.get(r.product_id)?.category ?? 'Неизвестно';
    }
  };

  const groups = new Map<string, SalesRecord[]>();
  for (const r of records) {
    const key = groupFn(r);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return Array.from(groups.entries()).map(([key, recs]) => {
    const agg = sumRecords(recs);
    const totalProfit = recs.reduce((s, r) => s + calcProfit(r), 0);
    const payouts = agg.revenue - agg.commission - agg.logistics_cost;

    let periodLabel = key;
    if (groupBy === 'week') periodLabel = getWeekLabel(key);
    else if (groupBy === 'day') {
      const d = new Date(key);
      periodLabel = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' });
    } else if (groupBy === 'sku') {
      const p = products.get(key);
      periodLabel = p ? `${p.name} (${p.sku})` : key;
    }

    return {
      period: key,
      periodLabel,
      avgPriceBeforeDiscount: agg.avgPrice,
      avgSalePrice: agg.avgSalePrice,
      revenue: agg.revenue,
      sales: agg.sales,
      payouts: Math.max(0, payouts),
      returns: agg.returns,
      operationalCosts: agg.totalCosts,
      profit: totalProfit,
      orders: agg.orders,
      buyoutRate: agg.buyoutRate,
      productId: groupBy === 'sku' ? key : undefined,
      productName: groupBy === 'sku' ? products.get(key)?.name : undefined,
      brand: groupBy === 'brand' ? key : products.get(recs[0]?.product_id)?.brand,
      category: groupBy === 'category' ? key : products.get(recs[0]?.product_id)?.category,
    } as SummaryRow;
  }).sort((a, b) => a.period.localeCompare(b.period));
}

export function SummaryPage() {
  const { filters } = useFilters();
  const { records, products, loading } = useSalesData(filters);
  const [groupBy, setGroupBy] = useState<GroupBy>('week');

  const rows = useMemo(() => buildRows(records, groupBy, products), [records, groupBy, products]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Сводный отчет</h1>
          <p className="text-sm text-slate-500 mt-0.5">Агрегированные данные за выбранный период</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {GROUP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setGroupBy(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                groupBy === opt.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <SummaryTable rows={rows} loading={loading} />
    </div>
  );
}
