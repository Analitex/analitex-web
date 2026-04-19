import { useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useSalesData } from '../hooks/useSalesData';
import { usePlanFactData } from '../hooks/usePlanFactData';
import { formatCurrency } from '../lib/calculations';
import { Target, TrendingUp, TrendingDown, Search } from 'lucide-react';
import type { PlanFactRow } from '../types';

function DeviationBadge({ pct }: { pct: number }) {
  const abs = Math.abs(pct);
  if (pct >= 10) return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full"><TrendingUp size={10} />+{pct.toFixed(1)}%</span>;
  if (pct >= 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full"><TrendingUp size={10} />+{pct.toFixed(1)}%</span>;
  if (abs >= 20) return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full"><TrendingDown size={10} />{pct.toFixed(1)}%</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full"><TrendingDown size={10} />{pct.toFixed(1)}%</span>;
}

function PlanActualBar({ planned, actual }: { planned: number; actual: number }) {
  const max = Math.max(planned, actual, 1);
  const planPct = (planned / max) * 100;
  const actPct = (actual / max) * 100;
  const isOver = actual >= planned;

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${planPct}%` }} />
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isOver ? 'bg-emerald-500' : 'bg-red-400'}`}
            style={{ width: `${actPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function PlanFactPage() {
  const { filters } = useFilters();
  const { products } = useSalesData(filters);
  const { rows, loading } = usePlanFactData(filters, products);
  const [search, setSearch] = useState('');

  const filtered = rows.filter(r =>
    !search || r.productName.toLowerCase().includes(search.toLowerCase()) || r.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalPlannedRevenue = rows.reduce((s, r) => s + r.plannedRevenue, 0);
  const totalActualRevenue = rows.reduce((s, r) => s + r.actualRevenue, 0);
  const totalPlannedProfit = rows.reduce((s, r) => s + r.plannedProfit, 0);
  const totalActualProfit = rows.reduce((s, r) => s + r.actualProfit, 0);

  const overPlanCount = rows.filter(r => r.revenueDeviationPct >= 0).length;
  const underPlanCount = rows.filter(r => r.revenueDeviationPct < 0).length;
  const hasData = rows.length > 0;

  const overallRevPct = totalPlannedRevenue > 0 ? ((totalActualRevenue - totalPlannedRevenue) / totalPlannedRevenue) * 100 : 0;
  const overallProfPct = totalPlannedProfit > 0 ? ((totalActualProfit - totalPlannedProfit) / totalPlannedProfit) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">План / Факт</h1>
        <p className="text-sm text-slate-500 mt-0.5">Сравнение плановых и фактических показателей</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Выручка план', value: formatCurrency(totalPlannedRevenue, true),
            sub: `Факт: ${formatCurrency(totalActualRevenue, true)}`, pct: overallRevPct,
            icon: Target, color: 'text-blue-600', bg: 'bg-blue-50'
          },
          {
            label: 'Прибыль план', value: formatCurrency(totalPlannedProfit, true),
            sub: `Факт: ${formatCurrency(totalActualProfit, true)}`, pct: overallProfPct,
            icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50'
          },
          {
            label: 'Выполнили план', value: String(overPlanCount),
            sub: 'товаров ≥ 100%', pct: null,
            icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50'
          },
          {
            label: 'Не выполнили', value: String(underPlanCount),
            sub: 'товаров < 100%', pct: null,
            icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50'
          },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                  <Icon size={15} className={item.color} />
                </div>
                <div className="text-xs text-slate-500">{item.label}</div>
              </div>
              <div className={`text-xl font-bold ${hasData ? item.color : 'text-slate-300'}`}>{hasData ? item.value : '--'}</div>
              <div className="text-xs text-slate-400 mt-0.5">{hasData ? item.sub : 'Ожидаем live данные'}</div>
              {hasData && item.pct !== null && (
                <div className="mt-2">
                  <DeviationBadge pct={item.pct} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && !hasData && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
          <div className="text-sm font-semibold text-slate-700">Live данные план/факт пока недоступны</div>
          <div className="mt-1 text-sm text-slate-500">Локальные seed-данные удалены из этой страницы. После подключения backend endpoint таблица заполнится автоматически.</div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по товару..."
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Товар</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">План выручки</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Факт выручки</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Выполн.</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Прогресс</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">План прибыли</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Факт прибыли</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Откл. прибыль</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">Нет данных</td></tr>
              ) : (
                filtered.map((row: PlanFactRow) => (
                  <tr key={row.productId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{row.productName}</div>
                      <div className="text-xs text-slate-400">{row.sku} · {row.brand}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.plannedRevenue, true)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(row.actualRevenue, true)}</td>
                    <td className="px-4 py-3 text-center"><DeviationBadge pct={row.revenueDeviationPct} /></td>
                    <td className="px-4 py-3">
                      <PlanActualBar planned={row.plannedRevenue} actual={row.actualRevenue} />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(row.plannedProfit, true)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${row.actualProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatCurrency(row.actualProfit, true)}
                    </td>
                    <td className="px-4 py-3 text-center"><DeviationBadge pct={row.profitDeviationPct} /></td>
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
