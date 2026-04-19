import { useState, useMemo } from 'react';
import { useFilters } from '../context/FilterContext';
import { useSalesData } from '../hooks/useSalesData';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { SummaryTable } from '../components/table/SummaryTable';
import { sumRecords, calcProfit } from '../lib/calculations';
import type { SummaryRow, GroupBy } from '../types';
import type { SalesRecord } from '../types';

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'day', label: 'По дням' },
  { value: 'week', label: 'По неделям' },
  { value: 'month', label: 'По месяцам' },
  { value: 'sku', label: 'По SKU' },
  { value: 'brand', label: 'По бренду' },
  { value: 'category', label: 'По категории' },
];

function getDetailedWeekLabel(dateStr: string) {
  const start = new Date(dateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startOfYear = new Date(start.getFullYear(), 0, 1);
  const days = Math.floor((start.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);

  const format = (date: Date) =>
    `${`${date.getDate()}`.padStart(2, '0')}.${`${date.getMonth() + 1}`.padStart(2, '0')}.${date.getFullYear()}`;

  return `${weekNumber} неделя (${format(start)} - ${format(end)})`;
}

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
      case 'month': {
        const d = new Date(r.date);
        return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`;
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
    if (groupBy === 'week') periodLabel = getDetailedWeekLabel(key);
    else if (groupBy === 'month') {
      const [year, month] = key.split('-').map(Number);
      periodLabel = new Date(year, month - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    }
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
  const analytics = useAnalyticsWorkspaceData();
  const [groupBy, setGroupBy] = useState<GroupBy>('week');

  const rows = useMemo(() => buildRows(records, groupBy, products), [records, groupBy, products]);

  const apiRows = analytics.breakdown?.rows ?? [];
  const apiMetrics = analytics.summary?.metrics ?? {};

  return (
    <div className="p-6">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Сводный отчет</h1>
            <p className="mt-1 text-sm text-slate-500">Агрегированные данные за выбранный период и live API snapshot</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {analytics.accountIds.length > 0 ? `${analytics.accountIds.length} accounts` : 'No accounts'}
          </div>
        </div>

        {analytics.error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {analytics.error}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Sales', value: apiMetrics.sales ?? 0 },
            { label: 'Commission', value: apiMetrics.commission ?? 0 },
            { label: 'Logistics', value: apiMetrics.logistics ?? 0 },
            { label: 'Orders', value: apiMetrics.ordersCount ?? 0 },
            { label: 'Stock', value: apiMetrics.stockBalance ?? 0 },
          ].map(item => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {Number.isFinite(item.value) ? item.value.toLocaleString('ru-RU') : '0'}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">API breakdown preview</div>
            <div className="mt-3 space-y-2">
              {apiRows.slice(0, 5).map((row, index) => {
                const dimension = typeof row.dimension === 'string' ? row.dimension : row.dimension?.label ?? row.dimension?.id ?? `Row ${index + 1}`;
                const sales = row.metrics?.sales ?? 0;
                const orders = row.metrics?.ordersCount ?? 0;
                return (
                  <div key={`${dimension}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{dimension}</div>
                      <div className="text-xs text-slate-500">orders: {orders.toLocaleString('ru-RU')}</div>
                    </div>
                    <div className="font-semibold text-slate-900">{sales.toLocaleString('ru-RU')}</div>
                  </div>
                );
              })}
              {apiRows.length === 0 && (
                <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500">
                  No breakdown rows from the API yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">API state</div>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                <dt className="text-slate-500">Summary updated</dt>
                <dd className="font-medium text-slate-900">{analytics.summary?.meta?.updatedAt ?? 'n/a'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                <dt className="text-slate-500">Trends series</dt>
                <dd className="font-medium text-slate-900">{analytics.trends?.series?.length ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                <dt className="text-slate-500">Partial data</dt>
                <dd className="font-medium text-slate-900">
                  {analytics.summary?.meta?.isPartial || analytics.trends?.dataState?.isPartial || analytics.breakdown?.meta?.isPartial ? 'Yes' : 'No'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Local fallback report</h2>
          <p className="mt-0.5 text-sm text-slate-500">Legacy table view kept until every breakdown screen is migrated</p>
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

      <SummaryTable title="SummaryReport" rows={rows} loading={loading} />
    </div>
  );
}
