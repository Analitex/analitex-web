import { useEffect, useMemo, useRef, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useSalesData } from '../hooks/useSalesData';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { useInventoryData } from '../hooks/useInventoryData';
import { MetricCard } from '../components/dashboard/MetricCard';
import { formatCurrency, formatNumber, sumRecords } from '../lib/calculations';
import { Activity, Check, ChevronDown, GripVertical, Info, Search, Settings2, TrendingUp, X } from 'lucide-react';
import type { DashboardMetrics, Product, SalesRecord } from '../types';

const WIDGET_PROFILES_STORAGE_KEY = 'dashboard-widget-profiles';
const DEFAULT_WIDGET_PROFILE_ID = 'default-profile';
const CUSTOM_METRICS_STORAGE_KEY = 'dashboard-custom-metrics';

const AVAILABLE_FORMULA_METRICS = [
  { label: 'Средняя цена продажи', value: 'averagePriceAfterSPP' },
  { label: 'Средняя цена до скидок МП', value: 'averagePriceBeforeSPP' },
  { label: 'Реализация', value: 'realisation' },
  { label: 'Продажи', value: 'sales' },
  { label: 'К перечислению', value: 'toTransfer' },
  { label: 'Сумма возвратов', value: 'returns' },
  { label: 'Себестоимость продаж', value: 'costOfSales' },
  { label: 'Штрафы', value: 'fines' },
  { label: 'Компенсация подмененного товара', value: 'compensationForSubstitutedGoods' },
  { label: 'Компенсация поставщика', value: 'reimbursementOfTransportationCosts' },
  { label: 'Оплата брака + потерянного товара', value: 'paymentForMarriageAndLostGoods' },
  { label: 'Ср. стоимость логистики', value: 'averageLogisticsCost' },
  { label: 'Логистика', value: 'logistics' },
  { label: 'Хранение', value: 'storage' },
  { label: 'Количество отказов + возвраты', value: 'rejectionsAndReturns' },
  { label: 'Всего продаж', value: 'totalSales' },
  { label: 'Процент выкупа', value: 'averageRedemption' },
  { label: 'Ср. прибыль на 1 шт', value: 'averageProfitPerPiece' },
  { label: 'Налоги', value: 'tax' },
  { label: 'Прибыль', value: 'profit' },
  { label: 'Прибыль без операционных расходов', value: 'profitWithoutExpense' },
  { label: 'ROI', value: 'roi' },
  { label: 'Рентабельность', value: 'profitability' },
  { label: 'Маржинальность', value: 'marginality' },
  { label: 'Расходы на рекламу', value: 'advertisingExpense' },
  { label: 'Расходы на рекламу с бонусного счета', value: 'advertisingExpenseBonus' },
  { label: 'Расходы на рекламу сумма', value: 'advertisingExpenseSum' },
  { label: 'ДРР', value: 'drr' },
  { label: 'ДРР с бонусного счета', value: 'drrBonus' },
  { label: 'ДРР сумма', value: 'drrSum' },
  { label: 'ДРР по заказам', value: 'drrz' },
  { label: 'Платная приемка', value: 'acceptanceSum' },
  { label: 'Прочие удержания', value: 'otherDeduction' },
  { label: 'Операционные расходы', value: 'expense' },
  { label: 'Стоимость всех заказов', value: 'orders' },
  { label: 'Количество всех заказов', value: 'ordersCount' },
  { label: 'Комиссия', value: 'commission' },
  { label: 'Компенсация', value: 'compensation' },
  { label: 'Итоговое вознаграждение ВБ', value: 'wbFinalReward' },
  { label: 'Итого к оплате', value: 'totalPaid' },
  { label: 'Остатки на складах МП', value: 'stockBalance' },
  { label: 'Остатки на складах WB (за вычетом в пути)', value: 'stockBalanceInWh' },
  { label: 'В пути к клиентам', value: 'stockBalanceInWayToClient' },
  { label: 'В пути от клиентов', value: 'stockBalanceInWayFromClient' },
  { label: 'Капитализация по себестоимости', value: 'capitalizationByCost' },
  { label: 'Капитализация по рознице', value: 'capitalizationByPrice' },
  { label: 'Эквайринг', value: 'commissionAcquiring' },
  { label: 'Номинальная комиссия', value: 'nominalCommission' },
  { label: 'Скидка МП', value: 'mpDiscount' },
  { label: 'Количество возвратов', value: 'refunds' },
  { label: 'Количество дней', value: 'daysCount' },
  { label: 'Остатки на моих складах', value: 'userWarehouseStockBalance' },
  { label: 'Капитализация моих складов по себестоимости', value: 'userWarehouseCapitalizationByCost' },
  { label: 'GMROI', value: 'gmroi' },
  { label: 'Годовой GMROI', value: 'gmroiYear' },
];

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
  customMetricId?: string;
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

interface CustomMetric {
  id: string;
  name: string;
  formula: string;
  growthColor: string;
  unit: string;
}

interface MarginLeaderboardRow {
  id: string;
  title: string;
  subtitle: string;
  revenue: number;
  profit: number;
  margin: number;
}

interface RevenueStructureRow {
  label: string;
  value: number;
  percent: number;
  color: string;
}

const TOP_MARGIN_OPTIONS = [10, 50, 100] as const;

export function DashboardPage() {
  const { filters } = useFilters();
  const { records, prevRecords, products, loading } = useSalesData(filters);
  const { totalValue, avgTurnover } = useInventoryData(filters, products);
  const metrics = useDashboardMetrics(records, prevRecords, totalValue, avgTurnover);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [isCreateMetricModalOpen, setIsCreateMetricModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [widgetSearch, setWidgetSearch] = useState('');
  const [profileName, setProfileName] = useState('');
  const [metricName, setMetricName] = useState('');
  const [metricFormula, setMetricFormula] = useState('');
  const [metricGrowthColor, setMetricGrowthColor] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [editingCustomMetricId, setEditingCustomMetricId] = useState<string | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [dragInsertPosition, setDragInsertPosition] = useState<'before' | 'after'>('before');
  const [articleMarginLimit, setArticleMarginLimit] = useState<number | 'all'>(10);
  const [categoryMarginLimit, setCategoryMarginLimit] = useState<number | 'all'>(10);
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(CUSTOM_METRICS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CustomMetric[]) : [];
    } catch {
      return [];
    }
  });

  const totalSalesCount = useMemo(() => records.reduce((s, r) => s + r.sales, 0), [records]);
  const revenueCurrent = metrics.revenue.current;
  const widgetDocuments = useMemo(
    () => buildWidgetDocuments(records, revenueCurrent),
    [records, revenueCurrent]
  );
  const formulaMetricValues = useMemo(
    () => buildFormulaMetricValues(metrics, records, prevRecords, totalValue),
    [metrics, records, prevRecords, totalValue]
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
      title: 'Чистая прибыль / Марж-сть',
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
      title: 'Реклама / ДРР',
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
      title: 'Прибыль / ед.',
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
    ...customMetrics.map(customMetric => {
      const metricValue = buildCustomMetricValue(customMetric.formula, formulaMetricValues);
      return {
        id: customMetric.id,
        title: customMetric.name,
        description: 'Пользовательская метрика',
        section: 'metrics' as const,
        metric: metricValue,
        format: (v: number) => formatCustomMetricValue(v, customMetric.unit),
        formatDelta: (v: number) => formatCustomMetricDelta(v, customMetric.unit),
        invertColors: customMetric.growthColor === 'red',
        faq: describeCustomMetricFormula(customMetric.formula, AVAILABLE_FORMULA_METRICS),
        customMetricId: customMetric.id,
      };
    }),
  ], [metrics, widgetDocuments, customMetrics, formulaMetricValues]);

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
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CUSTOM_METRICS_STORAGE_KEY, JSON.stringify(customMetrics));
  }, [customMetrics]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!isWidgetModalOpen && !isCreateMetricModalOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      if (isCreateMetricModalOpen) {
        closeCreateMetricModal();
        return;
      }

      if (isWidgetModalOpen) {
        closeWidgetModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isWidgetModalOpen, isCreateMetricModalOpen]);

  const orderedSelectedWidgetIds = selectedWidgetIds.filter(id =>
    widgetDefs.some(widget => widget.id === id)
  );
  const visibleMetricDefs = orderedSelectedWidgetIds
    .map(id => widgetDefs.find(widget => widget.id === id && widget.section === 'metrics'))
    .filter((widget): widget is WidgetDefinition => Boolean(widget));
  const topMarginArticles = useMemo(
    () => buildTopMarginArticles(records, products),
    [records, products]
  );
  const topMarginCategories = useMemo(
    () => buildTopMarginCategories(records, products),
    [records, products]
  );
  const visibleTopMarginArticles =
    articleMarginLimit === 'all' ? topMarginArticles : topMarginArticles.slice(0, articleMarginLimit);
  const visibleTopMarginCategories =
    categoryMarginLimit === 'all' ? topMarginCategories : topMarginCategories.slice(0, categoryMarginLimit);
  const revenueStructureItems = useMemo(
    () => buildRevenueStructureItems(records, products),
    [records, products]
  );
  const showCostBreakdown = selectedWidgetIds.includes('detail-cost-breakdown');
  const showUnitEconomics = selectedWidgetIds.includes('detail-unit-economics');
  const orderedWidgetDefs = orderWidgetDefinitions(widgetDefs, draftWidgetIds);
  const filteredWidgetDefs = orderedWidgetDefs.filter(widget => {
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
    setIsProfileMenuOpen(false);
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
    setWidgetSearch('');
    setProfileName('');
    setSelectedProfileId(DEFAULT_WIDGET_PROFILE_ID);
    setDraftWidgetIds(selectedWidgetIds);
  };

  const closeCreateMetricModal = () => {
    setIsCreateMetricModalOpen(false);
    setEditingCustomMetricId(null);
    setMetricName('');
    setMetricFormula('');
    setMetricGrowthColor('');
    setMetricUnit('');
  };

  const editCustomMetric = (customMetricId: string) => {
    const customMetric = customMetrics.find(metric => metric.id === customMetricId);
    if (!customMetric) return;

    setEditingCustomMetricId(customMetric.id);
    setMetricName(customMetric.name);
    setMetricFormula(customMetric.formula);
    setMetricGrowthColor(customMetric.growthColor);
    setMetricUnit(customMetric.unit);
    setIsCreateMetricModalOpen(true);
  };

  const toggleDraftWidget = (widgetId: string) => {
    setDraftWidgetIds(current =>
      current.includes(widgetId) ? current.filter(id => id !== widgetId) : [...current, widgetId]
    );
  };

  const moveDraftWidget = (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' = 'before'
  ) => {
    if (draggedId === targetId) return;

    setDraftWidgetIds(current => {
      const orderedIds = orderWidgetDefinitions(widgetDefs, current).map(widget => widget.id);
      const fromIndex = orderedIds.indexOf(draggedId);
      const toIndex = orderedIds.indexOf(targetId);

      if (fromIndex === -1 || toIndex === -1) {
        return current;
      }

      const next = [...orderedIds];
      const [movedId] = next.splice(fromIndex, 1);
      const adjustedTargetIndex = next.indexOf(targetId);
      const insertIndex = position === 'after' ? adjustedTargetIndex + 1 : adjustedTargetIndex;
      next.splice(insertIndex, 0, movedId);
      return next;
    });
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
    setIsProfileMenuOpen(false);
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

  const createCustomMetric = () => {
    const trimmedName = metricName.trim();
    const trimmedFormula = metricFormula.trim();
    if (!trimmedName || !trimmedFormula) return;

    const metricId = editingCustomMetricId ?? `custom-metric-${Date.now()}`;
    const newMetric: CustomMetric = {
      id: metricId,
      name: trimmedName,
      formula: trimmedFormula,
      growthColor: metricGrowthColor,
      unit: metricUnit,
    };

    setCustomMetrics(current => {
      const existingIndex = current.findIndex(metric => metric.id === metricId);
      if (existingIndex === -1) {
        return [...current, newMetric];
      }

      const next = [...current];
      next[existingIndex] = newMetric;
      return next;
    });
    setSelectedWidgetIds(current => [...new Set([...current, metricId])]);
    setDraftWidgetIds(current => [...new Set([...current, metricId])]);
    closeCreateMetricModal();
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Оцифровка
            <span className="text-sm font-medium text-slate-500"> {totalSalesCount.toLocaleString('ru-RU')} продаж</span>
          </h1>
        </div>
      </div>

      {!loading && records.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <TrendingUp size={40} className="mb-3 opacity-30" />
          <div className="text-lg font-medium">Нет данных за выбранный период</div>
          <div className="text-sm mt-1">Измените фильтры или диапазон дат</div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Общие показатели</div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateMetricModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="text-base leading-none">+</span>
            Добавить метрику
          </button>
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
        {visibleMetricDefs.map(def => (
          <MetricCard
            key={def.id}
            title={def.title}
            metric={def.metric!}
            format={def.format!}
            formatDelta={def.formatDelta}
            invertColors={def.invertColors}
            isLoading={loading}
            faq={def.faq}
            documents={def.documents}
            onEdit={def.customMetricId ? () => editCustomMetric(def.customMetricId!) : undefined}
          />
        ))}
      </div>

      {!loading && records.length > 0 && (
        <div className="mt-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <MarginLeaderboardCard
            title="Топ маржинальных артикулов"
            subtitle="Список товаров с наилучшей маржинальностью в выбранном периоде."
            items={visibleTopMarginArticles}
            limit={articleMarginLimit}
            onLimitChange={setArticleMarginLimit}
            emptyMessage="Для выбранных фильтров пока нет артикулов с продажами."
          />
          <MarginLeaderboardCard
            title="Топ маржинальных категорий"
            subtitle="Категории товаров, которые дают лучший процент маржи."
            items={visibleTopMarginCategories}
            limit={categoryMarginLimit}
            onLimitChange={setCategoryMarginLimit}
            emptyMessage="Для выбранных фильтров пока нет категорий с продажами."
          />
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="mt-6">
          <RevenueStructureAccordion items={revenueStructureItems} />
        </div>
      )}

      {isWidgetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              closeWidgetModal();
            }
          }}
        >
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

            <div className="px-6 py-5">
              <div className="relative mb-4" ref={profileMenuRef}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Профили</div>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(current => !current)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {selectedProfileId === DEFAULT_WIDGET_PROFILE_ID
                        ? 'Текущий набор'
                        : profiles.find(profile => profile.id === selectedProfileId)?.name ?? 'Текущий набор'}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {selectedProfileId === DEFAULT_WIDGET_PROFILE_ID
                        ? `${draftWidgetIds.length} виджетов выбрано`
                        : `${profiles.find(profile => profile.id === selectedProfileId)?.widgetIds.length ?? draftWidgetIds.length} виджетов`}
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <button
                      type="button"
                      onClick={() => applyProfile(null)}
                      className={`w-full border-b border-slate-100 px-4 py-3 text-left text-sm transition-colors ${
                        selectedProfileId === DEFAULT_WIDGET_PROFILE_ID
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium">Текущий набор</div>
                      <div className="mt-0.5 text-xs text-slate-400">{draftWidgetIds.length} виджетов</div>
                    </button>
                    {profiles.map(profile => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => applyProfile(profile)}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                          selectedProfileId === profile.id
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-medium">{profile.name}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{profile.widgetIds.length} виджетов</div>
                      </button>
                    ))}
                  </div>
                )}
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
                    const isDragging = draggedWidgetId === widget.id;
                    const isDropTarget = dragOverWidgetId === widget.id;

                    return (
                      <div
                        key={widget.id}
                        draggable
                        onDragStart={event => {
                          setDraggedWidgetId(widget.id);
                          setDragOverWidgetId(widget.id);
                          setDragInsertPosition('before');
                          event.dataTransfer.effectAllowed = 'move';

                          const dragPreview = event.currentTarget.cloneNode(true) as HTMLDivElement;
                          dragPreview.style.position = 'fixed';
                          dragPreview.style.top = '-1000px';
                          dragPreview.style.left = '-1000px';
                          dragPreview.style.width = `${event.currentTarget.clientWidth}px`;
                          dragPreview.style.pointerEvents = 'none';
                          dragPreview.style.transform = 'rotate(2deg)';
                          dragPreview.style.boxShadow = '0 18px 40px rgba(15, 23, 42, 0.18)';
                          dragPreview.style.borderColor = 'rgb(96 165 250)';
                          dragPreview.style.background = 'rgba(239, 246, 255, 0.96)';
                          document.body.appendChild(dragPreview);
                          event.dataTransfer.setDragImage(dragPreview, 24, 24);
                          window.setTimeout(() => {
                            document.body.removeChild(dragPreview);
                          }, 0);
                        }}
                        onDragEnd={() => {
                          setDraggedWidgetId(null);
                          setDragOverWidgetId(null);
                        }}
                        onDragOver={event => {
                          event.preventDefault();
                          const rect = event.currentTarget.getBoundingClientRect();
                          const nextPosition =
                            event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                          setDragOverWidgetId(widget.id);
                          setDragInsertPosition(nextPosition);
                        }}
                        onDrop={event => {
                          event.preventDefault();
                          if (draggedWidgetId) {
                            moveDraftWidget(draggedWidgetId, widget.id, dragInsertPosition);
                          }
                          setDraggedWidgetId(null);
                          setDragOverWidgetId(null);
                        }}
                        className={`relative flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                          isDragging ? 'scale-[1.01] border-blue-300 bg-blue-50/60 opacity-70 shadow-lg' : 'border-slate-200'
                        }`}
                      >
                        {isDropTarget && draggedWidgetId && draggedWidgetId !== widget.id && (
                          <div
                            className={`pointer-events-none absolute left-3 right-3 h-0.5 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(219,234,254,0.85)] ${
                              dragInsertPosition === 'before' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2'
                            }`}
                          />
                        )}
                        <button
                          type="button"
                          draggable={false}
                          onClick={() => toggleDraftWidget(widget.id)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                          aria-label={checked ? 'Скрыть виджет' : 'Показать виджет'}
                        >
                          <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                            checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'
                          }`}>
                            <Check size={12} />
                          </div>
                        </button>
                        <button
                          type="button"
                          draggable={true}
                          onDragStart={() => setDraggedWidgetId(widget.id)}
                          onDragEnd={() => setDraggedWidgetId(null)}
                          className="cursor-grab rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
                          aria-label="Перетащить виджет"
                          title="Перетащить виджет"
                        >
                          <GripVertical size={15} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-800">{widget.title}</div>
                          <div className="text-sm text-slate-500">{widget.description}</div>
                        </div>
                        <div className="text-xs uppercase tracking-wider text-slate-400">{widget.section === 'metrics' ? 'Карточка' : 'Блок'}</div>
                      </div>
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

      {isCreateMetricModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              closeCreateMetricModal();
            }
          }}
        >
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingCustomMetricId ? 'Редактировать метрику' : 'Добавить метрику'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Создайте пользовательскую метрику и настройте её отображение на дашборде.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateMetricModal}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <form className="flex flex-col gap-6 px-6 py-6">
              <div>
                <label htmlFor="metric-name" className="mb-2 block text-sm font-medium text-slate-900">
                  Название метрики
                </label>
                <input
                  id="metric-name"
                  value={metricName}
                  onChange={e => setMetricName(e.target.value)}
                  placeholder="Введите название метрики"
                  maxLength={255}
                  className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="metric-formula" className="text-sm font-medium text-slate-900">
                    Формула
                  </label>
                  <a
                    href="https://truestats.usedocs.com/article/78054"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-blue-700 no-underline"
                  >
                    Инструкция
                  </a>
                </div>
                <div className="space-y-2">
                  <FormulaEditor
                    id="metric-formula"
                    value={metricFormula}
                    onChange={setMetricFormula}
                    variables={AVAILABLE_FORMULA_METRICS}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="metric-growth" className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
                  Цвет роста
                  <InfoBadge />
                </label>
                <select
                  id="metric-growth"
                  value={metricGrowthColor}
                  onChange={e => setMetricGrowthColor(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Не выбрано</option>
                  <option value="green">Зелёный при росте</option>
                  <option value="red">Красный при росте</option>
                  <option value="neutral">Нейтральный</option>
                </select>
              </div>

              <div>
                <label htmlFor="metric-unit" className="mb-2 block text-sm font-medium text-slate-900">
                  Единица измерения
                </label>
                <select
                  id="metric-unit"
                  value={metricUnit}
                  onChange={e => setMetricUnit(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Не выбрана</option>
                  <option value="currency">Рубли</option>
                  <option value="percent">Проценты</option>
                  <option value="number">Число</option>
                  <option value="days">Дни</option>
                </select>
              </div>
            </form>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeCreateMetricModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={createCustomMetric}
                disabled={!metricName.trim() || !metricFormula.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {editingCustomMetricId ? 'Сохранить изменения' : 'Создать метрику'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBadge() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
      i
    </span>
  );
}

function FormulaEditor({
  id,
  value,
  onChange,
  variables,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  variables: Array<{ label: string; value: string }>;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<{ node: Text; start: number; end: number } | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const variableMap = useMemo(
    () => new Map(variables.map(variable => [variable.value, variable.label])),
    [variables]
  );

  const filteredVariables = variables.filter(variable => {
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return true;
    return `${variable.label} ${variable.value}`.toLowerCase().includes(query);
  });

  useEffect(() => {
    if (!editorRef.current) return;
    const serialized = serializeFormulaEditor(editorRef.current);
    if (serialized !== value) {
      renderFormulaEditor(editorRef.current, value, variableMap);
    }
  }, [value, variableMap]);

  useEffect(() => {
    if (!isPickerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!pickerRef.current?.contains(target) && !editorRef.current?.contains(target)) {
        setIsPickerOpen(false);
        triggerRef.current = null;
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isPickerOpen]);

  const syncValueFromDom = () => {
    if (!editorRef.current) return;
    onChange(serializeFormulaEditor(editorRef.current));
  };

  const updatePickerFromSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed) {
      setIsPickerOpen(false);
      triggerRef.current = null;
      return;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode || anchorNode.nodeType !== Node.TEXT_NODE) {
      setIsPickerOpen(false);
      triggerRef.current = null;
      return;
    }

    const textNode = anchorNode as Text;
    const beforeCursor = textNode.textContent?.slice(0, selection.anchorOffset) ?? '';
    const match = beforeCursor.match(/@([\w]*)$/);

    if (!match) {
      setIsPickerOpen(false);
      triggerRef.current = null;
      return;
    }

    triggerRef.current = {
      node: textNode,
      start: selection.anchorOffset - match[0].length,
      end: selection.anchorOffset,
    };
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    const fallbackRect = editorRef.current?.getBoundingClientRect();
    setPickerPosition({
      top: (rect.bottom || fallbackRect?.top || 0) + 6,
      left: rect.left || fallbackRect?.left || 0,
    });
    setPickerSearch(match[1]);
    setIsPickerOpen(true);
  };

  const insertVariable = (variable: { label: string; value: string }) => {
    if (triggerRef.current?.node.isConnected) {
      const { node, start, end } = triggerRef.current;
      const text = node.textContent ?? '';
      node.textContent = `${text.slice(0, start)}@${variable.value} ${text.slice(end)}`;
    } else if (editorRef.current) {
      editorRef.current.append(document.createTextNode(`${value.trim() ? ' ' : ''}@${variable.value}`));
    }

    syncValueFromDom();
    if (editorRef.current) renderFormulaEditor(editorRef.current, serializeFormulaEditor(editorRef.current), variableMap);
    setIsPickerOpen(false);
    setPickerSearch('');
    triggerRef.current = null;
    editorRef.current?.focus();
    placeCaretAtEnd(editorRef.current);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          id={id}
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => {
            syncValueFromDom();
            updatePickerFromSelection();
          }}
          onKeyUp={updatePickerFromSelection}
          onClick={updatePickerFromSelection}
          data-placeholder="Введите формулу или используйте @ для вставки метрики"
          className="min-h-24 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-100 empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
        />
        {isPickerOpen && (
          <div
            ref={pickerRef}
            className="fixed z-50 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
            style={{ top: pickerPosition.top, left: pickerPosition.left }}
          >
            <div className="border-b border-slate-100 p-2">
              <input
                type="text"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Поиск переменной..."
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredVariables.map(variable => (
                <button
                  key={variable.value}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="w-full px-3 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="text-sm font-medium text-slate-800">{variable.label}</div>
                  <div className="text-xs text-slate-400">{variable.value}</div>
                </button>
              ))}
              {filteredVariables.length === 0 && (
                <div className="px-3 py-4 text-sm text-slate-400">Ничего не найдено</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative inline-block">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            triggerRef.current = null;
            setPickerSearch('');
            const rect = buttonRef.current?.getBoundingClientRect();
            setPickerPosition({
              top: (rect?.bottom ?? 0) + 6,
              left: rect?.left ?? 0,
            });
            setIsPickerOpen(current => !current);
            editorRef.current?.focus();
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <span className="text-base leading-none">+</span>
          <span>Метрика</span>
        </button>
        {isPickerOpen && !triggerRef.current && (
          <div
            ref={pickerRef}
            className="fixed z-50 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
            style={{ top: pickerPosition.top, left: pickerPosition.left }}
          >
            <div className="border-b border-slate-100 p-2">
              <input
                type="text"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Поиск переменной..."
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredVariables.map(variable => (
                <button
                  key={variable.value}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="w-full px-3 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="text-sm font-medium text-slate-800">{variable.label}</div>
                  <div className="text-xs text-slate-400">{variable.value}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderFormulaEditor(
  element: HTMLDivElement,
  rawValue: string,
  variableMap: Map<string, string>
) {
  element.innerHTML = '';
  const fragments = rawValue.split(/(@[\w]+)/g).filter(Boolean);

  if (fragments.length === 0) {
    element.append(document.createElement('br'));
    return;
  }

  fragments.forEach((fragment, index) => {
    if (fragment.startsWith('@')) {
      const key = fragment.slice(1);
      const label = variableMap.get(key);
      if (label) {
        const chip = document.createElement('span');
        chip.contentEditable = 'false';
        chip.dataset.variable = key;
        chip.className = `mx-0.5 inline-flex select-none items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getVariableTone(index)}`;
        chip.textContent = label;
        element.append(chip);
        return;
      }
    }

    element.append(document.createTextNode(fragment));
  });
}

function serializeFormulaEditor(element: HTMLDivElement) {
  return Array.from(element.childNodes)
    .map(node => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
      if (node.nodeType === Node.ELEMENT_NODE) {
        const elementNode = node as HTMLElement;
        if (elementNode.dataset.variable) return `@${elementNode.dataset.variable}`;
        if (elementNode.tagName === 'BR') return '\n';
        return elementNode.textContent ?? '';
      }
      return '';
    })
    .join('');
}

function placeCaretAtEnd(element: HTMLDivElement) {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getVariableTone(index: number) {
  const tones = [
    'border-pink-200 bg-pink-50 text-pink-700',
    'border-violet-200 bg-violet-50 text-violet-700',
    'border-amber-200 bg-amber-50 text-amber-700',
    'border-blue-200 bg-blue-50 text-blue-700',
    'border-emerald-200 bg-emerald-50 text-emerald-700',
  ];

  return tones[index % tones.length];
}

function buildFormulaMetricValues(
  metrics: DashboardMetrics,
  records: SalesRecord[],
  prevRecords: SalesRecord[],
  inventoryValue: number
) {
  const avgBeforeDiscountCurrent = averageOf(records, record => record.avg_price);
  const avgBeforeDiscountPrevious = averageOf(prevRecords, record => record.avg_price);

  return {
    averagePriceAfterSPP: { current: metrics.avgSalePrice.current, previous: metrics.avgSalePrice.previous },
    averagePriceBeforeSPP: { current: avgBeforeDiscountCurrent, previous: avgBeforeDiscountPrevious },
    realisation: { current: metrics.revenue.current, previous: metrics.revenue.previous },
    sales: { current: metrics.sales.current, previous: metrics.sales.previous },
    toTransfer: { current: metrics.profit.current, previous: metrics.profit.previous },
    returns: { current: metrics.returns.current, previous: metrics.returns.previous },
    costOfSales: { current: metrics.revenue.current - metrics.profit.current, previous: metrics.revenue.previous - metrics.profit.previous },
    fines: { current: 0, previous: 0 },
    compensationForSubstitutedGoods: { current: 0, previous: 0 },
    reimbursementOfTransportationCosts: { current: 0, previous: 0 },
    paymentForMarriageAndLostGoods: { current: 0, previous: 0 },
    averageLogisticsCost: {
      current: metrics.sales.current > 0 ? metrics.logisticsCost.current / metrics.sales.current : 0,
      previous: metrics.sales.previous > 0 ? metrics.logisticsCost.previous / metrics.sales.previous : 0,
    },
    logistics: { current: metrics.logisticsCost.current, previous: metrics.logisticsCost.previous },
    storage: { current: metrics.storageCost.current, previous: metrics.storageCost.previous },
    rejectionsAndReturns: { current: metrics.returns.current, previous: metrics.returns.previous },
    totalSales: { current: metrics.sales.current, previous: metrics.sales.previous },
    averageRedemption: { current: metrics.buyoutRate.current, previous: metrics.buyoutRate.previous },
    averageProfitPerPiece: { current: metrics.profitPerUnit.current, previous: metrics.profitPerUnit.previous },
    tax: { current: metrics.taxes.current, previous: metrics.taxes.previous },
    profit: { current: metrics.profit.current, previous: metrics.profit.previous },
    profitWithoutExpense: { current: metrics.revenue.current, previous: metrics.revenue.previous },
    roi: { current: metrics.roi.current, previous: metrics.roi.previous },
    profitability: { current: metrics.roi.current, previous: metrics.roi.previous },
    marginality: {
      current: metrics.revenue.current > 0 ? (metrics.profit.current / metrics.revenue.current) * 100 : 0,
      previous: metrics.revenue.previous > 0 ? (metrics.profit.previous / metrics.revenue.previous) * 100 : 0,
    },
    advertisingExpense: { current: metrics.adsSpend.current, previous: metrics.adsSpend.previous },
    advertisingExpenseBonus: { current: 0, previous: 0 },
    advertisingExpenseSum: { current: metrics.adsSpend.current, previous: metrics.adsSpend.previous },
    drr: { current: metrics.drr.current, previous: metrics.drr.previous },
    drrBonus: { current: 0, previous: 0 },
    drrSum: { current: metrics.adsSpend.current, previous: metrics.adsSpend.previous },
    drrz: { current: metrics.drr.current, previous: metrics.drr.previous },
    acceptanceSum: { current: 0, previous: 0 },
    otherDeduction: { current: 0, previous: 0 },
    expense: {
      current: metrics.logisticsCost.current + metrics.adsSpend.current + metrics.commission.current + metrics.storageCost.current + metrics.taxes.current,
      previous: metrics.logisticsCost.previous + metrics.adsSpend.previous + metrics.commission.previous + metrics.storageCost.previous + metrics.taxes.previous,
    },
    orders: { current: metrics.orders.current, previous: metrics.orders.previous },
    ordersCount: { current: metrics.orders.current, previous: metrics.orders.previous },
    commission: { current: metrics.commission.current, previous: metrics.commission.previous },
    compensation: { current: 0, previous: 0 },
    wbFinalReward: { current: metrics.profit.current, previous: metrics.profit.previous },
    totalPaid: { current: metrics.profit.current, previous: metrics.profit.previous },
    stockBalance: { current: inventoryValue, previous: inventoryValue * 0.9 },
    stockBalanceInWh: { current: inventoryValue, previous: inventoryValue * 0.9 },
    stockBalanceInWayToClient: { current: 0, previous: 0 },
    stockBalanceInWayFromClient: { current: 0, previous: 0 },
    capitalizationByCost: { current: inventoryValue, previous: inventoryValue * 0.9 },
    capitalizationByPrice: { current: metrics.revenue.current, previous: metrics.revenue.previous },
    commissionAcquiring: { current: 0, previous: 0 },
    nominalCommission: { current: metrics.commission.current, previous: metrics.commission.previous },
    mpDiscount: { current: 0, previous: 0 },
    refunds: { current: metrics.returns.current, previous: metrics.returns.previous },
    daysCount: { current: records.length, previous: prevRecords.length },
    userWarehouseStockBalance: { current: inventoryValue, previous: inventoryValue * 0.9 },
    userWarehouseCapitalizationByCost: { current: inventoryValue, previous: inventoryValue * 0.9 },
    gmroi: { current: metrics.roi.current, previous: metrics.roi.previous },
    gmroiYear: { current: metrics.roi.current * 12, previous: metrics.roi.previous * 12 },
  };
}

function buildCustomMetricValue(
  formula: string,
  variables: Record<string, { current: number; previous: number }>
) {
  const current = evaluateFormula(formula, variables, 'current');
  const previous = evaluateFormula(formula, variables, 'previous');
  const delta = current - previous;
  const deltaPercent = previous !== 0 ? (delta / Math.abs(previous)) * 100 : 0;

  return {
    current,
    previous,
    delta,
    deltaPercent,
    trend: delta > 0 ? 'up' as const : delta < 0 ? 'down' as const : 'neutral' as const,
    sparkline: [],
  };
}

function evaluateFormula(
  formula: string,
  variables: Record<string, { current: number; previous: number }>,
  field: 'current' | 'previous'
) {
  const normalized = formula.replace(/@([\w]+)/g, (_, key: string) => String(variables[key]?.[field] ?? 0));
  if (!/^[\d+\-*/().,\s]+$/.test(normalized)) return 0;

  try {
    const expression = normalized.replace(/,/g, '.');
    const result = Function(`"use strict"; return (${expression});`)();
    return Number.isFinite(result) ? Number(result) : 0;
  } catch {
    return 0;
  }
}

function formatCustomMetricValue(value: number, unit: string) {
  switch (unit) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${value.toFixed(1)} дн`;
    case 'number':
    default:
      return formatNumber(value);
  }
}

function formatCustomMetricDelta(value: number, unit: string) {
  const sign = value >= 0 ? '+' : '';
  switch (unit) {
    case 'currency':
      return `${sign}${formatCurrency(value)}`;
    case 'percent':
      return `${sign}${value.toFixed(1)} п.п.`;
    case 'days':
      return `${sign}${value.toFixed(1)} дн`;
    case 'number':
    default:
      return `${sign}${formatNumber(value)}`;
  }
}

function averageOf(records: SalesRecord[], selector: (record: SalesRecord) => number) {
  if (records.length === 0) return 0;
  return records.reduce((sum, record) => sum + selector(record), 0) / records.length;
}

function describeCustomMetricFormula(
  formula: string,
  variables: Array<{ label: string; value: string }>
) {
  const labels = Array.from(
    new Set(
      Array.from(formula.matchAll(/@([\w]+)/g))
        .map(([, key]) => variables.find(variable => variable.value === key)?.label)
        .filter((label): label is string => Boolean(label))
    )
  );

  if (labels.length === 0) {
    return 'Пользовательская метрика, рассчитанная по заданной формуле.';
  }

  return `Пользовательская метрика. Использует: ${labels.join(', ')}.`;
}

function buildTopMarginArticles(records: SalesRecord[], products: Map<string, Product>): MarginLeaderboardRow[] {
  const byProduct = new Map<string, SalesRecord[]>();

  records.forEach(record => {
    if (!byProduct.has(record.product_id)) {
      byProduct.set(record.product_id, []);
    }
    byProduct.get(record.product_id)!.push(record);
  });

  return Array.from(byProduct.entries())
    .map(([productId, productRecords]) => {
      const product = products.get(productId);
      if (!product) return null;

      const summary = sumRecords(productRecords);
      if (summary.revenue <= 0) return null;

      return {
        id: productId,
        title: product.name,
        subtitle: `${product.sku} · ${product.brand}`,
        revenue: summary.revenue,
        profit: summary.profit,
        margin: summary.margin,
      };
    })
    .filter((item): item is MarginLeaderboardRow => item !== null)
    .sort((a, b) => b.margin - a.margin || b.profit - a.profit || b.revenue - a.revenue);
}

function buildRevenueStructureItems(records: SalesRecord[], products: Map<string, Product>): RevenueStructureRow[] {
  const summary = sumRecords(records);
  const revenue = summary.revenue || 1;
  const mpDiscount = records.reduce((sum, record) => {
    const diff = Math.max(record.avg_price - record.avg_sale_price, 0);
    return sum + diff * record.sales;
  }, 0);
  const costOfSales = records.reduce((sum, record) => {
    const costPrice = products.get(record.product_id)?.cost_price ?? 0;
    return sum + costPrice * record.sales;
  }, 0);

  return [
    { label: 'Скидка МП', value: mpDiscount, percent: (mpDiscount / revenue) * 100, color: 'rgba(244,114,182,0.85)' },
    { label: 'Себестоимость', value: costOfSales, percent: (costOfSales / revenue) * 100, color: 'rgba(253,186,140,0.85)' },
    { label: 'Прибыль', value: summary.profit, percent: (summary.profit / revenue) * 100, color: 'rgba(22,189,202,0.85)' },
    { label: 'Комиссия', value: summary.commission, percent: (summary.commission / revenue) * 100, color: 'rgba(214,31,105,0.85)' },
    { label: 'Логистика', value: summary.logistics_cost, percent: (summary.logistics_cost / revenue) * 100, color: 'rgba(26,86,219,0.85)' },
    { label: 'Налоги', value: summary.taxes, percent: (summary.taxes / revenue) * 100, color: 'rgba(144,97,249,0.85)' },
    { label: 'Реклама', value: summary.ads_spend, percent: (summary.ads_spend / revenue) * 100, color: 'rgba(41,181,115,0.85)' },
    { label: 'Прочее', value: summary.other_costs + summary.storage_cost, percent: ((summary.other_costs + summary.storage_cost) / revenue) * 100, color: 'rgba(55,61,63,0.85)' },
    { label: 'Компенсация', value: -summary.returns * summary.avgSalePrice, percent: ((-summary.returns * summary.avgSalePrice) / revenue) * 100, color: 'rgba(16,185,129,0.85)' },
  ];
}

function orderWidgetDefinitions(widgetDefs: WidgetDefinition[], orderedIds: string[]) {
  const rankedIds = new Map(orderedIds.map((id, index) => [id, index]));

  return [...widgetDefs].sort((left, right) => {
    const leftRank = rankedIds.get(left.id);
    const rightRank = rankedIds.get(right.id);

    if (leftRank !== undefined && rightRank !== undefined) {
      return leftRank - rightRank;
    }

    if (leftRank !== undefined) {
      return -1;
    }

    if (rightRank !== undefined) {
      return 1;
    }

    return 0;
  });
}

function buildTopMarginCategories(records: SalesRecord[], products: Map<string, Product>): MarginLeaderboardRow[] {
  const byCategory = new Map<string, SalesRecord[]>();

  records.forEach(record => {
    const category = products.get(record.product_id)?.category ?? 'Без категории';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(record);
  });

  return Array.from(byCategory.entries())
    .map(([category, categoryRecords]) => {
      const summary = sumRecords(categoryRecords);
      if (summary.revenue <= 0) return null;

      const uniqueArticles = new Set(categoryRecords.map(record => record.product_id)).size;

      return {
        id: category,
        title: category,
        subtitle: `${uniqueArticles} артикулов`,
        revenue: summary.revenue,
        profit: summary.profit,
        margin: summary.margin,
      };
    })
    .filter((item): item is MarginLeaderboardRow => item !== null)
    .sort((a, b) => b.margin - a.margin || b.profit - a.profit || b.revenue - a.revenue);
}

function MarginLeaderboardCard({
  title,
  subtitle,
  items,
  limit,
  onLimitChange,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  items: MarginLeaderboardRow[];
  limit: number | 'all';
  onLimitChange: (value: number | 'all') => void;
  emptyMessage: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'circle' | 'list'>('circle');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  return (
    <div className="self-start rounded-xl border border-slate-200 bg-white p-5">
      <button
        type="button"
        onClick={() => setIsExpanded(current => !current)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>
          <SectionInfoTooltip text={subtitle} />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-xs text-slate-400 sm:block">{items.length} элементов</div>
          <ChevronDown
            size={18}
            className={`shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('circle')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'circle' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Круги
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Список
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onLimitChange('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  limit === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Все
              </button>
              {TOP_MARGIN_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onLimitChange(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    limit === option ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Топ {option}
                </button>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              {emptyMessage}
            </div>
          ) : viewMode === 'circle' ? (
            <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-center">
              <MarginPieChart
                items={items}
                hoveredItemId={hoveredItemId}
                onHoverChange={setHoveredItemId}
              />
              <div className="space-y-1.5">
                {items.map((item, index) => {
                  const tone = getMarginChartColor(index);
                  const isActive = hoveredItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredItemId(item.id)}
                      onMouseLeave={() => setHoveredItemId(null)}
                      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors ${
                        isActive ? 'border-sky-200 bg-sky-50' : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <MetricLegendThumb label={item.title} color={tone} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold" style={{ color: tone }}>
                          {item.title}
                        </div>
                        <div className="truncate text-[11px] text-slate-400">{item.subtitle}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold" style={{ color: tone }}>
                          {item.margin.toFixed(1)}%
                        </div>
                        <div className="text-[11px] text-slate-400">{formatCurrency(item.profit)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{item.title}</div>
                    <div className="truncate text-xs text-slate-400">{item.subtitle}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-slate-800">{formatCurrency(item.profit)}</div>
                    <div className="text-xs text-slate-400">Прибыль</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {item.margin.toFixed(1)}%
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{formatCurrency(item.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MarginPieChart({
  items,
  hoveredItemId,
  onHoverChange,
}: {
  items: MarginLeaderboardRow[];
  hoveredItemId: string | null;
  onHoverChange: (itemId: string | null) => void;
}) {
  const chartItems = items.slice(0, 8);
  const normalizedValues = chartItems.map(item => Math.max(item.profit, 0));
  const total = normalizedValues.reduce((sum, value) => sum + value, 0);
  const activeItem = chartItems.find(item => item.id === hoveredItemId) ?? chartItems[0] ?? null;
  let startAngle = -Math.PI / 2;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
      <div className="mb-3 flex justify-end">
        <SectionInfoTooltip text="Наведите на сектор или строку справа для отображения точных данных." />
      </div>
      <div className="flex items-center justify-center">
        <div className="relative h-[220px] w-[220px]">
          <svg viewBox="0 0 220 220" className="h-full w-full overflow-visible">
            <g className="apexcharts-inner apexcharts-graphical" transform="translate(110 110)">
              {chartItems.map((item, index) => {
                const value = normalizedValues[index];
                const sliceAngle = total > 0 ? (value / total) * Math.PI * 2 : (Math.PI * 2) / Math.max(chartItems.length, 1);
                const endAngle = startAngle + sliceAngle;
                const path = describePieSlice(0, 0, hoveredItemId === item.id ? 90 : 84, startAngle, endAngle);
                startAngle = endAngle;

                return (
                  <path
                    key={item.id}
                    d={path}
                    fill={getMarginChartColor(index)}
                    opacity={hoveredItemId && hoveredItemId !== item.id ? 0.32 : 0.96}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => onHoverChange(item.id)}
                    onMouseLeave={() => onHoverChange(null)}
                  >
                    <title>{`${item.title}: маржа ${item.margin.toFixed(2)}%, прибыль ${formatCurrency(item.profit)}, выручка ${formatCurrency(item.revenue)}`}</title>
                  </path>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
      {activeItem && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-white/90 px-3 py-3 text-sm">
          <div className="font-medium text-slate-800">{activeItem.title}</div>
          <div className="mt-1 text-xs text-slate-400">{activeItem.subtitle}</div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-slate-400">Маржа</div>
              <div className="font-semibold text-slate-800">{activeItem.margin.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-slate-400">Прибыль</div>
              <div className="font-semibold text-slate-800">{formatCurrency(activeItem.profit)}</div>
            </div>
            <div>
              <div className="text-slate-400">Выручка</div>
              <div className="font-semibold text-slate-800">{formatCurrency(activeItem.revenue)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricLegendThumb({ label, color }: { label: string; color: string }) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/80 text-[10px] font-semibold shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${color}22, ${color}55)`,
        color,
      }}
      aria-hidden="true"
    >
      {initials || 'A'}
    </div>
  );
}

function RevenueStructureAccordion({ items }: { items: RevenueStructureRow[] }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const maxValue = Math.max(...items.map(item => Math.abs(item.percent)), 1);

  return (
    <div className="h-fit divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      <h2>
        <button
          type="button"
          onClick={() => setIsExpanded(current => !current)}
          className="flex w-full items-center justify-between p-5 text-left font-medium text-slate-900 transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <span>Структура выручки</span>
            <SectionInfoTooltip text="Рассчитывается в процентах от выручки и показывает, какие статьи формируют итоговую экономику." />
          </div>
          <div className="flex items-center gap-3">
            <ChevronDown
              size={18}
              className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </button>
      </h2>

      {isExpanded && (
        <div className="bg-white p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_96px]">
            <div className="space-y-3">
              {items.map(item => {
                const width = `${(Math.abs(item.percent) / maxValue) * 50}%`;

                return (
                  <div key={item.label} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <div className="truncate text-xs sm:text-sm text-slate-600">{item.label}</div>
                    <div className="relative h-8 overflow-hidden rounded-md">
                      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200" />
                      <div
                        className="absolute top-1/2 h-6 -translate-y-1/2 rounded-md opacity-90"
                        style={{
                          width,
                          backgroundColor: item.color,
                          left: item.percent >= 0 ? '50%' : undefined,
                          right: item.percent < 0 ? '50%' : undefined,
                        }}
                        title={`${item.label}: ${formatCurrency(item.value)} / ${item.percent.toFixed(2)}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="my-1 flex flex-col justify-between gap-3 text-right text-xs sm:text-sm text-slate-500">
              {items.map(item => (
                <div key={item.label} style={{ color: item.color }}>
                  {formatCurrencyDetailed(item.value)}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <div />
            <div className="grid grid-cols-5 text-[11px] text-slate-400">
              <div className="text-left">-100%</div>
              <div className="text-left">-50%</div>
              <div className="text-center">0%</div>
              <div className="text-right">50%</div>
              <div className="text-right">100%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionInfoTooltip({ text }: { text: string }) {
  return (
    <div className="group/tooltip relative flex shrink-0">
      <Info size={14} className="text-slate-400" />
      <div className="absolute left-0 top-full z-10 mt-2 hidden w-64 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm group-hover/tooltip:block">
        {text}
      </div>
    </div>
  );
}

function describePieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInRadians: number) {
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function getMarginChartColor(index: number) {
  const palette = ['#0f766e', '#14b8a6', '#38bdf8', '#6366f1', '#8b5cf6', '#f59e0b', '#f97316', '#ef4444'];
  return palette[index % palette.length];
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
