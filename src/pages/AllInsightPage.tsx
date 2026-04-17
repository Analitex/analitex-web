import { useMemo } from 'react';
import { useFilters } from '../context/FilterContext';
import { useSalesData } from '../hooks/useSalesData';
import { calcProfit, sumRecords, formatCurrency, formatNumber } from '../lib/calculations';
import { Sparkles, AlertTriangle, TrendingDown, TrendingUp, Lightbulb, Target, Zap } from 'lucide-react';
import type { SalesRecord, Product } from '../types';

interface Insight {
  type: 'warning' | 'success' | 'info' | 'critical';
  title: string;
  description: string;
  value?: string;
  action?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

function InsightCard({ insight }: { insight: Insight }) {
  const styles = {
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', title: 'text-amber-800', desc: 'text-amber-700', badge: 'bg-amber-100 text-amber-600' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', title: 'text-emerald-800', desc: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-600' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', title: 'text-blue-800', desc: 'text-blue-700', badge: 'bg-blue-100 text-blue-600' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', title: 'text-red-800', desc: 'text-red-700', badge: 'bg-red-100 text-red-600' },
  };
  const s = styles[insight.type];
  const Icon = insight.icon;

  return (
    <div className={`${s.bg} border ${s.border} rounded-xl p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.badge}`}>
          <Icon size={16} className={s.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${s.title} mb-1`}>{insight.title}</div>
          <div className={`text-sm ${s.desc} leading-relaxed`}>{insight.description}</div>
          {insight.value && (
            <div className={`mt-2 text-lg font-bold ${s.title}`}>{insight.value}</div>
          )}
          {insight.action && (
            <div className={`mt-2 text-xs font-medium ${s.badge.includes('red') ? 'text-red-600' : 'text-blue-600'} flex items-center gap-1`}>
              <Zap size={11} />
              {insight.action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductInsightRow({ product, records, rank }: {
  product: Product;
  records: SalesRecord[];
  rank: number;
}) {
  const agg = sumRecords(records);
  const profit = records.reduce((s, r) => s + calcProfit(r), 0);
  const margin = agg.revenue > 0 ? (profit / agg.revenue) * 100 : 0;

  const statusColor = margin < 0 ? 'bg-red-100 text-red-600' : margin < 10 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rank <= 3 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{product.name}</div>
        <div className="text-xs text-slate-400">{product.sku} · {product.brand}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold text-slate-700">{formatCurrency(agg.revenue, true)}</div>
        <div className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-block ${statusColor}`}>
          {margin.toFixed(1)}% маржа
        </div>
      </div>
    </div>
  );
}

export function AIInsightsPage() {
  const { filters } = useFilters();
  const { records, products, loading } = useSalesData(filters);

  const insights = useMemo((): Insight[] => {
    if (records.length === 0) return [];
    const result: Insight[] = [];

    const agg = sumRecords(records);
    const totalProfit = records.reduce((s, r) => s + calcProfit(r), 0);
    const margin = agg.revenue > 0 ? (totalProfit / agg.revenue) * 100 : 0;

    if (totalProfit < 0) {
      result.push({
        type: 'critical',
        title: 'Убыточный период',
        description: `За выбранный период зафиксирован суммарный убыток. Общая выручка ${formatCurrency(agg.revenue, true)}, но расходы превышают её.`,
        value: formatCurrency(totalProfit, true),
        action: 'Срочно пересмотрите стратегию ценообразования и рекламных расходов',
        icon: AlertTriangle,
      });
    } else if (margin < 10) {
      result.push({
        type: 'warning',
        title: 'Низкая маржинальность',
        description: `Маржа ${margin.toFixed(1)}% ниже рекомендуемого порога 10–15%. Рассмотрите оптимизацию расходов.`,
        value: `Маржа: ${margin.toFixed(1)}%`,
        action: 'Проанализируйте структуру затрат и оптимизируйте логистику',
        icon: TrendingDown,
      });
    } else if (margin > 25) {
      result.push({
        type: 'success',
        title: 'Отличная маржинальность',
        description: `Маржа ${margin.toFixed(1)}% превышает средний показатель по рынку. Хороший результат!`,
        value: `Маржа: ${margin.toFixed(1)}%`,
        icon: TrendingUp,
      });
    }

    const drrPct = agg.revenue > 0 ? (agg.ads_spend / agg.revenue) * 100 : 0;
    if (drrPct > 20) {
      result.push({
        type: 'critical',
        title: 'Высокие рекламные расходы (ДРР)',
        description: `ДРР составляет ${drrPct.toFixed(1)}%, что значительно выше нормы (5–15%). Реклама поглощает большую часть выручки.`,
        value: `ДРР: ${drrPct.toFixed(1)}%`,
        action: 'Оптимизируйте рекламные кампании — отключите неэффективные объявления',
        icon: AlertTriangle,
      });
    } else if (drrPct < 3 && agg.revenue > 0) {
      result.push({
        type: 'info',
        title: 'Низкий рекламный бюджет',
        description: `ДРР всего ${drrPct.toFixed(1)}%. Возможно, вы недоинвестируете в рекламу и теряете долю рынка.`,
        action: 'Рассмотрите увеличение рекламного бюджета для роста продаж',
        icon: Target,
      });
    }

    const buyoutRate = agg.buyoutRate;
    if (buyoutRate < 40) {
      result.push({
        type: 'critical',
        title: 'Критично низкий % выкупа',
        description: `Только ${buyoutRate.toFixed(1)}% заказов завершаются выкупом. Это указывает на проблемы с качеством товара или описанием.`,
        value: `Выкуп: ${buyoutRate.toFixed(1)}%`,
        action: 'Улучшите описания, фото и размерную сетку. Проверьте отзывы покупателей',
        icon: AlertTriangle,
      });
    } else if (buyoutRate < 60) {
      result.push({
        type: 'warning',
        title: 'Низкий % выкупа',
        description: `Выкуп ${buyoutRate.toFixed(1)}% ниже нормы (70–85%). Высокий процент отмен увеличивает логистические расходы.`,
        action: 'Улучшите карточки товаров и добавьте размерную таблицу',
        icon: TrendingDown,
      });
    } else if (buyoutRate > 80) {
      result.push({
        type: 'success',
        title: 'Высокий % выкупа',
        description: `Отличный показатель выкупа ${buyoutRate.toFixed(1)}%. Покупатели довольны товаром и описанием.`,
        icon: TrendingUp,
      });
    }

    const logPct = agg.revenue > 0 ? (agg.logistics_cost / agg.revenue) * 100 : 0;
    if (logPct > 30) {
      result.push({
        type: 'warning',
        title: 'Высокая доля логистики',
        description: `Логистика составляет ${logPct.toFixed(1)}% от выручки. Рассмотрите оптимизацию упаковки или переход на другой склад.`,
        action: 'Пересмотрите упаковку товара для снижения габаритной стоимости',
        icon: Lightbulb,
      });
    }

    return result;
  }, [records]);

  const topProducts = useMemo(() => {
    const byProduct = new Map<string, SalesRecord[]>();
    for (const r of records) {
      if (!byProduct.has(r.product_id)) byProduct.set(r.product_id, []);
      byProduct.get(r.product_id)!.push(r);
    }
    return [...byProduct.entries()]
      .map(([pid, recs]) => ({ product: products.get(pid), records: recs }))
      .filter(({ product }) => product !== undefined)
      .sort((a, b) => {
        const ra = sumRecords(a.records).revenue;
        const rb = sumRecords(b.records).revenue;
        return rb - ra;
      })
      .slice(0, 10) as { product: Product; records: SalesRecord[] }[];
  }, [records, products]);

  const worstProducts = useMemo(() => {
    const byProduct = new Map<string, SalesRecord[]>();
    for (const r of records) {
      if (!byProduct.has(r.product_id)) byProduct.set(r.product_id, []);
      byProduct.get(r.product_id)!.push(r);
    }
    return [...byProduct.entries()]
      .map(([pid, recs]) => ({
        product: products.get(pid),
        records: recs,
        profit: recs.reduce((s, r) => s + calcProfit(r), 0),
      }))
      .filter(({ product, profit }) => product !== undefined && profit < 0)
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 5) as { product: Product; records: SalesRecord[]; profit: number }[];
  }, [records, products]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">AI Инсайты</h1>
          <p className="text-sm text-slate-500 mt-0.5">Автоматический анализ аномалий и рекомендации</p>
        </div>
        <div className="ml-auto bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-700">
          {insights.length} инсайтов найдено
        </div>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Sparkles size={40} className="mb-3 opacity-30" />
          <div className="text-lg font-medium">Нет данных для анализа</div>
          <div className="text-sm mt-1">Измените фильтры или диапазон дат</div>
        </div>
      ) : (
        <>
          {insights.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-slate-700 mb-3">Обнаруженные проблемы и возможности</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}
              </div>
            </div>
          )}

          {insights.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <TrendingUp size={32} className="mx-auto text-emerald-500 mb-2" />
              <div className="text-lg font-semibold text-emerald-800">Всё отлично!</div>
              <div className="text-sm text-emerald-600 mt-1">AI-анализ не выявил критических проблем за выбранный период</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {topProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <div className="text-sm font-semibold text-slate-700">Топ-10 по выручке</div>
                </div>
                {topProducts.map((item, i) => (
                  <ProductInsightRow key={item.product.id} product={item.product} records={item.records} rank={i + 1} />
                ))}
              </div>
            )}

            {worstProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-red-500" />
                  <div className="text-sm font-semibold text-slate-700">Убыточные товары</div>
                </div>
                {worstProducts.map((item, i) => (
                  <div key={item.product.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{item.product.name}</div>
                      <div className="text-xs text-slate-400">{item.product.sku}</div>
                    </div>
                    <div className="text-sm font-bold text-red-500">{formatCurrency(item.profit, true)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} className="text-yellow-400" />
              <div className="text-sm font-semibold">Рекомендации для роста</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: 'Масштабируйте лидеров',
                  desc: 'Увеличьте бюджеты на рекламу топ-10 товаров по ROI',
                  icon: TrendingUp,
                },
                {
                  title: 'Оптимизируйте убыточных',
                  desc: 'Пересмотрите цену или себестоимость убыточных SKU',
                  icon: Target,
                },
                {
                  title: 'Пополните склад',
                  desc: 'Следите за оборачиваемостью, не допускайте out-of-stock',
                  icon: Zap,
                },
              ].map((rec, i) => {
                const Icon = rec.icon;
                return (
                  <div key={i} className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} className="text-blue-300" />
                      <div className="text-sm font-medium">{rec.title}</div>
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed">{rec.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
