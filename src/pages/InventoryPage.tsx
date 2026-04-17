import { useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useSalesData } from '../hooks/useSalesData';
import { useInventoryData } from '../hooks/useInventoryData';
import { formatCurrency, formatNumber } from '../lib/calculations';
import { Package, AlertTriangle, TrendingDown, Search } from 'lucide-react';
import type { InventorySummary } from '../types';

function TurnoverBadge({ days }: { days: number }) {
  if (days <= 14) return <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Критично ({days} д)</span>;
  if (days <= 30) return <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">Мало ({days} д)</span>;
  if (days >= 200) return <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-500 rounded-full">Нет продаж</span>;
  return <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">Норма ({days} д)</span>;
}

function WarehouseBar({ breakdown }: { breakdown: InventorySummary['warehouseBreakdown'] }) {
  const total = breakdown.reduce((s, w) => s + w.quantity, 0);
  if (total === 0) return null;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  return (
    <div className="flex items-center gap-1">
      <div className="flex h-2 rounded-full overflow-hidden w-24 shrink-0">
        {breakdown.map((w, i) => (
          <div key={w.warehouse} style={{ width: `${(w.quantity / total) * 100}%`, backgroundColor: colors[i % colors.length] }} />
        ))}
      </div>
      <span className="text-xs text-slate-400">{breakdown.map(w => `${w.warehouse}: ${w.quantity}`).join(' · ')}</span>
    </div>
  );
}

export function InventoryPage() {
  const { filters } = useFilters();
  const { products } = useSalesData(filters);
  const { summaries, loading, totalValue, avgTurnover } = useInventoryData(filters, products);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<keyof InventorySummary>('inventoryValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = summaries
    .filter(s => !search || s.productName.toLowerCase().includes(search.toLowerCase()) || s.sku.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const criticalCount = summaries.filter(s => s.turnoverDays <= 14 && s.totalStock > 0).length;
  const outOfStock = summaries.filter(s => s.totalStock === 0).length;

  const handleSort = (key: keyof InventorySummary) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Склад</h1>
        <p className="text-sm text-slate-500 mt-0.5">Остатки, оборачиваемость и стоимость запасов</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Стоимость склада', value: formatCurrency(totalValue, true), icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Средняя оборач.', value: `${avgTurnover} дн`, icon: TrendingDown, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Критичный запас', value: String(criticalCount), icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Нет на складе', value: String(outOfStock), icon: Package, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={item.color} />
              </div>
              <div>
                <div className="text-xs text-slate-500">{item.label}</div>
                <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по товару или SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-400">{filtered.length} товаров</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  { key: 'productName' as keyof InventorySummary, label: 'Товар', align: 'left' },
                  { key: 'totalStock' as keyof InventorySummary, label: 'Остаток', align: 'right' },
                  { key: 'inventoryValue' as keyof InventorySummary, label: 'Ст-ть запаса', align: 'right' },
                  { key: 'avgDailySales' as keyof InventorySummary, label: 'Прод/день', align: 'right' },
                  { key: 'turnoverDays' as keyof InventorySummary, label: 'Оборач.', align: 'right' },
                  { key: 'warehouseBreakdown' as keyof InventorySummary, label: 'Склады', align: 'left' },
                ].map(col => (
                  <th
                    key={col.key as string}
                    onClick={() => col.key !== 'warehouseBreakdown' && handleSort(col.key)}
                    className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.key !== 'warehouseBreakdown' ? 'cursor-pointer hover:text-slate-700' : ''}`}
                  >
                    {col.label}
                    {sortBy === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Нет данных</td></tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.productId} className={`hover:bg-slate-50 transition-colors ${item.totalStock === 0 ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{item.productName}</div>
                      <div className="text-xs text-slate-400">{item.sku} · {item.brand} · {item.category}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${item.totalStock === 0 ? 'text-red-500' : 'text-slate-800'}`}>
                        {formatNumber(item.totalStock)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 font-medium">
                      {formatCurrency(item.inventoryValue, true)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.avgDailySales.toFixed(1)}
                    </td>
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
