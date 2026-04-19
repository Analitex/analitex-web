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

export function useAnalyticsWorkspaceData(options?: { enabled?: boolean; includeWorkspaceMetrics?: boolean }) {
  const enabled = options?.enabled ?? true;
  const includeWorkspaceMetrics = options?.includeWorkspaceMetrics ?? true;
  const { session, selectedOrganizationId } = usePlatform();
  const { filters } = useFilters();
  const { reportMode } = useReportMode();
  const [state, setState] = useState<AnalyticsWorkspaceData>({
    accountIds: [],
    metricsCatalog: [],
    filterOptions: null,
    summary: null,
    trends: null,
    breakdown: null,
    explanation: null,
    loading: false,
    error: null,
  });

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

  useEffect(() => {
    if (!enabled || !session?.accessToken || !selectedOrganizationId) {
      setState({
        accountIds: [],
        metricsCatalog: [],
        filterOptions: null,
        summary: null,
        trends: null,
        breakdown: null,
        explanation: null,
        loading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;
    const loadAnalytics = async () => {
      setState(current => ({ ...current, loading: true, error: null }));

      try {
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
          if (cancelled) return;

          setState({
            accountIds: [],
            metricsCatalog: [],
            filterOptions: filterOptions ?? null,
            summary: null,
            trends: null,
            breakdown: null,
            explanation: null,
            loading: false,
            error: null,
          });
          return;
        }

        const metricsCatalog = await apiRequest<MetricsCatalogResponse>('/metadata/metrics', {
          token: session.accessToken,
        });
        const metricKeys = ((metricsCatalog.metrics ?? []) as { key?: string | null; label?: string | null }[])
          .map(item => item.key ?? item.label)
          .filter((item): item is string => Boolean(item));

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
          apiRequest<SummaryResponse>('/overview/summary', {
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
          }),
          apiRequest<TrendResponse>('/analytics/trends', {
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
          }),
          apiRequest<BreakdownResponse>('/analytics/breakdown', {
            token: session.accessToken,
            method: 'POST',
            body: JSON.stringify({
              dateFrom: filters.dateStart,
              dateTo: filters.dateEnd,
              groupBy: 'Product',
              accountIds,
              metrics: selectedMetrics,
              sort: { metric: 'sales', direction: 'Desc' },
              page: 1,
              limit: 25,
              marketplaces: filters.marketplace,
              filters: analyticsFilters,
            }),
          }),
          apiRequest<ExplanationResponse>('/analytics/explanations', {
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
          }),
        ]);

        if (cancelled) return;

        setState({
          accountIds,
          metricsCatalog: metricKeys,
          filterOptions: filterOptions ?? null,
          summary: summary ?? null,
          trends: trends ?? null,
          breakdown: breakdown ?? null,
          explanation: explanation ?? null,
          loading: false,
          error: null,
        });
      } catch (error) {
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
  }, [enabled, includeWorkspaceMetrics, filterQuery, filters.brand, filters.category, filters.dateEnd, filters.dateStart, filters.marketplace, filters.sku, filters.store, reportMode, selectedOrganizationId, session?.accessToken]);

  return state;
}
