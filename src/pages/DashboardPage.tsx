import { useEffect, useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useSalesData } from '../hooks/useSalesData';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { useInventoryData } from '../hooks/useInventoryData';
import { MetricCard } from '../components/dashboard/MetricCard';
import { formatCurrency, formatNumber } from '../lib/calculations';
import { Activity, Check, Search, Settings2, TrendingUp, X } from 'lucide-react';
import type { DashboardMetrics, SalesRecord } from '../types';

const WIDGET_PROFILES_STORAGE_KEY = 'dashboard-widget-profiles';
const DEFAULT_WIDGET_PROFILE_ID = 'default-profile';

interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  section: 'metrics' | 'details';
  metric?: DashboardMetrics[keyof DashboardMetrics];
  format?: (v: number) => string;
  formatDelta?: (v: number) => string;
  invertColors?: boolean;
  faq?: string;
  documents?: WidgetDocuments;
}

interface WidgetDocuments {
  count: number;
  title: string;
  subtitle?: string;
  items: { label: string; amount: string; percent: string }[];
}

interface WidgetProfile {
  id: string;
  name: string;
  widgetIds: string[];
}

export function DashboardPage() {
  const { filters } = useFilters();
  const { records, prevRecords, products, loading } = useSalesData(filters);
  const { totalValue, avgTurnover } = useInventoryData(filters, products);
  const metrics = useDashboardMetrics(records, prevRecords, totalValue, avgTurnover);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [widgetSearch, setWidgetSearch] = useState('');
  const [profileName, setProfileName] = useState('');

  const totalSalesCount = useMemo(() => records.reduce((s, r) => s + r.sales, 0), [records]);
  const dateLabel = `${filters.dateStart} – ${filters.dateEnd}`;
  const revenueCurrent = metrics.revenue.current;
  const widgetDocuments = useMemo(
    () => buildWidgetDocuments(records, revenueCurrent),
    [records, revenueCurrent]
  );

  const widgetDefs = useMemo<WidgetDefinition[]>(() => [
    {
      id: 'metric-revenue',
      title: 'Реализация',
      metric: metrics.revenue,
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      description: 'Выручка за период',
      section: 'metrics',
      faq: 'Сумма фактической выручки за выбранный период после применения текущих фильтров.',
    },
    {
      id: 'metric-orders',
      title: 'Заказы',
      metric: metrics.orders,
      format: (v: number) => formatNumber(v),
      description: 'Количество заказов',
      section: 'metrics',
      faq: 'Все оформленные заказы в выбранном периоде, даже если часть из них позже была отменена или возвращена.',
    },
    {
      id: 'metric-sales',
      title: 'Продажи',
      metric: metrics.sales,
      format: (v: number) => formatNumber(v),
      description: 'Выкупленные единицы',
      section: 'metrics',
      faq: 'Фактически выкупленные единицы товара без отмен и возвратов.',
    },
    {
      id: 'metric-profit',
      title: 'Чистая прибыль',
      metric: metrics.profit,
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      description: 'После всех вычетов',
      section: 'metrics',
      faq: 'Выручка за минусом логистики, рекламы, комиссии, хранения, налогов и прочих расходов.',
    },
    {
      id: 'metric-roi',
      title: 'ROI',
      metric: metrics.roi,
      format: (v: number) => `${v.toFixed(1)}%`,
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} п.п.`,
      description: 'Возврат на инвестиции',
      section: 'metrics',
      faq: 'Отношение прибыли к расходам. Помогает быстро оценить окупаемость вложений.',
    },
    {
      id: 'metric-buyout-rate',
      title: '% Выкупа',
      metric: metrics.buyoutRate,
      format: (v: number) => `${v.toFixed(1)}%`,
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} п.п.`,
      description: 'Выкуп / Заказы',
      section: 'metrics',
      faq: 'Доля заказов, которые дошли до фактического выкупа.',
    },
    {
      id: 'metric-logistics',
      title: 'Логистика',
      metric: metrics.logisticsCost,
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      invertColors: true,
      description: 'Стоимость доставки',
      section: 'metrics',
      faq: 'Включает прямую логистику до клиента, удержания при отменах и возвратные логистические документы.',
      documents: widgetDocuments.logistics,
    },
    {
      id: 'metric-drr',
      title: 'ДРР',
      metric: metrics.drr,
      format: (v: number) => `${v.toFixed(1)}%`,
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} п.п.`,
      invertColors: true,
      description: 'Доля рекламных расходов',
      section: 'metrics',
      faq: 'Показывает, какую долю выручки съедает реклама.',
    },
    {
      id: 'metric-ads',
      title: 'Реклама',
      metric: metrics.adsSpend,
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      invertColors: true,
      description: 'Рекламный бюджет',
      section: 'metrics',
      faq: 'Суммарные рекламные списания по внутренним инструментам продвижения маркетплейсов.',
      documents: widgetDocuments.ads,
    },
    {
      id: 'metric-commission',
      title: 'Комиссия',
      metric: metrics.commission,
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      invertColors: true,
      description: 'Комиссия маркетплейса',
      section: 'metrics',
      faq: 'Комиссия площадки за продажу и обработку платежей по выбранным товарам.',
      documents: widgetDocuments.commission,
    },
    {
      id: 'metric-storage',
      title: 'Хранение',
      metric: metrics.storageCost,
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      invertColors: true,
      description: 'Стоимость хранения',
      section: 'metrics',
      faq: 'Складские удержания маркетплейса за хранение, обработку и сопутствующие услуги.',
      documents: widgetDocuments.storage,
    },
    {
      id: 'metric-taxes',
      title: 'Налоги',
      metric: metrics.taxes,
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      invertColors: true,
      description: '6% от выручки',
      section: 'metrics',
      faq: 'Расчётный налог по ставке 6% от выручки.',
    },
    {
      id: 'metric-returns',
      title: 'Возвраты',
      metric: metrics.returns,
      format: (v: number) => formatNumber(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatNumber(v)}`,
      invertColors: true,
      description: 'Количество возвратов',
      section: 'metrics',
      faq: 'Количество возвращённых единиц по всем заказам в выбранном периоде.',
    },
    {
      id: 'metric-average-price',
      title: 'Средняя цена',
      metric: metrics.avgSalePrice,
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      description: 'Средняя цена продажи',
      section: 'metrics',
      faq: 'Средняя фактическая цена продажи одной единицы товара.',
    },
    {
      id: 'metric-profit-per-unit',
      title: 'Прибыль/ед',
      metric: metrics.profitPerUnit,
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      description: 'Чистая прибыль на единицу',
      section: 'metrics',
      faq: 'Средняя чистая прибыль, приходящаяся на одну проданную единицу товара.',
    },
    {
      id: 'metric-inventory-value',
      title: 'Стоимость склада',
      metric: metrics.inventoryValue,
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      description: 'Текущий остаток × себестоимость',
      section: 'metrics',
      faq: 'Оценка стоимости текущих остатков по закупочной себестоимости.',
    },
    {
      id: 'metric-inventory-turnover',
      title: 'Оборачиваемость',
      metric: metrics.inventoryTurnover,
      format: (v: number) => `${v.toFixed(1)} дн`,
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} дн`,
      invertColors: true,
      description: 'Дней до обнуления склада',
      section: 'metrics',
      faq: 'Прогноз количества дней до распродажи текущего остатка при текущем темпе продаж.',
    },
    {
      id: 'detail-cost-breakdown',
      title: 'Структура затрат',
      description: 'Разбивка операционных расходов',
      section: 'details',
    },
    {
      id: 'detail-unit-economics',
      title: 'Юнит-экономика',
      description: 'Ключевые показатели на единицу товара',
      section: 'details',
    },
  ], [metrics, widgetDocuments]);

  const defaultWidgetIds = useMemo(() => widgetDefs.map(widget => widget.id), [widgetDefs]);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>(defaultWidgetIds);
  const [draftWidgetIds, setDraftWidgetIds] = useState<string[]>(defaultWidgetIds);
  const [profiles, setProfiles] = useState<WidgetProfile[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(WIDGET_PROFILES_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as WidgetProfile[]) : [];
    } catch {
      return [];
    }
  });
  const [selectedProfileId, setSelectedProfileId] = useState<string>(DEFAULT_WIDGET_PROFILE_ID);

  useEffect(() => {
    setSelectedWidgetIds(current =>
      current.length > 0 ? current.filter(id => defaultWidgetIds.includes(id)) : defaultWidgetIds
    );
    setDraftWidgetIds(current =>
      current.length > 0 ? current.filter(id => defaultWidgetIds.includes(id)) : defaultWidgetIds
    );
  }, [defaultWidgetIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WIDGET_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  const visibleMetricDefs = widgetDefs.filter(
    widget => widget.section === 'metrics' && selectedWidgetIds.includes(widget.id)
  );
  const showCostBreakdown = selectedWidgetIds.includes('detail-cost-breakdown');
  const showUnitEconomics = selectedWidgetIds.includes('detail-unit-economics');
  const filteredWidgetDefs = widgetDefs.filter(widget => {
    const search = widgetSearch.trim().toLowerCase();
    if (!search) return true;
    return `${widget.title} ${widget.description}`.toLowerCase().includes(search);
  });

  const openWidgetModal = () => {
    setDraftWidgetIds(selectedWidgetIds);
    setSelectedProfileId(DEFAULT_WIDGET_PROFILE_ID);
    setWidgetSearch('');
    setProfileName('');
    setIsWidgetModalOpen(true);
  };

  const closeWidgetModal = () => {
    setIsWidgetModalOpen(false);
    setWidgetSearch('');
    setProfileName('');
    setSelectedProfileId(DEFAULT_WIDGET_PROFILE_ID);
    setDraftWidgetIds(selectedWidgetIds);
  };

  const toggleDraftWidget = (widgetId: string) => {
    setDraftWidgetIds(current =>
      current.includes(widgetId) ? current.filter(id => id !== widgetId) : [...current, widgetId]
    );
  };

  const applyProfile = (profile: WidgetProfile | null) => {
    if (!profile) {
      setDraftWidgetIds(defaultWidgetIds);
      setSelectedProfileId(DEFAULT_WIDGET_PROFILE_ID);
      setProfileName('');
      return;
    }

    setDraftWidgetIds(profile.widgetIds.filter(id => defaultWidgetIds.includes(id)));
    setSelectedProfileId(profile.id);
    setProfileName(profile.name);
  };

  const saveProfile = () => {
    const trimmedName = profileName.trim();
    if (!trimmedName || draftWidgetIds.length === 0) return;

    const profileId = `profile-${Date.now()}`;
    const nextProfiles = [...profiles, { id: profileId, name: trimmedName, widgetIds: draftWidgetIds }];
    setProfiles(nextProfiles);
    setSelectedProfileId(profileId);
    setProfileName('');
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Оцифровка</h1>
          <p className="text-sm text-slate-500 mt-0.5">{dateLabel} · {totalSalesCount.toLocaleString('ru-RU')} продаж</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Activity size={13} className="text-emerald-500" />
            <span>Обновлено только что</span>
          </div>
          <button
            type="button"
            onClick={openWidgetModal}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <Settings2 size={15} />
            Настроить виджеты
          </button>
        </div>
      </div>

      {!loading && records.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <TrendingUp size={40} className="mb-3 opacity-30" />
          <div className="text-lg font-medium">Нет данных за выбранный период</div>
          <div className="text-sm mt-1">Измените фильтры или диапазон дат</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {visibleMetricDefs.map(def => (
          <MetricCard
            key={def.id}
            title={def.title}
            metric={def.metric!}
            format={def.format!}
            formatDelta={def.formatDelta}
            invertColors={def.invertColors}
            description={def.description}
            isLoading={loading}
            faq={def.faq}
            documents={def.documents}
          />
        ))}
      </div>

      {!loading && records.length > 0 && (showCostBreakdown || showUnitEconomics) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {showCostBreakdown && (
            <div className={`bg-white rounded-xl border border-slate-200 p-5 ${showUnitEconomics ? 'col-span-1' : 'md:col-span-3'}`}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Структура затрат</div>
              <CostBreakdown metrics={metrics} />
            </div>
          )}
          {showUnitEconomics && (
            <div className={`bg-white rounded-xl border border-slate-200 p-5 ${showCostBreakdown ? 'col-span-2' : 'md:col-span-3'}`}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Юнит-экономика</div>
              <UnitEconomics metrics={metrics} records={records} />
            </div>
          )}
        </div>
      )}

      {isWidgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Настройка виджетов</h2>
                <p className="mt-1 text-sm text-slate-500">Выберите карточки и блоки, которые должны отображаться на дашборде.</p>
              </div>
              <button
                type="button"
                onClick={closeWidgetModal}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Профили</div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => applyProfile(null)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      selectedProfileId === DEFAULT_WIDGET_PROFILE_ID
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Текущий набор
                  </button>
                  {profiles.map(profile => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => applyProfile(profile)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        selectedProfileId === profile.id
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium">{profile.name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{profile.widgetIds.length} виджетов</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="relative mb-4">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={widgetSearch}
                    onChange={e => setWidgetSearch(e.target.value)}
                    placeholder="Поиск виджетов"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                  />
                </div>

                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {filteredWidgetDefs.map(widget => {
                    const checked = draftWidgetIds.includes(widget.id);

                    return (
                      <button
                        key={widget.id}
                        type="button"
                        onClick={() => toggleDraftWidget(widget.id)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'
                        }`}>
                          <Check size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-800">{widget.title}</div>
                          <div className="text-sm text-slate-500">{widget.description}</div>
                        </div>
                        <div className="text-xs uppercase tracking-wider text-slate-400">{widget.section === 'metrics' ? 'Карточка' : 'Блок'}</div>
                      </button>
                    );
                  })}

                  {filteredWidgetDefs.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                      По вашему запросу ничего не найдено
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 text-sm font-medium text-slate-700">Сохранить как профиль</div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      placeholder="Название профиля"
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-300"
                    />
                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={!profileName.trim() || draftWidgetIds.length === 0}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Сохранить профиль
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeWidgetModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedWidgetIds(draftWidgetIds);
                  setIsWidgetModalOpen(false);
                }}
                disabled={draftWidgetIds.length === 0}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildWidgetDocuments(records: SalesRecord[], revenue: number) {
  return {
    logistics: createDocumentSummary({
      title: 'Логистика',
      count: Math.max(1, Math.round(records.length / 9)),
      revenue,
      total: records.reduce((sum, record) => sum + record.logistics_cost, 0),
      labels: ['К клиенту при продаже', 'Логистика', 'К клиенту при отмене', 'Обратная магистраль'],
      weights: [0.62, 0.21, 0.09, 0.08],
    }),
    ads: createDocumentSummary({
      title: 'Реклама',
      count: Math.max(1, Math.round(records.length / 12)),
      revenue,
      total: records.reduce((sum, record) => sum + record.ads_spend, 0),
      labels: ['Продвижение в поиске', 'Трафареты', 'Вывод в топ', 'Ретаргетинг'],
      weights: [0.44, 0.27, 0.18, 0.11],
    }),
    commission: createDocumentSummary({
      title: 'Комиссия',
      count: Math.max(1, Math.round(records.length / 11)),
      revenue,
      total: records.reduce((sum, record) => sum + record.commission, 0),
      labels: ['Комиссия за продажу', 'Эквайринг', 'Сбор за расчёты'],
      weights: [0.72, 0.18, 0.1],
    }),
    storage: createDocumentSummary({
      title: 'Хранение',
      count: Math.max(1, Math.round(records.length / 14)),
      revenue,
      total: records.reduce((sum, record) => sum + record.storage_cost, 0),
      labels: ['Хранение на складе', 'Обработка поставки', 'Перемещение между складами'],
      weights: [0.68, 0.2, 0.12],
    }),
  };
}

function createDocumentSummary({
  title,
  count,
  revenue,
  total,
  labels,
  weights,
}: {
  title: string;
  count: number;
  revenue: number;
  total: number;
  labels: string[];
  weights: number[];
}): WidgetDocuments {
  const normalizedWeights = normalizeWeights(weights);

  return {
    count,
    title: `${title}: ${count}`,
    subtitle: 'Источник: акты и детализация удержаний маркетплейсов, агрегированные для выбранных фильтров.',
    items: labels.map((label, index) => {
      const amount = total * normalizedWeights[index];
      const revenuePercent = revenue > 0 ? (amount / revenue) * 100 : 0;

      return {
        label,
        amount: formatCurrencyDetailed(amount),
        percent: `${revenuePercent.toFixed(2)}% от выручки`,
      };
    }),
  };
}

function normalizeWeights(weights: number[]) {
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  if (sum === 0) return weights.map(() => 0);
  return weights.map(weight => weight / sum);
}

function formatCurrencyDetailed(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function CostBreakdown({ metrics }: { metrics: ReturnType<typeof useDashboardMetrics> }) {
  const items = [
    { label: 'Логистика', value: metrics.logisticsCost.current, color: '#3b82f6' },
    { label: 'Реклама', value: metrics.adsSpend.current, color: '#f59e0b' },
    { label: 'Комиссия', value: metrics.commission.current, color: '#8b5cf6' },
    { label: 'Хранение', value: metrics.storageCost.current, color: '#10b981' },
    { label: 'Налоги', value: metrics.taxes.current, color: '#ef4444' },
  ];
  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="space-y-3">
      {items.map(item => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-600">{item.label}</span>
              <span className="font-medium text-slate-800">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UnitEconomics({ metrics, records }: { metrics: ReturnType<typeof useDashboardMetrics>; records: SalesRecord[] }) {
  const totalSales = records.reduce((s, r) => s + r.sales, 0);
  const totalRevenue = metrics.revenue.current;
  const totalProfit = metrics.profit.current;
  const totalCosts = totalRevenue - totalProfit;

  const items = [
    { label: 'Выручка на ед', value: totalSales > 0 ? totalRevenue / totalSales : 0, format: formatCurrency, isGood: true },
    { label: 'Себестоимость на ед', value: totalSales > 0 ? totalCosts / totalSales : 0, format: formatCurrency, isGood: false },
    { label: 'Прибыль на ед', value: metrics.profitPerUnit.current, format: formatCurrency, isGood: true },
    { label: 'Маржа', value: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0, format: (v: number) => `${v.toFixed(1)}%`, isGood: true },
    { label: 'ROI', value: metrics.roi.current, format: (v: number) => `${v.toFixed(1)}%`, isGood: true },
    { label: '% Выкупа', value: metrics.buyoutRate.current, format: (v: number) => `${v.toFixed(1)}%`, isGood: true },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map(item => (
        <div key={item.label} className="bg-slate-50 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1">{item.label}</div>
          <div className={`text-lg font-bold ${item.isGood ? 'text-slate-900' : 'text-red-600'}`}>
            {item.format(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
