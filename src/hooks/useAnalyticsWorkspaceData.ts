import { useEffect, useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useReportMode } from '../context/ReportModeContext';
import { usePlatform } from '../context/PlatformContext';
import { apiRequest } from '../lib/api';

type AnalyticsMetricKey = string;

type AnalyticsMetricRecord = Record<AnalyticsMetricKey, number>;
type AnalyticsMetricComparisonRecord = Partial<
  Record<
    AnalyticsMetricKey,
    {
      previous?: number | null;
      delta?: number | null;
      deltaPercent?: number | null;
    }
  >
>;

type FilterOptionsResponse = {
  accounts?: { id: number; label?: string | null; marketplace?: string | null }[];
  products?: { id: string; label?: string | null }[];
  brands?: { id: string; label?: string | null }[];
  categories?: { id: string; label?: string | null }[];
  groups?: { id: number; label?: string | null }[];
  dateRange?: { minDate?: string; maxDate?: string };
};

type MetricsCatalogResponse = {
  metrics?: { key?: string | null; label?: string | null }[] | null;
};

type SummaryResponse = {
  metrics?: Partial<AnalyticsMetricRecord>;
  comparisons?: AnalyticsMetricComparisonRecord;
  meta?: {
    updatedAt?: string;
    isPartial?: boolean;
    taxConfigured?: boolean | null;
    productCostsConfigured?: boolean | null;
    economicsConfigured?: boolean | null;
  };
};

type TrendResponse = {
  grain?: 'Day' | 'Week' | 'Month';
  series?: Array<{ date?: string; metrics?: Partial<AnalyticsMetricRecord> }>;
  dataState?: { isPartial?: boolean; lastCompleteDate?: string; updatedAt?: string };
};

type BreakdownRow = {
  dimension?: string | { id?: string; label?: string };
  metrics?: Partial<AnalyticsMetricRecord>;
};

type BreakdownResponse = {
  rows?: BreakdownRow[];
  summary?: {
    total?: Partial<AnalyticsMetricRecord>;
    page?: Partial<AnalyticsMetricRecord>;
  };
  pagination?: { total?: number; page?: number; limit?: number };
  meta?: { isPartial?: boolean };
};

type ExplanationResponse = {
  metric?: string;
  breakdown?: Array<{ key?: string; label?: string; amount?: number }>;
  lineage?: unknown;
};

type AnalyticsQueryFilters = {
  productIds: string[];
  groupIds: number[];
  brandIds: string[];
  categoryIds: string[];
  tags: string[];
};

export interface AnalyticsWorkspaceData {
  accountIds: number[];
  metricsCatalog: string[];
  filterOptions: FilterOptionsResponse | null;
  summary: SummaryResponse | null;
  trends: TrendResponse | null;
  breakdown: BreakdownResponse | null;
  explanation: ExplanationResponse | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_METRICS: AnalyticsMetricKey[] = [
  'sales',
  'commission',
  'logistics',
  'storage',
  'returns',
  'ordersCount',
  'stockBalance',
];

const OVERVIEW_SUMMARY_METRICS: AnalyticsMetricKey[] = [
  'sales',
  'commission',
  'logistics',
  'storage',
  'returns',
  'ordersCount',
  'stockBalance',
];

const DEFAULT_ANALYTICS_METRICS: AnalyticsMetricKey[] = [
  ...DEFAULT_METRICS,
  'profit',
  'profitWithoutExpense',
  'costOfSales',
  'advertisingExpense',
  'drr',
  'drrByOrders',
  'capitalizationByCost',
  'capitalizationByPrice',
  'userWarehouseStockBalance',
];
const ANALYTICS_CACHE_TTL_MS = 30_000;
const analyticsRequestCache = new Map<string, { expiresAt: number; data: AnalyticsWorkspaceData }>();
const analyticsInFlightRequests = new Map<string, Promise<AnalyticsWorkspaceData>>();

function buildEmptyAnalyticsState(): AnalyticsWorkspaceData {
  return {
    accountIds: [],
    metricsCatalog: [],
    filterOptions: null,
    summary: null,
    trends: null,
    breakdown: null,
    explanation: null,
    loading: false,
    error: null,
  };
}

function getCachedAnalyticsState(cacheKey: string) {
  const cached = analyticsRequestCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    analyticsRequestCache.delete(cacheKey);
    return null;
  }
  return cached.data;
}

export function useAnalyticsWorkspaceData(options?: {
  enabled?: boolean;
  includeWorkspaceMetrics?: boolean;
  breakdownGroupBy?: 'Product' | 'Brand' | 'Category' | 'Account' | 'Marketplace' | 'Date' | 'Week' | 'Month';
  includeSummary?: boolean;
  includeTrends?: boolean;
  includeBreakdown?: boolean;
  includeExplanation?: boolean;
  includeMetricsCatalog?: boolean;
}) {
  const enabled = options?.enabled ?? true;
  const includeWorkspaceMetrics = options?.includeWorkspaceMetrics ?? true;
  const breakdownGroupBy = options?.breakdownGroupBy ?? 'Product';
  const includeSummary = options?.includeSummary ?? includeWorkspaceMetrics;
  const includeTrends = options?.includeTrends ?? includeWorkspaceMetrics;
  const includeBreakdown = options?.includeBreakdown ?? includeWorkspaceMetrics;
  const includeExplanation = options?.includeExplanation ?? includeWorkspaceMetrics;
  const includeMetricsCatalog = options?.includeMetricsCatalog ?? includeWorkspaceMetrics;
  const { session, selectedOrganizationId } = usePlatform();
  const { filters } = useFilters();
  const { reportMode } = useReportMode();
  const [state, setState] = useState<AnalyticsWorkspaceData>(buildEmptyAnalyticsState);

  const filterQuery = useMemo<AnalyticsQueryFilters>(
    () => ({
      productIds: filters.sku,
      groupIds: [],
      brandIds: filters.brand,
      categoryIds: filters.category,
      tags: [],
    }),
    [filters.brand, filters.category, filters.sku]
  );

  const requestKey = useMemo(
    () =>
      JSON.stringify({
        enabled,
        includeWorkspaceMetrics,
        includeSummary,
        includeTrends,
        includeBreakdown,
        includeExplanation,
        includeMetricsCatalog,
        breakdownGroupBy,
        token: session?.accessToken ?? null,
        selectedOrganizationId,
        reportMode,
        filters: {
          dateStart: filters.dateStart,
          dateEnd: filters.dateEnd,
          marketplace: filters.marketplace,
          store: filters.store,
          brand: filters.brand,
          category: filters.category,
          sku: filters.sku,
        },
      }),
    [
      breakdownGroupBy,
      enabled,
      includeBreakdown,
      includeExplanation,
      includeMetricsCatalog,
      includeSummary,
      includeTrends,
      filters.brand,
      filters.category,
      filters.dateEnd,
      filters.dateStart,
      filters.marketplace,
      filters.sku,
      filters.store,
      includeWorkspaceMetrics,
      reportMode,
      selectedOrganizationId,
      session?.accessToken,
    ]
  );

  useEffect(() => {
    if (!enabled || !session?.accessToken || !selectedOrganizationId) {
      setState(buildEmptyAnalyticsState());
      return;
    }

    let cancelled = false;
    const loadAnalytics = async () => {
      const cachedState = getCachedAnalyticsState(requestKey);
      if (cachedState) {
        setState(cachedState);
        return;
      }

      setState(current => ({ ...current, loading: true, error: null }));

      try {
        const existingRequest = analyticsInFlightRequests.get(requestKey);
        const requestPromise =
          existingRequest ??
          (async () => {
            const filterOptions = await apiRequest<FilterOptionsResponse>('/metadata/filter-options', {
              token: session.accessToken,
              method: 'POST',
              body: JSON.stringify({
                dateFrom: filters.dateStart,
                dateTo: filters.dateEnd,
                marketplaces: filters.marketplace,
                filters: filterQuery,
              }),
            });

            if (!includeWorkspaceMetrics) {
              return {
                accountIds: [],
                metricsCatalog: [],
                filterOptions: filterOptions ?? null,
                summary: null,
                trends: null,
                breakdown: null,
                explanation: null,
                loading: false,
                error: null,
              } satisfies AnalyticsWorkspaceData;
            }

            const metricKeys = [
              ...new Set(
                (includeMetricsCatalog
                  ? (
                      ((await apiRequest<MetricsCatalogResponse>('/metadata/metrics', {
                        token: session.accessToken,
                      })).metrics ?? []) as { key?: string | null; label?: string | null }[]
                    )
                      .map(item => item.key ?? item.label)
                      .filter((item): item is string => Boolean(item))
                  : [...DEFAULT_METRICS]
                ).concat(DEFAULT_METRICS),
              ),
            ];

            const accountIds = (filterOptions.accounts ?? [])
              .filter(account => {
                const matchesMarketplace = filters.marketplace.length === 0 || filters.marketplace.includes(account.marketplace ?? '');
                const matchesStore = filters.store.length === 0 || filters.store.includes(account.label ?? '');
                return matchesMarketplace && matchesStore;
              })
              .map(item => item.id)
              .filter((id): id is number => Number.isInteger(id));

            const analyticsFilters: AnalyticsQueryFilters = {
              productIds: filters.sku,
              groupIds: [],
              brandIds: filters.brand,
              categoryIds: filters.category,
              tags: [],
            };

            const analyticsBaseRequest = {
              dateFrom: filters.dateStart,
              dateTo: filters.dateEnd,
              mode: reportMode === 'financial' ? 'Financial' : 'Management',
              marketplaces: filters.marketplace,
              filters: analyticsFilters,
            };
            const maybeAccountIds = accountIds.length > 0 ? { accountIds } : {};

            const selectedMetrics = metricKeys.length > 0 ? metricKeys : DEFAULT_ANALYTICS_METRICS;
            const trendsMetrics = selectedMetrics.filter(metric => OVERVIEW_SUMMARY_METRICS.includes(metric)).slice(0, 6);
            const breakdownMetrics = selectedMetrics.filter(metric => OVERVIEW_SUMMARY_METRICS.includes(metric));

            const [summary, trends, breakdown, explanation] = await Promise.all([
              includeSummary
                ? apiRequest<SummaryResponse>('/overview/summary', {
                    token: session.accessToken,
                    method: 'POST',
                    body: JSON.stringify({
                      ...analyticsBaseRequest,
                      ...maybeAccountIds,
                      metrics: OVERVIEW_SUMMARY_METRICS,
                    }),
                  })
                : Promise.resolve(null),
              includeTrends
                ? apiRequest<TrendResponse>('/analytics/trends', {
                    token: session.accessToken,
                    method: 'POST',
                    body: JSON.stringify({
                      ...analyticsBaseRequest,
                      ...maybeAccountIds,
                      grain: 'Day',
                      metrics: trendsMetrics.length > 0 ? trendsMetrics : OVERVIEW_SUMMARY_METRICS.slice(0, 6),
                    }),
                  })
                : Promise.resolve(null),
              includeBreakdown
                ? apiRequest<BreakdownResponse>('/analytics/breakdown', {
                    token: session.accessToken,
                    method: 'POST',
                    body: JSON.stringify({
                      ...analyticsBaseRequest,
                      ...maybeAccountIds,
                      groupBy: breakdownGroupBy,
                      metrics: breakdownMetrics.length > 0 ? breakdownMetrics : OVERVIEW_SUMMARY_METRICS,
                      sort: { metric: 'sales', direction: 'Desc' },
                      page: 1,
                      limit: 25,
                    }),
                  })
                : Promise.resolve(null),
              includeExplanation
                ? apiRequest<ExplanationResponse>('/analytics/explanations', {
                    token: session.accessToken,
                    method: 'POST',
                    body: JSON.stringify({
                      ...analyticsBaseRequest,
                      ...maybeAccountIds,
                      metric: 'sales',
                    }),
                  })
                : Promise.resolve(null),
            ]);

            return {
              accountIds,
              metricsCatalog: metricKeys,
              filterOptions: filterOptions ?? null,
              summary,
              trends: trends ?? null,
              breakdown: breakdown ?? null,
              explanation: explanation ?? null,
              loading: false,
              error: null,
            } satisfies AnalyticsWorkspaceData;
          })();

        if (!existingRequest) {
          analyticsInFlightRequests.set(requestKey, requestPromise);
        }

        const nextState = await requestPromise;
        analyticsInFlightRequests.delete(requestKey);
        analyticsRequestCache.set(requestKey, {
          expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS,
          data: nextState,
        });

        if (cancelled) return;

        setState(nextState);
      } catch (error) {
        analyticsInFlightRequests.delete(requestKey);
        if (cancelled) return;
        setState(current => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load analytics.',
        }));
      }
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [
    breakdownGroupBy,
    enabled,
    includeBreakdown,
    includeExplanation,
    includeMetricsCatalog,
    includeSummary,
    includeTrends,
    filterQuery,
    filters.brand,
    filters.category,
    filters.dateEnd,
    filters.dateStart,
    filters.marketplace,
    filters.sku,
    filters.store,
    includeWorkspaceMetrics,
    reportMode,
    requestKey,
    selectedOrganizationId,
    session?.accessToken,
  ]);

  return state;
}
