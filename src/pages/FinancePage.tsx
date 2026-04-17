import { useMemo } from 'react';
import { useFilters } from '../context/FilterContext';
import { useSalesData } from '../hooks/useSalesData';
import { sumRecords, calcProfit, groupByWeek, getWeekLabel, formatCurrency, formatPercent } from '../lib/calculations';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface FinanceMetric {
  label: string;
  value: number;
  pctOfRevenue: number;
  color: string;
  bgColor: string;
  isPositive: boolean;
}

function FinanceRow({ metric, maxAbs }: { metric: FinanceMetric; maxAbs: number }) {
  const barWidth = maxAbs > 0 ? (Math.abs(metric.value) / maxAbs) * 100 : 0;
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="w-40 text-sm text-slate-600 font-medium shrink-0">{metric.label}</div>
      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden">
          <div
            className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${barWidth}%`, backgroundColor: metric.color, opacity: 0.8 }}
          />
        </div>
        <div className={`w-32 text-right text-sm font-semibold ${metric.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {metric.isPositive ? '' : '−'}{formatCurrency(Math.abs(metric.value), true)}
        </div>
        <div className="w-16 text-right text-xs text-slate-400">{metric.pctOfRevenue.toFixed(1)}%</div>
      </div>
    </div>
  );
}

function WeeklyProfitChart({ weeklyData }: { weeklyData: { label: string; revenue: number; costs: number; profit: number }[] }) {
  const maxVal = Math.max(...weeklyData.map(d => Math.max(d.revenue, Math.abs(d.profit))));
  if (maxVal === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-sm font-semibold text-slate-700 mb-4">Динамика прибыли по неделям</div>
      <div className="flex items-end gap-2 h-40">
        {weeklyData.map((week, i) => {
          const revH = (week.revenue / maxVal) * 144;
          const profH = (Math.abs(week.profit) / maxVal) * 144;
          const isProfitPos = week.profit >= 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="relative flex items-end gap-0.5 w-full justify-center"
                style={{ height: 144 }}
              >
                <div
                  className="w-5 bg-blue-100 rounded-t-md transition-all hover:bg-blue-200"
                  style={{ height: revH }}
                  title={`Выручка: ${formatCurrency(week.revenue, true)}`}
                />
                <div
                  className={`w-5 rounded-t-md transition-all ${isProfitPos ? 'bg-emerald-400 hover:bg-emerald-500' : 'bg-red-400 hover:bg-red-500'}`}
                  style={{ height: profH }}
                  title={`Прибыль: ${formatCurrency(week.profit, true)}`}
                />
              </div>
              <div className="text-[10px] text-slate-400 text-center leading-tight w-full truncate px-1">
                {week.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="w-3 h-3 rounded bg-blue-200" />Выручка
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="w-3 h-3 rounded bg-emerald-400" />Прибыль
        </div>
      </div>
    </div>
  );
}

export function FinancePage() {
  const { filters } = useFilters();
  const { records, loading } = useSalesData(filters);

  const agg = useMemo(() => sumRecords(records), [records]);
  const profit = useMemo(() => records.reduce((s, r) => s + calcProfit(r), 0), [records]);

  const weeklyData = useMemo(() => {
    const groups = groupByWeek(records);
    return [...groups.entries()].sort().map(([key, recs]) => {
      const s = sumRecords(recs);
      const p = recs.reduce((sum, r) => sum + calcProfit(r), 0);
      return { label: getWeekLabel(key), revenue: s.revenue, costs: s.totalCosts, profit: p };
    });
  }, [records]);

  const revenue = agg.revenue;
  const metrics: FinanceMetric[] = [
    { label: 'Выручка', value: revenue, pctOfRevenue: 100, color: '#3b82f6', bgColor: '#dbeafe', isPositive: true },
    { label: 'Логистика', value: -agg.logistics_cost, pctOfRevenue: revenue > 0 ? (agg.logistics_cost / revenue) * 100 : 0, color: '#f59e0b', bgColor: '#fef3c7', isPositive: false },
    { label: 'Реклама', value: -agg.ads_spend, pctOfRevenue: revenue > 0 ? (agg.ads_spend / revenue) * 100 : 0, color: '#8b5cf6', bgColor: '#ede9fe', isPositive: false },
    { label: 'Комиссия МП', value: -agg.commission, pctOfRevenue: revenue > 0 ? (agg.commission / revenue) * 100 : 0, color: '#ec4899', bgColor: '#fce7f3', isPositive: false },
    { label: 'Хранение', value: -agg.storage_cost, pctOfRevenue: revenue > 0 ? (agg.storage_cost / revenue) * 100 : 0, color: '#14b8a6', bgColor: '#ccfbf1', isPositive: false },
    { label: 'Налоги (6%)', value: -agg.taxes, pctOfRevenue: revenue > 0 ? (agg.taxes / revenue) * 100 : 0, color: '#ef4444', bgColor: '#fee2e2', isPositive: false },
    { label: 'Прочие расходы', value: -agg.other_costs, pctOfRevenue: revenue > 0 ? (agg.other_costs / revenue) * 100 : 0, color: '#94a3b8', bgColor: '#f1f5f9', isPositive: false },
    { label: 'Чистая прибыль', value: profit, pctOfRevenue: revenue > 0 ? (profit / revenue) * 100 : 0, color: profit >= 0 ? '#10b981' : '#ef4444', bgColor: profit >= 0 ? '#d1fae5' : '#fee2e2', isPositive: profit >= 0 },
  ];

  const maxAbs = Math.max(...metrics.map(m => Math.abs(m.value)));
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const topProducts = useMemo(() => {
    const byProduct = new Map<string, { revenue: number; profit: number; name: string }>();
    for (const r of records) {
      const cur = byProduct.get(r.product_id) ?? { revenue: 0, profit: 0, name: r.product_id };
      cur.revenue += r.revenue;
      cur.profit += calcProfit(r);
      byProduct.set(r.product_id, cur);
    }
    return [...byProduct.values()].sort((a, b) => b.profit - a.profit).slice(0, 10);
  }, [records]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Финансы</h1>
        <p className="text-sm text-slate-500 mt-0.5">Структура доходов и расходов</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Выручка', value: formatCurrency(revenue, true), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Чистая прибыль', value: formatCurrency(profit, true), icon: profit >= 0 ? TrendingUp : TrendingDown, color: profit >= 0 ? 'text-emerald-600' : 'text-red-500', bg: profit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
          { label: 'Маржа', value: formatPercent(margin, 1).replace('+', ''), icon: profit >= 0 ? TrendingUp : TrendingDown, color: profit >= 0 ? 'text-emerald-600' : 'text-red-500', bg: profit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                <Icon size={22} className={item.color} />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">{item.label}</div>
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-700 mb-4">P&L Отчет</div>
          <div className="flex items-center text-xs text-slate-400 gap-4 mb-3 pb-2 border-b border-slate-100">
            <span className="w-40">Статья</span>
            <span className="flex-1">Доля от выручки</span>
            <span className="w-32 text-right">Сумма</span>
            <span className="w-16 text-right">%</span>
          </div>
          {metrics.map(m => (
            <FinanceRow key={m.label} metric={m} maxAbs={maxAbs} />
          ))}
        </div>

        <WeeklyProfitChart weeklyData={weeklyData} />
      </div>

      {topProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-700 mb-4">Топ-10 товаров по прибыли</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase">Товар</th>
                  <th className="text-right py-2 pr-4 text-xs font-semibold text-slate-500 uppercase">Выручка</th>
                  <th className="text-right py-2 pr-4 text-xs font-semibold text-slate-500 uppercase">Прибыль</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Маржа</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topProducts.map((p, i) => {
                  const m = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 text-slate-700 font-medium">{p.name}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{formatCurrency(p.revenue, true)}</td>
                      <td className={`py-2.5 pr-4 text-right font-semibold ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(p.profit, true)}
                      </td>
                      <td className={`py-2.5 text-right ${m >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {m.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
