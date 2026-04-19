import { useEffect, useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useReportMode } from '../context/ReportModeContext';
import { usePlatform } from '../context/PlatformContext';
import { apiRequest } from '../lib/api';

type AnalyticsMetricKey = 'sales' | 'commission' | 'logistics' | 'storage' | 'returns' | 'ordersCount' | 'stockBalance';

type FilterOptionsResponse = {
  accounts?: { id: number; label?: string | null; marketplace?: string | null }[];
  products?: { id: string; label?: string | null }[];
  brands?: { id: string; label?: string | null }[];
  categories?: { id: string; label?: string | null }[];
  groups?: { id: number; label?: string | null }[];
  dateRange?: { dateFrom?: string; dateTo?: string };
};

type MetricsCatalogResponse = {
  metrics?: { key?: string | null; label?: string | null }[] | null;
};

type SummaryResponse = {
  metrics?: Partial<Record<AnalyticsMetricKey, number>>;
  comparisons?: Partial<Record<AnalyticsMetricKey, { previous?: number; delta?: number; deltaPercent?: number }>>;
  meta?: { updatedAt?: string; isPartial?: boolean };
};

type TrendResponse = {
  grain?: 'Day' | 'Week' | 'Month';
  series?: Array<{ date?: string; metrics?: Partial<Record<AnalyticsMetricKey, number>> }>;
  dataState?: { isPartial?: boolean; lastCompleteDate?: string; updatedAt?: string };
};

type BreakdownRow = {
  dimension?: string | { id?: string; label?: string };
  metrics?: Partial<Record<AnalyticsMetricKey, number>>;
};

type BreakdownResponse = {
  rows?: BreakdownRow[];
  summary?: { total?: number; page?: number };
  pagination?: { total?: number; page?: number; limit?: number };
  meta?: { isPartial?: boolean };
};

type ExplanationResponse = {
  metric?: string;
  breakdown?: Array<{ label?: string; value?: number; percent?: number }>;
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

const DEFAULT_METRICS: AnalyticsMetricKey[] = ['sales', 'commission', 'logistics', 'storage', 'returns', 'ordersCount', 'stockBalance'];
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
      tags: filters.marketplace,
    }),
    [filters.brand, filters.category, filters.marketplace, filters.sku]
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

            const metricKeys = includeMetricsCatalog
              ? (
                  ((await apiRequest<MetricsCatalogResponse>('/metadata/metrics', {
                    token: session.accessToken,
                  })).metrics ?? []) as { key?: string | null; label?: string | null }[]
                )
                  .map(item => item.key ?? item.label)
                  .filter((item): item is string => Boolean(item))
              : [...DEFAULT_METRICS];

            const accountIds = (filterOptions.accounts ?? [])
              .filter(account => {
                const matchesMarketplace = filters.marketplace.length === 0 || filters.marketplace.includes(account.marketplace ?? '');
                const matchesStore = filters.store.length === 0 || filters.store.includes(account.label ?? '');
                return matchesMarketplace && matchesStore;
              })
              .map(item => item.id)
              .filter((id): id is number => Number.isInteger(id));

            const selectedProductIds =
              filters.sku.length > 0
                ? filters.sku
                : (filterOptions.products ?? [])
                    .map(item => item.id)
                    .filter((id): id is string => Boolean(id));

            const selectedBrandIds =
              filters.brand.length > 0
                ? filters.brand
                : (filterOptions.brands ?? [])
                    .map(item => item.id)
                    .filter((id): id is string => Boolean(id));

            const selectedCategoryIds =
              filters.category.length > 0
                ? filters.category
                : (filterOptions.categories ?? [])
                    .map(item => item.id)
                    .filter((id): id is string => Boolean(id));

            const analyticsFilters: AnalyticsQueryFilters = {
              productIds: selectedProductIds,
              groupIds: (filterOptions.groups ?? []).map(item => item.id).filter((id): id is number => Number.isInteger(id)),
              brandIds: selectedBrandIds,
              categoryIds: selectedCategoryIds,
              tags: filters.marketplace,
            };

            const selectedMetrics = metricKeys.length > 0 ? metricKeys : DEFAULT_METRICS;

            const [summary, trends, breakdown, explanation] = await Promise.all([
              includeSummary
                ? apiRequest<SummaryResponse>('/overview/summary', {
                    token: session.accessToken,
                    method: 'POST',
                    body: JSON.stringify({
                      dateFrom: filters.dateStart,
                      dateTo: filters.dateEnd,
                      mode: reportMode === 'financial' ? 'Financial' : 'Management',
                      accountIds,
                      metrics: selectedMetrics,
                      marketplaces: filters.marketplace,
                      filters: analyticsFilters,
                    }),
                  })
                : Promise.resolve(null),
              includeTrends
                ? apiRequest<TrendResponse>('/analytics/trends', {
                    token: session.accessToken,
                    method: 'POST',
                    body: JSON.stringify({
                      dateFrom: filters.dateStart,
                      dateTo: filters.dateEnd,
                      grain: 'Day',
                      accountIds,
                      metrics: selectedMetrics.slice(0, 6),
                      marketplaces: filters.marketplace,
                      filters: analyticsFilters,
                    }),
                  })
                : Promise.resolve(null),
              includeBreakdown
                ? apiRequest<BreakdownResponse>('/analytics/breakdown', {
                    token: session.accessToken,
                    method: 'POST',
                    body: JSON.stringify({
                      dateFrom: filters.dateStart,
                      dateTo: filters.dateEnd,
                      groupBy: breakdownGroupBy,
                      accountIds,
                      metrics: selectedMetrics,
                      sort: { metric: 'sales', direction: 'Desc' },
                      page: 1,
                      limit: 25,
                      marketplaces: filters.marketplace,
                      filters: analyticsFilters,
                    }),
                  })
                : Promise.resolve(null),
              includeExplanation
                ? apiRequest<ExplanationResponse>('/analytics/explanations', {
                    token: session.accessToken,
                    method: 'POST',
                    body: JSON.stringify({
                      dateFrom: filters.dateStart,
                      dateTo: filters.dateEnd,
                      accountIds,
                      metric: 'sales',
                      marketplaces: filters.marketplace,
                      filters: analyticsFilters,
                    }),
                  })
                : Promise.resolve(null),
            ]);

            return {
              accountIds,
              metricsCatalog: metricKeys,
              filterOptions: filterOptions ?? null,
              summary: summary ?? null,
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
