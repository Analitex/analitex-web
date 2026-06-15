import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReportMode } from '../context/ReportModeContext';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { useProductReportingData } from '../hooks/useProductReportingData';
import { MarketplaceIcon } from '../components/common/MarketplaceIcon';
import { MetricCard } from '../components/dashboard/MetricCard';
import { MarginLeaderboardCard, type MarginLeaderboardRow } from '../components/dashboard/MarginLeaderboardCard';
import { RevenueStructureAccordion, type RevenueStructureRow } from '../components/dashboard/RevenueStructureAccordion';
import { SectionAlias } from '../components/dashboard/DashboardSectionMeta';
import {
  AnalyticsTableRowView,
  ProductImageThumb,
  getAnalyticsColumnWidth,
  type AnalyticsColumnDefinition,
  type AnalyticsTableRow,
} from '../components/dashboard/AnalyticsTableRowView';
import { formatCurrency, formatNumber } from '../lib/calculations';
import {
  buildAnalyticsRowsFromApi,
  formatAnalyticsCell,
  getAnalyticsBarcode,
  getAnalyticsComparableValue,
  getAnalyticsExportValue,
} from '../lib/dashboardAnalytics';
import {
  buildCustomMetricValue,
  buildFormulaMetricValues,
  describeCustomMetricFormula,
  formatCustomMetricDelta,
  formatCustomMetricValue,
} from '../lib/dashboardMetrics';
import { Activity, ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronDown, ChevronLeft, ChevronRight, Columns3, Eye, EyeOff, GripVertical, LayoutGrid, Pin, Search, Settings2, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { MetricValue } from '../types';

const WIDGET_PROFILES_STORAGE_KEY = 'dashboard-widget-profiles';
const DEFAULT_WIDGET_PROFILE_ID = 'default-profile';
const CUSTOM_METRICS_STORAGE_KEY = 'dashboard-custom-metrics';
const METRIC_VIEW_MODE_STORAGE_KEY = 'dashboard-metric-view-mode';
const DEFAULT_PRODUCT_METRIC_WIDGET_ORDER = [
  'metric-total-paid',
  'metric-profit',
  'metric-profit-without-expense',
  'metric-sales',
  'metric-revenue',
  'metric-wb-final-reward',
  'metric-orders',
  'metric-buyout-rate',
  'metric-logistics',
  'metric-ads-drr',
  'metric-storage',
  'metric-acceptance',
  'metric-other-deduction',
  'metric-roi',
  'metric-cogs',
  'metric-operating-expense',
  'metric-taxes',
  'metric-tax-base',
  'metric-commission',
  'metric-average-price-before-spp',
  'metric-capitalization-cost',
  'metric-capitalization-price',
  'metric-stock-balance',
  'metric-user-warehouse-stock',
  'metric-user-warehouse-capitalization',
  'metric-gmroi',
  'metric-gmroi-year',
  'metric-fines',
  'metric-compensation',
  'metric-average-price',
  'metric-average-logistics-cost',
  'metric-profit-per-unit',
  'metric-ads-drr-orders',
  'metric-returns',
  'metric-sales-turnover',
  'metric-orders-turnover',
  'metric-sales-units',
] as const;

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
  { label: 'ДРР по заказам', value: 'drrByOrders' },
  { label: 'Платная приемка', value: 'acceptanceSum' },
  { label: 'Прочие удержания', value: 'otherDeduction' },
  { label: 'Операционные расходы', value: 'operatingExpenses' },
  { label: 'Стоимость всех заказов', value: 'orders' },
  { label: 'Количество всех заказов', value: 'ordersCount' },
  { label: 'Комиссия', value: 'commission' },
  { label: 'Компенсация', value: 'compensation' },
  { label: 'Итоговое вознаграждение МП', value: 'netMarketplaceReward' },
  { label: 'Итого к оплате', value: 'totalPaid' },
  { label: 'Остатки', value: 'stockBalanceOverall' },
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
  metric?: MetricValue;
  format?: (v: number) => string;
  formatPrevious?: (v: number) => string;
  formatDelta?: (v: number) => string;
  hideDeltaPercent?: boolean;
  invertColors?: boolean;
  tone?: MetricTone;
  faq?: string;
  documents?: WidgetDocuments;
  customMetricId?: string;
}

type MetricTone = 'positive' | 'negative' | 'neutral';

function getWidgetTone(def: Pick<WidgetDefinition, 'invertColors' | 'tone'>): MetricTone {
  return def.tone ?? (def.invertColors ? 'negative' : 'positive');
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


const ANALYTICS_TABLE_SETTINGS_KEY = 'dashboard-analytics-table-settings';
const FINANCIAL_TOTAL_PAID_WIDGET_ID = 'metric-total-paid';
const EMPTY_METRIC_VALUE: MetricValue = { current: 0, previous: 0, delta: 0, deltaPercent: 0, trend: 'neutral', sparkline: [] };
type MetricViewMode = 'cards' | 'columns';
type MetricColumnGroupId = 'finance' | 'expenses' | 'indicators';
type AnalyticsGroupBy = 'product';
type AnalyticsSortDirection = 'asc' | 'desc';

interface AnalyticsSortState {
  columnId: string | null;
  direction: AnalyticsSortDirection | null;
}

interface AnalyticsRangeFilterState {
  min: string;
  max: string;
}

interface FloatingMenuPosition {
  top: number;
  left: number;
}

const ANALYTICS_COLUMNS: AnalyticsColumnDefinition[] = [
  { id: 'photo', label: 'Фото', sticky: 'photo', render: row => <ProductImageThumb row={row} /> },
  {
    id: 'article',
    label: 'Артикул',
    sticky: 'article',
    render: row => (
      <div className="flex min-w-[170px] max-w-[210px] items-start gap-2 whitespace-normal break-words">
        <MarketplaceIcon marketplace={row.marketplace} className="mt-0.5 h-4 w-4 shrink-0" />
        <a href={`#${row.id}`} className="line-clamp-2 font-medium leading-4 text-slate-800 underline-offset-2 hover:text-blue-600 hover:underline">{row.productName}</a>
      </div>
    ),
    exportValue: row => row.productName,
  },
  { id: 'toTransfer', label: 'Итого к оплате', align: 'right', sticky: 'payment', unit: '₽' },
  { id: 'store', label: 'Магазин' },
  { id: 'brand', label: 'Бренд' },
  { id: 'category', label: 'Категория' },
  { id: 'group', label: 'Группа' },
  {
    id: 'marketplaceArticleId',
    label: 'Артикул маркетплейса',
    render: row => <a href={`#mp-${row.marketplaceArticleId}`} className="break-all leading-5 text-blue-600 hover:underline">{row.marketplaceArticleId}</a>,
    exportValue: row => row.marketplaceArticleId,
  },
  { id: 'avgCost', label: 'Средняя себестоимость', align: 'right', unit: '₽' },
  { id: 'operationalExpense', label: 'Операционные расходы', align: 'right', unit: '₽' },
  { id: 'otherDeduction', label: 'Прочие удержания', align: 'right', unit: '₽' },
  { id: 'avgPriceBeforeDiscount', label: 'Средн. цена до скидок МП', align: 'right', unit: '₽' },
  { id: 'avgSalePrice', label: 'Средн. цена продажи', align: 'right', unit: '₽' },
  { id: 'realisation', label: 'Реализация (сумма продаж до СПП)', align: 'right', unit: '₽' },
  { id: 'turnoverSales', label: 'Оборачиваемость по прод.', align: 'right', unit: 'дн.' },
  { id: 'turnoverOrders', label: 'Оборачиваемость по зак.', align: 'right', unit: 'дн.' },
  { id: 'sales', label: 'Продажи', align: 'right', unit: '₽' },
  { id: 'returns', label: 'Возвраты', align: 'right', unit: '₽' },
  { id: 'costOfSales', label: 'Себестоимость продаж', align: 'right', unit: '₽' },
  { id: 'fines', label: 'Штрафы', align: 'right', unit: '₽' },
  { id: 'ordersCount', label: 'Заказы', align: 'right', unit: 'шт.' },
  { id: 'ordersAmount', label: 'Заказы', align: 'right', unit: '₽' },
  { id: 'commission', label: 'Комиссия', align: 'right', unit: '₽' },
  { id: 'netMarketplaceReward', label: 'Итоговое вознаграждение МП', align: 'right', unit: '₽' },
  { id: 'compensation', label: 'Компенсация', align: 'right', unit: '₽' },
  { id: 'averageLogisticsCost', label: 'Ср. стоимость логистики', align: 'right', unit: '₽' },
  { id: 'capitalizationByCost', label: 'Капитализация по себеc.', align: 'right', unit: '₽' },
  { id: 'capitalizationByRetail', label: 'Капитализация по розн.', align: 'right', unit: '₽' },
  { id: 'capitalizationOwnWarehouse', label: 'Капитализ. на моих складах', align: 'right', unit: '₽' },
  { id: 'gmroi', label: 'GMROI', align: 'right', unit: '%' },
  { id: 'gmroiYear', label: 'Годовой GMROI', align: 'right', unit: '%' },
  { id: 'logisticsCost', label: 'Стоимость логистики', align: 'right', unit: '₽' },
  { id: 'storage', label: 'Хранение', align: 'right', unit: '₽' },
  { id: 'rejectionsAndReturns', label: 'Количество отказов + возвраты', align: 'right', unit: 'шт.' },
  { id: 'totalSales', label: 'Всего продаж', align: 'right', unit: 'шт.' },
  { id: 'buyoutRate', label: 'Процент выкупа', align: 'right', unit: '%' },
  { id: 'averageProfitPerPiece', label: 'Средняя прибыль на 1 шт', align: 'right', unit: '₽' },
  { id: 'tax', label: 'Налоги', align: 'right', unit: '₽' },
  { id: 'taxBase', label: 'Налоговая база', align: 'right', unit: '₽' },
  { id: 'profit', label: 'Прибыль', align: 'right', unit: '₽' },
  { id: 'profitWithoutExpense', label: 'Прибыль без опер. расх.', align: 'right', unit: '₽' },
  { id: 'roi', label: 'ROI', align: 'right', unit: '%' },
  { id: 'shareOfRevenue', label: 'Доля в общей выручке', align: 'right', unit: '%' },
  { id: 'marginality', label: 'Маржинальность', align: 'right', unit: '%' },
  { id: 'marginalityWithoutExpense', label: 'Маржинальность без опер. расх.', align: 'right', unit: '%' },
  { id: 'advertisingExpense', label: 'Расходы на рекламу', align: 'right', unit: '₽' },
  { id: 'drr', label: 'ДРР по продажам', align: 'right', unit: '%' },
  { id: 'advertisingExpenseBonus', label: 'Расходы на рекламу с бонусов', align: 'right', unit: '₽' },
  { id: 'drrBonus', label: 'ДРР бонусов', align: 'right', unit: '%' },
  { id: 'advertisingExpenseTotal', label: 'Общие расходы на рекламу', align: 'right', unit: '₽' },
  { id: 'drrTotal', label: 'Общая ДРР', align: 'right', unit: '%' },
  { id: 'drrByOrders', label: 'ДРР по заказам', align: 'right', unit: '%' },
  { id: 'acceptanceSum', label: 'Платная приемка', align: 'right', unit: '₽' },
  { id: 'abcProfit', label: 'ABC-анализ по чистой прибыли' },
  { id: 'abcRevenue', label: 'ABC-анализ по выручке' },
  { id: 'stockBalanceMP', label: 'Остатки на складах МП', align: 'right', unit: 'шт.' },
  { id: 'stockBalanceOwn', label: 'Остатки на моих складах', align: 'right', unit: 'шт.' },
  { id: 'stockBalanceToClient', label: 'Остатки в пути к клиенту', align: 'right', unit: 'шт.' },
  { id: 'stockBalanceFromClient', label: 'Остатки в пути от клиента', align: 'right', unit: 'шт.' },
  { id: 'salesCount', label: 'Продажи в штуках', align: 'right', unit: 'шт.' },
];

const METRIC_COLUMN_GROUPS: Array<{ id: MetricColumnGroupId; title: string; widgetIds: string[] }> = [
  {
    id: 'finance',
    title: 'Финансы',
    widgetIds: [
      'metric-total-paid',
      'metric-profit',
      'metric-profit-without-expense',
      'metric-sales',
      'metric-revenue',
      'metric-orders',
      'metric-compensation',
      'metric-average-price',
      'metric-profit-per-unit',
    ],
  },
  {
    id: 'expenses',
    title: 'Расходы',
    widgetIds: [
      'metric-wb-final-reward',
      'metric-logistics',
      'metric-ads-drr',
      'metric-storage',
      'metric-acceptance',
      'metric-other-deduction',
      'metric-cogs',
      'metric-operating-expense',
      'metric-taxes',
      'metric-tax-base',
      'metric-commission',
      'metric-fines',
      'metric-returns',
      'metric-average-logistics-cost',
    ],
  },
  {
    id: 'indicators',
    title: 'Показатели',
    widgetIds: [
      'metric-buyout-rate',
      'metric-roi',
      'metric-average-price-before-spp',
      'metric-capitalization-cost',
      'metric-capitalization-price',
      'metric-stock-balance',
      'metric-user-warehouse-stock',
      'metric-user-warehouse-capitalization',
      'metric-gmroi',
      'metric-gmroi-year',
      'metric-ads-drr-orders',
      'metric-sales-turnover',
      'metric-orders-turnover',
      'metric-sales-units',
    ],
  },
];

const METRIC_COLUMN_GROUP_BY_WIDGET_ID = new Map(
  METRIC_COLUMN_GROUPS.flatMap(group => group.widgetIds.map(widgetId => [widgetId, group.id] as const))
);

const DEFAULT_PINNED_ANALYTICS_COLUMN_IDS = ['photo', 'article', 'toTransfer'];
const ANALYTICS_TABLE_PINNING_VERSION = 1;
const MAX_PINNED_ANALYTICS_COLUMNS = 4;

function getDefaultAnalyticsColumnIds() {
  return ANALYTICS_COLUMNS.map(column => String(column.id));
}

export function DashboardPage() {
  const { reportMode } = useReportMode();
  const analytics = useAnalyticsWorkspaceData({
    includeTrends: false,
    includeBreakdown: false,
    includeExplanation: false,
  });
  const [articleMarginLimit, setArticleMarginLimit] = useState<number | 'all'>(10);
  const [categoryMarginLimit, setCategoryMarginLimit] = useState<number | 'all'>(10);
  const productReportingMarketplaces = useMemo(
    () =>
      (analytics.filterOptions?.marketplaces ?? [])
        .map(item => item.id)
        .filter((id): id is string => Boolean(id)),
    [analytics.filterOptions?.marketplaces]
  );
  const isProductReportingEnabled =
    !analytics.loading &&
    analytics.accountIds.length > 0 &&
    productReportingMarketplaces.length > 0;
  const productReportingData = useProductReportingData({
    enabled: isProductReportingEnabled,
    accountIds: analytics.accountIds,
    marketplaces: productReportingMarketplaces,
    limit: 100,
    marginProductLimit: articleMarginLimit === 'all' ? 0 : articleMarginLimit,
    marginCategoryLimit: categoryMarginLimit === 'all' ? 0 : categoryMarginLimit,
  });
  const reportingSummaryMetrics = useMemo<Record<string, number | null> | null>(() => {
    const workspaceSummary = analytics.summary?.metrics ?? null;
    const productsSummary = productReportingData.overview?.summary ?? null;
    const reportingSummary = productReportingData.summary?.metrics ?? null;
    if (!workspaceSummary && !productsSummary && !reportingSummary) {
      return null;
    }
    return {
      ...(workspaceSummary ?? {}),
      ...(productsSummary ?? {}),
      ...(reportingSummary ?? {}),
    };
  }, [analytics.summary?.metrics, productReportingData.overview?.summary, productReportingData.summary?.metrics]);
  const reportingSummaryComparisons = productReportingData.summary?.comparisons ?? analytics.summary?.comparisons ?? null;
  const hasLiveSummaryMetrics = Boolean(reportingSummaryMetrics) || productReportingData.rows.length > 0;
  const isMetricsLoading = analytics.loading || productReportingData.loading;
  const showMetricPlaceholders = !isMetricsLoading && !hasLiveSummaryMetrics;
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [isCreateMetricModalOpen, setIsCreateMetricModalOpen] = useState(false);
  const [isWidgetEditMode, setIsWidgetEditMode] = useState(false);
  const [metricViewMode, setMetricViewMode] = useState<MetricViewMode>(() => {
    if (typeof window === 'undefined') return 'cards';
    return window.localStorage.getItem(METRIC_VIEW_MODE_STORAGE_KEY) === 'columns' ? 'columns' : 'cards';
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [widgetSearch, setWidgetSearch] = useState('');
  const [profileName, setProfileName] = useState('');
  const [metricName, setMetricName] = useState('');
  const [metricFormula, setMetricFormula] = useState('');
  const [metricGrowthColor, setMetricGrowthColor] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [editingCustomMetricId, setEditingCustomMetricId] = useState<string | null>(null);
  const [isDeleteMetricConfirmOpen, setIsDeleteMetricConfirmOpen] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [dragInsertPosition, setDragInsertPosition] = useState<'before' | 'after'>('before');
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(CUSTOM_METRICS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CustomMetric[]) : [];
    } catch {
      return [];
    }
  });
  const formulaMetricValues = useMemo(
    () =>
      buildFormulaMetricValues(
        reportingSummaryMetrics,
        reportingSummaryComparisons
      ),
    [reportingSummaryComparisons, reportingSummaryMetrics]
  );
  const productMetricTooltips = useMemo(() => {
    const byMetric = new Map<string, string>();
    const byCard = new Map<string, string>();

    const pushUnique = (parts: string[], value?: string | null) => {
      const normalized = value?.trim();
      if (normalized && !parts.includes(normalized)) {
        parts.push(normalized);
      }
    };

    productReportingData.metricDefinitions.forEach(metric => {
      const key = metric.key ?? metric.slug ?? metric.id ?? metric.header;
      const hint = metric.meta?.hint ?? metric.description ?? metric.label ?? metric.header;
      if (key && hint) {
        byMetric.set(key, hint);
      }
    });

    productReportingData.metricCards.forEach(card => {
      const parts: string[] = [];
      pushUnique(parts, card.hint);
      [card.primaryMetric, card.secondaryMetric, card.ratioMetric].forEach(metric => pushUnique(parts, metric ? byMetric.get(metric) : null));
      const text = parts.join('\n\n');
      if (!text) return;

      [card.id, card.title, card.primaryMetric, card.secondaryMetric, card.ratioMetric].forEach(key => {
        if (key) {
          byCard.set(key, text);
        }
      });
    });

    return { byMetric, byCard };
  }, [productReportingData.metricCards, productReportingData.metricDefinitions]);

  const widgetDefs = useMemo<WidgetDefinition[]>(() => {
    const getFormulaMetric = (key: keyof typeof formulaMetricValues) =>
      formulaMetricValues[key] ?? { current: 0, previous: 0 };
    const metricValue = (key: keyof typeof formulaMetricValues) => formulaMetricValues[key] ?? EMPTY_METRIC_VALUE;
    const hasValue = (value: number | null | undefined) => Number.isFinite(value) && Math.abs(Number(value)) > 0;
    const hasCurrentRevenue = hasValue(getFormulaMetric('realisation').current);
    const hasCurrentSalesAmount = hasValue(getFormulaMetric('totalSalesAmount').current);
    const hasCurrentOrdersAmount = hasValue(getFormulaMetric('orders').current);
    const moneyShare = (key: keyof typeof formulaMetricValues, period: 'current' | 'previous' = 'current') => (value: number) => {
      const revenue = Number(getFormulaMetric('realisation')[period] ?? 0);
      if (!revenue) return formatCurrency(value);
      return `${formatCurrency(value)} / ${((getFormulaMetric(key)[period] / revenue) * 100).toFixed(2)}%`;
    };
    const moneyUnit = (key: keyof typeof formulaMetricValues) => (value: number) =>
      `${formatCurrency(value)} / ${formatNumber(getFormulaMetric(key).current)} шт`;
    const moneyRatio = (ratioKey: keyof typeof formulaMetricValues, denominatorKey?: keyof typeof formulaMetricValues) => (value: number) => {
      if (denominatorKey && !getFormulaMetric(denominatorKey).current) return formatCurrency(value);
      return `${formatCurrency(value)} / ${getFormulaMetric(ratioKey).current.toFixed(2)}%`;
    };
    const previousMoneyRatio = (ratioKey: keyof typeof formulaMetricValues, denominatorKey?: keyof typeof formulaMetricValues) => (value: number) => {
      if (denominatorKey && !getFormulaMetric(denominatorKey).previous) return formatCurrency(value);
      return `${formatCurrency(value)} / ${getFormulaMetric(ratioKey).previous.toFixed(2)}%`;
    };
    const percent = (value: number) => `${value.toFixed(2)}%`;
    const deltaMoney = (value: number) => `${value >= 0 ? '+' : ''}${formatCurrency(value)}`;
    const deltaPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)} п.п.`;
    const tooltip = (keys: string[], fallback: string, cardKeys: string[] = []) => {
      const parts: string[] = [];
      const pushUnique = (value?: string) => {
        const normalized = value?.trim();
        if (normalized && !parts.includes(normalized)) {
          parts.push(normalized);
        }
      };

      [...cardKeys, ...keys].forEach(key => pushUnique(productMetricTooltips.byCard.get(key)));
      keys.forEach(key => pushUnique(productMetricTooltips.byMetric.get(key)));

      return parts.length > 0 ? parts.join('\n\n') : fallback;
    };

    return [
    {
      id: FINANCIAL_TOTAL_PAID_WIDGET_ID,
      title: 'Итого к оплате',
      metric: metricValue('totalPaid'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      description: 'Итого к оплате, ₽',
      faq: tooltip(['totalPaid'], 'Итого к оплате, ₽', [FINANCIAL_TOTAL_PAID_WIDGET_ID]),
      section: 'metrics',
    },
    {
      id: 'metric-profit',
      title: 'Чистая прибыль',
      metric: metricValue('profit'),
      format: (v: number) => `${formatCurrency(v)} / ${formulaMetricValues.profitability.current.toFixed(2)}%`,
      formatDelta: deltaMoney,
      description: 'Чистая прибыль/Марж-cть, ₽/%',
      faq: tooltip(['profit', 'profitability'], 'Чистая прибыль/Марж-cть, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-profit-without-expense',
      title: 'Прибыль без опер. расх.',
      metric: metricValue('profitWithoutExpense'),
      format: (v: number) => `${formatCurrency(v)} / ${formulaMetricValues.marginalityWithoutExpense.current.toFixed(2)}%`,
      formatDelta: deltaMoney,
      description: 'Прибыль/Марж. без опер. расх., ₽/%',
      faq: tooltip(['profitWithoutExpense', 'marginalityWithoutExpense'], 'Прибыль/Марж. без опер. расх., ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-sales',
      title: 'Продажи',
      metric: metricValue('totalSalesAmount'),
      format: moneyUnit('sales'),
      formatDelta: deltaMoney,
      description: 'Продажи, ₽/шт',
      faq: tooltip(['sales', 'salesCount', 'totalSales'], 'Продажи, ₽/шт'),
      section: 'metrics',
    },
    {
      id: 'metric-revenue',
      title: 'Реализация',
      metric: metricValue('realisation'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      description: 'Реализация, ₽',
      faq: tooltip(['realisation'], 'Реализация, ₽'),
      section: 'metrics',
    },
    {
      id: 'metric-wb-final-reward',
      title: 'Вознаграждение МП',
      metric: metricValue('netMarketplaceReward'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      invertColors: true,
      description: 'Итоговое вознаграждение МП, ₽',
      faq: tooltip(['netMarketplaceReward'], 'Итоговое вознаграждение МП, ₽'),
      section: 'metrics',
    },
    {
      id: 'metric-orders',
      title: 'Заказы',
      metric: metricValue('orders'),
      format: moneyUnit('ordersCount'),
      formatDelta: deltaMoney,
      description: 'Заказы, ₽/шт',
      faq: tooltip(['orders', 'ordersCount'], 'Заказы, ₽/шт'),
      section: 'metrics',
    },
    {
      id: 'metric-buyout-rate',
      title: '% выкупа',
      metric: metricValue('averageRedemption'),
      format: percent,
      formatDelta: deltaPercent,
      description: 'Процент выкупа, %',
      faq: tooltip(['averageRedemption'], 'Процент выкупа, %'),
      section: 'metrics',
    },
    {
      id: 'metric-logistics',
      title: 'Логистика',
      metric: metricValue('logistics'),
      format: moneyShare('logistics'),
      formatPrevious: moneyShare('logistics', 'previous'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentRevenue,
      invertColors: true,
      description: 'Логистика, ₽/%',
      faq: tooltip(['logistics'], 'Логистика, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-ads-drr',
      title: 'Реклама / ДРР',
      metric: metricValue('advertisingExpense'),
      format: moneyRatio('drr', 'totalSalesAmount'),
      formatPrevious: previousMoneyRatio('drr', 'totalSalesAmount'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentSalesAmount,
      invertColors: true,
      description: 'Реклама / ДРР, ₽/%',
      faq: tooltip(['advertisingExpense', 'drr'], 'Реклама / ДРР, ₽/%', ['advertisingDrr']),
      section: 'metrics',
    },
    {
      id: 'metric-storage',
      title: 'Хранение',
      metric: metricValue('storage'),
      format: moneyShare('storage'),
      formatPrevious: moneyShare('storage', 'previous'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentRevenue,
      invertColors: true,
      description: 'Хранение, ₽/%',
      faq: tooltip(['storage'], 'Хранение, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-acceptance',
      title: 'Плат. приемка',
      metric: metricValue('acceptanceSum'),
      format: moneyShare('acceptanceSum'),
      formatPrevious: moneyShare('acceptanceSum', 'previous'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentRevenue,
      invertColors: true,
      description: 'Плат. приемка, ₽/%',
      faq: tooltip(['acceptanceSum'], 'Плат. приемка, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-other-deduction',
      title: 'Прочие удерж.',
      metric: metricValue('otherDeduction'),
      format: moneyShare('otherDeduction'),
      formatPrevious: moneyShare('otherDeduction', 'previous'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentRevenue,
      invertColors: true,
      description: 'Прочие удержания, ₽/%',
      faq: tooltip(['otherDeduction'], 'Прочие удержания, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-roi',
      title: 'ROI',
      metric: metricValue('roi'),
      format: percent,
      formatDelta: deltaPercent,
      description: 'ROI, %',
      faq: tooltip(['roi'], 'ROI, %'),
      section: 'metrics',
    },
    {
      id: 'metric-cogs',
      title: 'Себестоимость продаж',
      metric: metricValue('costOfSales'),
      format: moneyShare('costOfSales'),
      formatPrevious: moneyShare('costOfSales', 'previous'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentRevenue,
      invertColors: true,
      description: 'Себестоимость продаж, ₽/%',
      faq: tooltip(['costOfSales'], 'Себестоимость продаж, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-operating-expense',
      title: 'Операционные расходы',
      metric: metricValue('operatingExpenses'),
      format: moneyShare('operatingExpenses'),
      formatPrevious: moneyShare('operatingExpenses', 'previous'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentRevenue,
      invertColors: true,
      description: 'Операционные расходы, ₽/%',
      faq: tooltip(['operatingExpenses'], 'Операционные расходы, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-taxes',
      title: 'Налоги',
      metric: metricValue('tax'),
      format: moneyShare('tax'),
      formatPrevious: moneyShare('tax', 'previous'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentRevenue,
      invertColors: true,
      description: 'Налоги, ₽/%',
      faq: tooltip(['tax'], 'Налоги, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-tax-base',
      title: 'Налоговая база',
      metric: metricValue('taxBase'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      invertColors: true,
      description: 'Налоговая База, ₽',
      faq: tooltip(['taxBase'], 'Налоговая База, ₽'),
      section: 'metrics',
    },
    {
      id: 'metric-commission',
      title: 'Комиссия',
      metric: metricValue('commission'),
      format: moneyShare('commission'),
      formatPrevious: moneyShare('commission', 'previous'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentRevenue,
      invertColors: true,
      description: 'Комиссия, ₽/%',
      faq: tooltip(['commission'], 'Комиссия, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-average-price-before-spp',
      title: 'Цена до скидок МП',
      metric: metricValue('averagePriceBeforeSPP'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      description: 'Сред. цена до скидок МП, ₽',
      faq: tooltip(['averagePriceBeforeSPP'], 'Сред. цена до скидок МП, ₽'),
      section: 'metrics',
    },
    {
      id: 'metric-capitalization-cost',
      title: 'Капитализация себес.',
      metric: metricValue('capitalizationByCost'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      description: 'Капитализация по себес., ₽',
      faq: tooltip(['capitalizationByCost'], 'Капитализация по себес., ₽'),
      tone: 'neutral',
      section: 'metrics',
    },
    {
      id: 'metric-capitalization-price',
      title: 'Капитализация розн.',
      metric: metricValue('capitalizationByPrice'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      description: 'Капитализация по розн., ₽',
      faq: tooltip(['capitalizationByPrice'], 'Капитализация по розн., ₽'),
      tone: 'neutral',
      section: 'metrics',
    },
    {
      id: 'metric-stock-balance',
      title: 'Остатки',
      metric: metricValue('stockBalanceOverall'),
      format: formatNumber,
      description: 'Остатки, шт',
      faq: tooltip(['stockBalanceOverall'], 'Остатки, шт'),
      tone: 'neutral',
      section: 'metrics',
    },
    {
      id: 'metric-user-warehouse-stock',
      title: 'Мои склады',
      metric: metricValue('userWarehouseStockBalance'),
      format: formatNumber,
      description: 'Остатки на моих складах, шт',
      faq: tooltip(['userWarehouseStockBalance'], 'Остатки на моих складах, шт'),
      tone: 'neutral',
      section: 'metrics',
    },
    {
      id: 'metric-user-warehouse-capitalization',
      title: 'Капитализ. моих складов',
      metric: metricValue('userWarehouseCapitalizationByCost'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      description: 'Капитализ. на моих складах, ₽',
      faq: tooltip(['userWarehouseCapitalizationByCost'], 'Капитализ. на моих складах, ₽'),
      tone: 'neutral',
      section: 'metrics',
    },
    {
      id: 'metric-gmroi',
      title: 'GMROI',
      metric: metricValue('gmroi'),
      format: percent,
      formatDelta: deltaPercent,
      description: 'GMROI, %',
      faq: tooltip(['gmroi'], 'GMROI, %'),
      section: 'metrics',
    },
    {
      id: 'metric-gmroi-year',
      title: 'Годовой GMROI',
      metric: metricValue('gmroiYear'),
      format: percent,
      formatDelta: deltaPercent,
      description: 'Годовой GMROI, %',
      faq: tooltip(['gmroiYear'], 'Годовой GMROI, %'),
      section: 'metrics',
    },
    {
      id: 'metric-fines',
      title: 'Штрафы',
      metric: metricValue('fines'),
      format: moneyShare('fines'),
      formatPrevious: moneyShare('fines', 'previous'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentRevenue,
      invertColors: true,
      description: 'Штрафы, ₽/%',
      faq: tooltip(['fines'], 'Штрафы, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-compensation',
      title: 'Компенсации',
      metric: metricValue('compensation'),
      format: moneyShare('compensation'),
      formatPrevious: moneyShare('compensation', 'previous'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentRevenue,
      description: 'Компенсации, ₽/%',
      faq: tooltip(['compensation'], 'Компенсации, ₽/%'),
      section: 'metrics',
    },
    {
      id: 'metric-average-price',
      title: 'Сред. цена продажи',
      metric: metricValue('averagePriceAfterSPP'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      description: 'Сред. цена продажи, ₽',
      faq: tooltip(['averagePriceAfterSPP'], 'Сред. цена продажи, ₽'),
      section: 'metrics',
    },
    {
      id: 'metric-average-logistics-cost',
      title: 'Логистика / шт.',
      metric: metricValue('averageLogisticsCost'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      invertColors: true,
      description: 'Ср. стоимость логистики на 1 шт., ₽',
      faq: tooltip(['averageLogisticsCost'], 'Ср. стоимость логистики на 1 шт., ₽'),
      section: 'metrics',
    },
    {
      id: 'metric-profit-per-unit',
      title: 'Прибыль / шт.',
      metric: metricValue('averageProfitPerPiece'),
      format: formatCurrency,
      formatDelta: deltaMoney,
      description: 'Средняя прибыль на 1 шт., ₽',
      faq: tooltip(['averageProfitPerPiece'], 'Средняя прибыль на 1 шт., ₽'),
      section: 'metrics',
    },
    {
      id: 'metric-ads-drr-orders',
      title: 'Реклама / ДРРз',
      metric: metricValue('advertisingExpense'),
      format: moneyRatio('drrByOrders', 'orders'),
      formatPrevious: previousMoneyRatio('drrByOrders', 'orders'),
      formatDelta: deltaMoney,
      hideDeltaPercent: !hasCurrentOrdersAmount,
      invertColors: true,
      description: 'Реклама/ДРРз, ₽/%',
      faq: tooltip(['advertisingExpense', 'drrByOrders'], 'Реклама/ДРРз, ₽/%', ['advertisingDrrByOrders']),
      section: 'metrics',
    },
    {
      id: 'metric-returns',
      title: 'Возвраты',
      metric: metricValue('returns'),
      format: (v: number) => `${formatCurrency(v)} / ${formatNumber(formulaMetricValues.rejectionsAndReturns.current)} шт`,
      formatDelta: deltaMoney,
      invertColors: true,
      description: 'Возвраты, ₽/шт',
      faq: tooltip(['returns', 'refunds', 'returnsUnits'], 'Возвраты, ₽/шт'),
      section: 'metrics',
    },
    {
      id: 'metric-sales-turnover',
      title: 'Оборач. по продажам',
      metric: metricValue('salesTurnover'),
      format: (v: number) => `${v.toFixed(2)} Дн.`,
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} Дн.`,
      invertColors: true,
      description: 'Оборачиваемость по прод., Дн.',
      faq: tooltip(['salesTurnover'], 'Оборачиваемость по прод., Дн.'),
      section: 'metrics',
    },
    {
      id: 'metric-orders-turnover',
      title: 'Оборач. по заказам',
      metric: metricValue('ordersTurnover'),
      format: (v: number) => `${v.toFixed(2)} Дн.`,
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} Дн.`,
      invertColors: true,
      description: 'Оборачиваемость по зак., Дн.',
      faq: tooltip(['ordersTurnover'], 'Оборачиваемость по зак., Дн.'),
      section: 'metrics',
    },
    {
      id: 'metric-sales-units',
      title: 'Продажи, шт.',
      metric: metricValue('sales'),
      format: formatNumber,
      description: 'Продажи в штуках, шт',
      faq: tooltip(['salesCount'], 'Продажи в штуках, шт'),
      section: 'metrics',
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
  ];
  }, [customMetrics, formulaMetricValues, productMetricTooltips]);

  const availableWidgetDefs = useMemo(
    () =>
      reportMode === 'financial'
        ? widgetDefs
        : widgetDefs.filter(widget => widget.id !== FINANCIAL_TOTAL_PAID_WIDGET_ID),
    [reportMode, widgetDefs]
  );
  const defaultWidgetIds = useMemo(() => {
    const availableIds = new Set(availableWidgetDefs.map(widget => widget.id));
    const orderedDefaults = DEFAULT_PRODUCT_METRIC_WIDGET_ORDER.filter(id => availableIds.has(id));
    const remainingIds = availableWidgetDefs
      .map(widget => widget.id)
      .filter(id => !orderedDefaults.includes(id as typeof DEFAULT_PRODUCT_METRIC_WIDGET_ORDER[number]));
    return [...orderedDefaults, ...remainingIds];
  }, [availableWidgetDefs]);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>(defaultWidgetIds);
  const [hiddenMetricWidgetIds, setHiddenMetricWidgetIds] = useState<string[]>([]);
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
    setHiddenMetricWidgetIds(current => current.filter(id => defaultWidgetIds.includes(id)));
    setDraftWidgetIds(current =>
      current.length > 0 ? current.filter(id => defaultWidgetIds.includes(id)) : defaultWidgetIds
    );
  }, [defaultWidgetIds]);

  useEffect(() => {
    if (reportMode !== 'financial' || !defaultWidgetIds.includes(FINANCIAL_TOTAL_PAID_WIDGET_ID)) return;

    setSelectedWidgetIds(current =>
      current.includes(FINANCIAL_TOTAL_PAID_WIDGET_ID)
        ? current
        : [FINANCIAL_TOTAL_PAID_WIDGET_ID, ...current]
    );
    setDraftWidgetIds(current =>
      current.includes(FINANCIAL_TOTAL_PAID_WIDGET_ID)
        ? current
        : [FINANCIAL_TOTAL_PAID_WIDGET_ID, ...current]
    );
  }, [defaultWidgetIds, reportMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WIDGET_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CUSTOM_METRICS_STORAGE_KEY, JSON.stringify(customMetrics));
  }, [customMetrics]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(METRIC_VIEW_MODE_STORAGE_KEY, metricViewMode);
  }, [metricViewMode]);

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

  const orderedSelectedWidgetIds = selectedWidgetIds.filter(id =>
    availableWidgetDefs.some(widget => widget.id === id) && !hiddenMetricWidgetIds.includes(id)
  );
  const visibleMetricDefs = orderedSelectedWidgetIds
    .map(id => availableWidgetDefs.find(widget => widget.id === id && widget.section === 'metrics'))
    .filter((widget): widget is WidgetDefinition => Boolean(widget));
  const groupedMetricDefs = useMemo(
    () => groupMetricDefinitions(visibleMetricDefs),
    [visibleMetricDefs]
  );
  const metricWidgetDefs = useMemo(
    () => availableWidgetDefs.filter(widget => widget.section === 'metrics'),
    [availableWidgetDefs]
  );
  const editableMetricDefs = useMemo(
    () => orderWidgetDefinitions(metricWidgetDefs, selectedWidgetIds),
    [metricWidgetDefs, selectedWidgetIds]
  );
  const apiAnalyticsRows = useMemo(
    () => buildAnalyticsRowsFromApi(productReportingData.rows),
    [productReportingData.rows]
  );
  const apiAnalyticsTotalRow = useMemo(() => {
    const total = productReportingData.tableSummary?.total;
    if (!total) return null;
    return buildAnalyticsRowsFromApi([
      {
        dimension: {
          productName: 'Итого за период',
          marketplaceArticle: 'total-period',
        },
        metrics: total,
      },
    ])[0] ?? null;
  }, [productReportingData.tableSummary?.total]);
  const topMarginArticles = useMemo(
    () =>
      productReportingData.marginTop
        ? buildMarginLeaderboardRowsFromApi(productReportingData.marginTop, 'product')
        : [],
    [productReportingData.marginTop]
  );
  const topMarginCategories = useMemo(
    () =>
      productReportingData.marginCategories
        ? buildMarginLeaderboardRowsFromApi(productReportingData.marginCategories, 'category')
        : [],
    [productReportingData.marginCategories]
  );
  const visibleTopMarginArticles =
    productReportingData.marginTop || articleMarginLimit === 'all' ? topMarginArticles : topMarginArticles.slice(0, articleMarginLimit);
  const visibleTopMarginCategories =
    productReportingData.marginCategories || categoryMarginLimit === 'all' ? topMarginCategories : topMarginCategories.slice(0, categoryMarginLimit);
  const totalMarginProfit = Math.max(Number(reportingSummaryMetrics?.profit ?? 0), 0);
  const articleMarginRemainder = useMemo(
    () => buildMarginLeaderboardRemainder(topMarginArticles, visibleTopMarginArticles.length, totalMarginProfit, productReportingData.marginTop),
    [productReportingData.marginTop, topMarginArticles, totalMarginProfit, visibleTopMarginArticles.length]
  );
  const categoryMarginRemainder = useMemo(
    () => buildMarginLeaderboardRemainder(topMarginCategories, visibleTopMarginCategories.length, totalMarginProfit, productReportingData.marginCategories),
    [productReportingData.marginCategories, topMarginCategories, totalMarginProfit, visibleTopMarginCategories.length]
  );
  const revenueStructureItems = useMemo(
    () => {
      if (productReportingData.revenueStructure?.items) {
        return buildRevenueStructureItemsFromApi(productReportingData.revenueStructure.items);
      }
      return [];
    },
    [productReportingData.revenueStructure?.items]
  );
  const orderedWidgetDefs = orderWidgetDefinitions(availableWidgetDefs, draftWidgetIds);
  const filteredWidgetDefs = orderedWidgetDefs.filter(widget => {
    const search = widgetSearch.trim().toLowerCase();
    if (!search) return true;
    return `${widget.title} ${widget.description}`.toLowerCase().includes(search);
  });

  const openWidgetModal = useCallback(() => {
    setDraftWidgetIds(selectedWidgetIds.filter(id => !hiddenMetricWidgetIds.includes(id)));
    setSelectedProfileId(DEFAULT_WIDGET_PROFILE_ID);
    setWidgetSearch('');
    setProfileName('');
    setIsWidgetModalOpen(true);
  }, [hiddenMetricWidgetIds, selectedWidgetIds]);

  const closeWidgetModal = useCallback(() => {
    setIsWidgetModalOpen(false);
    setIsProfileMenuOpen(false);
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
    setWidgetSearch('');
    setProfileName('');
    setSelectedProfileId(DEFAULT_WIDGET_PROFILE_ID);
    setDraftWidgetIds(selectedWidgetIds);
  }, [selectedWidgetIds]);

  const closeCreateMetricModal = useCallback(() => {
    setIsCreateMetricModalOpen(false);
    setIsDeleteMetricConfirmOpen(false);
    setEditingCustomMetricId(null);
    setMetricName('');
    setMetricFormula('');
    setMetricGrowthColor('');
    setMetricUnit('');
  }, []);

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
  }, [closeCreateMetricModal, closeWidgetModal, isWidgetModalOpen, isCreateMetricModalOpen]);

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
      const orderedIds = orderWidgetDefinitions(availableWidgetDefs, current).map(widget => widget.id);
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

  const toggleSelectedWidget = (widgetId: string) => {
    if (!selectedWidgetIds.includes(widgetId)) {
      setSelectedWidgetIds(current => [...current, widgetId]);
      setHiddenMetricWidgetIds(current => current.filter(id => id !== widgetId));
      return;
    }

    setHiddenMetricWidgetIds(current =>
      current.includes(widgetId) ? current.filter(id => id !== widgetId) : [...current, widgetId]
    );
  };

  const moveSelectedWidget = (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' = 'before'
  ) => {
    if (draggedId === targetId) return;

    setSelectedWidgetIds(current => {
      if (!current.includes(draggedId) || !current.includes(targetId)) {
        return current;
      }

      const next = [...current];
      const fromIndex = next.indexOf(draggedId);
      next.splice(fromIndex, 1);
      const targetIndex = next.indexOf(targetId);
      const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
      next.splice(insertIndex, 0, draggedId);
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

  const deleteCustomMetric = () => {
    if (!editingCustomMetricId) return;

    setCustomMetrics(current => current.filter(metric => metric.id !== editingCustomMetricId));
    setSelectedWidgetIds(current => current.filter(id => id !== editingCustomMetricId));
    setDraftWidgetIds(current => current.filter(id => id !== editingCustomMetricId));
    closeCreateMetricModal();
  };

  const metricPendingDeletion = customMetrics.find(metric => metric.id === editingCustomMetricId);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Оцифровка
            <span className="text-sm font-medium text-slate-500"> Товарный отчет</span>
          </h1>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">Общие показатели</div>
            <SectionAlias alias="general-metrics" />
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setMetricViewMode('cards')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                metricViewMode === 'cards'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              aria-pressed={metricViewMode === 'cards'}
            >
              <LayoutGrid size={14} />
              Карточки
            </button>
            <button
              type="button"
              onClick={() => setMetricViewMode('columns')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                metricViewMode === 'columns'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              aria-pressed={metricViewMode === 'columns'}
            >
              <Columns3 size={14} />
              Колонки
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Activity size={13} className="text-emerald-500" />
            <span>Данные отчета</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsWidgetEditMode(current => !current);
              setDraggedWidgetId(null);
              setDragOverWidgetId(null);
            }}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              isWidgetEditMode
                ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <GripVertical size={15} />
            {isWidgetEditMode ? 'Готово' : 'Редактировать'}
          </button>
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

      {!isWidgetEditMode && metricViewMode === 'columns' ? (
        <MetricColumnsView
          groups={groupedMetricDefs}
          isLoading={isMetricsLoading}
          isPlaceholder={showMetricPlaceholders}
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {(isWidgetEditMode ? editableMetricDefs : visibleMetricDefs).map(def => {
            const isOrdered = selectedWidgetIds.includes(def.id);
            const isVisible = isOrdered && !hiddenMetricWidgetIds.includes(def.id);
            return (
              <div
                key={def.id}
                draggable={isWidgetEditMode && isOrdered}
                onDragStart={event => {
                  if (!isWidgetEditMode || !isOrdered) return;
                  setDraggedWidgetId(def.id);
                  setDragOverWidgetId(def.id);
                  setDragInsertPosition('before');
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', def.id);
                }}
                onDragEnd={() => {
                  setDraggedWidgetId(null);
                  setDragOverWidgetId(null);
                }}
                onDragOver={event => {
                  if (!isWidgetEditMode || !isOrdered) return;
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  const nextPosition = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
                  const draggedId = event.dataTransfer.getData('text/plain') || draggedWidgetId;
                  setDragOverWidgetId(def.id);
                  setDragInsertPosition(nextPosition);
                  if (draggedId) {
                    moveSelectedWidget(draggedId, def.id, nextPosition);
                  }
                }}
                onDrop={event => {
                  if (!isWidgetEditMode || !isOrdered) return;
                  event.preventDefault();
                  setDraggedWidgetId(null);
                  setDragOverWidgetId(null);
                }}
                className={`relative transition ${isWidgetEditMode && !isVisible ? 'opacity-45 grayscale' : ''} ${
                  isWidgetEditMode && draggedWidgetId === def.id ? 'scale-[0.98] opacity-60' : ''
                }`}
              >
                {isWidgetEditMode && (
                  <>
                    {dragOverWidgetId === def.id && draggedWidgetId !== def.id && isVisible && (
                      <div className={`absolute left-2 right-2 z-20 h-0.5 rounded-full bg-blue-500 ${
                        dragInsertPosition === 'before' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2'
                      }`} />
                    )}
                    <div className="absolute left-2 top-2 z-30 flex items-center gap-1">
                      <div
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border bg-white text-slate-500 shadow-sm ${
                          isOrdered ? 'cursor-grab border-slate-200 active:cursor-grabbing' : 'cursor-not-allowed border-slate-100 opacity-60'
                        }`}
                        title={isOrdered ? 'Перетащить виджет' : 'Включите виджет перед перемещением'}
                      >
                        <GripVertical size={15} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSelectedWidget(def.id)}
                      className={`absolute right-2 top-2 z-30 inline-flex h-7 items-center gap-1 rounded-lg border bg-white px-2 text-xs font-semibold shadow-sm transition-colors ${
                        isVisible
                          ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                      {isVisible ? 'Вкл' : 'Скрыт'}
                    </button>
                  </>
                )}
                <MetricCard
                  title={def.title}
                  metric={def.metric!}
                  format={def.format!}
                formatPrevious={def.formatPrevious}
                formatDelta={def.formatDelta}
                hideDeltaPercent={def.hideDeltaPercent}
                invertColors={def.invertColors}
                tone={getWidgetTone(def)}
                  isLoading={isMetricsLoading && isVisible}
                  isPlaceholder={showMetricPlaceholders && isVisible}
                  isEditMode={isWidgetEditMode}
                  faq={def.faq}
                  documents={def.documents}
                  onEdit={def.customMetricId ? () => editCustomMetric(def.customMetricId!) : undefined}
                />
              </div>
            );
          })}
        </div>
      )}

      {(productReportingData.loading || visibleTopMarginArticles.length > 0) && (
        <div className="mt-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <MarginLeaderboardCard
            title="Топ маржинальных артикулов"
            alias="top-margin-articles"
            subtitle="Список товаров с наилучшей маржинальностью в выбранном периоде."
            items={visibleTopMarginArticles}
            limit={articleMarginLimit}
            totalCount={articleMarginRemainder.totalCount}
            totalProfit={articleMarginRemainder.totalProfit}
            selectedProfit={articleMarginRemainder.selectedProfit}
            hiddenCount={articleMarginRemainder.hiddenCount}
            hiddenProfit={articleMarginRemainder.hiddenProfit}
            isLoading={productReportingData.marginLoading}
            onLimitChange={setArticleMarginLimit}
            emptyMessage={productReportingData.loading ? 'Загружаем маржинальные артикулы...' : 'Для выбранных фильтров пока нет артикулов с продажами.'}
          />
          <MarginLeaderboardCard
            title="Топ маржинальных категорий"
            alias="top-margin-categories"
            subtitle="Категории товаров, которые дают лучший процент маржи."
            items={visibleTopMarginCategories}
            limit={categoryMarginLimit}
            totalCount={categoryMarginRemainder.totalCount}
            totalProfit={categoryMarginRemainder.totalProfit}
            selectedProfit={categoryMarginRemainder.selectedProfit}
            hiddenCount={categoryMarginRemainder.hiddenCount}
            hiddenProfit={categoryMarginRemainder.hiddenProfit}
            isLoading={productReportingData.marginLoading}
            onLimitChange={setCategoryMarginLimit}
            emptyMessage={productReportingData.loading ? 'Загружаем категории...' : 'Для выбранных фильтров пока нет категорий с продажами.'}
          />
        </div>
      )}

      {(productReportingData.loading || revenueStructureItems.length > 0) && (
        <div className="mt-6">
          <RevenueStructureAccordion items={revenueStructureItems} />
        </div>
      )}

      {(productReportingData.rows.length > 0 || productReportingData.loading || productReportingData.error) && (
        <div className="mt-6">
          <AnalyticsDataSection rows={apiAnalyticsRows} totalRow={apiAnalyticsTotalRow} loading={productReportingData.loading} error={productReportingData.error} />
        </div>
      )}

      {isWidgetModalOpen && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/45 p-4"
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
                          event.dataTransfer.setData('text/plain', widget.id);

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
                          const draggedId = draggedWidgetId || event.dataTransfer.getData('text/plain');
                          if (draggedId) {
                            moveDraftWidget(draggedId, widget.id, dragInsertPosition);
                          }
                          setDraggedWidgetId(null);
                          setDragOverWidgetId(null);
                        }}
                        onClick={() => toggleDraftWidget(widget.id)}
                        className={`relative flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
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
                          onClick={event => event.stopPropagation()}
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
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            toggleDraftWidget(widget.id);
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                            checked ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                          aria-label={checked ? 'Скрыть виджет' : 'Показать виджет'}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                              checked ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
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
                  setHiddenMetricWidgetIds([]);
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
          className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/45 p-4"
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

            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {editingCustomMetricId && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteMetricConfirmOpen(true)}
                    className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    Удалить метрику
                  </button>
                )}
              </div>
              <div className="flex justify-end gap-3">
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
        </div>
      )}
      {isDeleteMetricConfirmOpen && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="text-lg font-semibold text-slate-950">Удалить метрику?</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Метрика {metricPendingDeletion?.name ? `«${metricPendingDeletion.name}»` : ''} будет удалена из виджетов. Это действие нельзя отменить.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteMetricConfirmOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={deleteCustomMetric}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Удалить
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

function buildRevenueStructureItemsFromApi(items: Array<{
  key?: string | null;
  label?: string | null;
  labelRu?: string | null;
  effect?: string | null;
  amount?: number | null;
  shareOfRealisationPercent?: number | null;
  managerDescription?: string | null;
}>) {
  return normalizeRevenueStructureItems(items);
}

function normalizeRevenueStructureItems(items: Array<{
  key?: string | null;
  label?: string | null;
  labelRu?: string | null;
  effect?: string | null;
  amount?: number | null;
  shareOfRealisationPercent?: number | null;
  managerDescription?: string | null;
}>): RevenueStructureRow[] {
  return items
    .filter(item => item.key || item.labelRu || item.label)
    .map((item, index) => ({
      label: item.labelRu ?? item.label ?? item.key ?? `Статья ${index + 1}`,
      value: Number(item.amount ?? 0),
      percent: Number(item.shareOfRealisationPercent ?? 0),
      color: getRevenueStructureColor(item.key, item.effect, index),
      description: item.managerDescription ?? undefined,
    }));
}

function getRevenueStructureColor(key?: string | null, effect?: string | null, index = 0) {
  const byKey: Record<string, string> = {
    marketplace_discount: '#db2777',
    cost_of_sales: '#ea580c',
    profit: '#0891b2',
    logistics: '#2563eb',
    tax: '#7c3aed',
    commission: '#be123c',
    advertising: '#059669',
    other_marketplace_expenses: '#475569',
  };
  if (key && byKey[key]) return byKey[key];
  if (effect === 'profit') return '#0891b2';
  if (effect === 'income') return '#059669';
  const palette = ['#db2777', '#ea580c', '#2563eb', '#7c3aed', '#475569'];
  return palette[index % palette.length];
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

type MarginLeaderboardApiResponse = {
  summary?: {
    totalProducts?: number | null;
    returnedProducts?: number | null;
    otherProducts?: number | null;
    totalCategories?: number | null;
    returnedCategories?: number | null;
    otherCategories?: number | null;
    totalProfit?: number | null;
    returnedProfit?: number | null;
    otherProfit?: number | null;
  } | null;
  items?: Array<{
    kind?: string | null;
    dimension?: {
      id?: string | null;
      label?: string | null;
      vendorCode?: string | null;
      marketplaceArticle?: string | null;
      productName?: string | null;
      brand?: string | null;
      category?: string | null;
      accountName?: string | null;
      imageUrl?: string | null;
    } | null;
    metrics?: Record<string, number | null> | null;
    profit?: number | null;
    profitSharePercent?: number | null;
    productCount?: number | null;
  } | null> | null;
};

function buildMarginLeaderboardRowsFromApi(
  response: MarginLeaderboardApiResponse,
  variant: 'product' | 'category'
): MarginLeaderboardRow[] {
  return (response.items ?? [])
    .filter((item): item is NonNullable<NonNullable<MarginLeaderboardApiResponse['items']>[number]> => Boolean(item))
    .filter(item => item.kind !== 'Other')
    .map((item, index) => {
      const dimension = item.dimension ?? {};
      const metrics = item.metrics ?? {};
      const revenue = Number(metrics.realisation ?? 0);
      const profit = Number(item.profit ?? metrics.profit ?? 0);
      const margin = Number(metrics.profitability ?? 0);
      const title =
        variant === 'product'
          ? dimension.productName ?? dimension.label ?? dimension.marketplaceArticle ?? dimension.vendorCode ?? `Товар ${index + 1}`
          : dimension.label ?? dimension.category ?? dimension.id ?? 'Без категории';
      const subtitle =
        variant === 'product'
          ? dimension.brand ?? dimension.accountName ?? ''
          : `${Number(item.productCount ?? 0)} артикулов`;

      return {
        id: dimension.id ?? dimension.marketplaceArticle ?? title,
        title,
        subtitle,
        imageUrl: dimension.imageUrl ?? undefined,
        revenue,
        profit,
        margin,
        profitSharePercent: Number(item.profitSharePercent ?? 0),
        kind: item.kind ?? undefined,
        productCount: Number(item.productCount ?? 0),
      };
    });
}

function buildMarginLeaderboardRemainder(
  items: MarginLeaderboardRow[],
  visibleCount: number,
  totalProfit: number,
  apiResponse?: MarginLeaderboardApiResponse | null
) {
  if (apiResponse?.summary) {
    const summary = apiResponse.summary;
    const selectedProfit = Number(summary.returnedProfit ?? items.reduce((sum, item) => sum + Math.max(item.profit, 0), 0));
    const safeTotalProfit = Math.max(Number(summary.totalProfit ?? totalProfit), selectedProfit);

    return {
      totalCount: Number(summary.totalProducts ?? summary.totalCategories ?? items.length),
      hiddenCount: Number(summary.otherProducts ?? summary.otherCategories ?? 0),
      totalProfit: safeTotalProfit,
      selectedProfit,
      hiddenProfit: Math.max(Number(summary.otherProfit ?? safeTotalProfit - selectedProfit), 0),
    };
  }

  let selectedProfit = 0;

  for (let index = 0; index < visibleCount; index += 1) {
    selectedProfit += Math.max(items[index]?.profit ?? 0, 0);
  }

  const safeTotalProfit = Math.max(totalProfit, selectedProfit);

  return {
    totalCount: items.length,
    hiddenCount: Math.max(items.length - visibleCount, 0),
    totalProfit: safeTotalProfit,
    selectedProfit,
    hiddenProfit: Math.max(safeTotalProfit - selectedProfit, 0),
  };
}

function AnalyticsDataSection({
  rows,
  totalRow,
  loading,
  error,
}: {
  rows: AnalyticsTableRow[];
  totalRow: AnalyticsTableRow | null;
  loading: boolean;
  error: string | null;
}) {
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>('product');
  const [sourceTable, setSourceTable] = useState('Исходная таблица');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null);
  const [columnMenuPosition, setColumnMenuPosition] = useState<FloatingMenuPosition | null>(null);
  const [columnMenuSearch, setColumnMenuSearch] = useState('');
  const [draftColumnFilterValues, setDraftColumnFilterValues] = useState<string[]>([]);
  const [appliedColumnFilterValues, setAppliedColumnFilterValues] = useState<Record<string, string[]>>({});
  const [draftRangeFilter, setDraftRangeFilter] = useState<AnalyticsRangeFilterState>({ min: '', max: '' });
  const [appliedRangeFilters, setAppliedRangeFilters] = useState<Record<string, AnalyticsRangeFilterState>>({});
  const [sortState, setSortState] = useState<AnalyticsSortState>({ columnId: null, direction: null });
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const didDragColumnRef = useRef(false);

  const initialSettings = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        order: getDefaultAnalyticsColumnIds(),
        visible: getDefaultAnalyticsColumnIds(),
        pinned: DEFAULT_PINNED_ANALYTICS_COLUMN_IDS,
      };
    }

    try {
      const raw = window.localStorage.getItem(ANALYTICS_TABLE_SETTINGS_KEY);
      if (!raw) {
        return {
          order: getDefaultAnalyticsColumnIds(),
          visible: getDefaultAnalyticsColumnIds(),
          pinned: DEFAULT_PINNED_ANALYTICS_COLUMN_IDS,
        };
      }

      const parsed = JSON.parse(raw) as { order?: string[]; visible?: string[]; pinned?: string[]; pinningVersion?: number };
      const pinned = normalizeAnalyticsPinnedColumns(
        parsed.pinningVersion === ANALYTICS_TABLE_PINNING_VERSION ? parsed.pinned ?? [] : parsed.pinned?.length ? parsed.pinned : DEFAULT_PINNED_ANALYTICS_COLUMN_IDS
      );
      return {
        order: parsed.order?.length ? normalizeAnalyticsColumnOrder(parsed.order, pinned) : normalizeAnalyticsColumnOrder(getDefaultAnalyticsColumnIds(), pinned),
        visible: parsed.visible?.length ? parsed.visible : getDefaultAnalyticsColumnIds(),
        pinned,
      };
    } catch {
      return {
        order: getDefaultAnalyticsColumnIds(),
        visible: getDefaultAnalyticsColumnIds(),
        pinned: DEFAULT_PINNED_ANALYTICS_COLUMN_IDS,
      };
    }
  }, []);

  const [columnOrder, setColumnOrder] = useState<string[]>(initialSettings.order);
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(initialSettings.visible);
  const [pinnedColumnIds, setPinnedColumnIds] = useState<string[]>(initialSettings.pinned);
  const [draftColumnOrder, setDraftColumnOrder] = useState<string[]>(initialSettings.order);
  const [draftVisibleColumnIds, setDraftVisibleColumnIds] = useState<string[]>(initialSettings.visible);
  const [draftPinnedColumnIds, setDraftPinnedColumnIds] = useState<string[]>(initialSettings.pinned);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      ANALYTICS_TABLE_SETTINGS_KEY,
      JSON.stringify({
        order: columnOrder,
        visible: visibleColumnIds,
        pinned: pinnedColumnIds,
        pinningVersion: ANALYTICS_TABLE_PINNING_VERSION,
      })
    );
  }, [columnOrder, pinnedColumnIds, visibleColumnIds]);

  useEffect(() => {
    if (!openColumnMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!columnMenuRef.current?.contains(event.target as Node)) {
        setOpenColumnMenuId(null);
        setColumnMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openColumnMenuId]);

  useEffect(() => {
    if (!isExportMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isExportMenuOpen]);

  useEffect(() => {
    if (!draggedColumnId) return;

    const handlePointerMove = (event: PointerEvent) => {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-analytics-column-id]');
      const targetId = target?.dataset.analyticsColumnId;
      if (!targetId || targetId === draggedColumnId) return;

      didDragColumnRef.current = true;
      setDraftColumnOrder(current => {
        const next = [...current];
        const from = next.indexOf(draggedColumnId);
        const to = next.indexOf(targetId);
        if (from === -1 || to === -1) return current;
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    };

    const handlePointerUp = () => {
      setDraggedColumnId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggedColumnId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [groupBy, pageSize, appliedColumnFilterValues, appliedRangeFilters, sortState]);

  const orderedColumns = orderAnalyticsColumns(ANALYTICS_COLUMNS, normalizeAnalyticsColumnOrder(columnOrder, pinnedColumnIds)).filter(column =>
    visibleColumnIds.includes(String(column.id))
  );

  const stickyOffsets = useMemo(() => {
    let left = 0;
    const offsets = new Map<string, number>();
    orderedColumns.forEach(column => {
      const columnId = String(column.id);
      if (!pinnedColumnIds.includes(columnId)) return;
      offsets.set(columnId, left);
      left += getAnalyticsColumnWidth(column);
    });
    return offsets;
  }, [orderedColumns, pinnedColumnIds]);

  const filterableValueOptions = useMemo(() => {
    const options = new Map<string, string[]>();
    ANALYTICS_COLUMNS.forEach(column => {
      const values = Array.from(
        new Set(
          rows
            .map(row => String(getAnalyticsComparableValue(row, column.id) ?? '—').trim() || '—')
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'ru'));
      options.set(String(column.id), values);
    });
    return options;
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(row =>
      ANALYTICS_COLUMNS.every(column => {
        const columnId = String(column.id);
        const valueFilters = appliedColumnFilterValues[columnId];
        if (valueFilters?.length) {
          const rawValue = String(getAnalyticsComparableValue(row, column.id) ?? '—').trim() || '—';
          if (!valueFilters.includes(rawValue)) return false;
        }

        const rangeFilter = appliedRangeFilters[columnId];
        if (rangeFilter && (rangeFilter.min || rangeFilter.max)) {
          const numericValue = Number(getAnalyticsComparableValue(row, column.id));
          if (!Number.isFinite(numericValue)) return false;
          if (rangeFilter.min !== '' && numericValue < Number(rangeFilter.min)) return false;
          if (rangeFilter.max !== '' && numericValue > Number(rangeFilter.max)) return false;
        }

        return true;
      })
    );
  }, [appliedColumnFilterValues, appliedRangeFilters, rows]);

  const sortedRows = useMemo(() => {
    if (!sortState.columnId || !sortState.direction) return filteredRows;

    return [...filteredRows].sort((left, right) => {
      const leftValue = getAnalyticsComparableValue(left, sortState.columnId);
      const rightValue = getAnalyticsComparableValue(right, sortState.columnId);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortState.direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      const safeLeft = String(leftValue ?? '');
      const safeRight = String(rightValue ?? '');
      const compared = safeLeft.localeCompare(safeRight, 'ru', { numeric: true, sensitivity: 'base' });
      return sortState.direction === 'asc' ? compared : -compared;
    });
  }, [filteredRows, sortState]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const exportTable = (mode: 'article' | 'barcode') => {
    const headers = orderedColumns
      .map(column => (column.id === 'article' ? (mode === 'barcode' ? 'Штрихкод' : column.label) : column.label))
      .join(',');
    const allRows = sortedRows
      .map(row =>
        orderedColumns
          .map(column => {
            if (column.id === 'article') {
              const identifier = mode === 'barcode' ? getAnalyticsBarcode(row) : row.productName;
              return `"${String(identifier).replace(/"/g, '""')}"`;
            }
            const value = column.exportValue ? column.exportValue(row) : getAnalyticsExportValue(row, column.id);
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\n');
    const blob = new Blob([`\uFEFF${headers}\n${allRows}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-table-${mode}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const columnSettingsColumns = orderAnalyticsColumns(ANALYTICS_COLUMNS, normalizeAnalyticsColumnOrder(draftColumnOrder, draftPinnedColumnIds)).filter(column =>
    column.label.toLowerCase().includes(columnSearch.trim().toLowerCase())
  );

  const openColumnMenu = (columnId: string, anchor: HTMLElement) => {
    setOpenColumnMenuId(current => {
      if (current === columnId) {
        setColumnMenuPosition(null);
        return null;
      }

      setColumnMenuSearch('');
      setDraftColumnFilterValues(appliedColumnFilterValues[columnId] ?? []);
      setDraftRangeFilter(appliedRangeFilters[columnId] ?? { min: '', max: '' });
      const rect = anchor.getBoundingClientRect();
      setColumnMenuPosition({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 304),
      });
      return columnId;
    });
  };

  const applyColumnMenu = (columnId: string) => {
    setAppliedColumnFilterValues(current => ({
      ...current,
      [columnId]: draftColumnFilterValues,
    }));
    setAppliedRangeFilters(current => ({
      ...current,
      [columnId]: draftRangeFilter,
    }));
    setOpenColumnMenuId(null);
    setColumnMenuPosition(null);
  };

  const resetColumnMenu = (columnId: string) => {
    setDraftColumnFilterValues([]);
    setDraftRangeFilter({ min: '', max: '' });
    setAppliedColumnFilterValues(current => {
      const next = { ...current };
      delete next[columnId];
      return next;
    });
    setAppliedRangeFilters(current => {
      const next = { ...current };
      delete next[columnId];
      return next;
    });
    setColumnMenuSearch('');
    if (sortState.columnId === columnId) {
      setSortState({ columnId: null, direction: null });
    }
    setOpenColumnMenuId(null);
    setColumnMenuPosition(null);
  };

  const openColumnSettings = () => {
    setDraftColumnOrder(normalizeAnalyticsColumnOrder(columnOrder, pinnedColumnIds));
    setDraftVisibleColumnIds(visibleColumnIds);
    setDraftPinnedColumnIds(pinnedColumnIds);
    setColumnSearch('');
    setIsColumnSettingsOpen(true);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900">Аналитическая таблица</div>
          <SectionAlias alias="analytics-table" />
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <ToolbarSelect
              label="Группировка"
              value={groupBy}
              onChange={value => setGroupBy(value as AnalyticsGroupBy)}
              options={[{ value: 'product', label: 'По товару' }]}
            />
            <ToolbarSelect
              label=""
              value={sourceTable}
              onChange={setSourceTable}
              options={[{ value: 'product-reporting', label: 'Товарный отчет' }]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(current => !current)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Экспорт</span>
                <ChevronDown size={14} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isExportMenuOpen && (
                <div className="absolute right-0 top-full z-[95] mt-2 min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => exportTable('article')}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Экспорт по артикулу
                  </button>
                  <button
                    type="button"
                    onClick={() => exportTable('barcode')}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Экспорт по штрихкоду
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={openColumnSettings}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Настройки колонок
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-visible">
        <div className="max-h-[720px] overflow-auto">
          <table className="min-w-[1600px] w-full table-auto text-xs">
            <thead className="sticky top-0 z-30 bg-white">
              <tr className="border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                {orderedColumns.map(column => (
                  <th
                    key={String(column.id)}
                    className={`whitespace-normal break-words border-b border-r border-slate-200 px-2 py-2 align-top text-[11px] font-semibold uppercase leading-4 tracking-wide text-slate-500 ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    } ${stickyOffsets.has(String(column.id)) ? 'sticky z-20 bg-slate-50/95' : ''}`}
                    style={
                      stickyOffsets.has(String(column.id))
                        ? {
                            left: stickyOffsets.get(String(column.id)),
                            width: getAnalyticsColumnWidth(column),
                            minWidth: getAnalyticsColumnWidth(column),
                            maxWidth: getAnalyticsColumnWidth(column),
                          }
                        : { maxWidth: getAnalyticsColumnWidth(column) }
                    }
                  >
                    <div className={`relative flex ${column.align === 'right' ? 'justify-end' : ''}`}>
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          openColumnMenu(String(column.id), event.currentTarget);
                        }}
                        className={`inline-flex w-full max-w-full items-start gap-1 rounded-lg px-1.5 py-1 text-left leading-4 transition-colors hover:bg-white ${
                          openColumnMenuId === String(column.id) ||
                          sortState.columnId === String(column.id) ||
                          (appliedColumnFilterValues[String(column.id)]?.length ?? 0) > 0 ||
                          appliedRangeFilters[String(column.id)]?.min ||
                          appliedRangeFilters[String(column.id)]?.max
                            ? 'bg-white text-slate-700 shadow-sm ring-1 ring-blue-200'
                            : 'text-slate-500'
                        }`}
                        aria-label={`Сортировка и фильтр колонки ${column.label}`}
                      >
                        <span className="line-clamp-2 min-w-0 break-words">
                          {column.label}
                          {column.unit && <span className="ml-1 whitespace-nowrap text-slate-400">{column.unit}</span>}
                        </span>
                        {sortState.columnId === String(column.id) && sortState.direction === 'asc' && <ArrowUpWideNarrow size={12} className="text-blue-600" />}
                        {sortState.columnId === String(column.id) && sortState.direction === 'desc' && <ArrowDownWideNarrow size={12} className="text-blue-600" />}
                        {(appliedColumnFilterValues[String(column.id)]?.length ?? 0) > 0 && <FilterIcon className="text-blue-600" />}
                        <ChevronDown size={12} className="text-slate-400" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={`analytics-loading-${index}`}>
                    {orderedColumns.map(column => (
                      <td
                        key={`${String(column.id)}-${index}`}
                        className={`border-r border-slate-100 px-2 py-1.5 ${stickyOffsets.has(String(column.id)) ? 'sticky z-20 bg-white' : ''}`}
                        style={
                          stickyOffsets.has(String(column.id))
                            ? {
                                left: stickyOffsets.get(String(column.id)),
                                width: getAnalyticsColumnWidth(column),
                                minWidth: getAnalyticsColumnWidth(column),
                                maxWidth: getAnalyticsColumnWidth(column),
                              }
                            : undefined
                        }
                      >
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={orderedColumns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                    Нет данных товарного отчета для выбранных фильтров.
                  </td>
                </tr>
              ) : (
                <>
                  {totalRow && (
                    <AnalyticsTableRowView row={totalRow} columns={orderedColumns} stickyOffsets={stickyOffsets} formatCell={formatAnalyticsCell} isTotal />
                  )}
                  {pageRows.map(row => (
                    <AnalyticsTableRowView key={row.id} row={row} columns={orderedColumns} stickyOffsets={stickyOffsets} formatCell={formatAnalyticsCell} />
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {openColumnMenuId && columnMenuPosition && (
        <div
          ref={columnMenuRef}
          className="fixed z-[140]"
          style={{ top: columnMenuPosition.top, left: columnMenuPosition.left }}
        >
          <AnalyticsColumnMenu
            column={orderedColumns.find(column => String(column.id) === openColumnMenuId) ?? orderedColumns[0]}
            rows={rows}
            sortState={sortState}
            search={columnMenuSearch}
            onSearchChange={setColumnMenuSearch}
            filterOptions={filterableValueOptions.get(openColumnMenuId) ?? []}
            selectedValues={draftColumnFilterValues}
            onSelectedValuesChange={setDraftColumnFilterValues}
            rangeFilter={draftRangeFilter}
            onRangeChange={setDraftRangeFilter}
            onSortChange={direction => setSortState({ columnId: openColumnMenuId, direction })}
            onApply={() => applyColumnMenu(openColumnMenuId)}
            onReset={() => resetColumnMenu(openColumnMenuId)}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button
            type="button"
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={safePage === 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`h-8 min-w-8 rounded-lg px-2 text-sm transition-colors ${
                  safePage === page ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            disabled={safePage === totalPages}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Размер страницы</span>
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none"
          >
            {[10, 25, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {isColumnSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={e => e.target === e.currentTarget && setIsColumnSettingsOpen(false)}>
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Настройки колонок (Исходная таблица)</h2>
                <p className="mt-1 text-sm text-slate-500">Выбрано: {draftVisibleColumnIds.length} из {ANALYTICS_COLUMNS.length}</p>
              </div>
              <button type="button" onClick={() => setIsColumnSettingsOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftVisibleColumnIds(getDefaultAnalyticsColumnIds())}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                  >
                    Выбрать все
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftVisibleColumnIds(getDefaultAnalyticsColumnIds());
                      setDraftColumnOrder(getDefaultAnalyticsColumnIds());
                      setDraftPinnedColumnIds(DEFAULT_PINNED_ANALYTICS_COLUMN_IDS);
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                  >
                    Сбросить
                  </button>
                </div>
                <input
                  value={columnSearch}
                  onChange={e => setColumnSearch(e.target.value)}
                  placeholder="Поиск колонок..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none sm:max-w-xs"
                />
              </div>
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {columnSettingsColumns.map(column => (
                  <div
                    key={String(column.id)}
                    data-analytics-column-id={String(column.id)}
                    onClick={() => {
                      if (didDragColumnRef.current) {
                        didDragColumnRef.current = false;
                        return;
                      }
                      setDraftVisibleColumnIds(current =>
                        current.includes(String(column.id))
                          ? current.filter(id => id !== String(column.id))
                          : [...current, String(column.id)]
                      );
                    }}
                    className={`flex cursor-pointer select-none items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-slate-50 ${
                      draggedColumnId === String(column.id) ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onPointerDown={event => {
                        event.stopPropagation();
                        didDragColumnRef.current = false;
                        setDraggedColumnId(String(column.id));
                      }}
                      onClick={event => event.stopPropagation()}
                      className="cursor-grab rounded-md p-1 text-slate-400 active:cursor-grabbing"
                    >
                      <GripVertical size={15} />
                    </button>
                    <div className="flex-1 text-sm text-slate-700">{column.label}</div>
                    <button
                      type="button"
                      disabled={!draftPinnedColumnIds.includes(String(column.id)) && draftPinnedColumnIds.length >= MAX_PINNED_ANALYTICS_COLUMNS}
                      onClick={event => {
                        event.stopPropagation();
                        setDraftPinnedColumnIds(current =>
                          current.includes(String(column.id))
                            ? current.filter(id => id !== String(column.id))
                            : [...current, String(column.id)]
                        );
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                        draftPinnedColumnIds.includes(String(column.id))
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                      title={
                        !draftPinnedColumnIds.includes(String(column.id)) && draftPinnedColumnIds.length >= MAX_PINNED_ANALYTICS_COLUMNS
                          ? `Можно закрепить до ${MAX_PINNED_ANALYTICS_COLUMNS} колонок`
                          : undefined
                      }
                    >
                      <Pin size={12} />
                      {draftPinnedColumnIds.includes(String(column.id)) ? 'Закреплено' : 'Закрепить'}
                    </button>
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        setDraftVisibleColumnIds(current =>
                          current.includes(String(column.id))
                            ? current.filter(id => id !== String(column.id))
                            : [...current, String(column.id)]
                        );
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                        draftVisibleColumnIds.includes(String(column.id)) ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          draftVisibleColumnIds.includes(String(column.id)) ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  const nextPinned = normalizeAnalyticsPinnedColumns(draftPinnedColumnIds);
                  setColumnOrder(normalizeAnalyticsColumnOrder(draftColumnOrder, nextPinned));
                  setVisibleColumnIds(draftVisibleColumnIds);
                  setPinnedColumnIds(nextPinned);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
              >
                Сохранить настройки
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextPinned = normalizeAnalyticsPinnedColumns(draftPinnedColumnIds);
                  setColumnOrder(normalizeAnalyticsColumnOrder(draftColumnOrder, nextPinned));
                  setVisibleColumnIds(draftVisibleColumnIds);
                  setPinnedColumnIds(nextPinned);
                  setIsColumnSettingsOpen(false);
                }}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"
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

function ToolbarSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const currentOption = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(current => !current)}
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-white"
      >
        <span className="font-medium">{label}</span>
        <span className="text-slate-800">{currentOption?.label}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-[80] mt-2 min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                option.value === value ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function AnalyticsColumnMenu({
  column,
  rows,
  sortState,
  search,
  onSearchChange,
  filterOptions,
  selectedValues,
  onSelectedValuesChange,
  rangeFilter,
  onRangeChange,
  onSortChange,
  onApply,
  onReset,
}: {
  column: AnalyticsColumnDefinition;
  rows: AnalyticsTableRow[];
  sortState: AnalyticsSortState;
  search: string;
  onSearchChange: (value: string) => void;
  filterOptions: string[];
  selectedValues: string[];
  onSelectedValuesChange: (values: string[]) => void;
  rangeFilter: AnalyticsRangeFilterState;
  onRangeChange: (value: AnalyticsRangeFilterState) => void;
  onSortChange: (direction: AnalyticsSortDirection) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const numericColumn = rows.some(row => typeof getAnalyticsComparableValue(row, column.id) === 'number');
  const filteredOptions = filterOptions.filter(option => option.toLowerCase().includes(search.trim().toLowerCase()));
  const allSelected = filteredOptions.length > 0 && filteredOptions.every(option => selectedValues.includes(option));
  const sortActive = sortState.columnId === String(column.id) ? sortState.direction : null;

  return (
    <div className="w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{column.label}</div>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onSortChange('asc')}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${sortActive === 'asc' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <span>Сортировать по возрастанию</span>
          <ArrowUpWideNarrow size={14} />
        </button>
        <button
          type="button"
          onClick={() => onSortChange('desc')}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${sortActive === 'desc' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <span>Сортировать по убыванию</span>
          <ArrowDownWideNarrow size={14} />
        </button>
      </div>

      {numericColumn ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="mb-2 text-xs font-medium text-slate-500">Диапазон значений</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={rangeFilter.min}
              onChange={event => onRangeChange({ ...rangeFilter, min: event.target.value })}
              placeholder="От"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
            />
            <input
              value={rangeFilter.max}
              onChange={event => onRangeChange({ ...rangeFilter, max: event.target.value })}
              placeholder="До"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <input
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Поиск"
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
          />
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  onSelectedValuesChange(allSelected ? selectedValues.filter(value => !filteredOptions.includes(value)) : [...new Set([...selectedValues, ...filteredOptions])])
                }
              />
              Выбрать все
            </label>
            {filteredOptions.map(option => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() =>
                    onSelectedValuesChange(
                      selectedValues.includes(option)
                        ? selectedValues.filter(value => value !== option)
                        : [...selectedValues, option]
                    )
                  }
                />
                <span className="truncate">{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onApply} className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
          Применить
        </button>
        <button type="button" onClick={onReset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
          Сбросить
        </button>
      </div>
    </div>
  );
}

function normalizeAnalyticsPinnedColumns(pinnedIds: string[]) {
  const knownIds = new Set(getDefaultAnalyticsColumnIds());
  return Array.from(
    new Set(pinnedIds.filter(id => knownIds.has(id)))
  ).slice(0, MAX_PINNED_ANALYTICS_COLUMNS);
}

function normalizeAnalyticsColumnOrder(orderedIds: string[], pinnedIds: string[] = []) {
  const defaultIds = getDefaultAnalyticsColumnIds();
  const knownIds = new Set(defaultIds);
  const normalizedPinnedIds = normalizeAnalyticsPinnedColumns(pinnedIds);
  const restIds = orderedIds.filter(id => knownIds.has(id) && !normalizedPinnedIds.includes(id));
  const missingIds = defaultIds.filter(id => !normalizedPinnedIds.includes(id) && !restIds.includes(id));
  return [...normalizedPinnedIds, ...restIds, ...missingIds];
}

function orderAnalyticsColumns(columns: AnalyticsColumnDefinition[], orderedIds: string[]) {
  const rank = new Map(normalizeAnalyticsColumnOrder(orderedIds).map((id, index) => [id, index]));
  return [...columns].sort((left, right) => (rank.get(String(left.id)) ?? 999) - (rank.get(String(right.id)) ?? 999));
}

function groupMetricDefinitions(metricDefs: WidgetDefinition[]) {
  const groups = METRIC_COLUMN_GROUPS.map(group => ({ ...group, metrics: [] as WidgetDefinition[] }));
  const byGroupId = new Map(groups.map(group => [group.id, group.metrics]));

  metricDefs.forEach(metric => {
    const groupId = METRIC_COLUMN_GROUP_BY_WIDGET_ID.get(metric.id) ?? 'indicators';
    byGroupId.get(groupId)?.push(metric);
  });

  return groups;
}

function MetricColumnsView({
  groups,
  isLoading,
  isPlaceholder,
}: {
  groups: ReturnType<typeof groupMetricDefinitions>;
  isLoading: boolean;
  isPlaceholder: boolean;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      {groups.map(group => (
        <section key={group.id} className="min-w-0">
          <div className="mb-2 flex h-9 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3">
            <h2 className="text-sm font-semibold text-slate-900">{group.title}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              {group.metrics.length}
            </span>
          </div>
          <div className="space-y-2">
            {group.metrics.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-400">Нет выбранных метрик</div>
            ) : (
              group.metrics.map(metric => (
                <MetricColumnRow
                  key={metric.id}
                  def={metric}
                  isLoading={isLoading}
                  isPlaceholder={isPlaceholder}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function MetricColumnRow({
  def,
  isLoading,
  isPlaceholder,
}: {
  def: WidgetDefinition;
  isLoading: boolean;
  isPlaceholder: boolean;
}) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="mb-2 h-3 w-2/5 rounded bg-slate-100" />
        <div className="h-5 w-3/5 rounded bg-slate-100" />
      </div>
    );
  }

  if (isPlaceholder || !def.metric || !def.format) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-3">
        <div className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{def.title}</div>
        <div className="mt-1 text-lg font-bold text-slate-300">--</div>
      </div>
    );
  }

  const isPositive = def.metric.trend === 'up';
  const isNegative = def.metric.trend === 'down';
  const isNeutral = def.metric.trend === 'neutral';
  const goodTrend = def.invertColors ? isNegative : isPositive;
  const badTrend = def.invertColors ? isPositive : isNegative;
  const trendColor = goodTrend ? 'text-emerald-700' : badTrend ? 'text-red-600' : 'text-slate-500';
  const tone = getWidgetTone(def);
  const rowTone =
    tone === 'positive'
      ? 'border-emerald-100 bg-emerald-50/45 shadow-emerald-50'
      : tone === 'negative'
      ? 'border-rose-100 bg-rose-50/45 shadow-rose-50'
      : 'border-slate-200 bg-white shadow-slate-100';
  const deltaValue = def.metric.delta ?? 0;
  const deltaPercentValue = def.metric.deltaPercent ?? 0;
  const shouldHideDeltaPercent = def.hideDeltaPercent || !Number.isFinite(def.metric.previous) || def.metric.previous === 0;
  const deltaStr = def.formatDelta
    ? def.formatDelta(deltaValue)
    : `${deltaValue >= 0 ? '+' : ''}${deltaValue.toFixed(1)}`;
  const pctStr = shouldHideDeltaPercent ? '--' : `${deltaPercentValue >= 0 ? '+' : ''}${deltaPercentValue.toFixed(2)}%`;

  return (
    <div className={`rounded-lg border px-3 py-2.5 shadow-sm transition hover:shadow-md ${rowTone}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-slate-700">{def.title}</div>
          <div className="mt-1 truncate text-[11px] font-medium text-slate-500">
            {(def.formatPrevious ?? def.format)(def.metric.previous)}
          </div>
        </div>
        <div className="text-right">
          <div className="whitespace-nowrap text-sm font-bold text-slate-950">{def.format(def.metric.current)}</div>
          <div className={`mt-1 whitespace-nowrap text-[11px] font-semibold ${trendColor}`}>{deltaStr}</div>
        </div>
        <div className="w-16 text-right">
          <div className="whitespace-nowrap text-sm font-bold text-slate-950">{pctStr}</div>
          <div className={`mt-1 inline-flex items-center justify-end gap-1 text-[11px] font-semibold ${trendColor}`}>
            {isNeutral ? null : isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <span>{def.metric.trend === 'neutral' ? '--' : def.metric.trend === 'up' ? 'рост' : 'сниж.'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

