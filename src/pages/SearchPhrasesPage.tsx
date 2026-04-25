import { useEffect, useMemo, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { useReportMode } from '../context/ReportModeContext';
import { usePlatform } from '../context/PlatformContext';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { apiRequest } from '../lib/api';
import { formatCurrency, formatNumber } from '../lib/calculations';
import { MousePointer2, Search, Target } from 'lucide-react';

type SearchPhraseRow = {
  dimension?: {
    id?: string | null;
    label?: string | null;
    campaignId?: string | null;
    campaignName?: string | null;
    phrase?: string | null;
    phraseType?: string | null;
    category?: string | null;
    placement?: string | null;
  } | null;
  metrics?: {
    impressions?: number | null;
    clicks?: number | null;
    ordersCount?: number | null;
    ordersAmount?: number | null;
    expense?: number | null;
    ctr?: number | null;
    cpc?: number | null;
    drr?: number | null;
  } | null;
};

type SearchPhraseQueryResponse = {
  rows?: SearchPhraseRow[] | null;
};

type SearchPhraseHistoryResponse = {
  dimension?: {
    label?: string | null;
    campaignId?: string | null;
    phrase?: string | null;
  } | null;
  series?: Array<{
    date?: string | null;
    impressions?: number | null;
    clicks?: number | null;
    ordersCount?: number | null;
    ordersAmount?: number | null;
    expense?: number | null;
    ctr?: number | null;
    cpc?: number | null;
    drr?: number | null;
  }> | null;
};

function getMetricNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function SearchPhrasesPage() {
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
  const [rows, setRows] = useState<SearchPhraseRow[]>([]);
  const [history, setHistory] = useState<SearchPhraseHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhrase, setSelectedPhrase] = useState<{ campaignId?: string; phrase?: string; label: string } | null>(null);
  const requestMarketplaces = useMemo(
    () => (filters.marketplace.length > 0 ? filters.marketplace : ['Ozon']),
    [filters.marketplace]
  );
  const requestAccountIds = analytics.accountIds.length > 0 ? analytics.accountIds : undefined;

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
        const response = await apiRequest<SearchPhraseQueryResponse>('/reporting/search-phrases/query', {
          method: 'POST',
          token: session.accessToken,
          body: JSON.stringify({
            dateFrom: filters.dateStart,
            dateTo: filters.dateEnd,
            mode: reportMode === 'financial' ? 'Financial' : 'Management',
            accountIds: requestAccountIds,
            marketplaces: requestMarketplaces,
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
        setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить поисковые фразы.');
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
  }, [filters.dateEnd, filters.dateStart, reportMode, requestAccountIds, requestMarketplaces, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !selectedPhrase) {
      setHistory(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setHistoryLoading(true);

      try {
        const response = await apiRequest<SearchPhraseHistoryResponse>('/reporting/search-phrases/history', {
          method: 'POST',
          token: session.accessToken,
          body: JSON.stringify({
            dateFrom: filters.dateStart,
            dateTo: filters.dateEnd,
            mode: reportMode === 'financial' ? 'Financial' : 'Management',
            accountIds: requestAccountIds,
            marketplaces: requestMarketplaces,
            campaignId: selectedPhrase.campaignId,
            phrase: selectedPhrase.phrase,
          }),
        });
        if (cancelled) return;
        setHistory(response ?? null);
      } catch (nextError) {
        if (cancelled) return;
        setHistory(null);
        setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить историю фразы.');
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
  }, [filters.dateEnd, filters.dateStart, reportMode, requestAccountIds, requestMarketplaces, selectedPhrase, session?.accessToken]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.impressions += getMetricNumber(row.metrics?.impressions);
        acc.clicks += getMetricNumber(row.metrics?.clicks);
        acc.ordersCount += getMetricNumber(row.metrics?.ordersCount);
        acc.ordersAmount += getMetricNumber(row.metrics?.ordersAmount);
        acc.expense += getMetricNumber(row.metrics?.expense);
        return acc;
      },
      { impressions: 0, clicks: 0, ordersCount: 0, ordersAmount: 0, expense: 0 }
    );
  }, [rows]);

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const drr = totals.ordersAmount > 0 ? (totals.expense / totals.ordersAmount) * 100 : 0;
  const historySeries = history?.series ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Поисковые фразы</h1>
        <p className="mt-0.5 text-sm text-slate-500">Кампании, фразы и эффективность performance API</p>
      </div>

      {(analytics.error || error) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {analytics.error ?? error}
        </div>
      )}

      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        Экран использует Ozon Performance phrases. Если фильтр площадок пустой, frontend автоматически запрашивает `Ozon`.
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: 'Показы', value: formatNumber(totals.impressions), icon: Search, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Клики', value: formatNumber(totals.clicks), icon: MousePointer2, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Заказы', value: formatNumber(totals.ordersCount), icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'CTR', value: `${ctr.toFixed(1)}%`, icon: MousePointer2, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'ДРР', value: `${drr.toFixed(1)}%`, icon: Target, color: 'text-rose-600', bg: 'bg-rose-50' },
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
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Фразы и кампании</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Фраза</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Показы</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Клики</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Заказы</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Выручка</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">ДРР</th>
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
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Нет данных по поисковым фразам</td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={`${row.dimension?.id ?? row.dimension?.campaignId ?? row.dimension?.phrase ?? 'phrase'}-${index}`}
                      onClick={() =>
                        setSelectedPhrase({
                          campaignId: row.dimension?.campaignId ?? undefined,
                          phrase: row.dimension?.phrase ?? undefined,
                          label: row.dimension?.label ?? row.dimension?.phrase ?? `Фраза ${index + 1}`,
                        })
                      }
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{row.dimension?.label ?? row.dimension?.phrase ?? 'Фраза'}</div>
                        <div className="text-xs text-slate-400">{row.dimension?.campaignName ?? 'Без кампании'} · {row.dimension?.phraseType ?? '—'} · {row.dimension?.placement ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatNumber(getMetricNumber(row.metrics?.impressions))}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatNumber(getMetricNumber(row.metrics?.clicks))}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatNumber(getMetricNumber(row.metrics?.ordersCount))}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(getMetricNumber(row.metrics?.ordersAmount), true)}</td>
                      <td className="px-4 py-3 text-right text-rose-600">{getMetricNumber(row.metrics?.drr).toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-slate-700">История фразы</div>
          <div className="mt-1 text-xs text-slate-500">{selectedPhrase?.label ?? 'Выберите фразу в таблице'}</div>
          <div className="mt-4 space-y-2">
            {historyLoading ? (
              Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />)
            ) : historySeries.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-sm text-slate-500">История появится после выбора фразы.</div>
            ) : (
              historySeries.slice(-10).reverse().map((point, index) => (
                <div key={`${point.date ?? 'point'}-${index}`} className="grid grid-cols-[90px_repeat(4,minmax(0,1fr))] gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-medium text-slate-900">{point.date ?? '—'}</div>
                  <div className="text-slate-600">Показы: {formatNumber(getMetricNumber(point.impressions))}</div>
                  <div className="text-slate-600">Клики: {formatNumber(getMetricNumber(point.clicks))}</div>
                  <div className="text-slate-600">Заказы: {formatNumber(getMetricNumber(point.ordersCount))}</div>
                  <div className="text-slate-600">CTR: {getMetricNumber(point.ctr).toFixed(1)}%</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
