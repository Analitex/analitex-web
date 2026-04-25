import { useMemo, useState } from 'react';
import { ProductDrilldownModal } from '../components/product/ProductDrilldownModal';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { useProductDrilldownData } from '../hooks/useProductDrilldownData';
import { useProductReportingData } from '../hooks/useProductReportingData';
import { formatCurrency, formatPercent } from '../lib/calculations';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

interface FinanceMetric {
  label: string;
  value: number;
  pctOfRevenue: number;
  color: string;
  isPositive: boolean;
}

interface FinanceTopProduct {
  id: string;
  name: string;
  article: string;
  revenue: number;
  profit: number;
}

function getMetricNumber(metrics: Record<string, number | null> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metrics?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function FinanceRow({ metric, maxAbs }: { metric: FinanceMetric; maxAbs: number }) {
  const barWidth = maxAbs > 0 ? (Math.abs(metric.value) / maxAbs) * 100 : 0;
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 py-3 last:border-0">
      <div className="w-40 shrink-0 text-sm font-medium text-slate-600">{metric.label}</div>
      <div className="flex flex-1 items-center gap-3">
        <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
          <div
            className="flex h-full items-center justify-end rounded-md pr-2 transition-all duration-500"
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

function WeeklyProfitChart({ weeklyData }: { weeklyData: { label: string; revenue: number; profit: number }[] }) {
  const maxVal = Math.max(...weeklyData.map(item => Math.max(item.revenue, Math.abs(item.profit))), 0);
  if (maxVal <= 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 text-sm font-semibold text-slate-700">Динамика прибыли по неделям</div>
      <div className="flex h-40 items-end gap-2">
        {weeklyData.map((week, index) => {
          const revenueHeight = (week.revenue / maxVal) * 144;
          const profitHeight = (Math.abs(week.profit) / maxVal) * 144;
          const isProfitPositive = week.profit >= 0;

          return (
            <div key={`${week.label}-${index}`} className="group flex flex-1 flex-col items-center gap-1">
              <div className="relative flex h-36 w-full items-end justify-center gap-0.5">
                <div
                  className="w-5 rounded-t-md bg-blue-100 transition-all hover:bg-blue-200"
                  style={{ height: revenueHeight }}
                  title={`Выручка: ${formatCurrency(week.revenue, true)}`}
                />
                <div
                  className={`w-5 rounded-t-md transition-all ${isProfitPositive ? 'bg-emerald-400 hover:bg-emerald-500' : 'bg-red-400 hover:bg-red-500'}`}
                  style={{ height: profitHeight }}
                  title={`Прибыль: ${formatCurrency(week.profit, true)}`}
                />
              </div>
              <div className="w-full truncate px-1 text-center text-[10px] leading-tight text-slate-400">
                {week.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="h-3 w-3 rounded bg-blue-200" />Выручка
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="h-3 w-3 rounded bg-emerald-400" />Прибыль
        </div>
      </div>
    </div>
  );
}

export function FinancePage() {
  const analytics = useAnalyticsWorkspaceData({
    includeBreakdown: false,
    includeExplanation: false,
  });
  const productReporting = useProductReportingData({
    accountIds: analytics.accountIds,
    limit: 100,
  });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductName, setSelectedProductName] = useState('');
  const drilldown = useProductDrilldownData(selectedProductId, analytics.accountIds, Boolean(selectedProductId));

  const summaryMetrics = productReporting.summary?.metrics ?? analytics.summary?.metrics;
  const summaryMeta = productReporting.summary?.meta ?? analytics.summary?.meta ?? null;
  const revenue = Number(summaryMetrics?.sales ?? 0);
  const commission = Number(summaryMetrics?.commission ?? 0);
  const logistics = Number(summaryMetrics?.logistics ?? 0);
  const storage = Number(summaryMetrics?.storage ?? 0);
  const returns = Number(summaryMetrics?.returns ?? 0);

  const aggregatedProductMetrics = useMemo(() => {
    return productReporting.rows.reduce(
      (acc, row) => {
        const metrics = row.metrics ?? {};
        acc.profit += getMetricNumber(metrics, ['profit']);
        acc.advertising += getMetricNumber(metrics, ['advertisingExpense', 'advertisingExpenseSum']);
        acc.taxes += getMetricNumber(metrics, ['tax', 'taxes']);
        acc.other += getMetricNumber(metrics, ['otherDeduction', 'expense', 'fines']);
        acc.totalPaid += getMetricNumber(metrics, ['totalPaid']);
        return acc;
      },
      { profit: 0, advertising: 0, taxes: 0, other: 0, totalPaid: 0 }
    );
  }, [productReporting.rows]);

  const advertising = Number(summaryMetrics?.advertisingExpense ?? aggregatedProductMetrics.advertising);
  const taxes = Number(summaryMetrics?.tax ?? summaryMetrics?.taxes ?? aggregatedProductMetrics.taxes);
  const otherExpenses = Number(summaryMetrics?.otherDeduction ?? aggregatedProductMetrics.other);
  const fallbackProfit = aggregatedProductMetrics.profit || revenue - commission - logistics - storage - returns - advertising - taxes - otherExpenses;
  const profit = Number(summaryMetrics?.profit ?? fallbackProfit);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const hasData = Boolean(analytics.summary) || productReporting.rows.length > 0;

  const metrics: FinanceMetric[] = [
    { label: 'Выручка', value: revenue, pctOfRevenue: revenue > 0 ? 100 : 0, color: '#3b82f6', isPositive: true },
    { label: 'Логистика', value: -logistics, pctOfRevenue: revenue > 0 ? (logistics / revenue) * 100 : 0, color: '#f59e0b', isPositive: false },
    { label: 'Реклама', value: -advertising, pctOfRevenue: revenue > 0 ? (advertising / revenue) * 100 : 0, color: '#8b5cf6', isPositive: false },
    { label: 'Комиссия МП', value: -commission, pctOfRevenue: revenue > 0 ? (commission / revenue) * 100 : 0, color: '#ec4899', isPositive: false },
    { label: 'Хранение', value: -storage, pctOfRevenue: revenue > 0 ? (storage / revenue) * 100 : 0, color: '#14b8a6', isPositive: false },
    { label: 'Налоги', value: -taxes, pctOfRevenue: revenue > 0 ? (taxes / revenue) * 100 : 0, color: '#ef4444', isPositive: false },
    { label: 'Прочие расходы', value: -otherExpenses, pctOfRevenue: revenue > 0 ? (otherExpenses / revenue) * 100 : 0, color: '#94a3b8', isPositive: false },
    { label: 'Возвраты', value: -returns, pctOfRevenue: revenue > 0 ? (returns / revenue) * 100 : 0, color: '#fb7185', isPositive: false },
    { label: 'Чистая прибыль', value: profit, pctOfRevenue: revenue > 0 ? (profit / revenue) * 100 : 0, color: profit >= 0 ? '#10b981' : '#ef4444', isPositive: profit >= 0 },
  ];

  const maxAbs = Math.max(...metrics.map(metric => Math.abs(metric.value)), 0);

  const weeklyData = useMemo(() => {
    return (analytics.trends?.series ?? []).map((point, index) => {
      const metrics = point.metrics ?? {};
      const pointRevenue = Number(metrics.sales ?? 0);
      const pointProfit =
        pointRevenue -
        Number(metrics.commission ?? 0) -
        Number(metrics.logistics ?? 0) -
        Number(metrics.storage ?? 0) -
        Number(metrics.returns ?? 0);

      return {
        label: point.date ? new Date(point.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : `Период ${index + 1}`,
        revenue: pointRevenue,
        profit: pointProfit,
      };
    });
  }, [analytics.trends?.series]);

  const topProducts = useMemo<FinanceTopProduct[]>(() => {
    return productReporting.rows
      .map((row, index) => ({
        id: row.dimension?.vendorCode ?? row.dimension?.marketplaceArticle ?? row.dimension?.productName ?? `product-${index + 1}`,
        name: row.dimension?.productName ?? row.dimension?.vendorCode ?? `Товар ${index + 1}`,
        article: row.dimension?.vendorCode ?? row.dimension?.marketplaceArticle ?? '\u2014',
        revenue: getMetricNumber(row.metrics ?? {}, ['sales']),
        profit: getMetricNumber(row.metrics ?? {}, ['profit']),
      }))
      .sort((left, right) => right.profit - left.profit)
      .slice(0, 10);
  }, [productReporting.rows]);

  if (analytics.loading || productReporting.loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
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
        <h1 className="text-xl font-bold text-slate-900">Финансы</h1>
        <p className="mt-0.5 text-sm text-slate-500">Структура доходов и расходов на основе live API</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            summaryMeta?.taxConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            Налоги: {summaryMeta?.taxConfigured ? 'настроены' : 'нет настроек'}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            summaryMeta?.productCostsConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            Себестоимость: {summaryMeta?.productCostsConfigured ? 'настроена' : 'нет настроек'}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            summaryMeta?.economicsConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            Экономика: {summaryMeta?.economicsConfigured ? 'полная' : 'неполная'}
          </span>
        </div>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Выручка', value: formatCurrency(revenue, true), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Чистая прибыль', value: formatCurrency(profit, true), icon: profit >= 0 ? TrendingUp : TrendingDown, color: profit >= 0 ? 'text-emerald-600' : 'text-red-500', bg: profit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
          { label: 'Маржа', value: formatPercent(margin, 1).replace('+', ''), icon: profit >= 0 ? TrendingUp : TrendingDown, color: profit >= 0 ? 'text-emerald-600' : 'text-red-500', bg: profit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
              <div className={`h-12 w-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                <Icon size={22} className={item.color} />
              </div>
              <div>
                <div className="mb-0.5 text-xs text-slate-500">{item.label}</div>
                <div className={`text-2xl font-bold ${hasData ? item.color : 'text-slate-300'}`}>{hasData ? item.value : '--'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {!hasData && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
          <div className="text-sm font-semibold text-slate-700">Live финансовые данные пока недоступны</div>
          <div className="mt-1 text-sm text-slate-500">Страница уже переведена на новый API и заполнится, когда backend вернёт данные по выбранным фильтрам.</div>
        </div>
      )}

      {hasData && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 text-sm font-semibold text-slate-700">P&L Отчет</div>
            <div className="mb-3 flex items-center gap-4 border-b border-slate-100 pb-2 text-xs text-slate-400">
              <span className="w-40">Статья</span>
              <span className="flex-1">Доля от выручки</span>
              <span className="w-32 text-right">Сумма</span>
              <span className="w-16 text-right">%</span>
            </div>
            {metrics.map(metric => (
              <FinanceRow key={metric.label} metric={metric} maxAbs={maxAbs} />
            ))}
          </div>

          {weeklyData.length > 0 ? (
            <WeeklyProfitChart weeklyData={weeklyData} />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
              Backend пока не вернул точки динамики по трендам для финансового графика.
            </div>
          )}
        </div>
      )}

      {topProducts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 text-sm font-semibold text-slate-700">Топ-10 товаров по прибыли</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2 pr-4 text-left text-xs font-semibold uppercase text-slate-500">Товар</th>
                  <th className="py-2 pr-4 text-right text-xs font-semibold uppercase text-slate-500">Выручка</th>
                  <th className="py-2 pr-4 text-right text-xs font-semibold uppercase text-slate-500">Прибыль</th>
                  <th className="py-2 text-right text-xs font-semibold uppercase text-slate-500">Маржа</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topProducts.map(product => {
                  const productMargin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                  return (
                    <tr
                      key={product.id}
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setSelectedProductName(product.name);
                      }}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="py-2.5 pr-4 font-medium text-slate-700">
                        <div className="max-w-[320px] whitespace-normal break-words">{product.name}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{product.article}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{formatCurrency(product.revenue, true)}</td>
                      <td className={`py-2.5 pr-4 text-right font-semibold ${product.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(product.profit, true)}
                      </td>
                      <td className={`py-2.5 text-right ${productMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {productMargin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProductDrilldownModal
        open={Boolean(selectedProductId)}
        fallbackName={selectedProductName}
        fallbackProductId={selectedProductId ?? ''}
        drilldown={drilldown}
        onClose={() => {
          setSelectedProductId(null);
          setSelectedProductName('');
        }}
      />
    </div>
  );
}
