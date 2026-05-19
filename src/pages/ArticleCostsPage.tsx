import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Save } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { usePlatform } from '../context/PlatformContext';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { apiRequest } from '../lib/api';

type CostValue = {
  date?: string | null;
  cost?: number | null;
  fulfillment?: number | null;
  vat?: number | null;
  currencyCode?: string | null;
};

type ArticleCostSize = {
  sizeId?: number | null;
  size_id?: number | null;
  size?: string | null;
  barcode?: string | null;
  values?: CostValue[] | null;
};

type ArticleCostItem = {
  id?: number | string | null;
  nmId?: number | string | null;
  article?: string | null;
  vendorCode?: string | null;
  title?: string | null;
  accountId?: number | string | null;
  marketplaceConnectionId?: string | null;
  brand?: string | null;
  category?: string | null;
  costs?: ArticleCostSize[] | null;
};

type ArticleCostsQueryResponse = {
  items?: ArticleCostItem[] | null;
  costs?: {
    items?: ArticleCostItem[] | null;
    dates?: (string | null)[] | null;
    filterData?: unknown;
    filters?: unknown;
  } | null;
  pagination?: { total?: number; page?: number; limit?: number } | null;
  filterData?: unknown;
  filters?: unknown;
};

type CostDraft = {
  cost: string;
  fulfillment: string;
  vat: string;
};

type CostRow = {
  key: string;
  article: string;
  vendorCode: string;
  title: string;
  accountId: number | string | null;
  sizeId: number | null;
  size: string;
  barcode: string;
  currencyCode: string;
  value: CostValue | null;
};

const PAGE_SIZE = 30;

function asMoneyInput(value: number | null | undefined) {
  return value == null ? '' : String(value);
}

function parseNonNegativeNumber(value: string) {
  if (!value.trim()) return 0;
  const normalized = Number(value.replace(',', '.'));
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : null;
}

function getMarketplaceId(marketplace: string) {
  if (marketplace === 'Ozon') return '1';
  if (marketplace === 'Wildberries') return '0';
  return marketplace;
}

function getRows(response: ArticleCostsQueryResponse | null, snapshotDate: string | null): CostRow[] {
  const items = response?.costs?.items ?? response?.items ?? [];
  return items.flatMap(item => {
    const costGroups = item.costs?.length ? item.costs : [{ values: [] }];
    return costGroups.map(group => {
      const values = group.values ?? [];
      const value = values.find(entry => (entry.date ?? null) === snapshotDate) ?? values.find(entry => entry.date == null) ?? null;
      const article = String(item.article ?? item.nmId ?? item.id ?? '');
      const barcode = group.barcode ?? '';
      const sizeId = group.sizeId ?? group.size_id ?? null;
      const size = group.size ?? '';

      return {
        key: `${article}:${barcode}:${sizeId ?? ''}:${size}`,
        article,
        vendorCode: item.vendorCode ?? '',
        title: item.title ?? '',
        accountId: item.accountId ?? null,
        sizeId,
        size,
        barcode,
        currencyCode: value?.currencyCode ?? 'RUB',
        value,
      };
    });
  });
}

function getDrafts(rows: CostRow[]) {
  return Object.fromEntries(
    rows.map(row => [
      row.key,
      {
        cost: asMoneyInput(row.value?.cost),
        fulfillment: asMoneyInput(row.value?.fulfillment),
        vat: asMoneyInput(row.value?.vat),
      },
    ])
  ) as Record<string, CostDraft>;
}

export function ArticleCostsPage() {
  const { filters } = useFilters();
  const { session, connections, selectedOrganizationId, loadSettingsTabData, enqueueNotification } = usePlatform();
  const analytics = useAnalyticsWorkspaceData({ enabled: true, includeWorkspaceMetrics: false });
  const shops = useMemo(
    () => connections.filter(connection => connection.organizationId === selectedOrganizationId),
    [connections, selectedOrganizationId]
  );
  const [snapshotMode, setSnapshotMode] = useState<'current' | 'dated'>('current');
  const [snapshotDate, setSnapshotDate] = useState(filters.dateEnd);
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<ArticleCostsQueryResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, CostDraft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const selectedConnection = useMemo(() => {
    const selectedStores = new Set(filters.store);
    const selectedMarketplaces = new Set(filters.marketplace);

    return (
      shops.find(shop => {
        const matchesStore = selectedStores.size === 0 || selectedStores.has(shop.displayName);
        const matchesMarketplace = selectedMarketplaces.size === 0 || selectedMarketplaces.has(shop.marketplace);
        return matchesStore && matchesMarketplace;
      }) ??
      shops.find(shop => selectedMarketplaces.size === 0 || selectedMarketplaces.has(shop.marketplace)) ??
      shops[0] ??
      null
    );
  }, [filters.marketplace, filters.store, shops]);
  const effectiveSnapshotDate = snapshotMode === 'dated' ? snapshotDate : null;
  const rows = useMemo(() => getRows(response, effectiveSnapshotDate), [effectiveSnapshotDate, response]);
  const totalRows = response?.pagination?.total ?? rows.length;
  const filteredAccountIds = useMemo(
    () => {
      if (filters.store.length === 0) return [];
      const accountOptions = analytics.filterOptions?.accounts ?? [];
      return accountOptions
        .filter(account => {
          const matchesMarketplace = filters.marketplace.length === 0 || filters.marketplace.includes(account.marketplace ?? '');
          const matchesStore = filters.store.length === 0 || filters.store.includes(account.label ?? '');
          return matchesMarketplace && matchesStore;
        })
        .map(account => String(account.id));
    },
    [analytics.filterOptions?.accounts, filters.marketplace, filters.store]
  );

  useEffect(() => {
    if (shops.length === 0) {
      void loadSettingsTabData('shops');
    }
  }, [loadSettingsTabData, shops.length]);

  useEffect(() => {
    setPage(1);
  }, [filters.brand, filters.category, filters.marketplace, filters.sku, filters.store, selectedConnection, snapshotMode, snapshotDate]);

  useEffect(() => {
    if (!session?.accessToken || !selectedConnection) {
      setResponse(null);
      setDrafts({});
      return;
    }

    let cancelled = false;
    const loadCosts = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextResponse = await apiRequest<ArticleCostsQueryResponse>(
          `/config/marketplace-connections/${selectedConnection.id}/article-costs/query`,
          {
            token: session.accessToken,
            method: 'POST',
            body: JSON.stringify({
              filters: {
                accountId: filteredAccountIds,
                marketplaceId: filters.marketplace.map(getMarketplaceId),
                brand: filters.brand,
                category: filters.category,
                article: filters.sku,
                productIds: filters.sku,
                brandIds: filters.brand,
                categoryIds: filters.category,
              },
              page,
              limit: PAGE_SIZE,
            }),
          }
        );

        if (cancelled) return;
        const nextRows = getRows(nextResponse, effectiveSnapshotDate);
        setResponse(nextResponse);
        setDrafts(getDrafts(nextRows));
      } catch (requestError) {
        if (cancelled) return;
        setResponse(null);
        setDrafts({});
        setError(requestError instanceof Error ? requestError.message : 'Не удалось загрузить себестоимость.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadCosts();
    return () => {
      cancelled = true;
    };
  }, [
    effectiveSnapshotDate,
    filteredAccountIds,
    filters.brand,
    filters.category,
    filters.marketplace,
    filters.sku,
    page,
    reloadToken,
    selectedConnection,
    session?.accessToken,
  ]);

  const changedRows = rows.filter(row => {
    const draft = drafts[row.key];
    if (!draft) return false;
    return (
      draft.cost !== asMoneyInput(row.value?.cost) ||
      draft.fulfillment !== asMoneyInput(row.value?.fulfillment) ||
      draft.vat !== asMoneyInput(row.value?.vat)
    );
  });

  const saveCosts = async () => {
    if (!session?.accessToken || !selectedConnection || changedRows.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const items = changedRows.map(row => {
        const draft = drafts[row.key];
        const cost = parseNonNegativeNumber(draft.cost);
        const fulfillment = parseNonNegativeNumber(draft.fulfillment);
        const vat = parseNonNegativeNumber(draft.vat);

        if (cost == null || fulfillment == null || vat == null) {
          throw new Error('Себестоимость, фулфилмент и НДС должны быть неотрицательными числами.');
        }

        return {
          article: row.article,
          cost,
          fulfillment,
          vat,
          date: effectiveSnapshotDate,
        };
      });

      const uploadResponse = await apiRequest<ArticleCostsQueryResponse>(
        `/config/marketplace-connections/${selectedConnection.id}/article-costs/upload`,
        {
          token: session.accessToken,
          method: 'POST',
          body: JSON.stringify({
            items,
          }),
        }
      );
      const nextRows = getRows(uploadResponse, effectiveSnapshotDate);
      setResponse(uploadResponse);
      setDrafts(getDrafts(nextRows));
      enqueueNotification({
        tone: 'success',
        title: 'Себестоимость сохранена',
        message: `Обновлено строк: ${items.length}.`,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить себестоимость.');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  return (
    <section className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-blue-600">Товары</div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Себестоимость</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Таблица берет товары из синхронизированного каталога и накладывает текущие или исторические значения себестоимости.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
          <label>
            <div className="mb-2 text-sm font-medium text-slate-600">Снимок</div>
            <select
              value={snapshotMode}
              onChange={event => setSnapshotMode(event.target.value as 'current' | 'dated')}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="current">Текущий</option>
              <option value="dated">На дату</option>
            </select>
          </label>

          <label>
            <div className="mb-2 text-sm font-medium text-slate-600">Дата</div>
            <input
              type="date"
              value={snapshotDate}
              disabled={snapshotMode === 'current'}
              onChange={event => setSnapshotDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Каталог товаров</div>
            <div className="mt-1 text-xs text-slate-500">
              {loading ? 'Загрузка строк...' : `Строк: ${totalRows}. Изменено: ${changedRows.length}.`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReloadToken(current => current + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Обновить
            </button>
            <button
              type="button"
              onClick={() => void saveCosts()}
              disabled={saving || changedRows.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Сохранить
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Товар</th>
                <th className="px-4 py-3">Артикул</th>
                <th className="px-4 py-3">Размер</th>
                <th className="px-4 py-3">Баркод</th>
                <th className="px-4 py-3 text-right">Себестоимость</th>
                <th className="px-4 py-3 text-right">Фулфилмент</th>
                <th className="px-4 py-3 text-right">НДС</th>
                <th className="px-4 py-3 text-right">Итого</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    <Loader2 size={18} className="mx-auto mb-2 animate-spin text-blue-600" />
                    Загружаем товары...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    Нет товаров для выбранных фильтров.
                  </td>
                </tr>
              ) : (
                rows.map(row => {
                  const draft = drafts[row.key] ?? { cost: '', fulfillment: '', vat: '' };
                  const cost = parseNonNegativeNumber(draft.cost) ?? 0;
                  const fulfillment = parseNonNegativeNumber(draft.fulfillment) ?? 0;
                  const vat = parseNonNegativeNumber(draft.vat) ?? 0;

                  return (
                    <tr key={row.key} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="max-w-sm font-medium text-slate-900">{row.title || row.vendorCode || row.article}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.vendorCode || 'SKU не указан'}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{row.article || '-'}</td>
                      <td className="px-4 py-4 text-slate-700">{row.size || '-'}</td>
                      <td className="px-4 py-4 text-slate-700">{row.barcode || '-'}</td>
                      {(['cost', 'fulfillment', 'vat'] as const).map(field => (
                        <td key={field} className="px-4 py-3">
                          <input
                            inputMode="decimal"
                            value={draft[field]}
                            onChange={event =>
                              setDrafts(current => ({
                                ...current,
                                [row.key]: {
                                  ...draft,
                                  [field]: event.target.value,
                                },
                              }))
                            }
                            className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-4 text-right font-semibold text-slate-900">
                        {(cost + fulfillment + vat).toLocaleString('ru-RU')} {row.currencyCode}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            Страница {page} из {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(current => Math.max(1, current - 1))}
              disabled={page === 1 || loading}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => setPage(current => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Вперед
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
