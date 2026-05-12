import { useMemo } from 'react';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { useProductReportingData } from '../hooks/useProductReportingData';
import { formatCurrency } from '../lib/calculations';
import { AlertTriangle, Lightbulb, Sparkles, Target, TrendingDown, TrendingUp, Zap } from 'lucide-react';

interface Insight {
  type: 'warning' | 'success' | 'info' | 'critical';
  title: string;
  description: string;
  value?: string;
  action?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface ProductInsightItem {
  id: string;
  name: string;
  article: string;
  brand: string;
  revenue: number;
  profit: number;
  margin: number;
  drr: number;
  buyoutRate: number;
  logisticsPercent: number;
  returns: number;
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

function ProductInsightRow({ product, rank }: { product: ProductInsightItem; rank: number }) {
  const statusColor = product.margin < 0 ? 'bg-red-100 text-red-600' : product.margin < 10 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rank <= 3 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{product.name}</div>
        <div className="text-xs text-slate-400">{product.article} · {product.brand || 'Без бренда'}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold text-slate-700">{formatCurrency(product.revenue, true)}</div>
        <div className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-block ${statusColor}`}>
          {product.margin.toFixed(1)}% маржа
        </div>
      </div>
    </div>
  );
}

export function AIInsightsPage() {
  const analytics = useAnalyticsWorkspaceData({
    includeTrends: false,
    includeBreakdown: false,
  });
  const productReporting = useProductReportingData({
    accountIds: analytics.accountIds,
    limit: 50,
  });

  const products = useMemo<ProductInsightItem[]>(() => {
    return (productReporting.rows ?? []).map((row, index) => {
      const metrics = row.metrics ?? {};
      const revenue = Number(metrics.sales ?? 0);
      const profit = Number(metrics.profit ?? 0);
      const advertisingExpense = Number(metrics.advertisingExpense ?? metrics.advertisingExpenseSum ?? 0);
      const logistics = Number(metrics.logistics ?? 0);
      const returns = Number(metrics.returns ?? 0);

      return {
        id: row.dimension?.vendorCode ?? row.dimension?.marketplaceArticle ?? row.dimension?.productName ?? `product-${index + 1}`,
        name: row.dimension?.productName ?? row.dimension?.vendorCode ?? `Товар ${index + 1}`,
        article: row.dimension?.vendorCode ?? row.dimension?.marketplaceArticle ?? '\u2014',
        brand: row.dimension?.brand ?? '',
        revenue,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        drr: revenue > 0 ? (advertisingExpense / revenue) * 100 : 0,
        buyoutRate: Number(metrics.averageRedemption ?? 0),
        logisticsPercent: revenue > 0 ? (logistics / revenue) * 100 : 0,
        returns,
      };
    });
  }, [productReporting.rows]);

  const insights = useMemo((): Insight[] => {
    if (products.length === 0) return [];

    const totalRevenue = products.reduce((sum, item) => sum + item.revenue, 0);
    const totalProfit = products.reduce((sum, item) => sum + item.profit, 0);
    const totalReturns = products.reduce((sum, item) => sum + item.returns, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgDrr = totalRevenue > 0 ? products.reduce((sum, item) => sum + (item.drr * item.revenue), 0) / totalRevenue : 0;
    const avgBuyoutRate = products.length > 0 ? products.reduce((sum, item) => sum + item.buyoutRate, 0) / products.length : 0;
    const avgLogisticsShare = totalRevenue > 0 ? products.reduce((sum, item) => sum + (item.logisticsPercent * item.revenue), 0) / totalRevenue : 0;

    const result: Insight[] = [];

    if (totalProfit < 0) {
      result.push({
        type: 'critical',
        title: 'Убыточный период',
        description: `За выбранный период зафиксирован суммарный убыток. Общая выручка ${formatCurrency(totalRevenue, true)}, но расходы превышают её.`,
        value: formatCurrency(totalProfit, true),
        action: 'Срочно пересмотрите стратегию ценообразования и рекламных расходов',
        icon: AlertTriangle,
      });
    } else if (avgMargin < 10) {
      result.push({
        type: 'warning',
        title: 'Низкая маржинальность',
        description: `Маржа ${avgMargin.toFixed(1)}% ниже рекомендуемого порога 10–15%. Рассмотрите оптимизацию расходов.`,
        value: `Маржа: ${avgMargin.toFixed(1)}%`,
        action: 'Проанализируйте структуру затрат и оптимизируйте логистику',
        icon: TrendingDown,
      });
    } else if (avgMargin > 25) {
      result.push({
        type: 'success',
        title: 'Отличная маржинальность',
        description: `Маржа ${avgMargin.toFixed(1)}% превышает средний показатель по рынку. Хороший результат!`,
        value: `Маржа: ${avgMargin.toFixed(1)}%`,
        icon: TrendingUp,
      });
    }

    if (avgDrr > 20) {
      result.push({
        type: 'critical',
        title: 'Высокие рекламные расходы (ДРР)',
        description: `ДРР составляет ${avgDrr.toFixed(1)}%, что значительно выше нормы (5–15%). Реклама поглощает большую часть выручки.`,
        value: `ДРР: ${avgDrr.toFixed(1)}%`,
        action: 'Оптимизируйте рекламные кампании — отключите неэффективные объявления',
        icon: AlertTriangle,
      });
    } else if (avgDrr > 0 && avgDrr < 3) {
      result.push({
        type: 'info',
        title: 'Низкий рекламный бюджет',
        description: `ДРР всего ${avgDrr.toFixed(1)}%. Возможно, вы недоинвестируете в рекламу и теряете долю рынка.`,
        action: 'Рассмотрите увеличение рекламного бюджета для роста продаж',
        icon: Target,
      });
    }

    if (avgBuyoutRate > 0 && avgBuyoutRate < 40) {
      result.push({
        type: 'critical',
        title: 'Критично низкий % выкупа',
        description: `Только ${avgBuyoutRate.toFixed(1)}% заказов завершаются выкупом. Это указывает на проблемы с качеством товара или описанием.`,
        value: `Выкуп: ${avgBuyoutRate.toFixed(1)}%`,
        action: 'Улучшите описания, фото и размерную сетку. Проверьте отзывы покупателей',
        icon: AlertTriangle,
      });
    } else if (avgBuyoutRate > 0 && avgBuyoutRate < 60) {
      result.push({
        type: 'warning',
        title: 'Низкий % выкупа',
        description: `Выкуп ${avgBuyoutRate.toFixed(1)}% ниже нормы (70–85%). Высокий процент отмен увеличивает логистические расходы.`,
        action: 'Улучшите карточки товаров и добавьте размерную таблицу',
        icon: TrendingDown,
      });
    } else if (avgBuyoutRate > 80) {
      result.push({
        type: 'success',
        title: 'Высокий % выкупа',
        description: `Отличный показатель выкупа ${avgBuyoutRate.toFixed(1)}%. Покупатели довольны товаром и описанием.`,
        icon: TrendingUp,
      });
    }

    if (avgLogisticsShare > 30) {
      result.push({
        type: 'warning',
        title: 'Высокая доля логистики',
        description: `Логистика составляет ${avgLogisticsShare.toFixed(1)}% от выручки. Рассмотрите оптимизацию упаковки или переход на другой склад.`,
        action: 'Пересмотрите упаковку товара для снижения габаритной стоимости',
        icon: Lightbulb,
      });
    }

    if (totalReturns > 0 && totalRevenue > 0 && (totalReturns / totalRevenue) * 100 > 10) {
      result.push({
        type: 'warning',
        title: 'Высокая доля возвратов',
        description: 'Возвраты занимают заметную долю в структуре продаж. Проверьте качество товара, упаковку и описание карточек.',
        value: formatCurrency(totalReturns, true),
        action: 'Найдите SKU с максимальными возвратами и проверьте отзывы по ним',
        icon: AlertTriangle,
      });
    }

    return result;
  }, [products]);

  const topProducts = useMemo(() => [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 10), [products]);
  const worstProducts = useMemo(() => [...products].filter(item => item.profit < 0).sort((a, b) => a.profit - b.profit).slice(0, 5), [products]);

  if (analytics.loading || productReporting.loading) {
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
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI Инсайты</h1>
            <p className="mt-0.5 text-sm text-slate-500">Автоматический анализ продаж и факторов изменений</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            {analytics.accountIds.length > 0 ? `${analytics.accountIds.length} кабинетов` : 'Кабинеты не найдены'}
          </div>
        </div>

        {analytics.error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {analytics.error}
          </div>
        )}

        {productReporting.error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {productReporting.error}
          </div>
        )}

        {analytics.explanation && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Объяснение продаж</div>
              <div className="mt-3 space-y-2">
                {(analytics.explanation.breakdown ?? []).slice(0, 5).map((item, index) => (
                  <div key={`${item.label ?? 'item'}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm">
                    <div className="font-medium text-slate-900">{item.label ?? `Item ${index + 1}`}</div>
                    <div className="text-slate-700">{Number.isFinite(item.amount ?? NaN) ? Number(item.amount).toLocaleString('ru-RU') : '0'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Состояние данных</div>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                  <dt className="text-slate-500">Products loaded</dt>
                  <dd className="font-medium text-slate-900">{productReporting.rows.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                  <dt className="text-slate-500">Explanation items</dt>
                  <dd className="font-medium text-slate-900">{analytics.explanation.breakdown?.length ?? 0}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                  <dt className="text-slate-500">Updated</dt>
                  <dd className="font-medium text-slate-900">{productReporting.overview?.meta?.updatedAt ? new Date(productReporting.overview.meta.updatedAt).toLocaleString('ru-RU') : analytics.summary?.meta?.updatedAt ? new Date(analytics.summary.meta.updatedAt).toLocaleString('ru-RU') : '\u2014'}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

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

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Sparkles size={40} className="mb-3 opacity-30" />
          <div className="text-lg font-medium">Нет данных для анализа</div>
          <div className="text-sm mt-1">Измените фильтры или дождитесь загрузки данных</div>
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
                  <ProductInsightRow key={item.id} product={item} rank={i + 1} />
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
                  <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.article}</div>
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
                  desc: 'Увеличьте бюджеты на рекламу товаров с лучшей выручкой и положительной маржей',
                  icon: TrendingUp,
                },
                {
                  title: 'Оптимизируйте убыточных',
                  desc: 'Пересмотрите цену, логистику и карточки товаров с отрицательной прибылью',
                  icon: Target,
                },
                {
                  title: 'Снижайте возвраты',
                  desc: 'Проверьте SKU с высокими возвратами и доработайте описание и упаковку',
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
