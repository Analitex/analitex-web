import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowDownWideNarrow, ArrowUp, ArrowUpDown, ArrowUpWideNarrow, Check, ChevronDown, Download, Loader2, RefreshCw, Save, Search, Upload } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { usePlatform } from '../context/PlatformContext';
import { useAnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import { apiDownload, apiRequest } from '../lib/api';

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

type ArticleCostsImportResponse = ArticleCostsQueryResponse & {
  date?: string | null;
  parsedRows?: number | null;
  savedRows?: number | null;
  unknownArticles?: unknown[] | null;
  errors?: unknown[] | null;
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
  currencyCode: string;
  value: CostValue | null;
};

type CostColumnId = 'product' | 'article' | 'cost' | 'fulfillment' | 'vat';
type CostSortDir = 'asc' | 'desc' | null;

type CostColumn = {
  id: CostColumnId;
  label: string;
  align?: 'left' | 'right';
  type: 'text' | 'number';
};

type CostSortState = {
  columnId: CostColumnId | null;
  direction: CostSortDir;
};

type RangeFilterState = {
  min: string;
  max: string;
};

type DropdownOption<T extends string> = {
  value: T;
  label: string;
  meta?: string;
};

const PAGE_SIZE = 30;
const COST_COLUMNS: CostColumn[] = [
  { id: 'product', label: 'Товар', align: 'left', type: 'text' },
  { id: 'article', label: 'Артикул', align: 'left', type: 'text' },
  { id: 'cost', label: 'Себестоимость', align: 'right', type: 'number' },
  { id: 'fulfillment', label: 'Фулфилмент', align: 'right', type: 'number' },
  { id: 'vat', label: 'НДС', align: 'right', type: 'number' },
];

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
  return items.map(item => {
    const costGroups = item.costs?.length ? item.costs : [{ values: [] }];
    const value =
      costGroups
        .flatMap(group => group.values ?? [])
        .find(entry => (entry.date ?? null) === snapshotDate) ??
      costGroups.flatMap(group => group.values ?? []).find(entry => entry.date == null) ??
      null;
    const article = String(item.article ?? item.nmId ?? item.id ?? '');

    return {
      key: `${item.marketplaceConnectionId ?? item.accountId ?? ''}:${article}`,
      article,
      vendorCode: item.vendorCode ?? '',
      title: item.title ?? '',
      accountId: item.accountId ?? null,
      currencyCode: value?.currencyCode ?? 'RUB',
      value,
    };
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

function getComparableValue(row: CostRow, drafts: Record<string, CostDraft>, columnId: CostColumnId) {
  const draft = drafts[row.key] ?? { cost: '', fulfillment: '', vat: '' };

  if (columnId === 'product') return row.title || row.vendorCode || row.article || '—';
  if (columnId === 'article') return row.article || '—';
  return parseNonNegativeNumber(draft[columnId]) ?? 0;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [openColumnMenuId, setOpenColumnMenuId] = useState<CostColumnId | null>(null);
  const [columnMenuSearch, setColumnMenuSearch] = useState('');
  const [draftColumnFilterValues, setDraftColumnFilterValues] = useState<string[]>([]);
  const [appliedColumnFilterValues, setAppliedColumnFilterValues] = useState<Record<string, string[]>>({});
  const [draftRangeFilter, setDraftRangeFilter] = useState<RangeFilterState>({ min: '', max: '' });
  const [appliedRangeFilters, setAppliedRangeFilters] = useState<Record<string, RangeFilterState>>({});
  const [sortState, setSortState] = useState<CostSortState>({ columnId: null, direction: null });
  const [columnMenuPosition, setColumnMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedConnection = useMemo(() => {
    const explicitConnection = shops.find(shop => shop.id === selectedConnectionId);
    if (explicitConnection) return explicitConnection;

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
  }, [filters.marketplace, filters.store, selectedConnectionId, shops]);
  const effectiveSnapshotDate = snapshotMode === 'dated' ? snapshotDate : null;
  const rows = useMemo(() => getRows(response, effectiveSnapshotDate), [effectiveSnapshotDate, response]);
  const totalRows = response?.pagination?.total ?? rows.length;
  const shopOptions = useMemo<DropdownOption<string>[]>(
    () => shops.map(shop => ({ value: shop.id, label: shop.displayName, meta: shop.marketplace })),
    [shops]
  );
  const filterOptions = useMemo(() => {
    const options = new Map<CostColumnId, string[]>();
    COST_COLUMNS.forEach(column => {
      if (column.type === 'number') {
        options.set(column.id, []);
        return;
      }

      const values = Array.from(
        new Set(rows.map(row => String(getComparableValue(row, drafts, column.id)).trim() || '—'))
      ).sort((left, right) => left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' }));
      options.set(column.id, values);
    });
    return options;
  }, [drafts, rows]);
  const filteredRows = useMemo(
    () =>
      rows.filter(row =>
        COST_COLUMNS.every(column => {
          const valueFilters = appliedColumnFilterValues[column.id];
          if (valueFilters?.length) {
            const rawValue = String(getComparableValue(row, drafts, column.id)).trim() || '—';
            if (!valueFilters.includes(rawValue)) return false;
          }

          const rangeFilter = appliedRangeFilters[column.id];
          if (rangeFilter && (rangeFilter.min || rangeFilter.max)) {
            const numericValue = Number(getComparableValue(row, drafts, column.id));
            if (!Number.isFinite(numericValue)) return false;
            if (rangeFilter.min !== '' && numericValue < Number(rangeFilter.min)) return false;
            if (rangeFilter.max !== '' && numericValue > Number(rangeFilter.max)) return false;
          }

          return true;
        })
      ),
    [appliedColumnFilterValues, appliedRangeFilters, drafts, rows]
  );
  const sortedRows = useMemo(() => {
    if (!sortState.columnId || !sortState.direction) return filteredRows;

    return [...filteredRows].sort((left, right) => {
      const leftValue = getComparableValue(left, drafts, sortState.columnId!);
      const rightValue = getComparableValue(right, drafts, sortState.columnId!);
      const compared =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'ru', { numeric: true, sensitivity: 'base' });

      return sortState.direction === 'asc' ? compared : -compared;
    });
  }, [drafts, filteredRows, sortState]);
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
  const articleCostFilters = useMemo(
    () => ({
      accountId: filteredAccountIds,
      marketplaceId: filters.marketplace.map(getMarketplaceId),
      brand: filters.brand,
      category: filters.category,
      article: filters.sku,
      productIds: filters.sku,
      brandIds: filters.brand,
      categoryIds: filters.category,
    }),
    [filteredAccountIds, filters.brand, filters.category, filters.marketplace, filters.sku]
  );

  useEffect(() => {
    if (shops.length === 0) {
      void loadSettingsTabData('shops');
    }
  }, [loadSettingsTabData, shops.length]);

  useEffect(() => {
    if (!openColumnMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!columnMenuRef.current?.contains(event.target as Node)) {
        setOpenColumnMenuId(null);
        setColumnMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openColumnMenuId]);

  useEffect(() => {
    if (!selectedConnection) {
      setSelectedConnectionId('');
      return;
    }

    if (selectedConnection.id !== selectedConnectionId) {
      setSelectedConnectionId(selectedConnection.id);
    }
  }, [selectedConnection, selectedConnectionId]);

  useEffect(() => {
    setPage(1);
  }, [filters.brand, filters.category, filters.marketplace, filters.sku, filters.store, selectedConnection?.id, snapshotMode, snapshotDate]);

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
                ...articleCostFilters,
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
    articleCostFilters,
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

  const openColumnMenu = (columnId: CostColumnId, anchor: HTMLElement) => {
    setOpenColumnMenuId(current => {
      if (current === columnId) {
        setColumnMenuPosition(null);
        return null;
      }

      setColumnMenuSearch('');
      setDraftColumnFilterValues(appliedColumnFilterValues[columnId] ?? []);
      setDraftRangeFilter(appliedRangeFilters[columnId] ?? { min: '', max: '' });
      const rect = anchor.getBoundingClientRect();
      setColumnMenuPosition({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 304),
      });
      return columnId;
    });
  };

  const applyColumnMenu = (columnId: CostColumnId) => {
    setAppliedColumnFilterValues(current => ({ ...current, [columnId]: draftColumnFilterValues }));
    setAppliedRangeFilters(current => ({ ...current, [columnId]: draftRangeFilter }));
    setOpenColumnMenuId(null);
    setColumnMenuPosition(null);
  };

  const resetColumnMenu = (columnId: CostColumnId) => {
    setDraftColumnFilterValues([]);
    setDraftRangeFilter({ min: '', max: '' });
    setAppliedColumnFilterValues(current => {
      const next = { ...current };
      delete next[columnId];
      return next;
    });
    setAppliedRangeFilters(current => {
      const next = { ...current };
      delete next[columnId];
      return next;
    });
    if (sortState.columnId === columnId) setSortState({ columnId: null, direction: null });
    setOpenColumnMenuId(null);
    setColumnMenuPosition(null);
  };

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

  const exportCosts = async () => {
    if (!session?.accessToken || !selectedConnection) return;

    setExporting(true);
    setError(null);
    try {
      const { blob, filename } = await apiDownload(
        `/config/marketplace-connections/${selectedConnection.id}/article-costs/export`,
        {
          token: session.accessToken,
          method: 'POST',
          body: JSON.stringify({
            date: effectiveSnapshotDate ?? undefined,
            filters: articleCostFilters,
          }),
        }
      );
      downloadBlob(blob, filename ?? `article-costs-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Не удалось экспортировать файл себестоимости.');
    } finally {
      setExporting(false);
    }
  };

  const importCosts = async (file: File | null | undefined) => {
    if (!file || !session?.accessToken || !selectedConnection) return;

    setImporting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const importResponse = await apiRequest<ArticleCostsImportResponse>(
        `/config/marketplace-connections/${selectedConnection.id}/article-costs/import`,
        {
          token: session.accessToken,
          method: 'POST',
          body: form,
        }
      );
      const nextRows = getRows(importResponse, importResponse.date ?? null);
      setResponse(importResponse);
      setDrafts(getDrafts(nextRows));
      if (importResponse.date) {
        setSnapshotMode('dated');
        setSnapshotDate(importResponse.date);
      } else {
        setSnapshotMode('current');
      }
      enqueueNotification({
        tone: importResponse.unknownArticles?.length || importResponse.errors?.length ? 'warning' : 'success',
        title: 'Импорт себестоимости завершен',
        message: `Сохранено строк: ${importResponse.savedRows ?? 0}. Ошибок: ${importResponse.errors?.length ?? 0}. Не найдены: ${importResponse.unknownArticles?.length ?? 0}.`,
      });
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Не удалось импортировать файл себестоимости.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[540px]">
          <label>
            <div className="mb-2 text-sm font-medium text-slate-600">Магазин</div>
            <FancyDropdown
              value={selectedConnection?.id ?? ''}
              onChange={setSelectedConnectionId}
              options={shopOptions}
              placeholder="Нет магазинов"
              disabled={shops.length === 0}
            />
          </label>

          <label>
            <div className="mb-2 text-sm font-medium text-slate-600">Снимок</div>
            <FancyDropdown
              value={snapshotMode}
              onChange={setSnapshotMode}
              options={[
                { value: 'current', label: 'Текущий' },
                { value: 'dated', label: 'На дату' },
              ]}
            />
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
              {loading ? 'Загрузка строк...' : `Строк: ${totalRows}. Показано: ${sortedRows.length}. Изменено: ${changedRows.length}.`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={event => void importCosts(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedConnection || importing || exporting}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Импорт XLSX
            </button>
            <button
              type="button"
              onClick={() => void exportCosts()}
              disabled={!selectedConnection || exporting || importing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Экспорт XLSX
            </button>
            <button
              type="button"
              onClick={() => setReloadToken(current => current + 1)}
              disabled={loading || importing || exporting}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Обновить
            </button>
            <button
              type="button"
              onClick={() => void saveCosts()}
              disabled={saving || importing || exporting || changedRows.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Сохранить
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {COST_COLUMNS.map(column => {
                  const hasValueFilter = (appliedColumnFilterValues[column.id]?.length ?? 0) > 0;
                  const rangeFilter = appliedRangeFilters[column.id];
                  const hasRangeFilter = Boolean(rangeFilter?.min || rangeFilter?.max);
                  const isActive = openColumnMenuId === column.id || sortState.columnId === column.id || hasValueFilter || hasRangeFilter;

                  return (
                    <th key={column.id} className={`${column.id === 'product' ? 'px-5' : 'px-4'} py-3 ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                      <div className={`flex ${column.align === 'right' ? 'justify-end' : ''}`}>
                        <button
                          type="button"
                          onClick={event => openColumnMenu(column.id, event.currentTarget)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white ${
                            isActive ? 'bg-white text-slate-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-500'
                          }`}
                        >
                          <span>{column.label}</span>
                          {sortState.columnId === column.id && sortState.direction === 'asc' && <ArrowUp size={12} className="text-blue-600" />}
                          {sortState.columnId === column.id && sortState.direction === 'desc' && <ArrowDown size={12} className="text-blue-600" />}
                          {(hasValueFilter || hasRangeFilter) && <Search size={12} className="text-blue-600" />}
                          {sortState.columnId !== column.id && !hasValueFilter && !hasRangeFilter && <ArrowUpDown size={12} className="text-slate-400" />}
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    <Loader2 size={18} className="mx-auto mb-2 animate-spin text-blue-600" />
                    Загружаем товары...
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    Нет товаров для выбранных фильтров.
                  </td>
                </tr>
              ) : (
                sortedRows.map(row => {
                  const draft = drafts[row.key] ?? { cost: '', fulfillment: '', vat: '' };

                  return (
                    <tr key={row.key} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="max-w-sm font-medium text-slate-900">{row.title || row.vendorCode || row.article}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.vendorCode || 'SKU не указан'}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{row.article || '-'}</td>
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {openColumnMenuId && columnMenuPosition && (
          <div ref={columnMenuRef} className="fixed z-[140]" style={{ top: columnMenuPosition.top, left: columnMenuPosition.left }}>
            <CostColumnMenu
              column={COST_COLUMNS.find(column => column.id === openColumnMenuId) ?? COST_COLUMNS[0]}
              sort={sortState}
              search={columnMenuSearch}
              onSearchChange={setColumnMenuSearch}
              filterOptions={filterOptions.get(openColumnMenuId) ?? []}
              selectedValues={draftColumnFilterValues}
              onSelectedValuesChange={setDraftColumnFilterValues}
              rangeFilter={draftRangeFilter}
              onRangeChange={setDraftRangeFilter}
              onSortChange={direction => setSortState({ columnId: openColumnMenuId, direction })}
              onApply={() => applyColumnMenu(openColumnMenuId)}
              onReset={() => resetColumnMenu(openColumnMenuId)}
            />
          </div>
        )}

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

function CostColumnMenu({
  column,
  sort,
  search,
  onSearchChange,
  filterOptions,
  selectedValues,
  onSelectedValuesChange,
  rangeFilter,
  onRangeChange,
  onSortChange,
  onApply,
  onReset,
}: {
  column: CostColumn;
  sort: CostSortState;
  search: string;
  onSearchChange: (value: string) => void;
  filterOptions: string[];
  selectedValues: string[];
  onSelectedValuesChange: (values: string[]) => void;
  rangeFilter: RangeFilterState;
  onRangeChange: (value: RangeFilterState) => void;
  onSortChange: (direction: CostSortDir) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const filteredOptions = filterOptions.filter(option =>
    option.toLowerCase().includes(search.trim().toLowerCase())
  );
  const allSelected = filteredOptions.length > 0 && filteredOptions.every(option => selectedValues.includes(option));

  return (
    <div className="w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{column.label}</div>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onSortChange('asc')}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
            sort.columnId === column.id && sort.direction === 'asc' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Сортировать по возрастанию</span>
          <ArrowUpWideNarrow size={14} />
        </button>
        <button
          type="button"
          onClick={() => onSortChange('desc')}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
            sort.columnId === column.id && sort.direction === 'desc' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Сортировать по убыванию</span>
          <ArrowDownWideNarrow size={14} />
        </button>
      </div>

      {column.type === 'number' ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="mb-2 text-xs font-medium text-slate-500">Диапазон значений</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={rangeFilter.min}
              onChange={event => onRangeChange({ ...rangeFilter, min: event.target.value })}
              placeholder="От"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
            />
            <input
              value={rangeFilter.max}
              onChange={event => onRangeChange({ ...rangeFilter, max: event.target.value })}
              placeholder="До"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Поиск"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-300"
            />
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  onSelectedValuesChange(
                    allSelected
                      ? selectedValues.filter(value => !filteredOptions.includes(value))
                      : [...new Set([...selectedValues, ...filteredOptions])]
                  )
                }
              />
              Выбрать все
            </label>
            {filteredOptions.map(option => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() =>
                    onSelectedValuesChange(
                      selectedValues.includes(option)
                        ? selectedValues.filter(value => value !== option)
                        : [...selectedValues, option]
                    )
                  }
                />
                <span className="truncate">{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onApply} className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
          Применить
        </button>
        <button type="button" onClick={onReset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
          Сбросить
        </button>
      </div>
    </div>
  );
}

function FancyDropdown<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Выберите',
  disabled = false,
}: {
  value: T | string;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(current => !current)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 hover:bg-slate-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className="min-w-0">
          <span className="block truncate">{selectedOption?.label ?? placeholder}</span>
          {selectedOption?.meta && <span className="mt-0.5 block truncate text-xs text-slate-400">{selectedOption.meta}</span>}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full z-[90] mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl">
          {options.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-slate-400">{placeholder}</div>
          ) : (
            options.map(option => {
              const active = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{option.label}</span>
                    {option.meta && <span className="mt-0.5 block truncate text-xs text-slate-400">{option.meta}</span>}
                  </span>
                  {active && <Check size={15} className="shrink-0 text-blue-600" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
