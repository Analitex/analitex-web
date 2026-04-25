import { useEffect, useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useReportMode } from '../context/ReportModeContext';
import { usePlatform } from '../context/PlatformContext';
import { apiRequest } from '../lib/api';

type ProductMetricBreakdownItem = {
  key?: string | null;
  label?: string | null;
  amount?: number | null;
};

type ProductDimension = {
  productName?: string | null;
  vendorCode?: string | null;
  marketplaceArticle?: string | null;
  brand?: string | null;
  category?: string | null;
  marketplace?: string | number | null;
  currencyCode?: string | null;
};

type ResponseMeta = {
  updatedAt?: string | null;
  isPartial?: boolean | null;
  taxConfigured?: boolean | null;
  productCostsConfigured?: boolean | null;
  economicsConfigured?: boolean | null;
};

type ProductMetricDetailsResponse = {
  product?: ProductDimension | null;
  summary?: Record<string, number | null> | null;
  metric?: string | null;
  total?: number | null;
  breakdown?: ProductMetricBreakdownItem[] | null;
  metricBreakdowns?: Record<string, ProductMetricBreakdownItem[] | null> | null;
  meta?: ResponseMeta | null;
};

type ProductMetricBreakdownsResponse = {
  product?: ProductDimension | null;
  summary?: Record<string, number | null> | null;
  metricBreakdowns?: Record<string, ProductMetricBreakdownItem[] | null> | null;
  meta?: ResponseMeta | null;
};

type ProductStockHistoryPoint = {
  date?: string | null;
  quantity?: number | null;
  marketplaceQty?: number | null;
  userWarehouseQty?: number | null;
  inWayToClientQty?: number | null;
  inWayFromClientQty?: number | null;
};

type ProductStockHistoryResponse = {
  series?: ProductStockHistoryPoint[] | null;
  meta?: ResponseMeta | null;
};

type ProductStockSourceSummary = {
  totalQuantity?: number | null;
  warehouseQuantity?: number | null;
  marketplaceWarehouseQuantity?: number | null;
  sellerWarehouseQuantity?: number | null;
  sourceBucketQuantity?: number | null;
  unknownQuantity?: number | null;
  distinctSources?: number | null;
  distinctRegions?: number | null;
};

type ProductStockSourceKindSummary = {
  sourceKind?: string | number | null;
  label?: string | null;
  quantity?: number | null;
};

type ProductStockSourceItem = {
  sourceKind?: string | number | null;
  sourceLabel?: string | null;
  sourceType?: string | null;
  sourceKey?: string | null;
  sourceName?: string | null;
  regionName?: string | null;
  quantity?: number | null;
};

type ProductStockSourcesResponse = {
  product?: ProductDimension | null;
  snapshotDate?: string | null;
  summary?: ProductStockSourceSummary | null;
  sourceKindTotals?: ProductStockSourceKindSummary[] | null;
  items?: ProductStockSourceItem[] | null;
  meta?: ResponseMeta | null;
};

type ProductTrafficHistoryPoint = {
  date?: string | null;
  orderedUnits?: number | null;
  deliveredUnits?: number | null;
  returnsUnits?: number | null;
  cancellations?: number | null;
  hitsView?: number | null;
  hitsToCart?: number | null;
  sessionView?: number | null;
  convToCart?: number | null;
  positionCategory?: number | null;
};

type ProductTrafficHistoryResponse = {
  product?: ProductDimension | null;
  series?: ProductTrafficHistoryPoint[] | null;
  meta?: ResponseMeta | null;
};

export interface ProductDrilldownData {
  details: ProductMetricDetailsResponse | null;
  groupedBreakdowns: ProductMetricBreakdownsResponse | null;
  stockHistory: ProductStockHistoryResponse | null;
  stockSources: ProductStockSourcesResponse | null;
  trafficHistory: ProductTrafficHistoryResponse | null;
  loading: boolean;
  error: string | null;
}

function buildEmptyState(): ProductDrilldownData {
  return {
    details: null,
    groupedBreakdowns: null,
    stockHistory: null,
    stockSources: null,
    trafficHistory: null,
    loading: false,
    error: null,
  };
}

export function useProductDrilldownData(productId: string | null, accountIds: number[], enabled = true) {
  const { session } = usePlatform();
  const { filters } = useFilters();
  const { reportMode } = useReportMode();
  const [state, setState] = useState<ProductDrilldownData>(buildEmptyState);
  const accountIdsKey = useMemo(() => accountIds.join(','), [accountIds]);

  const requestBody = useMemo(() => {
    if (!productId) return null;
    return {
      dateFrom: filters.dateStart,
      dateTo: filters.dateEnd,
      mode: reportMode === 'financial' ? 'Financial' : 'Management',
      accountIds,
      filters: {
        productIds: [productId],
        brandIds: filters.brand,
        categoryIds: filters.category,
      },
    };
  }, [accountIds, filters.brand, filters.category, filters.dateEnd, filters.dateStart, productId, reportMode]);

  useEffect(() => {
    if (!enabled || !session?.accessToken || !requestBody || accountIds.length === 0) {
      setState(buildEmptyState());
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState(current => ({ ...current, loading: true, error: null }));

      try {
        const [details, groupedBreakdowns, stockHistory, stockSources, trafficHistory] = await Promise.all([
          apiRequest<ProductMetricDetailsResponse>('/reporting/products/details', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify({
              ...requestBody,
              metric: 'profit',
            }),
          }),
          apiRequest<ProductMetricBreakdownsResponse>('/reporting/products/metric-breakdowns', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify({
              ...requestBody,
              metrics: ['commission', 'profit', 'stockBalance', 'totalPaid', 'logistics', 'storage'],
            }),
          }),
          apiRequest<ProductStockHistoryResponse>('/reporting/products/stock-history', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(requestBody),
          }),
          apiRequest<ProductStockSourcesResponse>('/reporting/products/stock-sources', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(requestBody),
          }),
          apiRequest<ProductTrafficHistoryResponse>('/reporting/products/traffic-history', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(requestBody),
          }),
        ]);

        if (cancelled) return;

        setState({
          details: details ?? null,
          groupedBreakdowns: groupedBreakdowns ?? null,
          stockHistory: stockHistory ?? null,
          stockSources: stockSources ?? null,
          trafficHistory: trafficHistory ?? null,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          details: null,
          groupedBreakdowns: null,
          stockHistory: null,
          stockSources: null,
          trafficHistory: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Не удалось загрузить детализацию товара.',
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [accountIds.length, accountIdsKey, enabled, requestBody, session?.accessToken]);

  return state;
}
