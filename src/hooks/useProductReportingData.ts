import { useEffect, useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useReportMode } from '../context/ReportModeContext';
import { usePlatform } from '../context/PlatformContext';
import { apiRequest } from '../lib/api';
import { PRODUCT_REPORT_METRICS_CATALOG } from '../lib/platformCatalog';
import { previewProductReportingData } from '../lib/previewData';
import { isPreviewMode } from '../lib/previewMode';

const SUMMARY_PRIORITY_METRICS = [
  'realisation',
  'sales',
  'salesCount',
  'totalSales',
  'netMarketplaceReward',
  'orders',
  'toTransfer',
  'profit',
  'ordersCount',
  'stockBalance',
  'stockBalanceOverall',
  'totalPaid',
  'salesUnits',
  'orderedUnits',
  'profitWithoutExpense',
  'profitability',
  'costOfSales',
  'advertisingExpense',
  'drr',
  'drrByOrders',
  'averageRedemption',
  'averagePriceBeforeSPP',
  'averagePriceAfterSPP',
  'orderPrice',
  'averageLogisticsCost',
  'averageProfitPerPiece',
  'salesTurnover',
  'ordersTurnover',
  'returns',
  'returnsUnits',
  'returnsCount',
  'refunds',
  'tax',
  'taxBase',
  'roi',
  'gmroi',
  'gmroiYear',
  'shareInTotalRevenue',
  'shareInTotalProfit',
  'acceptanceSum',
  'fines',
  'otherDeduction',
  'compensation',
  'capitalizationByCost',
  'capitalizationByPrice',
  'userWarehouseStockBalance',
  'userWarehouseCapitalizationByCost',
] as const;

const PRODUCT_SUMMARY_METRICS = [
  'realisation',
  'sales',
  'totalSales',
  'profit',
  'profitWithoutExpense',
  'profitability',
  'totalPaid',
  'netMarketplaceReward',
  'orders',
  'toTransfer',
  'ordersCount',
  'salesCount',
  'stockBalance',
  'stockBalanceOverall',
  'averageRedemption',
  'averagePriceBeforeSPP',
  'averagePriceAfterSPP',
  'orderPrice',
  'averageLogisticsCost',
  'averageProfitPerPiece',
  'salesTurnover',
  'ordersTurnover',
  'shareInTotalRevenue',
  'shareInTotalProfit',
  'logistics',
  'storage',
  'returns',
  'returnsUnits',
  'returnsCount',
  'refunds',
  'advertisingExpense',
  'drr',
  'drrByOrders',
  'roi',
  'costOfSales',
  'tax',
  'taxBase',
  'commission',
  'acceptanceSum',
  'fines',
  'otherDeduction',
  'compensation',
  'capitalizationByCost',
  'capitalizationByPrice',
  'userWarehouseStockBalance',
  'userWarehouseCapitalizationByCost',
  'cost',
  'currentPrice',
  'oldPrice',
  'marketingPrice',
  'minimumPrice',
  'netPrice',
  'vatRate',
  'sellerDiscountPercent',
  'marketplaceDiscountPercent',
  'orderedUnits',
  'deliveredUnits',
  'cancellations',
  'hitsViewSearch',
  'hitsViewPdp',
  'hitsView',
  'hitsToCartSearch',
  'hitsToCartPdp',
  'hitsToCart',
  'sessionViewSearch',
  'sessionViewPdp',
  'sessionView',
  'convToCartSearch',
  'convToCartPdp',
  'convToCart',
  'positionCategory',
  'gmroi',
  'gmroiYear',
] as const;

function preferMetrics(keys: string[], candidates: string[]) {
  const normalized = [...candidates];
  const chosen = new Set<string>();
  keys.forEach(key => {
    if (normalized.includes(key)) {
      chosen.add(key);
    }
  });
  normalized.forEach(key => chosen.add(key));
  return Array.from(chosen);
}

type ProductReportingDimension = {
  vendorCode?: string | null;
  marketplaceArticle?: string | null;
  productName?: string | null;
  brand?: string | null;
  category?: string | null;
  accountName?: string | null;
  marketplace?: string | null;
  imageUrl?: string | null;
  productUrl?: string | null;
};

type ProductReportingRow = {
  dimension?: ProductReportingDimension | null;
  metrics?: Record<string, number | null> | null;
};

type ResponseMeta = {
  updatedAt?: string | null;
  isPartial?: boolean | null;
  taxConfigured?: boolean | null;
  productCostsConfigured?: boolean | null;
  economicsConfigured?: boolean | null;
};

type ProductOverviewResponse = {
  summary?: Record<string, number | null> | null;
  topProducts?: ProductReportingRow[] | null;
  meta?: ResponseMeta | null;
};

type ProductSummaryResponse = {
  metrics?: Record<string, number | null> | null;
  comparisons?: Record<
    string,
    {
      previous?: number | null;
      delta?: number | null;
      deltaPercent?: number | null;
    } | null
  > | null;
  meta?: ResponseMeta | null;
};

type ProductRowsResponse = {
  rows?: ProductReportingRow[] | null;
  summary?: {
    total?: Record<string, number | null> | null;
    page?: Record<string, number | null> | null;
  } | null;
  pagination?: { page?: number | null; limit?: number | null; total?: number | null } | null;
  meta?: ResponseMeta | null;
};

type ProductMainResponse = ProductRowsResponse & {
  topProducts?: ProductReportingRow[] | null;
};

type ProductRevenueStructureResponse = {
  realisation?: number | null;
  sales?: number | null;
  items?: Array<{
    key?: string | null;
    label?: string | null;
    labelRu?: string | null;
    effect?: string | null;
    amount?: number | null;
    shareOfRealisationPercent?: number | null;
    managerDescription?: string | null;
    sourceMetrics?: string[] | null;
  }> | null;
  breakdowns?: Record<
    string,
    Array<{
      key?: string | null;
      label?: string | null;
      labelRu?: string | null;
      amount?: number | null;
      managerDescription?: string | null;
      sourceMetrics?: string[] | null;
    }>
  > | null;
  meta?: ResponseMeta | null;
};

type ProductMarginDimension = {
  id?: string | null;
  label?: string | null;
  vendorCode?: string | null;
  marketplaceArticle?: string | null;
  productName?: string | null;
  brand?: string | null;
  category?: string | null;
  accountName?: string | null;
};

type ProductMarginItem = {
  rank?: number | null;
  kind?: string | null;
  dimension?: ProductMarginDimension | null;
  metrics?: Record<string, number | null> | null;
  profit?: number | null;
  profitSharePercent?: number | null;
  cumulativeProfitSharePercent?: number | null;
  productCount?: number | null;
};

type ProductMarginResponse = {
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
  items?: ProductMarginItem[] | null;
  meta?: ResponseMeta | null;
};

type ProductMetricsCatalogResponse = {
  metrics?: Array<{
    key?: string | null;
    id?: string | null;
    slug?: string | null;
    header?: string | null;
    label?: string | null;
    meta?: {
      hint?: string | null;
      suffix?: string | null;
      group?: string | null;
    } | null;
    description?: string | null;
  }> | null;
  cards?: Array<{
    id?: string | null;
    title?: string | null;
    primaryMetric?: string | null;
    secondaryMetric?: string | null;
    ratioMetric?: string | null;
    hint?: string | null;
    group?: string | null;
    order?: number | null;
  }> | null;
};

type ProductMetricCardDefinition = NonNullable<ProductMetricsCatalogResponse['cards']>[number];
type ProductMetricDefinition = NonNullable<ProductMetricsCatalogResponse['metrics']>[number];

export interface ProductReportingData {
  summary: ProductSummaryResponse | null;
  overview: ProductOverviewResponse | null;
  tableSummary: ProductRowsResponse['summary'] | null;
  revenueStructure: ProductRevenueStructureResponse | null;
  marginTop: ProductMarginResponse | null;
  marginCategories: ProductMarginResponse | null;
  rows: ProductReportingRow[];
  metricsCatalog: string[];
  metricCards: ProductMetricCardDefinition[];
  metricDefinitions: ProductMetricDefinition[];
  loading: boolean;
  marginLoading: boolean;
  error: string | null;
}

export function useProductReportingData(options?: {
  enabled?: boolean;
  limit?: number;
  accountIds?: number[];
  marginProductLimit?: number;
  marginCategoryLimit?: number;
}) {
  const previewMode = isPreviewMode();
  const enabled = options?.enabled ?? true;
  const limit = options?.limit ?? 50;
  const marginProductLimit = options?.marginProductLimit ?? 10;
  const marginCategoryLimit = options?.marginCategoryLimit ?? 10;
  const accountIds = useMemo(() => options?.accountIds ?? [], [options?.accountIds]);
  const accountIdsKey = useMemo(() => accountIds.join(','), [accountIds]);
  const { session } = usePlatform();
  const { filters } = useFilters();
  const { reportMode } = useReportMode();
  const [state, setState] = useState<ProductReportingData>({
    summary: null,
    overview: null,
    tableSummary: null,
    revenueStructure: null,
    marginTop: null,
    marginCategories: null,
    rows: [],
    metricsCatalog: [],
    metricCards: [],
    metricDefinitions: [],
    loading: false,
    marginLoading: false,
    error: null,
  });

  const requestFilters = useMemo(
    () => ({
      productIds: filters.sku,
      brandIds: filters.brand,
      categoryIds: filters.category,
    }),
    [filters.brand, filters.category, filters.sku]
  );

  useEffect(() => {
    if (previewMode) {
      setState(enabled ? previewProductReportingData : {
        summary: null,
        overview: null,
        tableSummary: null,
        revenueStructure: null,
        marginTop: null,
        marginCategories: null,
        rows: [],
        metricsCatalog: [],
        metricCards: [],
        metricDefinitions: [],
        loading: false,
        marginLoading: false,
        error: null,
      });
      return;
    }

    if (!enabled || !session?.accessToken) {
      setState({
        summary: null,
        overview: null,
        tableSummary: null,
        revenueStructure: null,
        marginTop: null,
        marginCategories: null,
        rows: [],
        metricsCatalog: [],
        metricCards: [],
        metricDefinitions: [],
        loading: false,
        marginLoading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState(current => ({ ...current, loading: true, error: null }));

      try {
        const baseRequest = {
          dateFrom: filters.dateStart,
          dateTo: filters.dateEnd,
          mode: reportMode === 'financial' ? 'Financial' : 'Management',
          marketplaces: filters.marketplace,
          filters: requestFilters,
        };
        if (accountIds.length > 0) {
          (baseRequest as { accountIds: number[] }).accountIds = accountIds;
        }

        const metricsCatalogResponse = await apiRequest<ProductMetricsCatalogResponse>('/reporting/product-metrics', {
          method: 'GET',
          token: session.accessToken,
        });
        const metricsCatalog = (metricsCatalogResponse.metrics ?? [])
          .map(item => item.key ?? item.slug ?? item.id ?? item.header)
          .filter((item): item is string => Boolean(item));
        const metricCards = metricsCatalogResponse.cards ?? [];
        const metricDefinitions = metricsCatalogResponse.metrics ?? [];
        const selectedMetrics = metricsCatalog.length > 0 ? metricsCatalog : [...PRODUCT_REPORT_METRICS_CATALOG];
        const overviewMetrics = preferMetrics(SUMMARY_PRIORITY_METRICS, selectedMetrics);

        const mainMetrics = [...new Set([...selectedMetrics, ...PRODUCT_SUMMARY_METRICS])];
        const revenueStructurePromise = apiRequest<ProductRevenueStructureResponse>('/reporting/products/revenue-structure', {
          method: 'POST',
          token: session.accessToken,
          body: JSON.stringify(baseRequest),
        }).catch(() => null);

        const main = await apiRequest<ProductMainResponse>('/reporting/products/main', {
          method: 'POST',
          token: session.accessToken,
          body: JSON.stringify({
            ...baseRequest,
            metrics: mainMetrics,
            sort: { metric: 'sales', direction: 'Desc' },
            page: 1,
            limit,
            topProductMetrics: overviewMetrics.slice(0, 6),
            topProductsSortMetric: 'sales',
            topProductsSortDirection: 'Desc',
            topProductsLimit: 5,
            marginMetrics: [],
            marginLimit: 1,
            includeOthers: false,
          }),
        });

        if (cancelled) return;

        const mainSummaryMetrics = main.summary?.total ?? null;

        setState(current => ({
          summary: {
            metrics: mainSummaryMetrics,
            meta: main.meta ?? null,
          },
          overview: {
            summary: mainSummaryMetrics,
            topProducts: main.topProducts ?? [],
            meta: main.meta ?? null,
          },
          tableSummary: main.summary ?? null,
          revenueStructure: null,
          marginTop: current.marginTop,
          marginCategories: current.marginCategories,
          rows: main.rows ?? [],
          metricsCatalog,
          metricCards,
          metricDefinitions,
          loading: false,
          marginLoading: current.marginLoading,
          error: null,
        }));

        const revenueStructure = await revenueStructurePromise;
        if (cancelled) return;

        setState(current => ({
          ...current,
          revenueStructure,
        }));
      } catch (error) {
        if (cancelled) return;
        setState({
          summary: null,
          overview: null,
          tableSummary: null,
          revenueStructure: null,
          marginTop: null,
          marginCategories: null,
          rows: [],
          metricsCatalog: [],
          metricCards: [],
          metricDefinitions: [],
          loading: false,
          marginLoading: false,
          error: error instanceof Error ? error.message : 'Не удалось загрузить товарный отчет.',
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    accountIds,
    accountIdsKey,
    enabled,
    filters.dateEnd,
    filters.dateStart,
    filters.marketplace,
    limit,
    previewMode,
    reportMode,
    requestFilters,
    session?.accessToken,
  ]);

  useEffect(() => {
    if (previewMode) {
      setState(current => ({
        ...current,
        marginTop: enabled ? previewProductReportingData.marginTop : null,
        marginCategories: enabled ? previewProductReportingData.marginCategories : null,
        marginLoading: false,
      }));
      return;
    }

    if (!enabled || !session?.accessToken) {
      setState(current => ({
        ...current,
        marginTop: null,
        marginCategories: null,
        marginLoading: false,
      }));
      return;
    }

    let cancelled = false;

    const loadMargins = async () => {
      setState(current => ({ ...current, marginLoading: true, error: null }));

      try {
        const baseRequest = {
          dateFrom: filters.dateStart,
          dateTo: filters.dateEnd,
          mode: reportMode === 'financial' ? 'Financial' : 'Management',
          marketplaces: filters.marketplace,
          filters: requestFilters,
        };
        if (accountIds.length > 0) {
          (baseRequest as { accountIds: number[] }).accountIds = accountIds;
        }

        const [marginTop, marginCategories] = await Promise.all([
          apiRequest<ProductMarginResponse>('/reporting/products/margin-top', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify({
              ...baseRequest,
              limit: marginProductLimit,
              includeOthers: true,
            }),
          }),
          apiRequest<ProductMarginResponse>('/reporting/products/margin-categories', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify({
              ...baseRequest,
              limit: marginCategoryLimit,
              includeOthers: true,
            }),
          }),
        ]);

        if (cancelled) return;

        setState(current => ({
          ...current,
          marginTop: marginTop ?? null,
          marginCategories: marginCategories ?? null,
          marginLoading: false,
          error: null,
        }));
      } catch (error) {
        if (cancelled) return;
        setState(current => ({
          ...current,
          marginTop: null,
          marginCategories: null,
          marginLoading: false,
          error: error instanceof Error ? error.message : 'Не удалось загрузить маржинальные виджеты.',
        }));
      }
    };

    void loadMargins();

    return () => {
      cancelled = true;
    };
  }, [
    accountIds,
    accountIdsKey,
    enabled,
    filters.dateEnd,
    filters.dateStart,
    filters.marketplace,
    marginCategoryLimit,
    marginProductLimit,
    previewMode,
    reportMode,
    requestFilters,
    session?.accessToken,
  ]);

  return state;
}
