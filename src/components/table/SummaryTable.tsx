import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Eye, EyeOff } from 'lucide-react';
import type { SummaryRow } from '../../types';
import { formatCurrency, formatNumber, formatPercent } from '../../lib/calculations';

interface Column {
  key: keyof SummaryRow;
  label: string;
  format: (v: number | string) => string;
  align?: 'right' | 'left';
  sortable?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'periodLabel', label: 'Период', format: v => String(v), align: 'left' },
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

type SortDir = 'asc' | 'desc' | null;

interface SortState { key: keyof SummaryRow; dir: SortDir }

interface SummaryTableProps {
  rows: SummaryRow[];
  loading?: boolean;
}

function SkeletonRow() {
  return (
    <tr>
      {COLUMNS.map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SummaryTable({ rows, loading }: SummaryTableProps) {
  const [sort, setSort] = useState<SortState>({ key: 'period', dir: null });
  const [hiddenCols, setHiddenCols] = useState<Set<keyof SummaryRow>>(new Set());
  const [showColToggle, setShowColToggle] = useState(false);

  const sorted = useMemo(() => {
    if (!sort.dir) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'ru');
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort]);

  const visibleCols = COLUMNS.filter(c => !hiddenCols.has(c.key));

  const toggleSort = (key: keyof SummaryRow) => {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return { key, dir: null };
    });
  };

  const exportCsv = () => {
    const headers = visibleCols.map(c => c.label).join(',');
    const rowsStr = sorted.map(row =>
      visibleCols.map(c => {
        const v = row[c.key];
        return typeof v === 'number' ? v.toFixed(2) : String(v);
      }).join(',')
    ).join('\n');
    const blob = new Blob([`\uFEFF${headers}\n${rowsStr}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="text-sm font-semibold text-slate-700">{rows.length} строк</div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowColToggle(!showColToggle)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Eye size={13} />
              Столбцы
            </button>
            {showColToggle && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 min-w-[200px]">
                <div className="text-xs font-semibold text-slate-500 mb-2">Видимые столбцы</div>
                {COLUMNS.map(col => (
                  <label key={col.key as string} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 rounded px-1">
                    <input
                      type="checkbox"
                      checked={!hiddenCols.has(col.key)}
                      onChange={() => {
                        const next = new Set(hiddenCols);
                        if (next.has(col.key)) next.delete(col.key);
                        else next.add(col.key);
                        setHiddenCols(next);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={13} />
            Экспорт CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {visibleCols.map(col => (
                <th
                  key={col.key as string}
                  className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.sortable ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    {col.sortable && (
                      sort.key === col.key && sort.dir === 'desc' ? <ArrowDown size={11} className="text-blue-500" /> :
                      sort.key === col.key && sort.dir === 'asc' ? <ArrowUp size={11} className="text-blue-500" /> :
                      <ArrowUpDown size={11} className="text-slate-300" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length} className="py-12 text-center text-slate-400 text-sm">
                  Нет данных
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  {visibleCols.map(col => {
                    const rawValue = row[col.key];
                    const formatted = typeof rawValue === 'number'
                      ? col.format(rawValue)
                      : String(rawValue ?? '—');

                    const isProfit = col.key === 'profit';
                    const profitColor = isProfit && typeof rawValue === 'number'
                      ? rawValue >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'
                      : '';

                    return (
                      <td
                        key={col.key as string}
                        className={`px-4 py-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'} ${profitColor || 'text-slate-700'}`}
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          {sorted.length > 0 && !loading && (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                {visibleCols.map((col, i) => {
                  if (i === 0) return <td key="label" className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Итого</td>;
                  if (typeof sorted[0][col.key] === 'number' && col.key !== 'avgPriceBeforeDiscount' && col.key !== 'avgSalePrice' && col.key !== 'buyoutRate') {
                    const total = sorted.reduce((s, r) => s + (Number(r[col.key]) || 0), 0);
                    const isProfit = col.key === 'profit';
                    return (
                      <td key={col.key as string} className={`px-4 py-3 text-right text-xs font-bold ${isProfit ? (total >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-700'}`}>
                        {col.format(total)}
                      </td>
                    );
                  }
                  const avg = sorted.reduce((s, r) => s + (Number(r[col.key]) || 0), 0) / (sorted.length || 1);
                  return (
                    <td key={col.key as string} className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                      {col.format(avg)} ср.
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
