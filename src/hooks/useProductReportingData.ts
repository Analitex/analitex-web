import { useEffect, useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useReportMode } from '../context/ReportModeContext';
import { usePlatform } from '../context/PlatformContext';
import { apiRequest } from '../lib/api';
import { PRODUCT_REPORT_METRICS_CATALOG } from '../lib/platformCatalog';

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

type ProductOverviewResponse = {
  summary?: Record<string, number | null> | null;
  topProducts?: ProductReportingRow[] | null;
  meta?: { updatedAt?: string | null; isPartial?: boolean | null } | null;
};

type ProductRowsResponse = {
  rows?: ProductReportingRow[] | null;
  summary?: {
    total?: Record<string, number | null> | null;
    page?: Record<string, number | null> | null;
  } | null;
  pagination?: { page?: number | null; limit?: number | null; total?: number | null } | null;
  meta?: { updatedAt?: string | null; isPartial?: boolean | null } | null;
};

type ProductMetricsCatalogResponse = {
  metrics?: Array<{
    id?: string | null;
    slug?: string | null;
    header?: string | null;
  }> | null;
};

export interface ProductReportingData {
  overview: ProductOverviewResponse | null;
  rows: ProductReportingRow[];
  metricsCatalog: string[];
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
    overview: null,
    rows: [],
    metricsCatalog: [],
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
    if (!enabled || !session?.accessToken || accountIds.length === 0) {
      setState({
        overview: null,
        rows: [],
        metricsCatalog: [],
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
          accountIds,
          filters: requestFilters,
        };

        const metricsCatalogResponse = await apiRequest<ProductMetricsCatalogResponse>('/reporting/product-metrics', {
          method: 'GET',
          token: session.accessToken,
        });
        const metricsCatalog = (metricsCatalogResponse.metrics ?? [])
          .map(item => item.slug ?? item.id ?? item.header)
          .filter((item): item is string => Boolean(item));
        const selectedMetrics = metricsCatalog.length > 0 ? metricsCatalog : [...PRODUCT_REPORT_METRICS_CATALOG];

        const [overview, table] = await Promise.all([
          apiRequest<ProductOverviewResponse>('/reporting/products/overview', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify({
              ...baseRequest,
              summaryMetrics: selectedMetrics.slice(0, 5),
              topProductMetrics: selectedMetrics.slice(0, 4),
              topProductsSortMetric: 'sales',
              topProductsSortDirection: 'Desc',
              topProductsLimit: 5,
            }),
          }),
          apiRequest<ProductRowsResponse>('/reporting/products', {
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
          overview: overview ?? null,
          rows: table.rows ?? [],
          metricsCatalog,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          overview: null,
          rows: [],
          metricsCatalog: [],
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
