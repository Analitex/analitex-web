import { useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { useProductReportingData } from '../hooks/useProductReportingData';
import { formatCurrency, formatNumber } from '../lib/calculations';
import { AlertTriangle, Package, Search, TrendingDown } from 'lucide-react';
import type { InventorySummary } from '../types';

function getMetricNumber(metrics: Record<string, number | null> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metrics?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function TurnoverBadge({ days }: { days: number }) {
  if (days <= 14) return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Критично ({days} д)</span>;
  if (days <= 30) return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Мало ({days} д)</span>;
  if (days >= 200) return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Нет продаж</span>;
  return <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Норма ({days} д)</span>;
}

function WarehouseBar({ breakdown }: { breakdown: InventorySummary['warehouseBreakdown'] }) {
  const total = breakdown.reduce((sum, item) => sum + item.quantity, 0);
  if (total === 0) return null;

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="flex items-center gap-1">
      <div className="flex h-2 w-24 shrink-0 overflow-hidden rounded-full">
        {breakdown.map((item, index) => (
          <div key={item.warehouse} style={{ width: `${(item.quantity / total) * 100}%`, backgroundColor: colors[index % colors.length] }} />
        ))}
      </div>
      <span className="text-xs text-slate-400">{breakdown.map(item => `${item.warehouse}: ${item.quantity}`).join(' · ')}</span>
    </div>
  );
}

function getDaysInRange(dateStart: string, dateEnd: string) {
  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

export function InventoryPage() {
  const { filters } = useFilters();
  const analytics = useAnalyticsWorkspaceData({
    includeSummary: false,
    includeTrends: false,
    includeBreakdown: false,
    includeExplanation: false,
  });
  const productReporting = useProductReportingData({
    accountIds: analytics.accountIds,
    limit: 200,
  });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<keyof InventorySummary>('inventoryValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const summaries = useMemo<InventorySummary[]>(() => {
    const days = getDaysInRange(filters.dateStart, filters.dateEnd);
    return productReporting.rows.map((row, index) => {
      const metrics = row.metrics ?? {};
      const totalStock = getMetricNumber(metrics, ['stockBalance']);
      const ownWarehouseStock = getMetricNumber(metrics, ['userWarehouseStockBalance']);
      const marketplaceWarehouseStock = getMetricNumber(metrics, ['stockBalanceInWh', 'stockBalance']) - ownWarehouseStock;
      const stockToClient = getMetricNumber(metrics, ['stockBalanceInWayToClient']);
      const stockFromClient = getMetricNumber(metrics, ['stockBalanceInWayFromClient']);
      const inventoryValue = getMetricNumber(metrics, ['capitalizationByCost', 'userWarehouseCapitalizationByCost']);
      const salesUnits = getMetricNumber(metrics, ['salesUnits', 'totalSales', 'ordersCount']);
      const avgDailySales = days > 0 ? salesUnits / days : 0;
      const turnoverDays = avgDailySales > 0 ? Math.round(totalStock / avgDailySales) : 999;

      const warehouseBreakdown = [
        { warehouse: 'Склады МП', quantity: Math.max(0, Math.round(marketplaceWarehouseStock)) },
        { warehouse: 'Мои склады', quantity: Math.max(0, Math.round(ownWarehouseStock)) },
        { warehouse: 'К клиенту', quantity: Math.max(0, Math.round(stockToClient)) },
        { warehouse: 'От клиента', quantity: Math.max(0, Math.round(stockFromClient)) },
      ].filter(item => item.quantity > 0);

      return {
        productId: row.dimension?.vendorCode ?? row.dimension?.marketplaceArticle ?? row.dimension?.productName ?? `product-${index + 1}`,
        productName: row.dimension?.productName ?? row.dimension?.vendorCode ?? `Товар ${index + 1}`,
        sku: row.dimension?.vendorCode ?? row.dimension?.marketplaceArticle ?? '\u2014',
        brand: row.dimension?.brand ?? '',
        category: row.dimension?.category ?? '',
        totalStock: Math.max(0, Math.round(totalStock)),
        inventoryValue,
        turnoverDays,
        warehouseBreakdown,
        avgDailySales,
      } satisfies InventorySummary;
    });
  }, [filters.dateEnd, filters.dateStart, productReporting.rows]);

  const filtered = summaries
    .filter(item => !search || item.productName.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase()))
    .sort((left, right) => {
      const leftValue = left[sortBy];
      const rightValue = right[sortBy];
      const comparison = typeof leftValue === 'number' && typeof rightValue === 'number' ? leftValue - rightValue : 0;
      return sortDir === 'asc' ? comparison : -comparison;
    });

  const totalValue = summaries.reduce((sum, item) => sum + item.inventoryValue, 0);
  const avgTurnover = summaries.length > 0 ? Math.round(summaries.reduce((sum, item) => sum + item.turnoverDays, 0) / summaries.length) : 0;
  const criticalCount = summaries.filter(item => item.turnoverDays <= 14 && item.totalStock > 0).length;
  const outOfStock = summaries.filter(item => item.totalStock === 0).length;
  const hasData = summaries.length > 0;

  const handleSort = (key: keyof InventorySummary) => {
    if (sortBy === key) {
      setSortDir(current => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  if (analytics.loading || productReporting.loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Склад</h1>
        <p className="mt-0.5 text-sm text-slate-500">Остатки, оборачиваемость и стоимость запасов на основе live API</p>
      </div>

      {analytics.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {analytics.error}
        </div>
      )}

      {productReporting.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {productReporting.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Стоимость склада', value: formatCurrency(totalValue, true), icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Средняя оборач.', value: `${avgTurnover} дн`, icon: TrendingDown, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Критичный запас', value: String(criticalCount), icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Нет на складе', value: String(outOfStock), icon: Package, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                <Icon size={18} className={item.color} />
              </div>
              <div>
                <div className="text-xs text-slate-500">{item.label}</div>
                <div className={`text-xl font-bold ${hasData ? item.color : 'text-slate-300'}`}>{hasData ? item.value : '--'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {!hasData && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
          <div className="text-sm font-semibold text-slate-700">Live данные по складу пока недоступны</div>
          <div className="mt-1 text-sm text-slate-500">Страница уже переведена на `reporting/products` и заполнится, когда backend вернёт данные по остаткам.</div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по товару или SKU..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-400">{filtered.length} товаров</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {[
                  { key: 'productName' as keyof InventorySummary, label: 'Товар', align: 'left' },
                  { key: 'totalStock' as keyof InventorySummary, label: 'Остаток', align: 'right' },
                  { key: 'inventoryValue' as keyof InventorySummary, label: 'Ст-ть запаса', align: 'right' },
                  { key: 'avgDailySales' as keyof InventorySummary, label: 'Прод/день', align: 'right' },
                  { key: 'turnoverDays' as keyof InventorySummary, label: 'Оборач.', align: 'right' },
                  { key: 'warehouseBreakdown' as keyof InventorySummary, label: 'Склады', align: 'left' },
                ].map(column => (
                  <th
                    key={column.key as string}
                    onClick={() => column.key !== 'warehouseBreakdown' && handleSort(column.key)}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${column.align === 'right' ? 'text-right' : 'text-left'} ${column.key !== 'warehouseBreakdown' ? 'cursor-pointer hover:text-slate-700' : ''}`}
                  >
                    {column.label}
                    {sortBy === column.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Нет данных</td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.productId} className={`transition-colors hover:bg-slate-50 ${item.totalStock === 0 ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{item.productName}</div>
                      <div className="text-xs text-slate-400">{item.sku} · {item.brand || 'Без бренда'} · {item.category || 'Без категории'}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${item.totalStock === 0 ? 'text-red-500' : 'text-slate-800'}`}>
                        {formatNumber(item.totalStock)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrency(item.inventoryValue, true)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{item.avgDailySales.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">
                      <TurnoverBadge days={item.turnoverDays} />
                    </td>
                    <td className="px-4 py-3">
                      <WarehouseBar breakdown={item.warehouseBreakdown} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
