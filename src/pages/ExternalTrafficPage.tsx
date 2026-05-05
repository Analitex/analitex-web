import { useEffect, useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useReportMode } from '../context/ReportModeContext';
import { usePlatform } from '../context/PlatformContext';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { apiRequest } from '../lib/api';
import { formatCurrency, formatNumber } from '../lib/calculations';
import { MousePointer2, Radio, ReceiptText } from 'lucide-react';

type ExternalTrafficRow = {
  dimension?: {
    id?: string | null;
    label?: string | null;
    sourceName?: string | null;
    sourceType?: string | null;
    sourceKey?: string | null;
    vendorTag?: string | null;
  } | null;
  metrics?: {
    visits?: number | null;
    clicks?: number | null;
    ordersCount?: number | null;
    ordersAmount?: number | null;
    expense?: number | null;
  } | null;
};

type ExternalTrafficQueryResponse = {
  rows?: ExternalTrafficRow[] | null;
  summary?: {
    total?: Record<string, number | null> | null;
    page?: Record<string, number | null> | null;
  } | null;
  pagination?: { total?: number | null } | null;
};

type ExternalTrafficHistoryResponse = {
  dimension?: {
    label?: string | null;
    sourceName?: string | null;
    sourceKey?: string | null;
    vendorTag?: string | null;
  } | null;
  series?: Array<{
    date?: string | null;
    visits?: number | null;
    clicks?: number | null;
    ordersCount?: number | null;
    ordersAmount?: number | null;
    expense?: number | null;
  }> | null;
};

function getMetricNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function ExternalTrafficPage() {
  const { session } = usePlatform();
  const { filters } = useFilters();
  const { reportMode } = useReportMode();
  const analytics = useAnalyticsWorkspaceData({
    includeSummary: false,
    includeTrends: false,
    includeBreakdown: false,
    includeExplanation: false,
    includeMetricsCatalog: false,
  });
  const [rows, setRows] = useState<ExternalTrafficRow[]>([]);
  const [history, setHistory] = useState<ExternalTrafficHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<{ sourceKey?: string; vendorTag?: string; label: string } | null>(null);
  const requestMarketplaces = useMemo(
    () => (filters.marketplace.length > 0 ? filters.marketplace : ['Ozon']),
    [filters.marketplace]
  );
  const requestAccountIds = useMemo(
    () => (analytics.accountIds.length > 0 ? analytics.accountIds : undefined),
    [analytics.accountIds]
  );
  const requestFilters = useMemo(
    () => ({
      productIds: filters.sku,
      groupIds: [],
      brandIds: filters.brand,
      categoryIds: filters.category,
      tags: [],
    }),
    [filters.brand, filters.category, filters.sku]
  );

  useEffect(() => {
    if (!session?.accessToken) {
      setRows([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiRequest<ExternalTrafficQueryResponse>('/reporting/external-traffic/query', {
          method: 'POST',
          token: session.accessToken,
          body: JSON.stringify({
            dateFrom: filters.dateStart,
            dateTo: filters.dateEnd,
            mode: reportMode === 'financial' ? 'Financial' : 'Management',
            accountIds: requestAccountIds,
            marketplaces: requestMarketplaces,
            filters: requestFilters,
            sort: { metric: 'ordersAmount', direction: 'Desc' },
            page: 1,
            limit: 50,
          }),
        });

        if (cancelled) return;
        setRows(response.rows ?? []);
      } catch (nextError) {
        if (cancelled) return;
        setRows([]);
        setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить внешний трафик.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [filters.dateEnd, filters.dateStart, reportMode, requestAccountIds, requestFilters, requestMarketplaces, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !selectedSource) {
      setHistory(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setHistoryLoading(true);

      try {
        const response = await apiRequest<ExternalTrafficHistoryResponse>('/reporting/external-traffic/history', {
          method: 'POST',
          token: session.accessToken,
          body: JSON.stringify({
            dateFrom: filters.dateStart,
            dateTo: filters.dateEnd,
            mode: reportMode === 'financial' ? 'Financial' : 'Management',
            accountIds: requestAccountIds,
            marketplaces: requestMarketplaces,
            filters: requestFilters,
            sourceKey: selectedSource.sourceKey,
            vendorTag: selectedSource.vendorTag,
          }),
        });
        if (cancelled) return;
        setHistory(response ?? null);
      } catch (nextError) {
        if (cancelled) return;
        setHistory(null);
        setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить историю источника.');
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [filters.dateEnd, filters.dateStart, reportMode, requestAccountIds, requestFilters, requestMarketplaces, selectedSource, session?.accessToken]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.visits += getMetricNumber(row.metrics?.visits);
        acc.clicks += getMetricNumber(row.metrics?.clicks);
        acc.ordersCount += getMetricNumber(row.metrics?.ordersCount);
        acc.ordersAmount += getMetricNumber(row.metrics?.ordersAmount);
        acc.expense += getMetricNumber(row.metrics?.expense);
        return acc;
      },
      { visits: 0, clicks: 0, ordersCount: 0, ordersAmount: 0, expense: 0 }
    );
  }, [rows]);

  const ctr = totals.visits > 0 ? (totals.clicks / totals.visits) * 100 : 0;
  const sourceSeries = history?.series ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Внешний трафик</h1>
        <p className="mt-0.5 text-sm text-slate-500">Источник трафика, расходы и заказы из live performance API</p>
      </div>

      {(analytics.error || error) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {analytics.error ?? error}
        </div>
      )}

      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        Экран использует performance-данные Ozon. Если фильтр площадок пустой, frontend автоматически запрашивает `Ozon`.
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: 'Визиты', value: formatNumber(totals.visits), icon: Radio, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Клики', value: formatNumber(totals.clicks), icon: MousePointer2, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Заказы', value: formatNumber(totals.ordersCount), icon: ReceiptText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Выручка', value: formatCurrency(totals.ordersAmount, true), icon: ReceiptText, color: 'text-slate-700', bg: 'bg-slate-100' },
          { label: 'CTR', value: `${ctr.toFixed(1)}%`, icon: MousePointer2, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                <Icon size={18} className={item.color} />
              </div>
              <div>
                <div className="text-xs text-slate-500">{item.label}</div>
                <div className="text-lg font-bold text-slate-900">{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Источники трафика</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Источник</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Визиты</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Клики</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Заказы</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Выручка</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Расход</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-5 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Нет данных по внешнему трафику</td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={`${row.dimension?.id ?? row.dimension?.sourceKey ?? row.dimension?.vendorTag ?? 'source'}-${index}`}
                      onClick={() =>
                        setSelectedSource({
                          sourceKey: row.dimension?.sourceKey ?? undefined,
                          vendorTag: row.dimension?.vendorTag ?? undefined,
                          label: row.dimension?.label ?? row.dimension?.sourceName ?? `Источник ${index + 1}`,
                        })
                      }
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{row.dimension?.label ?? row.dimension?.sourceName ?? 'Источник'}</div>
                        <div className="text-xs text-slate-400">{row.dimension?.sourceType ?? '—'} · {row.dimension?.vendorTag ?? row.dimension?.sourceKey ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatNumber(getMetricNumber(row.metrics?.visits))}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatNumber(getMetricNumber(row.metrics?.clicks))}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatNumber(getMetricNumber(row.metrics?.ordersCount))}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(getMetricNumber(row.metrics?.ordersAmount), true)}</td>
                      <td className="px-4 py-3 text-right text-rose-600">{formatCurrency(getMetricNumber(row.metrics?.expense), true)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-slate-700">История источника</div>
          <div className="mt-1 text-xs text-slate-500">{selectedSource?.label ?? 'Выберите источник в таблице'}</div>
          <div className="mt-4 space-y-2">
            {historyLoading ? (
              Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />)
            ) : sourceSeries.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-sm text-slate-500">История появится после выбора источника.</div>
            ) : (
              sourceSeries.slice(-10).reverse().map((point, index) => (
                <div key={`${point.date ?? 'point'}-${index}`} className="grid grid-cols-[90px_repeat(4,minmax(0,1fr))] gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-medium text-slate-900">{point.date ?? '—'}</div>
                  <div className="text-slate-600">Визиты: {formatNumber(getMetricNumber(point.visits))}</div>
                  <div className="text-slate-600">Клики: {formatNumber(getMetricNumber(point.clicks))}</div>
                  <div className="text-slate-600">Заказы: {formatNumber(getMetricNumber(point.ordersCount))}</div>
                  <div className="text-slate-600">Выручка: {formatCurrency(getMetricNumber(point.ordersAmount), true)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
