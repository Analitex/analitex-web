import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFilters } from '../context/FilterContext';
import { useReportMode } from '../context/ReportModeContext';
import { usePlatform } from '../context/PlatformContext';
import { useSalesData } from '../hooks/useSalesData';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { useInventoryData } from '../hooks/useInventoryData';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { MetricCard } from '../components/dashboard/MetricCard';
import { formatCurrency, formatNumber, sumRecords } from '../lib/calculations';
import { apiRequest } from '../lib/api';
import { Activity, ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronDown, ChevronLeft, ChevronRight, GripVertical, Info, Search, Settings2, TrendingUp, X } from 'lucide-react';
import type { DashboardMetrics, Product, SalesRecord } from '../types';
import { PRODUCT_REPORT_METRICS_CATALOG } from '../lib/platformCatalog';

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

type ProductReportingOverviewResponse = {
  summary?: Record<string, unknown> | null;
  topProducts?: Array<{
    dimension?: {
      productName?: string | null;
      vendorCode?: string | null;
      marketplaceArticle?: string | null;
      brand?: string | null;
      category?: string | null;
      accountName?: string | null;
      marketplace?: string | null;
    } | null;
    metrics?: Record<string, number | null> | null;
  }> | null;
  meta?: { updatedAt?: string | null; isPartial?: boolean | null } | null;
};

const TOP_MARGIN_OPTIONS = [10, 50, 100] as const;
const ANALYTICS_TABLE_SETTINGS_KEY = 'dashboard-analytics-table-settings';
const FINANCIAL_TOTAL_PAID_WIDGET_ID = 'metric-total-paid';

const ANALYTICS_GROUP_OPTIONS = [
  { value: 'product', label: 'По товару' },
  { value: 'brand', label: 'По бренду' },
  { value: 'store', label: 'По магазину' },
  { value: 'category', label: 'По категории' },
  { value: 'group', label: 'По группе' },
] as const;

type AnalyticsGroupBy = (typeof ANALYTICS_GROUP_OPTIONS)[number]['value'];
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

interface AnalyticsTableRow {
  id: string;
  photoLabel: string;
  articleLabel: string;
  productName: string;
  marketplace: string;
  store: string;
  brand: string;
  category: string;
  group: string;
  marketplaceArticleId: string;
  avgCost: number;
  operationalExpense: number;
  otherDeduction: number;
  avgPriceBeforeDiscount: number;
  avgSalePrice: number;
  revenue: number;
  turnoverSales: number;
  turnoverOrders: number;
  sales: number;
  toTransfer: number;
  returns: number;
  costOfSales: number;
  fines: number;
  ordersCount: number;
  ordersAmount: number;
  commission: number;
  wbFinalReward: number;
  compensation: number;
  averageLogisticsCost: number;
  capitalizationByCost: number;
  capitalizationByRetail: number;
  capitalizationOwnWarehouse: number;
  gmroi: number;
  gmroiYear: number;
  logisticsCost: number;
  storage: number;
  rejectionsAndReturns: number;
  totalSales: number;
  buyoutRate: number;
  averageProfitPerPiece: number;
  taxes: number;
  taxBase: number;
  profit: number;
  profitWithoutExpense: number;
  roi: number;
  shareOfRevenue: number;
  marginality: number;
  marginalityWithoutExpense: number;
  advertisingExpense: number;
  drrSales: number;
  advertisingExpenseBonus: number;
  drrBonus: number;
  advertisingExpenseTotal: number;
  drrTotal: number;
  drrOrders: number;
  acceptanceSum: number;
  abcProfit: string;
  abcRevenue: string;
  stockBalanceMP: number;
  stockBalanceOwn: number;
  stockBalanceToClient: number;
  stockBalanceFromClient: number;
  salesUnits: number;
}

interface AnalyticsColumnDefinition {
  id: keyof AnalyticsTableRow | 'photo' | 'article';
  label: string;
  align?: 'left' | 'right';
  sticky?: 'photo' | 'article';
  render?: (row: AnalyticsTableRow) => ReactNode;
  exportValue?: (row: AnalyticsTableRow) => string | number;
}

const ANALYTICS_COLUMNS: AnalyticsColumnDefinition[] = [
  { id: 'photo', label: 'Фото', sticky: 'photo', render: row => <MetricLegendThumb label={row.photoLabel} color={getMarketplaceColor(row.marketplace)} /> },
  {
    id: 'article',
    label: 'Артикул',
    sticky: 'article',
    render: row => (
      <div className="min-w-[220px]">
        <a href={`#${row.id}`} className="font-medium text-slate-800 underline-offset-2 hover:text-blue-600 hover:underline">{row.productName}</a>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
          <span className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: `${getMarketplaceColor(row.marketplace)}22`, color: getMarketplaceColor(row.marketplace) }}>
            {getMarketplaceShort(row.marketplace)}
          </span>
          <span>{row.articleLabel}</span>
        </div>
      </div>
    ),
    exportValue: row => row.productName,
  },
  { id: 'store', label: 'Магазин' },
  { id: 'brand', label: 'Бренд' },
  { id: 'category', label: 'Категория' },
  { id: 'group', label: 'Группа' },
  {
    id: 'marketplaceArticleId',
    label: 'Артикул маркетплейса',
    render: row => <a href={`#mp-${row.marketplaceArticleId}`} className="text-blue-600 hover:underline">{row.marketplaceArticleId}</a>,
    exportValue: row => row.marketplaceArticleId,
  },
  { id: 'avgCost', label: 'Средняя себестоимость', align: 'right' },
  { id: 'operationalExpense', label: 'Операционные расходы', align: 'right' },
  { id: 'otherDeduction', label: 'Прочие удержания', align: 'right' },
  { id: 'avgPriceBeforeDiscount', label: 'Средн. цена до скидок МП', align: 'right' },
  { id: 'avgSalePrice', label: 'Средн. цена продажи', align: 'right' },
  { id: 'revenue', label: 'Реализация (сумма продаж до СПП)', align: 'right' },
  { id: 'turnoverSales', label: 'Оборачиваемость по прод.', align: 'right' },
  { id: 'turnoverOrders', label: 'Оборачиваемость по зак.', align: 'right' },
  { id: 'sales', label: 'Продажи', align: 'right' },
  { id: 'toTransfer', label: 'К перечислению', align: 'right' },
  { id: 'returns', label: 'Возвраты', align: 'right' },
  { id: 'costOfSales', label: 'Себестоимость продаж', align: 'right' },
  { id: 'fines', label: 'Штрафы', align: 'right' },
  { id: 'ordersCount', label: 'Заказы шт.', align: 'right' },
  { id: 'ordersAmount', label: 'Заказы ₽', align: 'right' },
  { id: 'commission', label: 'Комиссия', align: 'right' },
  { id: 'wbFinalReward', label: 'Итоговое вознаграждение ВБ', align: 'right' },
  { id: 'compensation', label: 'Компенсация', align: 'right' },
  { id: 'averageLogisticsCost', label: 'Ср. стоимость логистики', align: 'right' },
  { id: 'capitalizationByCost', label: 'Капитализация по себеc.', align: 'right' },
  { id: 'capitalizationByRetail', label: 'Капитализация по розн.', align: 'right' },
  { id: 'capitalizationOwnWarehouse', label: 'Капитализ. на моих складах', align: 'right' },
  { id: 'gmroi', label: 'GMROI', align: 'right' },
  { id: 'gmroiYear', label: 'Годовой GMROI', align: 'right' },
  { id: 'logisticsCost', label: 'Стоимость логистики', align: 'right' },
  { id: 'storage', label: 'Хранение', align: 'right' },
  { id: 'rejectionsAndReturns', label: 'Количество отказов + возвраты', align: 'right' },
  { id: 'totalSales', label: 'Всего продаж', align: 'right' },
  { id: 'buyoutRate', label: 'Процент выкупа', align: 'right' },
  { id: 'averageProfitPerPiece', label: 'Средняя прибыль на 1 шт', align: 'right' },
  { id: 'taxes', label: 'Налоги', align: 'right' },
  { id: 'taxBase', label: 'Налоговая база', align: 'right' },
  { id: 'profit', label: 'Прибыль', align: 'right' },
  { id: 'profitWithoutExpense', label: 'Прибыль без опер. расх.', align: 'right' },
  { id: 'roi', label: 'ROI', align: 'right' },
  { id: 'shareOfRevenue', label: 'Доля в общей выручке', align: 'right' },
  { id: 'marginality', label: 'Маржинальность', align: 'right' },
  { id: 'marginalityWithoutExpense', label: 'Маржинальность без опер. расх.', align: 'right' },
  { id: 'advertisingExpense', label: 'Расходы на рекламу', align: 'right' },
  { id: 'drrSales', label: 'ДРР по продажам, %', align: 'right' },
  { id: 'advertisingExpenseBonus', label: 'Расходы на рекламу с бонусов', align: 'right' },
  { id: 'drrBonus', label: 'ДРР бонусов', align: 'right' },
  { id: 'advertisingExpenseTotal', label: 'Общие расходы на рекламу', align: 'right' },
  { id: 'drrTotal', label: 'Общая ДРР', align: 'right' },
  { id: 'drrOrders', label: 'ДРР по заказам, %', align: 'right' },
  { id: 'acceptanceSum', label: 'Платная приемка', align: 'right' },
  { id: 'abcProfit', label: 'ABC-анализ по чистой прибыли' },
  { id: 'abcRevenue', label: 'ABC-анализ по выручке' },
  { id: 'stockBalanceMP', label: 'Остатки на складах МП, шт', align: 'right' },
  { id: 'stockBalanceOwn', label: 'Остатки на моих складах, шт', align: 'right' },
  { id: 'stockBalanceToClient', label: 'Остатки в пути к клиенту, шт', align: 'right' },
  { id: 'stockBalanceFromClient', label: 'Остатки в пути от клиента, шт', align: 'right' },
  { id: 'salesUnits', label: 'Продажи в штуках', align: 'right' },
];

export function DashboardPage() {
  const { filters } = useFilters();
  const { reportMode } = useReportMode();
  const { session } = usePlatform();
  const { records, prevRecords, products, loading } = useSalesData(filters);
  const { totalValue, avgTurnover } = useInventoryData(filters, products);
  const analytics = useAnalyticsWorkspaceData();
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
  const [productReporting, setProductReporting] = useState<ProductReportingOverviewResponse | null>(null);
  const [productReportingLoading, setProductReportingLoading] = useState(false);
  const [productReportingError, setProductReportingError] = useState<string | null>(null);

  const totalSalesCount = useMemo(() => records.reduce((s, r) => s + r.sales, 0), [records]);
  const revenueCurrent = metrics.revenue.current;
  const widgetDocuments = useMemo(
    () => buildWidgetDocuments(records, revenueCurrent),
    [records, revenueCurrent]
  );
  const productReportingRequest = useMemo(
    () => ({
      dateFrom: filters.dateStart,
      dateTo: filters.dateEnd,
      mode: reportMode === 'financial' ? 'Financial' : 'Management',
      accountIds: analytics.accountIds,
      filters: {
        productIds: filters.sku,
        brandIds: filters.brand,
        categoryIds: filters.category,
      },
      summaryMetrics: [...PRODUCT_REPORT_METRICS_CATALOG].slice(0, 5),
      topProductMetrics: [...PRODUCT_REPORT_METRICS_CATALOG].slice(0, 4),
      topProductsSortMetric: 'sales',
      topProductsSortDirection: 'Desc',
      topProductsLimit: 5,
    }),
    [analytics.accountIds, filters.brand, filters.category, filters.dateEnd, filters.dateStart, filters.sku, reportMode]
  );
  const formulaMetricValues = useMemo(
    () => buildFormulaMetricValues(metrics, records, prevRecords, totalValue),
    [metrics, records, prevRecords, totalValue]
  );

  useEffect(() => {
    if (!session?.accessToken || analytics.accountIds.length === 0) {
      setProductReporting(null);
      setProductReportingLoading(false);
      setProductReportingError(null);
      return;
    }

    let cancelled = false;

    const loadProductReporting = async () => {
      setProductReportingLoading(true);
      try {
        const response = await apiRequest<ProductReportingOverviewResponse>('/reporting/products/overview', {
          method: 'POST',
          token: session.accessToken,
          body: JSON.stringify(productReportingRequest),
        });

        if (cancelled) return;

        setProductReporting(response);
        setProductReportingError(null);
      } catch (error) {
        if (cancelled) return;
        setProductReporting(null);
        setProductReportingError(error instanceof Error ? error.message : 'Не удалось загрузить товарный отчет.');
      } finally {
        if (!cancelled) setProductReportingLoading(false);
      }
    };

    void loadProductReporting();

    return () => {
      cancelled = true;
    };
  }, [analytics.accountIds.length, productReportingRequest, session?.accessToken]);

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
      id: FINANCIAL_TOTAL_PAID_WIDGET_ID,
      title: 'Итого к оплате',
      metric: buildDerivedMetricValue(formulaMetricValues.totalPaid.current, formulaMetricValues.totalPaid.previous),
      format: (v: number) => formatCurrency(v),
      formatDelta: (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`,
      description: 'Сумма к перечислению на расчетный счет',
      section: 'metrics',
      faq: 'Сумма, которую селлер получит на расчетный счет от маркетплейса в режиме финансовой отчетности.',
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

  const availableWidgetDefs = useMemo(
    () =>
      widgetDefs.filter(widget =>
        reportMode === 'financial' ? true : widget.id !== FINANCIAL_TOTAL_PAID_WIDGET_ID
      ),
    [reportMode, widgetDefs]
  );
  const defaultWidgetIds = useMemo(() => availableWidgetDefs.map(widget => widget.id), [availableWidgetDefs]);
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
    availableWidgetDefs.some(widget => widget.id === id)
  );
  const visibleMetricDefs = orderedSelectedWidgetIds
    .map(id => availableWidgetDefs.find(widget => widget.id === id && widget.section === 'metrics'))
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
  const orderedWidgetDefs = orderWidgetDefinitions(availableWidgetDefs, draftWidgetIds);
  const filteredWidgetDefs = orderedWidgetDefs.filter(widget => {
    const search = widgetSearch.trim().toLowerCase();
    if (!search) return true;
    return `${widget.title} ${widget.description}`.toLowerCase().includes(search);
  });

  const openWidgetModal = useCallback(() => {
    setDraftWidgetIds(selectedWidgetIds);
    setSelectedProfileId(DEFAULT_WIDGET_PROFILE_ID);
    setWidgetSearch('');
    setProfileName('');
    setIsWidgetModalOpen(true);
  }, [selectedWidgetIds]);

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

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Live API snapshot</div>
            <p className="mt-1 text-sm text-slate-500">Backend summary for the selected period and active organization.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {analytics.accountIds.length > 0 ? `${analytics.accountIds.length} accounts` : 'No accounts'}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Sales', value: analytics.summary?.metrics?.sales ?? 0 },
            { label: 'Commission', value: analytics.summary?.metrics?.commission ?? 0 },
            { label: 'Logistics', value: analytics.summary?.metrics?.logistics ?? 0 },
            { label: 'Orders', value: analytics.summary?.metrics?.ordersCount ?? 0 },
            { label: 'Stock', value: analytics.summary?.metrics?.stockBalance ?? 0 },
          ].map(item => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {Number(item.value || 0).toLocaleString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
        {analytics.error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {analytics.error}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Product reporting overview</div>
            <p className="mt-1 text-sm text-slate-500">POST /api/v1/reporting/products/overview</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {productReportingLoading ? 'Loading' : productReporting?.meta?.isPartial ? 'Partial data' : 'Ready'}
          </div>
        </div>
        {productReportingError && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {productReportingError}
          </div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {(productReporting?.summary ? Object.entries(productReporting.summary).slice(0, 5) : PRODUCT_REPORT_METRICS_CATALOG.slice(0, 5).map(metric => [metric, 0] as const)).map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {Number(value ?? 0).toLocaleString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {(productReporting?.topProducts ?? []).length > 0 ? productReporting.topProducts!.slice(0, 5).map((item, index) => (
            <div key={`${item.dimension?.marketplaceArticle ?? item.dimension?.productName ?? index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-900">
                  {item.dimension?.productName ?? item.dimension?.marketplaceArticle ?? `Товар ${index + 1}`}
                </div>
                <div className="text-xs text-slate-500">
                  {[item.dimension?.vendorCode, item.dimension?.brand, item.dimension?.marketplace, item.dimension?.accountName]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {Object.entries(item.metrics ?? {}).slice(0, 3).map(([metric, value]) => (
                  <span key={metric} className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm">
                    {metric}: {Number(value ?? 0).toLocaleString('ru-RU')}
                  </span>
                ))}
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
              Товарные данные появятся после ответа backend.
            </div>
          )}
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
            alias="top-margin-articles"
            subtitle="Список товаров с наилучшей маржинальностью в выбранном периоде."
            items={visibleTopMarginArticles}
            limit={articleMarginLimit}
            onLimitChange={setArticleMarginLimit}
            emptyMessage="Для выбранных фильтров пока нет артикулов с продажами."
          />
          <MarginLeaderboardCard
            title="Топ маржинальных категорий"
            alias="top-margin-categories"
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

      {!loading && records.length > 0 && (
        <div className="mt-6">
          <AnalyticsDataSection records={records} products={products} />
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
  return buildDerivedMetricValue(current, previous);
}

function buildDerivedMetricValue(current: number, previous: number) {
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
  alias,
  subtitle,
  items,
  limit,
  onLimitChange,
  emptyMessage,
}: {
  title: string;
  alias: string;
  subtitle: string;
  items: MarginLeaderboardRow[];
  limit: number | 'all';
  onLimitChange: (value: number | 'all') => void;
  emptyMessage: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'circle' | 'list'>('circle');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOptionsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!optionsRef.current?.contains(event.target as Node)) {
        setIsOptionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOptionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOptionsOpen]);

  return (
    <div className="self-start rounded-xl border border-slate-200 bg-white p-5">
      <button
        type="button"
        onClick={() => setIsExpanded(current => !current)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>
          <SectionAlias alias={alias} />
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

            <div className="relative" ref={optionsRef}>
              <button
                type="button"
                onClick={() => setIsOptionsOpen(current => !current)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Параметры
                <ChevronDown size={14} className={`transition-transform ${isOptionsOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOptionsOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Диапазон
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onLimitChange('all');
                      setIsOptionsOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      limit === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Все
                  </button>
                  {TOP_MARGIN_OPTIONS.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        onLimitChange(option);
                        setIsOptionsOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        limit === option ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Топ {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              {emptyMessage}
            </div>
          ) : viewMode === 'circle' ? (
            <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
              <MarginPieChart
                items={items}
                hoveredItemId={hoveredItemId}
                onHoverChange={setHoveredItemId}
              />
              <div className="space-y-1.5 lg:pt-0.5">
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

function AnalyticsDataSection({
  records,
  products,
}: {
  records: SalesRecord[];
  products: Map<string, Product>;
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

  const initialSettings = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        order: ANALYTICS_COLUMNS.map(column => String(column.id)),
        visible: ANALYTICS_COLUMNS.map(column => String(column.id)),
      };
    }

    try {
      const raw = window.localStorage.getItem(ANALYTICS_TABLE_SETTINGS_KEY);
      if (!raw) {
        return {
          order: ANALYTICS_COLUMNS.map(column => String(column.id)),
          visible: ANALYTICS_COLUMNS.map(column => String(column.id)),
        };
      }

      const parsed = JSON.parse(raw) as { order?: string[]; visible?: string[] };
      return {
        order: parsed.order?.length ? parsed.order : ANALYTICS_COLUMNS.map(column => String(column.id)),
        visible: parsed.visible?.length ? parsed.visible : ANALYTICS_COLUMNS.map(column => String(column.id)),
      };
    } catch {
      return {
        order: ANALYTICS_COLUMNS.map(column => String(column.id)),
        visible: ANALYTICS_COLUMNS.map(column => String(column.id)),
      };
    }
  }, []);

  const [columnOrder, setColumnOrder] = useState<string[]>(initialSettings.order);
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(initialSettings.visible);
  const [draftColumnOrder, setDraftColumnOrder] = useState<string[]>(initialSettings.order);
  const [draftVisibleColumnIds, setDraftVisibleColumnIds] = useState<string[]>(initialSettings.visible);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      ANALYTICS_TABLE_SETTINGS_KEY,
      JSON.stringify({ order: columnOrder, visible: visibleColumnIds })
    );
  }, [columnOrder, visibleColumnIds]);

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

  const rows = useMemo(() => buildAnalyticsRows(records, products, groupBy), [records, products, groupBy]);
  useEffect(() => {
    setCurrentPage(1);
  }, [groupBy, pageSize, appliedColumnFilterValues, appliedRangeFilters, sortState]);

  const orderedColumns = orderAnalyticsColumns(ANALYTICS_COLUMNS, columnOrder).filter(column =>
    visibleColumnIds.includes(String(column.id))
  );

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

  const totalRow = useMemo(() => buildAnalyticsTotalRow(sortedRows), [sortedRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const exportTable = (mode: 'article' | 'barcode') => {
    const headers = orderedColumns
      .map(column => (column.id === 'article' ? (mode === 'barcode' ? 'Штрихкод' : column.label) : column.label))
      .join(',');
    const allRows = [totalRow, ...sortedRows]
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

  const columnSettingsColumns = orderAnalyticsColumns(ANALYTICS_COLUMNS, draftColumnOrder).filter(column =>
    column.label.toLowerCase().includes(columnSearch.trim().toLowerCase())
  );

  const moveDraftColumn = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setDraftColumnOrder(current => {
      const next = [...current];
      const from = next.indexOf(draggedId);
      const to = next.indexOf(targetId);
      if (from === -1 || to === -1) return current;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

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
    setDraftColumnOrder(columnOrder);
    setDraftVisibleColumnIds(visibleColumnIds);
    setColumnSearch('');
    setIsColumnSettingsOpen(true);
  };

  const stickyLeft = (column: AnalyticsColumnDefinition) => {
    if (column.sticky === 'photo') return 'left-0 z-20';
    if (column.sticky === 'article') return 'left-[72px] z-20';
    return '';
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
              options={ANALYTICS_GROUP_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
            />
            <ToolbarSelect
              label=""
              value={sourceTable}
              onChange={setSourceTable}
              options={[{ value: 'Исходная таблица', label: 'Исходная таблица' }]}
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

      <div className="overflow-visible">
        <div className="max-h-[720px] overflow-auto">
          <table className="min-w-[2200px] w-full text-sm">
            <thead className="sticky top-0 z-30 bg-white">
              <tr className="border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                {orderedColumns.map(column => (
                  <th
                    key={String(column.id)}
                    className={`whitespace-nowrap border-b border-slate-200 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    } ${column.sticky ? `sticky ${stickyLeft(column)} bg-slate-50/95` : ''}`}
                    style={column.sticky === 'photo' ? { width: 72, minWidth: 72 } : column.sticky === 'article' ? { width: 260, minWidth: 260 } : undefined}
                  >
                    <div className={`relative flex ${column.align === 'right' ? 'justify-end' : ''}`}>
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          openColumnMenu(String(column.id), event.currentTarget);
                        }}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white ${
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
                        <span>{column.label}</span>
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
              <AnalyticsTableRowView row={totalRow} columns={orderedColumns} stickyLeft={stickyLeft} isTotal />
              {pageRows.map(row => (
                <AnalyticsTableRowView key={row.id} row={row} columns={orderedColumns} stickyLeft={stickyLeft} />
              ))}
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
                    onClick={() => setDraftVisibleColumnIds(ANALYTICS_COLUMNS.map(column => String(column.id)))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                  >
                    Выбрать все
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftVisibleColumnIds(ANALYTICS_COLUMNS.map(column => String(column.id)));
                      setDraftColumnOrder(ANALYTICS_COLUMNS.map(column => String(column.id)));
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
                    draggable
                    onDragStart={event => {
                      setDraggedColumnId(String(column.id));
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(column.id));

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
                    onDragEnd={() => setDraggedColumnId(null)}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                      const draggedId = draggedColumnId || event.dataTransfer.getData('text/plain');
                      if (draggedId) moveDraftColumn(draggedId, String(column.id));
                      setDraggedColumnId(null);
                    }}
                    onClick={() =>
                      setDraftVisibleColumnIds(current =>
                        current.includes(String(column.id))
                          ? current.filter(id => id !== String(column.id))
                          : [...current, String(column.id)]
                      )
                    }
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-slate-50 ${
                      draggedColumnId === String(column.id) ? 'scale-[1.01] border-blue-300 bg-blue-50/60 opacity-70 shadow-lg' : 'border-slate-200'
                    }`}
                  >
                    <button type="button" onClick={event => event.stopPropagation()} className="cursor-grab rounded-md p-1 text-slate-400">
                      <GripVertical size={15} />
                    </button>
                    <div className="flex-1 text-sm text-slate-700">{column.label}</div>
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
                  setColumnOrder(draftColumnOrder);
                  setVisibleColumnIds(draftVisibleColumnIds);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
              >
                Сохранить настройки
              </button>
              <button
                type="button"
                onClick={() => {
                  setColumnOrder(draftColumnOrder);
                  setVisibleColumnIds(draftVisibleColumnIds);
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

function AnalyticsTableRowView({
  row,
  columns,
  stickyLeft,
  isTotal = false,
}: {
  row: AnalyticsTableRow;
  columns: AnalyticsColumnDefinition[];
  stickyLeft: (column: AnalyticsColumnDefinition) => string;
  isTotal?: boolean;
}) {
  return (
    <tr className={`${isTotal ? 'bg-slate-50' : 'hover:bg-slate-50'} transition-colors`}>
      {columns.map(column => {
        const content = column.render ? column.render(row) : formatAnalyticsCell(row, column.id);
        return (
          <td
            key={String(column.id)}
            className={`whitespace-nowrap border-b border-slate-100 px-3 py-3 align-middle ${
              column.align === 'right' ? 'text-right' : 'text-left'
            } ${column.sticky ? `sticky ${stickyLeft(column)} ${isTotal ? 'bg-slate-50 shadow-[6px_0_10px_-10px_rgba(15,23,42,0.35)]' : 'bg-white shadow-[6px_0_10px_-10px_rgba(15,23,42,0.18)]'}` : ''}`}
            style={column.sticky === 'photo' ? { width: 72, minWidth: 72 } : column.sticky === 'article' ? { width: 260, minWidth: 260 } : undefined}
          >
            {isTotal && column.id === 'article' ? (
              <div className="font-semibold text-slate-900">Итого за период</div>
            ) : column.id === 'photo' && isTotal ? null : content}
          </td>
        );
      })}
    </tr>
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
  const maxValue = Math.max(...items.map(item => Math.abs(item.percent)), 5);
  const axisMax = Math.ceil(maxValue / 5) * 5;
  const axisMarks = Array.from({ length: axisMax * 2 / 5 + 1 }, (_, index) => -axisMax + index * 5);

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
            <SectionAlias alias="revenue-structure" />
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
            <div className="space-y-1">
              {items.map(item => {
                const width = `${(Math.abs(item.percent) / axisMax) * 50}%`;

                return (
                  <div key={item.label} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <div className="truncate text-xs sm:text-sm text-slate-600">{item.label}</div>
                    <div className="relative h-7 overflow-hidden bg-slate-50/70 first:rounded-t-md last:rounded-b-md">
                      {axisMarks.map(mark => {
                        const position = ((mark + axisMax) / (axisMax * 2)) * 100;
                        return (
                          <div
                            key={mark}
                            className={`absolute inset-y-0 w-px -translate-x-1/2 ${
                              mark === 0 ? 'bg-slate-300' : 'bg-slate-200/80'
                            }`}
                            style={{ left: `${position}%` }}
                          />
                        );
                      })}
                      <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200/70" />
                      <div
                        className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md opacity-90"
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

            <div className="my-0.5 flex flex-col justify-between gap-1 text-right text-xs sm:text-sm text-slate-500">
              {items.map(item => (
                <div key={item.label} className="h-7 leading-7" style={{ color: item.color }}>
                  {formatCurrencyDetailed(item.value)}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-0 grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <div />
            <div className="border-t border-slate-200 pt-1">
              <div className="grid text-[10px] text-slate-400" style={{ gridTemplateColumns: `repeat(${axisMarks.length}, minmax(0, 1fr))` }}>
                {axisMarks.map(mark => (
                  <div
                    key={mark}
                    className={
                      mark === -axisMax
                        ? 'text-left'
                        : mark === axisMax
                        ? 'text-right'
                        : 'text-center'
                    }
                  >
                    {mark}%
                  </div>
                ))}
              </div>
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
      <div className="absolute left-0 top-full z-10 mt-2 hidden w-80 whitespace-pre-line rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm group-hover/tooltip:block">
        {text}
      </div>
    </div>
  );
}

function SectionAlias({ alias }: { alias: string }) {
  return (
    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
      {alias}
    </span>
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

function orderAnalyticsColumns(columns: AnalyticsColumnDefinition[], orderedIds: string[]) {
  const rank = new Map(orderedIds.map((id, index) => [id, index]));
  return [...columns].sort((left, right) => (rank.get(String(left.id)) ?? 999) - (rank.get(String(right.id)) ?? 999));
}

function getAnalyticsComparableValue(row: AnalyticsTableRow, columnId: AnalyticsColumnDefinition['id'] | string) {
  if (columnId === 'photo') return row.photoLabel;
  if (columnId === 'article') return row.productName;
  return row[columnId as keyof AnalyticsTableRow];
}

function getAnalyticsBarcode(row: AnalyticsTableRow) {
  const raw = row.marketplaceArticleId.replace(/\D/g, '');
  return raw ? `20${raw.padStart(11, '0').slice(0, 11)}` : `20${row.id.replace(/\D/g, '').padStart(11, '0').slice(0, 11)}`;
}

function buildAnalyticsRows(
  records: SalesRecord[],
  products: Map<string, Product>,
  groupBy: AnalyticsGroupBy
) {
  const groups = new Map<string, { rows: SalesRecord[]; products: Product[] }>();
  const revenueTotal = records.reduce((sum, record) => sum + record.revenue, 0) || 1;

  records.forEach(record => {
    const product = products.get(record.product_id);
    if (!product) return;
    const key = getAnalyticsGroupKey(product, groupBy);
    if (!groups.has(key)) {
      groups.set(key, { rows: [], products: [] });
    }
    groups.get(key)!.rows.push(record);
    if (!groups.get(key)!.products.some(item => item.id === product.id)) {
      groups.get(key)!.products.push(product);
    }
  });

  const rows = Array.from(groups.entries()).map(([key, value]) => {
    const summary = sumRecords(value.rows);
    const primaryProduct = value.products[0];
    const costOfSales = value.rows.reduce((sum, record) => sum + (products.get(record.product_id)?.cost_price ?? 0) * record.sales, 0);
    const operationalExpense = summary.logistics_cost + summary.ads_spend + summary.commission + summary.storage_cost + summary.taxes + summary.other_costs;
    const profitWithoutExpense = summary.revenue - costOfSales;
    const capitalizationByCost = value.products.reduce((sum, product) => sum + product.cost_price * 100, 0);
    const capitalizationByRetail = summary.count > 0 ? summary.avgSalePrice * Math.max(summary.sales, 1) : summary.revenue;
    const shareOfRevenue = (summary.revenue / revenueTotal) * 100;
    const compensation = Math.max(0, summary.returns * summary.avgSalePrice * 0.18);

    return {
      id: key,
      photoLabel: primaryProduct?.name ?? key,
      articleLabel: groupBy === 'product' ? primaryProduct?.sku ?? key : key,
      productName: groupBy === 'product' ? primaryProduct?.name ?? key : key,
      marketplace: primaryProduct?.marketplace ?? 'Mixed',
      store: groupBy === 'store' ? key : primaryProduct?.store ?? '—',
      brand: groupBy === 'brand' ? key : primaryProduct?.brand ?? 'Нет бренда',
      category: groupBy === 'category' ? key : primaryProduct?.category ?? '—',
      group: groupBy === 'group' ? key : deriveProductGroup(primaryProduct),
      marketplaceArticleId: String(buildMarketplaceArticleId(primaryProduct?.id ?? key)),
      avgCost: costOfSales / Math.max(summary.sales, 1),
      operationalExpense,
      otherDeduction: summary.other_costs,
      avgPriceBeforeDiscount: summary.avgPrice,
      avgSalePrice: summary.avgSalePrice,
      revenue: summary.revenue,
      turnoverSales: Math.max(1, 30 / Math.max(summary.sales, 1)),
      turnoverOrders: Math.max(1, 30 / Math.max(summary.orders, 1)),
      sales: summary.sales,
      toTransfer: summary.revenue - summary.commission - summary.logistics_cost,
      returns: summary.returns,
      costOfSales,
      fines: 0,
      ordersCount: summary.orders,
      ordersAmount: summary.orders * summary.avgPrice,
      commission: summary.commission,
      wbFinalReward: summary.revenue - summary.commission,
      compensation,
      averageLogisticsCost: summary.logistics_cost / Math.max(summary.sales, 1),
      capitalizationByCost,
      capitalizationByRetail,
      capitalizationOwnWarehouse: capitalizationByCost * 0.42,
      gmroi: costOfSales > 0 ? (summary.profit / costOfSales) * 100 : 0,
      gmroiYear: costOfSales > 0 ? ((summary.profit / costOfSales) * 100) * 12 : 0,
      logisticsCost: summary.logistics_cost,
      storage: summary.storage_cost,
      rejectionsAndReturns: summary.returns,
      totalSales: summary.sales,
      buyoutRate: summary.buyoutRate,
      averageProfitPerPiece: summary.profitPerUnit,
      taxes: summary.taxes,
      taxBase: summary.revenue - summary.commission,
      profit: summary.profit,
      profitWithoutExpense,
      roi: summary.roi,
      shareOfRevenue,
      marginality: summary.margin,
      marginalityWithoutExpense: summary.revenue > 0 ? (profitWithoutExpense / summary.revenue) * 100 : 0,
      advertisingExpense: summary.ads_spend,
      drrSales: summary.drr,
      advertisingExpenseBonus: summary.ads_spend * 0.18,
      drrBonus: summary.revenue > 0 ? ((summary.ads_spend * 0.18) / summary.revenue) * 100 : 0,
      advertisingExpenseTotal: summary.ads_spend * 1.18,
      drrTotal: summary.revenue > 0 ? ((summary.ads_spend * 1.18) / summary.revenue) * 100 : 0,
      drrOrders: summary.orders > 0 ? ((summary.ads_spend * 1.18) / (summary.orders * summary.avgSalePrice)) * 100 : 0,
      acceptanceSum: summary.revenue * 0.012,
      abcProfit: getAbcBucket(summary.profit, 'profit'),
      abcRevenue: getAbcBucket(summary.revenue, 'revenue'),
      stockBalanceMP: value.products.length * 120,
      stockBalanceOwn: value.products.length * 45,
      stockBalanceToClient: Math.round(summary.orders * 0.12),
      stockBalanceFromClient: Math.round(summary.returns * 0.35),
      salesUnits: summary.sales,
    } satisfies AnalyticsTableRow;
  });

  return rows.sort((left, right) => right.revenue - left.revenue);
}

function buildAnalyticsTotalRow(rows: AnalyticsTableRow[]): AnalyticsTableRow;
function buildAnalyticsTotalRow(rows: AnalyticsTableRow[]) {
  const base = rows.reduce(
    (acc, row) => {
      Object.keys(row).forEach(key => {
        if (typeof row[key as keyof AnalyticsTableRow] === 'number') {
          acc[key as keyof AnalyticsTableRow] = ((acc[key as keyof AnalyticsTableRow] as number) || 0) + (row[key as keyof AnalyticsTableRow] as number);
        }
      });
      return acc;
    },
    {} as Partial<Record<keyof AnalyticsTableRow, number>>
  );

  return {
    id: 'total-period',
    photoLabel: '',
    articleLabel: 'Итого за период',
    productName: 'Итого за период',
    marketplace: '—',
    store: '—',
    brand: '—',
    category: '—',
    group: '—',
    marketplaceArticleId: '—',
    avgCost: (base.avgCost ?? 0) / Math.max(rows.length, 1),
    operationalExpense: base.operationalExpense ?? 0,
    otherDeduction: base.otherDeduction ?? 0,
    avgPriceBeforeDiscount: (base.avgPriceBeforeDiscount ?? 0) / Math.max(rows.length, 1),
    avgSalePrice: (base.avgSalePrice ?? 0) / Math.max(rows.length, 1),
    revenue: base.revenue ?? 0,
    turnoverSales: (base.turnoverSales ?? 0) / Math.max(rows.length, 1),
    turnoverOrders: (base.turnoverOrders ?? 0) / Math.max(rows.length, 1),
    sales: base.sales ?? 0,
    toTransfer: base.toTransfer ?? 0,
    returns: base.returns ?? 0,
    costOfSales: base.costOfSales ?? 0,
    fines: base.fines ?? 0,
    ordersCount: base.ordersCount ?? 0,
    ordersAmount: base.ordersAmount ?? 0,
    commission: base.commission ?? 0,
    wbFinalReward: base.wbFinalReward ?? 0,
    compensation: base.compensation ?? 0,
    averageLogisticsCost: (base.averageLogisticsCost ?? 0) / Math.max(rows.length, 1),
    capitalizationByCost: base.capitalizationByCost ?? 0,
    capitalizationByRetail: base.capitalizationByRetail ?? 0,
    capitalizationOwnWarehouse: base.capitalizationOwnWarehouse ?? 0,
    gmroi: (base.gmroi ?? 0) / Math.max(rows.length, 1),
    gmroiYear: (base.gmroiYear ?? 0) / Math.max(rows.length, 1),
    logisticsCost: base.logisticsCost ?? 0,
    storage: base.storage ?? 0,
    rejectionsAndReturns: base.rejectionsAndReturns ?? 0,
    totalSales: base.totalSales ?? 0,
    buyoutRate: (base.buyoutRate ?? 0) / Math.max(rows.length, 1),
    averageProfitPerPiece: (base.averageProfitPerPiece ?? 0) / Math.max(rows.length, 1),
    taxes: base.taxes ?? 0,
    taxBase: base.taxBase ?? 0,
    profit: base.profit ?? 0,
    profitWithoutExpense: base.profitWithoutExpense ?? 0,
    roi: (base.roi ?? 0) / Math.max(rows.length, 1),
    shareOfRevenue: 100,
    marginality: (base.marginality ?? 0) / Math.max(rows.length, 1),
    marginalityWithoutExpense: (base.marginalityWithoutExpense ?? 0) / Math.max(rows.length, 1),
    advertisingExpense: base.advertisingExpense ?? 0,
    drrSales: (base.drrSales ?? 0) / Math.max(rows.length, 1),
    advertisingExpenseBonus: base.advertisingExpenseBonus ?? 0,
    drrBonus: (base.drrBonus ?? 0) / Math.max(rows.length, 1),
    advertisingExpenseTotal: base.advertisingExpenseTotal ?? 0,
    drrTotal: (base.drrTotal ?? 0) / Math.max(rows.length, 1),
    drrOrders: (base.drrOrders ?? 0) / Math.max(rows.length, 1),
    acceptanceSum: base.acceptanceSum ?? 0,
    abcProfit: '—',
    abcRevenue: '—',
    stockBalanceMP: base.stockBalanceMP ?? 0,
    stockBalanceOwn: base.stockBalanceOwn ?? 0,
    stockBalanceToClient: base.stockBalanceToClient ?? 0,
    stockBalanceFromClient: base.stockBalanceFromClient ?? 0,
    salesUnits: base.salesUnits ?? 0,
  } satisfies AnalyticsTableRow;
}

function formatAnalyticsCell(row: AnalyticsTableRow, columnId: AnalyticsColumnDefinition['id']): ReactNode {
  const value = row[columnId as keyof AnalyticsTableRow];
  if (typeof value === 'number') {
    if (String(columnId).includes('Rate') || String(columnId).includes('roi') || String(columnId).includes('drr') || String(columnId).includes('margin') || columnId === 'shareOfRevenue' || columnId === 'buyoutRate' || columnId === 'gmroi' || columnId === 'gmroiYear' || columnId === 'marginality' || columnId === 'marginalityWithoutExpense') {
      return `${value.toFixed(1)}%`;
    }
    if (
      ['sales', 'returns', 'ordersCount', 'stockBalanceMP', 'stockBalanceOwn', 'stockBalanceToClient', 'stockBalanceFromClient', 'salesUnits', 'rejectionsAndReturns', 'totalSales'].includes(String(columnId))
    ) {
      return formatNumber(value);
    }
    return formatCurrency(value);
  }
  return value ?? '—';
}

function getAnalyticsExportValue(row: AnalyticsTableRow, columnId: AnalyticsColumnDefinition['id']) {
  if (columnId === 'photo') return '';
  if (columnId === 'article') return row.productName;
  const value = row[columnId as keyof AnalyticsTableRow];
  return typeof value === 'number' ? value : value ?? '';
}

function getAnalyticsGroupKey(product: Product, groupBy: AnalyticsGroupBy) {
  switch (groupBy) {
    case 'brand':
      return product.brand || 'Нет бренда';
    case 'store':
      return product.store;
    case 'category':
      return product.category;
    case 'group':
      return deriveProductGroup(product);
    case 'product':
    default:
      return product.id;
  }
}

function deriveProductGroup(product?: Product) {
  if (!product) return 'Без группы';
  if (product.category === 'Термопосуда') return 'Kitchen';
  if (product.category === 'Спорт') return 'Sport';
  if (product.category === 'Освещение' || product.category === 'Хранение') return 'Home';
  return 'Other';
}

function buildMarketplaceArticleId(seed: string) {
  return Math.abs(
    Array.from(seed).reduce((sum, char) => sum * 31 + char.charCodeAt(0), 17)
  )
    .toString()
    .slice(0, 9);
}

function getMarketplaceShort(marketplace: string) {
  if (marketplace.includes('Wildberries')) return 'WB';
  if (marketplace.includes('Ozon')) return 'OZ';
  if (marketplace.includes('Яндекс')) return 'YM';
  return 'MP';
}

function getMarketplaceColor(marketplace: string) {
  if (marketplace.includes('Wildberries')) return '#7c3aed';
  if (marketplace.includes('Ozon')) return '#2563eb';
  if (marketplace.includes('Яндекс')) return '#f59e0b';
  return '#0f766e';
}

function getAbcBucket(value: number, mode: 'profit' | 'revenue') {
  const absValue = Math.abs(value);
  if (mode === 'profit') {
    if (absValue > 150000) return 'A';
    if (absValue > 60000) return 'B';
    return 'C';
  }
  if (absValue > 500000) return 'A';
  if (absValue > 200000) return 'B';
  return 'C';
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
