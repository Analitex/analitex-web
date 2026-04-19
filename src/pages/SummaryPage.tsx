import { useState, useMemo } from 'react';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { SummaryTable } from '../components/table/SummaryTable';
import type { SummaryRow, GroupBy } from '../types';

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'day', label: 'По дням' },
  { value: 'week', label: 'По неделям' },
  { value: 'month', label: 'По месяцам' },
  { value: 'sku', label: 'По SKU' },
  { value: 'brand', label: 'По бренду' },
  { value: 'category', label: 'По категории' },
];

export function SummaryPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>('week');
  const analyticsGroupBy = useMemo(() => {
    switch (groupBy) {
      case 'day':
        return 'Date' as const;
      case 'week':
        return 'Week' as const;
      case 'month':
        return 'Month' as const;
      case 'brand':
        return 'Brand' as const;
      case 'category':
        return 'Category' as const;
      case 'sku':
      default:
        return 'Product' as const;
    }
  }, [groupBy]);
  const analytics = useAnalyticsWorkspaceData({
    breakdownGroupBy: analyticsGroupBy,
    includeTrends: false,
    includeExplanation: false,
  });

  const rows = useMemo(() => {
    const apiRows = analytics.breakdown?.rows ?? [];
    return apiRows.map((row, index) => {
      const dimension = typeof row.dimension === 'string' ? row.dimension : row.dimension?.label ?? row.dimension?.id ?? `Row ${index + 1}`;
      const metrics = row.metrics ?? {};
      const revenue = Number(metrics.sales ?? 0);
      const sales = Number(metrics.ordersCount ?? 0);
      const commission = Number(metrics.commission ?? 0);
      const logistics = Number(metrics.logistics ?? 0);
      const storage = Number(metrics.storage ?? 0);
      const returns = Number(metrics.returns ?? 0);
      const profit = revenue - commission - logistics - storage - returns;

      return {
        period: typeof row.dimension === 'string' ? row.dimension : row.dimension?.id ?? dimension,
        periodLabel: dimension,
        avgPriceBeforeDiscount: 0,
        avgSalePrice: sales > 0 ? revenue / sales : 0,
        revenue,
        sales,
        payouts: Math.max(0, revenue - commission - logistics),
        returns,
        operationalCosts: commission + logistics + storage,
        profit,
        orders: sales,
        buyoutRate: 0,
        productId: groupBy === 'sku' ? (typeof row.dimension === 'string' ? row.dimension : row.dimension?.id ?? undefined) : undefined,
        productName: groupBy === 'sku' ? dimension : undefined,
        brand: groupBy === 'brand' ? dimension : undefined,
        category: groupBy === 'category' ? dimension : undefined,
      } satisfies SummaryRow;
    });
  }, [analytics.breakdown?.rows, groupBy]);

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
            {analytics.accountIds.length > 0 ? `${analytics.accountIds.length} кабинетов` : analytics.loading ? 'Загрузка кабинетов' : 'Кабинеты не найдены'}
          </div>
        </div>

        {analytics.error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {analytics.error}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {analytics.summary?.metrics ? [
            { label: 'Sales', value: apiMetrics.sales },
            { label: 'Commission', value: apiMetrics.commission },
            { label: 'Logistics', value: apiMetrics.logistics },
            { label: 'Orders', value: apiMetrics.ordersCount },
            { label: 'Stock', value: apiMetrics.stockBalance },
          ].map(item => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {Number(item.value ?? 0).toLocaleString('ru-RU')}
              </div>
            </div>
          )) : Array.from({ length: 5 }).map((_, index) => (
            <div key={`summary-metric-placeholder-${index}`} className="rounded-2xl bg-slate-50 p-4">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-8 w-28 animate-pulse rounded bg-slate-200" />
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
              {analytics.loading && apiRows.length === 0 && Array.from({ length: 4 }).map((_, index) => (
                <div key={`summary-breakdown-placeholder-${index}`} className="rounded-xl bg-white px-4 py-3">
                  <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
              {!analytics.loading && apiRows.length === 0 && (
                <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500">
                  Backend пока не вернул строки детализации.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">API state</div>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                <dt className="text-slate-500">Summary updated</dt>
                <dd className="font-medium text-slate-900">{analytics.summary?.meta?.updatedAt ? new Date(analytics.summary.meta.updatedAt).toLocaleString('ru-RU') : '\u2014'}</dd>
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
          <h2 className="text-lg font-semibold text-slate-900">API report table</h2>
          <p className="mt-0.5 text-sm text-slate-500">Таблица теперь использует backend breakdown по выбранной группировке</p>
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

      <SummaryTable title="SummaryReport" rows={rows} loading={analytics.loading} />
    </div>
  );
}
