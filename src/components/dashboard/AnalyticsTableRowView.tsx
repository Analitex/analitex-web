import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface AnalyticsTableRow {
  id: string;
  photoLabel: string;
  articleLabel: string;
  productName: string;
  imageUrl?: string;
  marketplace: string;
  store: string;
  brand: string;
  category: string;
  group: string;
  marketplaceArticleId: string;
  avgCost: number;
  operationalExpense: number;
  otherDeduction: number;
  avgPriceBeforeDiscount: number;
  avgSalePrice: number;
  realisation: number;
  turnoverSales: number;
  turnoverOrders: number;
  sales: number;
  toTransfer: number;
  returns: number;
  costOfSales: number;
  fines: number;
  ordersCount: number;
  ordersAmount: number;
  commission: number;
  netMarketplaceReward: number;
  compensation: number;
  averageLogisticsCost: number;
  capitalizationByCost: number;
  capitalizationByRetail: number;
  capitalizationOwnWarehouse: number;
  gmroi: number;
  gmroiYear: number;
  logisticsCost: number;
  storage: number;
  rejectionsAndReturns: number;
  totalSales: number;
  buyoutRate: number;
  averageProfitPerPiece: number;
  tax: number;
  taxBase: number;
  profit: number;
  profitWithoutExpense: number;
  roi: number;
  shareOfRevenue: number;
  marginality: number;
  marginalityWithoutExpense: number;
  advertisingExpense: number;
  drr: number;
  advertisingExpenseBonus: number;
  drrBonus: number;
  advertisingExpenseTotal: number;
  drrTotal: number;
  drrByOrders: number;
  acceptanceSum: number;
  abcProfit: string;
  abcRevenue: string;
  stockBalanceMP: number;
  stockBalanceOwn: number;
  stockBalanceToClient: number;
  stockBalanceFromClient: number;
  salesCount: number;
}

export interface AnalyticsColumnDefinition {
  id: keyof AnalyticsTableRow | 'photo' | 'article';
  label: string;
  align?: 'left' | 'right';
  sticky?: 'photo' | 'article' | 'payment';
  unit?: string;
  render?: (row: AnalyticsTableRow) => ReactNode;
  exportValue?: (row: AnalyticsTableRow) => string | number;
}

export function getAnalyticsColumnWidth(column: AnalyticsColumnDefinition) {
  if (column.id === 'photo') return 48;
  if (column.id === 'article') return 220;
  if (column.id === 'toTransfer') return 120;
  return 132;
}

export function AnalyticsTableRowView({
  row,
  columns,
  stickyOffsets,
  isTotal = false,
  formatCell,
}: {
  row: AnalyticsTableRow;
  columns: AnalyticsColumnDefinition[];
  stickyOffsets: Map<string, number>;
  isTotal?: boolean;
  formatCell: (row: AnalyticsTableRow, columnId: AnalyticsColumnDefinition['id']) => ReactNode;
}) {
  return (
    <tr className={`${isTotal ? 'bg-slate-50' : 'hover:bg-slate-50'} transition-colors`}>
      {columns.map(column => {
        const content = column.render ? column.render(row) : formatCell(row, column.id);
        const columnId = String(column.id);
        const isSticky = stickyOffsets.has(columnId);

        return (
          <td
            key={columnId}
            className={`whitespace-normal break-words border-b border-r border-slate-100 px-2 py-1.5 align-top leading-5 ${
              column.align === 'right' ? 'text-right tabular-nums' : 'text-left'
            } ${isSticky ? `sticky z-20 ${isTotal ? 'bg-slate-50' : 'bg-white'}` : ''}`}
            style={
              isSticky
                ? {
                    left: stickyOffsets.get(columnId),
                    width: getAnalyticsColumnWidth(column),
                    minWidth: getAnalyticsColumnWidth(column),
                    maxWidth: getAnalyticsColumnWidth(column),
                  }
                : { maxWidth: getAnalyticsColumnWidth(column) }
            }
          >
            {isTotal && column.id === 'article' ? (
              <div className="whitespace-normal break-words font-semibold text-slate-900">Итого за период</div>
            ) : column.id === 'photo' && isTotal ? null : content}
          </td>
        );
      })}
    </tr>
  );
}

export function ProductImageThumb({ row }: { row: AnalyticsTableRow }) {
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const imageUrl = row.imageUrl;

  if (!imageUrl) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-400">
        —
      </div>
    );
  }

  return (
    <>
      <img
        src={imageUrl}
        alt={row.productName}
        loading="lazy"
        onMouseEnter={event => setPreviewPosition({ x: event.clientX, y: event.clientY })}
        onMouseMove={event => setPreviewPosition({ x: event.clientX, y: event.clientY })}
        onMouseLeave={() => setPreviewPosition(null)}
        className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 object-cover shadow-sm"
      />
      {previewPosition &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[220] overflow-hidden rounded-2xl border border-white bg-white p-1 shadow-2xl"
            style={{
              left: Math.min(previewPosition.x + 16, window.innerWidth - 224),
              top: Math.min(previewPosition.y + 16, window.innerHeight - 264),
            }}
          >
            <img src={imageUrl} alt={row.productName} className="h-60 w-52 rounded-xl object-cover" />
          </div>,
          document.body
        )}
    </>
  );
}


