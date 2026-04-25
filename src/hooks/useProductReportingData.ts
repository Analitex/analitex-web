import { useEffect, useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useReportMode } from '../context/ReportModeContext';
import { usePlatform } from '../context/PlatformContext';
import { apiRequest } from '../lib/api';
import { PRODUCT_REPORT_METRICS_CATALOG } from '../lib/platformCatalog';

const SUMMARY_PRIORITY_METRICS = [
  'realisation',
  'sales',
  'salesCount',
  'totalSales',
  'netMarketplaceReward',
  'orders',
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
  'ordersCount',
  'salesCount',
  'stockBalance',
  'stockBalanceOverall',
  'averageRedemption',
  'averagePriceBeforeSPP',
  'averagePriceAfterSPP',
  'averageLogisticsCost',
  'averageProfitPerPiece',
  'salesTurnover',
  'ordersTurnover',
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

type ProductMetricsCatalogResponse = {
  metrics?: Array<{
    key?: string | null;
    id?: string | null;
    slug?: string | null;
    header?: string | null;
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

export interface ProductReportingData {
  summary: ProductSummaryResponse | null;
  overview: ProductOverviewResponse | null;
  rows: ProductReportingRow[];
  metricsCatalog: string[];
  metricCards: ProductMetricCardDefinition[];
  loading: boolean;
  error: string | null;
}

export function useProductReportingData(options?: { enabled?: boolean; limit?: number; accountIds?: number[] }) {
  const enabled = options?.enabled ?? true;
  const limit = options?.limit ?? 50;
  const accountIds = useMemo(() => options?.accountIds ?? [], [options?.accountIds]);
  const accountIdsKey = useMemo(() => accountIds.join(','), [accountIds]);
  const { session } = usePlatform();
  const { filters } = useFilters();
  const { reportMode } = useReportMode();
  const [state, setState] = useState<ProductReportingData>({
    summary: null,
    overview: null,
    rows: [],
    metricsCatalog: [],
    metricCards: [],
    loading: false,
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
    if (!enabled || !session?.accessToken) {
      setState({
        summary: null,
        overview: null,
        rows: [],
        metricsCatalog: [],
        metricCards: [],
        loading: false,
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
        const selectedMetrics = metricsCatalog.length > 0 ? metricsCatalog : [...PRODUCT_REPORT_METRICS_CATALOG];
        const overviewMetrics = preferMetrics(SUMMARY_PRIORITY_METRICS, selectedMetrics);

        const [summary, overview, table] = await Promise.all([
          apiRequest<ProductSummaryResponse>('/reporting/products/summary', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify({
              ...baseRequest,
              metrics: [...PRODUCT_SUMMARY_METRICS],
            }),
          }),
          apiRequest<ProductOverviewResponse>('/reporting/products/overview', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify({
              ...baseRequest,
              summaryMetrics: overviewMetrics.slice(0, 8),
              topProductMetrics: overviewMetrics.slice(0, 6),
              topProductsSortMetric: 'sales',
              topProductsSortDirection: 'Desc',
              topProductsLimit: 5,
            }),
          }),
          apiRequest<ProductRowsResponse>('/reporting/products/query', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify({
              ...baseRequest,
              metrics: selectedMetrics,
              sort: { metric: 'sales', direction: 'Desc' },
              page: 1,
              limit,
            }),
          }),
        ]);

        if (cancelled) return;

        setState({
          summary: summary ?? null,
          overview: overview ?? null,
          rows: table.rows ?? [],
          metricsCatalog,
          metricCards,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          summary: null,
          overview: null,
          rows: [],
          metricsCatalog: [],
          metricCards: [],
          loading: false,
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
    limit,
    reportMode,
    requestFilters,
    session?.accessToken,
  ]);

  return state;
}
