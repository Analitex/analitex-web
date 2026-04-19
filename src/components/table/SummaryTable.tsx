import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowDownWideNarrow, ArrowUp, ArrowUpDown, ArrowUpWideNarrow, Download, GripVertical, Search, Settings2 } from 'lucide-react';
import type { SummaryRow } from '../../types';
import { formatCurrency, formatNumber, formatPercent } from '../../lib/calculations';

interface Column {
  key: keyof SummaryRow;
  label: string;
  format: (v: number | string) => string;
  align?: 'right' | 'left';
  sortable?: boolean;
  sticky?: boolean;
}

type SortDir = 'asc' | 'desc' | null;

interface SortState {
  key: keyof SummaryRow;
  dir: SortDir;
}

interface RangeFilterState {
  min: string;
  max: string;
}

const COLUMNS: Column[] = [
  { key: 'periodLabel', label: 'Период', format: v => String(v), align: 'left', sortable: true, sticky: true },
  { key: 'revenue', label: 'Реализация', format: v => formatCurrency(Number(v), true), align: 'right', sortable: true },
  { key: 'sales', label: 'Продажи', format: v => formatNumber(Number(v)), align: 'right', sortable: true },
  { key: 'orders', label: 'Заказы', format: v => formatNumber(Number(v)), align: 'right', sortable: true },
  { key: 'returns', label: 'Возвраты', format: v => formatNumber(Number(v)), align: 'right', sortable: true },
  { key: 'avgPriceBeforeDiscount', label: 'Цена без скидки', format: v => formatCurrency(Number(v)), align: 'right', sortable: true },
  { key: 'avgSalePrice', label: 'Цена продажи', format: v => formatCurrency(Number(v)), align: 'right', sortable: true },
  { key: 'payouts', label: 'Выплаты', format: v => formatCurrency(Number(v), true), align: 'right', sortable: true },
  { key: 'operationalCosts', label: 'Опер. расходы', format: v => formatCurrency(Number(v), true), align: 'right', sortable: true },
  { key: 'profit', label: 'Прибыль', format: v => formatCurrency(Number(v), true), align: 'right', sortable: true },
  { key: 'buyoutRate', label: '% Выкупа', format: v => formatPercent(Number(v), 1).replace('+', ''), align: 'right', sortable: true },
];

interface SummaryTableProps {
  title?: string;
  rows: SummaryRow[];
  loading?: boolean;
}

function SkeletonRow({ visibleColumns }: { visibleColumns: Column[] }) {
  return (
    <tr>
      {visibleColumns.map((column, index) => (
        <td
          key={String(column.key)}
          className={`px-4 py-3 ${column.sticky ? 'sticky left-0 z-10 bg-white shadow-[8px_0_16px_-16px_rgba(15,23,42,0.28)]' : ''}`}
        >
          <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${62 + ((index * 11) % 28)}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SummaryTable({ title = 'SummaryReport', rows, loading }: SummaryTableProps) {
  const [sort, setSort] = useState<SortState>({ key: 'period', dir: null });
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({ periodLabel: 220 });
  const [columnOrder, setColumnOrder] = useState<Array<keyof SummaryRow>>(COLUMNS.map(column => column.key));
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Array<keyof SummaryRow>>(COLUMNS.map(column => column.key));
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [draggedColumnKey, setDraggedColumnKey] = useState<keyof SummaryRow | null>(null);
  const [openColumnMenuKey, setOpenColumnMenuKey] = useState<keyof SummaryRow | null>(null);
  const [columnMenuSearch, setColumnMenuSearch] = useState('');
  const [draftValueFilter, setDraftValueFilter] = useState<string[]>([]);
  const [appliedValueFilters, setAppliedValueFilters] = useState<Record<string, string[]>>({});
  const [draftRangeFilter, setDraftRangeFilter] = useState<RangeFilterState>({ min: '', max: '' });
  const [appliedRangeFilters, setAppliedRangeFilters] = useState<Record<string, RangeFilterState>>({});
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [settingsDraftOrder, setSettingsDraftOrder] = useState<Array<keyof SummaryRow>>(columnOrder);
  const [settingsDraftVisible, setSettingsDraftVisible] = useState<Array<keyof SummaryRow>>(visibleColumnKeys);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<{ key: keyof SummaryRow; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!openColumnMenuKey) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!columnMenuRef.current?.contains(event.target as Node)) {
        setOpenColumnMenuKey(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openColumnMenuKey]);

  useEffect(() => {
    if (!isColumnSettingsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setIsColumnSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isColumnSettingsOpen]);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const delta = event.clientX - resizeState.startX;
      const nextWidth = Math.max(140, resizeState.startWidth + delta);
      setColumnWidths(current => ({ ...current, [String(resizeState.key)]: nextWidth }));
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
    };

    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    return () => {
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
    };
  }, []);

  const orderedColumns = useMemo(() => {
    const rank = new Map(columnOrder.map((key, index) => [key, index]));
    return [...COLUMNS]
      .filter(column => visibleColumnKeys.includes(column.key))
      .sort((left, right) => (rank.get(left.key) ?? 999) - (rank.get(right.key) ?? 999));
  }, [columnOrder, visibleColumnKeys]);

  const filterOptions = useMemo(() => {
    const options = new Map<keyof SummaryRow, string[]>();
    COLUMNS.forEach(column => {
      const values = Array.from(
        new Set(rows.map(row => String(getComparableValue(row, column.key) ?? '—').trim() || '—'))
      ).sort((left, right) => left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' }));
      options.set(column.key, values);
    });
    return options;
  }, [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter(row =>
        COLUMNS.every(column => {
          const valueFilter = appliedValueFilters[String(column.key)];
          if (valueFilter?.length) {
            const raw = String(getComparableValue(row, column.key) ?? '—').trim() || '—';
            if (!valueFilter.includes(raw)) return false;
          }

          const rangeFilter = appliedRangeFilters[String(column.key)];
          if (rangeFilter && (rangeFilter.min || rangeFilter.max)) {
            const numericValue = Number(getComparableValue(row, column.key));
            if (!Number.isFinite(numericValue)) return false;
            if (rangeFilter.min !== '' && numericValue < Number(rangeFilter.min)) return false;
            if (rangeFilter.max !== '' && numericValue > Number(rangeFilter.max)) return false;
          }

          return true;
        })
      ),
    [appliedRangeFilters, appliedValueFilters, rows]
  );

  const sortedRows = useMemo(() => {
    if (!sort.dir) return filteredRows;

    return [...filteredRows].sort((left, right) => {
      const leftValue = getComparableValue(left, sort.key);
      const rightValue = getComparableValue(right, sort.key);

      const compared =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'ru', { numeric: true, sensitivity: 'base' });

      return sort.dir === 'asc' ? compared : -compared;
    });
  }, [filteredRows, sort]);

  const rowDiffs = useMemo(() => {
    const diffs = new Map<string, Partial<Record<keyof SummaryRow, number | null>>>();
    sortedRows.forEach((row, index) => {
      const nextRow = sortedRows[index + 1];
      const rowDiff: Partial<Record<keyof SummaryRow, number | null>> = {};
      COLUMNS.forEach(column => {
        const currentValue = row[column.key];
        const nextValue = nextRow?.[column.key];
        rowDiff[column.key] =
          typeof currentValue === 'number' && typeof nextValue === 'number'
            ? currentValue - nextValue
            : null;
      });
      diffs.set(row.period, rowDiff);
    });
    return diffs;
  }, [sortedRows]);

  const openColumnMenu = (key: keyof SummaryRow, anchor: HTMLElement) => {
    setOpenColumnMenuKey(current => {
      if (current === key) {
        setMenuPosition(null);
        return null;
      }

      setColumnMenuSearch('');
      setDraftValueFilter(appliedValueFilters[String(key)] ?? []);
      setDraftRangeFilter(appliedRangeFilters[String(key)] ?? { min: '', max: '' });
      const rect = anchor.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 304),
      });
      return key;
    });
  };

  const applyColumnMenu = (key: keyof SummaryRow) => {
    setAppliedValueFilters(current => ({ ...current, [String(key)]: draftValueFilter }));
    setAppliedRangeFilters(current => ({ ...current, [String(key)]: draftRangeFilter }));
    setOpenColumnMenuKey(null);
    setMenuPosition(null);
  };

  const resetColumnMenu = (key: keyof SummaryRow) => {
    setDraftValueFilter([]);
    setDraftRangeFilter({ min: '', max: '' });
    setAppliedValueFilters(current => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
    setAppliedRangeFilters(current => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
    if (sort.key === key) setSort({ key: 'period', dir: null });
    setOpenColumnMenuKey(null);
    setMenuPosition(null);
  };

  const openColumnSettings = () => {
    setSettingsDraftOrder(columnOrder);
    setSettingsDraftVisible(visibleColumnKeys);
    setColumnSearch('');
    setIsColumnSettingsOpen(true);
  };

  const applyColumnSettings = () => {
    setColumnOrder(settingsDraftOrder);
    setVisibleColumnKeys(settingsDraftVisible);
    setIsColumnSettingsOpen(false);
  };

  const exportCsv = () => {
    const headers = orderedColumns.map(column => column.label).join(',');
    const body = sortedRows
      .map(row =>
        orderedColumns
          .map(column => `"${String(getComparableValue(row, column.key) ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([`\uFEFF${headers}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summary-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const settingsColumns = useMemo(
    () =>
      [...COLUMNS]
        .sort((left, right) => settingsDraftOrder.indexOf(left.key) - settingsDraftOrder.indexOf(right.key))
        .filter(column => column.label.toLowerCase().includes(columnSearch.trim().toLowerCase())),
    [columnSearch, settingsDraftOrder]
  );

  const moveDraftColumn = (draggedKey: keyof SummaryRow, targetKey: keyof SummaryRow) => {
    if (draggedKey === targetKey) return;

    setSettingsDraftOrder(current => {
      const next = [...current];
      const from = next.indexOf(draggedKey);
      const to = next.indexOf(targetKey);
      if (from === -1 || to === -1) return current;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const getColumnWidth = (column: Column) => {
    if (columnWidths[String(column.key)]) return columnWidths[String(column.key)];
    if (column.sticky) return 220;
    return column.align === 'right' ? 170 : 180;
  };

  return (
    <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-0.5 text-xs text-slate-500">{sortedRows.length} строк после фильтрации</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openColumnSettings}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Settings2 size={14} />
              Настройки колонок
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Download size={14} />
              Экспорт
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-visible">
        <div className="max-h-[720px] overflow-auto">
          <table className="min-w-[1400px] w-full text-sm">
            <thead className="sticky top-0 z-30 bg-white">
              <tr className="border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                {orderedColumns.map(column => (
                  <th
                    key={String(column.key)}
                    className={`group border-b border-slate-200 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    } ${column.sticky ? 'sticky left-0 z-20 bg-slate-50/95 shadow-[8px_0_16px_-16px_rgba(15,23,42,0.28)]' : ''}`}
                    style={{ minWidth: getColumnWidth(column), width: getColumnWidth(column) }}
                  >
                    <div className={`relative flex ${column.align === 'right' ? 'justify-end' : ''}`}>
                      <button
                        type="button"
                        onClick={event => openColumnMenu(column.key, event.currentTarget)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white ${
                          openColumnMenuKey === column.key ||
                          sort.key === column.key ||
                          (appliedValueFilters[String(column.key)]?.length ?? 0) > 0 ||
                          appliedRangeFilters[String(column.key)]?.min ||
                          appliedRangeFilters[String(column.key)]?.max
                            ? 'bg-white text-slate-700 shadow-sm ring-1 ring-blue-200'
                            : 'text-slate-500'
                        }`}
                      >
                        <span>{column.label}</span>
                        {sort.key === column.key && sort.dir === 'asc' && <ArrowUp size={12} className="text-blue-600" />}
                        {sort.key === column.key && sort.dir === 'desc' && <ArrowDown size={12} className="text-blue-600" />}
                        {(appliedValueFilters[String(column.key)]?.length ?? 0) > 0 && <Search size={12} className="text-blue-600" />}
                        {sort.key !== column.key && !(appliedValueFilters[String(column.key)]?.length ?? 0) && <ArrowUpDown size={12} className="text-slate-400" />}
                      </button>
                      <button
                        type="button"
                        onMouseDown={event => {
                          event.preventDefault();
                          event.stopPropagation();
                          resizeStateRef.current = {
                            key: column.key,
                            startX: event.clientX,
                            startWidth: getColumnWidth(column),
                          };
                        }}
                        className="absolute -right-2 top-1/2 h-8 w-4 -translate-y-1/2 cursor-col-resize rounded opacity-0 transition-opacity hover:bg-blue-100 group-hover:opacity-100"
                        aria-label={`Изменить ширину колонки ${column.label}`}
                      >
                        <span className="absolute left-1/2 top-1/2 h-5 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-300" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} visibleColumns={orderedColumns} />)
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={orderedColumns.length} className="py-12 text-center text-sm text-slate-400">
                    Нет данных
                  </td>
                </tr>
              ) : (
                sortedRows.map(row => (
                  <tr key={row.period} className="transition-colors hover:bg-slate-50/70">
                    {orderedColumns.map(column => {
                      const rawValue = row[column.key];
                      const formatted = typeof rawValue === 'number' ? column.format(rawValue) : String(rawValue ?? '—');
                      const diffValue = rowDiffs.get(row.period)?.[column.key];
                      const isNumeric = typeof rawValue === 'number';
                      const diffText =
                        typeof diffValue === 'number' && Number.isFinite(diffValue)
                          ? `${diffValue >= 0 ? '+' : ''}${formatDiffValue(diffValue, column.key)}`
                          : null;

                      return (
                        <td
                          key={String(column.key)}
                          className={`px-4 py-3 ${
                            column.align === 'right' ? 'text-right' : 'text-left'
                          } ${column.sticky ? 'sticky left-0 z-10 bg-white shadow-[8px_0_16px_-16px_rgba(15,23,42,0.28)]' : ''}`}
                          style={{ minWidth: getColumnWidth(column), width: getColumnWidth(column) }}
                        >
                          <div className={column.key === 'profit' && typeof rawValue === 'number' ? (rawValue >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-700'}>
                            <div className={`font-medium ${column.key === 'profit' ? 'font-semibold' : ''} ${column.key === 'periodLabel' ? 'whitespace-normal break-words leading-5' : 'whitespace-nowrap'}`}>{formatted}</div>
                            {isNumeric && diffText && (
                              <div className={`mt-0.5 text-[11px] font-medium ${diffValue! >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {diffText}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>

            {!loading && sortedRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  {orderedColumns.map((column, index) => {
                    if (index === 0) {
                      return (
                        <td
                          key={String(column.key)}
                          className="sticky left-0 z-20 bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-600 shadow-[8px_0_16px_-16px_rgba(15,23,42,0.28)]"
                          style={{ minWidth: getColumnWidth(column), width: getColumnWidth(column) }}
                        >
                          Итого
                        </td>
                      );
                    }

                    const sampleValue = sortedRows[0][column.key];
                    if (typeof sampleValue !== 'number') {
                      return <td key={String(column.key)} className="px-4 py-3 text-right text-xs text-slate-400">—</td>;
                    }

                    const isAverageColumn = ['avgPriceBeforeDiscount', 'avgSalePrice', 'buyoutRate'].includes(String(column.key));
                    const value = isAverageColumn
                      ? sortedRows.reduce((sum, row) => sum + Number(row[column.key] || 0), 0) / Math.max(sortedRows.length, 1)
                      : sortedRows.reduce((sum, row) => sum + Number(row[column.key] || 0), 0);

                    return (
                      <td
                        key={String(column.key)}
                        className={`px-4 py-3 text-right text-xs font-bold ${
                          column.key === 'profit' ? (value >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-700'
                        }`}
                        style={{ minWidth: getColumnWidth(column), width: getColumnWidth(column) }}
                      >
                        {column.format(value)}
                        {isAverageColumn && <span className="ml-1 font-medium text-slate-400">ср.</span>}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {openColumnMenuKey && menuPosition && (
        <div ref={columnMenuRef} className="fixed z-[140]" style={{ top: menuPosition.top, left: menuPosition.left }}>
          <ColumnMenu
            column={COLUMNS.find(column => column.key === openColumnMenuKey) ?? COLUMNS[0]}
            sort={sort}
            search={columnMenuSearch}
            onSearchChange={setColumnMenuSearch}
            filterOptions={filterOptions.get(openColumnMenuKey) ?? []}
            selectedValues={draftValueFilter}
            onSelectedValuesChange={setDraftValueFilter}
            rangeFilter={draftRangeFilter}
            onRangeChange={setDraftRangeFilter}
            onSortChange={dir => setSort({ key: openColumnMenuKey, dir })}
            onApply={() => applyColumnMenu(openColumnMenuKey)}
            onReset={() => resetColumnMenu(openColumnMenuKey)}
          />
        </div>
      )}

      {isColumnSettingsOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/40 p-4">
          <div ref={settingsRef} className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-lg font-semibold text-slate-900">Настройки колонок</div>
                <div className="mt-1 text-sm text-slate-500">Выбрано: {settingsDraftVisible.length} из {COLUMNS.length}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsColumnSettingsOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsDraftVisible(COLUMNS.map(column => column.key))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                  >
                    Выбрать все
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsDraftVisible(COLUMNS.map(column => column.key));
                      setSettingsDraftOrder(COLUMNS.map(column => column.key));
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
                  >
                    Сбросить
                  </button>
                </div>
                <input
                  value={columnSearch}
                  onChange={event => setColumnSearch(event.target.value)}
                  placeholder="Поиск колонок..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none sm:max-w-xs"
                />
              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {settingsColumns.map(column => (
                  <div
                    key={String(column.key)}
                    draggable
                    onDragStart={event => {
                      setDraggedColumnKey(column.key);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(column.key));

                      const preview = event.currentTarget.cloneNode(true) as HTMLDivElement;
                      preview.style.position = 'fixed';
                      preview.style.top = '-1000px';
                      preview.style.left = '-1000px';
                      preview.style.width = `${event.currentTarget.clientWidth}px`;
                      preview.style.pointerEvents = 'none';
                      preview.style.transform = 'rotate(2deg)';
                      preview.style.boxShadow = '0 18px 40px rgba(15, 23, 42, 0.18)';
                      preview.style.borderColor = 'rgb(96 165 250)';
                      preview.style.background = 'rgba(239, 246, 255, 0.96)';
                      document.body.appendChild(preview);
                      event.dataTransfer.setDragImage(preview, 24, 24);
                      window.setTimeout(() => document.body.removeChild(preview), 0);
                    }}
                    onDragEnd={() => setDraggedColumnKey(null)}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                      const draggedKey = (draggedColumnKey ?? event.dataTransfer.getData('text/plain')) as keyof SummaryRow;
                      if (draggedKey) moveDraftColumn(draggedKey, column.key);
                      setDraggedColumnKey(null);
                    }}
                    onClick={() =>
                      setSettingsDraftVisible(current =>
                        current.includes(column.key)
                          ? current.filter(key => key !== column.key)
                          : [...current, column.key]
                      )
                    }
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-slate-50 ${
                      draggedColumnKey === column.key ? 'scale-[1.01] border-blue-300 bg-blue-50/60 opacity-70 shadow-lg' : 'border-slate-200'
                    }`}
                  >
                    <button type="button" onClick={event => event.stopPropagation()} className="cursor-grab rounded-md p-1 text-slate-400">
                      <GripVertical size={15} />
                    </button>
                    <div className="flex-1 text-sm text-slate-700">{column.label}</div>
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        setSettingsDraftVisible(current =>
                          current.includes(column.key)
                            ? current.filter(key => key !== column.key)
                            : [...current, column.key]
                        );
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                        settingsDraftVisible.includes(column.key) ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          settingsDraftVisible.includes(column.key) ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsColumnSettingsOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={applyColumnSettings}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColumnMenu({
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
  column: Column;
  sort: SortState;
  search: string;
  onSearchChange: (value: string) => void;
  filterOptions: string[];
  selectedValues: string[];
  onSelectedValuesChange: (values: string[]) => void;
  rangeFilter: RangeFilterState;
  onRangeChange: (value: RangeFilterState) => void;
  onSortChange: (dir: SortDir) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const isNumeric = column.key !== 'periodLabel';
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
            sort.key === column.key && sort.dir === 'asc' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Сортировать по возрастанию</span>
          <ArrowUpWideNarrow size={14} />
        </button>
        <button
          type="button"
          onClick={() => onSortChange('desc')}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
            sort.key === column.key && sort.dir === 'desc' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Сортировать по убыванию</span>
          <ArrowDownWideNarrow size={14} />
        </button>
      </div>

      {isNumeric ? (
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

function getComparableValue(row: SummaryRow, key: keyof SummaryRow) {
  return row[key];
}

function formatDiffValue(value: number, key: keyof SummaryRow) {
  if (key === 'buyoutRate') return `${Math.abs(value).toFixed(1)}%`;
  if (['sales', 'orders', 'returns'].includes(String(key))) return formatNumber(Math.abs(value));
  return formatCurrency(Math.abs(value), true);
}
