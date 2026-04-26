import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Info, Maximize2 } from 'lucide-react';
import { formatCurrency } from '../../lib/calculations';

export interface MarginLeaderboardRow {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  revenue: number;
  profit: number;
  margin: number;
  profitSharePercent?: number;
  kind?: string;
  productCount?: number;
}

const TOP_MARGIN_OPTIONS = [5, 10, 50] as const;

export function MarginLeaderboardCard({
  title,
  alias,
  subtitle,
  items,
  limit,
  totalCount,
  totalProfit,
  selectedProfit,
  hiddenCount,
  hiddenProfit,
  isLoading,
  onLimitChange,
  emptyMessage,
}: {
  title: string;
  alias: string;
  subtitle: string;
  items: MarginLeaderboardRow[];
  limit: number | 'all';
  totalCount: number;
  totalProfit: number;
  selectedProfit: number;
  hiddenCount: number;
  hiddenProfit: number;
  isLoading: boolean;
  onLimitChange: (value: number | 'all') => void;
  emptyMessage: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'circle' | 'list'>('circle');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const selectedProfitPercent = totalProfit > 0 ? (selectedProfit / totalProfit) * 100 : 0;

  return (
    <div className="self-start rounded-xl border border-slate-200 bg-white p-5">
      <button
        type="button"
        onClick={() => setIsExpanded(current => !current)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>
          <SectionAlias alias={alias} />
          <SectionInfoTooltip text={subtitle} />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-xs text-slate-400 sm:block">{totalCount} элементов</div>
          <ChevronDown
            size={18}
            className={`shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4">
          <MarginDisplayControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            limit={limit}
            onLimitChange={onLimitChange}
            onZoom={() => setIsDetailOpen(true)}
          />

          {isLoading ? (
            <MarginLeaderboardPlaceholder />
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              {emptyMessage}
            </div>
          ) : viewMode === 'circle' ? (
            <>
              <MarginTotalRatio
                selectedCount={items.length}
                totalCount={totalCount}
                selectedProfit={selectedProfit}
                totalProfit={totalProfit}
                percent={selectedProfitPercent}
              />
              <div className="mt-4 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
                <MarginPieChart
                  items={items}
                  hiddenProfit={hiddenProfit}
                  hiddenCount={hiddenCount}
                  totalProfit={totalProfit}
                  hoveredItemId={hoveredItemId}
                  onHoverChange={setHoveredItemId}
                />
                <div className="max-h-[23rem] space-y-1 overflow-y-auto pr-2 lg:pt-0.5">
                  {items.map((item, index) => {
                  const tone = getMarginChartColor(index);
                  const isActive = hoveredItemId === item.id;
                  const displayPercent = item.profitSharePercent ?? item.margin;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredItemId(item.id)}
                      onMouseLeave={() => setHoveredItemId(null)}
                      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors ${
                        isActive ? 'border-sky-200 bg-sky-50' : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      {item.imageUrl ? (
                        <MarginImagePreview item={item} className="h-8 w-8 rounded-lg" />
                      ) : (
                        <MetricLegendThumb label={item.title} color={tone} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold" style={{ color: tone }}>
                          {item.title}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold" style={{ color: tone }}>
                          <span>{displayPercent.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                  {hiddenCount > 0 && (
                    <div
                      onMouseEnter={() => setHoveredItemId('__other__')}
                      onMouseLeave={() => setHoveredItemId(null)}
                      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors ${
                        hoveredItemId === '__other__' ? 'border-slate-300 bg-slate-100' : 'border-slate-100 bg-slate-50/70'
                      }`}
                    >
                      <MetricLegendThumb label="Остальное" color="#cbd5e1" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-slate-500">Остальное</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold text-slate-500">
                          <span>
                            {totalProfit > 0 ? `${((hiddenProfit / totalProfit) * 100).toFixed(1)}%` : '0.0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <MarginTotalRatio
                selectedCount={items.length}
                totalCount={totalCount}
                selectedProfit={selectedProfit}
                totalProfit={totalProfit}
                percent={selectedProfitPercent}
              />
              <div className="mt-4 max-h-[23rem] space-y-1.5 overflow-y-auto pr-2">
                {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {item.imageUrl ? (
                      <MarginImagePreview item={item} className="h-7 w-7 rounded-full" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{item.title}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-slate-800">{formatCurrency(item.profit)}</div>
                    <div className="text-xs text-slate-400">Прибыль</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <span>{(item.profitSharePercent ?? item.margin).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {isDetailOpen && (
        <MarginLeaderboardModal
          title={title}
          items={items}
          hiddenProfit={hiddenProfit}
          hiddenCount={hiddenCount}
          totalProfit={totalProfit}
          selectedProfit={selectedProfit}
          totalCount={totalCount}
          hoveredItemId={hoveredItemId}
          onHoverChange={setHoveredItemId}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          limit={limit}
          onLimitChange={onLimitChange}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </div>
  );
}

function MarginDisplayControls({
  viewMode,
  onViewModeChange,
  limit,
  onLimitChange,
  onZoom,
}: {
  viewMode: 'circle' | 'list';
  onViewModeChange: (value: 'circle' | 'list') => void;
  limit: number | 'all';
  onLimitChange: (value: number | 'all') => void;
  onZoom?: () => void;
}) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [manualLimit, setManualLimit] = useState('');
  const optionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOptionsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!optionsRef.current?.contains(event.target as Node)) {
        setIsOptionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOptionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOptionsOpen]);

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex rounded-full bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => onViewModeChange('circle')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            viewMode === 'circle' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Круги
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('list')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Список
        </button>
      </div>

      <div className="relative" ref={optionsRef}>
        <div className="flex items-center gap-2">
          {onZoom && (
            <button
              type="button"
              onClick={onZoom}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              aria-label="Открыть детальный график"
            >
              <Maximize2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOptionsOpen(current => !current)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            {limit === 'all' ? 'Все' : `Топ ${limit}`}
            <ChevronDown size={14} className={`transition-transform ${isOptionsOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {isOptionsOpen && (
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Диапазон
            </div>
            <button
              type="button"
              onClick={() => {
                onLimitChange('all');
                setIsOptionsOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                limit === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Все
            </button>
            {TOP_MARGIN_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onLimitChange(option);
                  setIsOptionsOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  limit === option ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Топ {option}
              </button>
            ))}
            <div className="mt-2 border-t border-slate-100 pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Свой лимит
              </div>
              <div className="flex gap-2 px-2 pb-1">
                <input
                  type="number"
                  min={1}
                  value={manualLimit}
                  onChange={event => setManualLimit(event.target.value)}
                  placeholder="Напр. 25"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsedLimit = Number.parseInt(manualLimit, 10);
                    onLimitChange(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 'all');
                    setIsOptionsOpen(false);
                  }}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MarginPieChart({
  items,
  hiddenProfit,
  hiddenCount,
  totalProfit,
  hoveredItemId,
  onHoverChange,
  size = 260,
}: {
  items: MarginLeaderboardRow[];
  hiddenProfit: number;
  hiddenCount: number;
  totalProfit: number;
  hoveredItemId: string | null;
  onHoverChange: (itemId: string | null) => void;
  size?: number;
}) {
  const center = size / 2;
  const radius = size * 0.39;
  const activeRadius = size * 0.42;
  const tooltipRadius = size * 0.47;
  const chartItems = items.slice(0, 8);
  const hiddenChartItem: MarginLeaderboardRow | null = hiddenCount > 0
    ? {
        id: '__other__',
        title: 'Остальное',
        subtitle: 'Прибыль вне выбранного топа',
        revenue: 0,
        profit: hiddenProfit,
        margin: 0,
        profitSharePercent: totalProfit > 0 ? (hiddenProfit / totalProfit) * 100 : 0,
      }
    : null;
  const chartEntries = hiddenChartItem ? [...chartItems, hiddenChartItem] : chartItems;
  const normalizedValues = chartItems.map(item => Math.max(item.profit, 0));
  if (hiddenChartItem) {
    normalizedValues.push(Math.max(hiddenChartItem.profit, 0));
  }
  const total = normalizedValues.reduce((sum, value) => sum + value, 0);
  const hoveredItem = chartEntries.find(item => item.id === hoveredItemId) ?? null;
  let startAngle = -Math.PI / 2;
  const tooltipAnchor = hoveredItem
    ? (() => {
        let anchorStart = -Math.PI / 2;
        const hoveredIndex = chartEntries.findIndex(item => item.id === hoveredItem.id);
        for (let index = 0; index < hoveredIndex; index += 1) {
          anchorStart += total > 0
            ? (normalizedValues[index] / total) * Math.PI * 2
            : (Math.PI * 2) / Math.max(chartEntries.length, 1);
        }
        const sliceAngle = total > 0
          ? (normalizedValues[hoveredIndex] / total) * Math.PI * 2
          : (Math.PI * 2) / Math.max(chartEntries.length, 1);
        const midAngle = anchorStart + sliceAngle / 2;
        return {
          left: center + Math.cos(midAngle) * tooltipRadius,
          top: center + Math.sin(midAngle) * tooltipRadius,
        };
      })()
    : null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="mb-1 flex justify-end">
        <SectionInfoTooltip text="Наведите на сектор или строку справа для отображения точных данных." />
      </div>
      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full overflow-visible">
            <g className="apexcharts-inner apexcharts-graphical" transform={`translate(${center} ${center})`}>
              {chartEntries.map((item, index) => {
                const value = normalizedValues[index];
                const sliceAngle = total > 0 ? (value / total) * Math.PI * 2 : (Math.PI * 2) / Math.max(chartEntries.length, 1);
                const endAngle = startAngle + sliceAngle;
                const path = describePieSlice(0, 0, hoveredItemId === item.id ? activeRadius : radius, startAngle, endAngle);
                startAngle = endAngle;
                const isOther = item.id === '__other__';

                return (
                  <path
                    key={item.id}
                    d={path}
                    fill={isOther ? '#cbd5e1' : getMarginChartColor(index)}
                    opacity={hoveredItemId && hoveredItemId !== item.id ? 0.32 : 0.96}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => onHoverChange(item.id)}
                    onMouseLeave={() => onHoverChange(null)}
                  />
                );
              })}
            </g>
          </svg>
          {hoveredItem && (
            <div
              className="pointer-events-none absolute z-20 w-44 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl"
              style={{
                left: tooltipAnchor ? `${tooltipAnchor.left}px` : '50%',
                top: tooltipAnchor ? `${tooltipAnchor.top}px` : '50%',
                transform: tooltipAnchor && tooltipAnchor.left > center
                  ? 'translate(-100%, -50%)'
                  : 'translate(0, -50%)',
              }}
            >
              <div className="truncate font-semibold text-slate-800">{hoveredItem.title}</div>
              <div className="mt-1 text-slate-500">
                Доля прибыли: <span className="font-semibold text-slate-800">{(hoveredItem.profitSharePercent ?? 0).toFixed(2)}%</span>
              </div>
              <div className="mt-0.5 text-slate-500">
                Прибыль: <span className="font-semibold text-slate-800">{formatCurrency(hoveredItem.profit)}</span>
              </div>
              {hoveredItem.id !== '__other__' && (
                <div className="mt-0.5 text-slate-500">
                  Выручка: <span className="font-semibold text-slate-800">{formatCurrency(hoveredItem.revenue)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MarginLeaderboardPlaceholder() {
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
        <div className="mx-auto h-[260px] w-[260px] animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2.5 rounded-lg border border-slate-100 px-2.5 py-1.5">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MarginLeaderboardModal({
  title,
  items,
  hiddenProfit,
  hiddenCount,
  totalProfit,
  selectedProfit,
  totalCount,
  hoveredItemId,
  onHoverChange,
  viewMode,
  onViewModeChange,
  limit,
  onLimitChange,
  onClose,
}: {
  title: string;
  items: MarginLeaderboardRow[];
  hiddenProfit: number;
  hiddenCount: number;
  totalProfit: number;
  selectedProfit: number;
  totalCount: number;
  hoveredItemId: string | null;
  onHoverChange: (itemId: string | null) => void;
  viewMode: 'circle' | 'list';
  onViewModeChange: (value: 'circle' | 'list') => void;
  limit: number | 'all';
  onLimitChange: (value: number | 'all') => void;
  onClose: () => void;
}) {
  const selectedShare = totalProfit > 0 ? (selectedProfit / totalProfit) * 100 : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Детальный график</div>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">{title}</h3>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Закрыть
            </button>
            <div className="w-full min-w-[260px]">
              <MarginDisplayControls
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                limit={limit}
                onLimitChange={onLimitChange}
              />
            </div>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[500px_minmax(0,1fr)]">
          <div>
            <MarginPieChart
              items={items}
              hiddenProfit={hiddenProfit}
              hiddenCount={hiddenCount}
              totalProfit={totalProfit}
              hoveredItemId={hoveredItemId}
              onHoverChange={onHoverChange}
              size={420}
            />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-400">Доля топа</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{selectedShare.toFixed(2)}%</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-400">Прибыль топа</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(selectedProfit)}</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-400">Всего</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{totalCount}</div>
              </div>
            </div>
          </div>
          <div className="min-h-0">
            <div className="mb-3 text-sm font-semibold text-slate-900">Связанные элементы</div>
            <div className="max-h-[34rem] space-y-1.5 overflow-y-auto pr-2">
              {items.map((item, index) => {
                const tone = getMarginChartColor(index);
                const isActive = hoveredItemId === item.id;
                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => onHoverChange(item.id)}
                    onMouseLeave={() => onHoverChange(null)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                      isActive ? 'border-sky-200 bg-sky-50' : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    {item.imageUrl ? <MarginImagePreview item={item} className="h-10 w-10 rounded-xl" /> : <MetricLegendThumb label={item.title} color={tone} />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">{item.title}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-slate-800">{(item.profitSharePercent ?? 0).toFixed(2)}%</div>
                      <div className="text-xs text-slate-400">{formatCurrency(item.profit)}</div>
                    </div>
                  </div>
                );
              })}
              {hiddenCount > 0 && (
                <div
                  onMouseEnter={() => onHoverChange('__other__')}
                  onMouseLeave={() => onHoverChange(null)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                    hoveredItemId === '__other__' ? 'border-slate-300 bg-slate-100' : 'border-slate-100 bg-slate-50/70'
                  }`}
                >
                  <MetricLegendThumb label="Остальное" color="#cbd5e1" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-600">Остальное</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-slate-700">{totalProfit > 0 ? ((hiddenProfit / totalProfit) * 100).toFixed(2) : '0.00'}%</div>
                    <div className="text-xs text-slate-400">{formatCurrency(hiddenProfit)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function MarginImagePreview({ item, className }: { item: MarginLeaderboardRow; className: string }) {
  const [anchorElement, setAnchorElement] = useState<HTMLSpanElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen || !anchorElement) return;

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      const previewWidth = Math.min(224, window.innerWidth - 24);
      setPosition({
        top: Math.min(rect.bottom + 8, window.innerHeight - 240),
        left: Math.min(Math.max(12, rect.left), window.innerWidth - previewWidth - 12),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorElement, isOpen]);

  if (!item.imageUrl) return null;

  return (
    <span
      ref={setAnchorElement}
      className="inline-flex shrink-0"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      <img
        src={item.imageUrl}
        alt=""
        className={`${className} shrink-0 border border-slate-100 object-cover`}
        loading="lazy"
      />
      {isOpen && createPortal(
        <div
          className="pointer-events-none fixed z-[280] w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
          style={{ top: position.top, left: position.left }}
        >
          <img src={item.imageUrl} alt="" className="h-40 w-full rounded-xl object-cover" loading="lazy" />
          <div className="mt-2 text-sm font-semibold leading-5 text-slate-900">{item.title}</div>
          {item.subtitle && <div className="mt-1 text-xs text-slate-500">{item.subtitle}</div>}
          <div className="mt-2 text-xs text-slate-500">
            Доля прибыли: <span className="font-semibold text-slate-800">{(item.profitSharePercent ?? 0).toFixed(2)}%</span>
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}

function MarginTotalRatio({
  selectedCount,
  totalCount,
  selectedProfit,
  totalProfit,
  percent,
}: {
  selectedCount: number;
  totalCount: number;
  selectedProfit: number;
  totalProfit: number;
  percent: number;
}) {
  const safePercent = Math.max(0, Math.min(percent, 100));

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <div className="font-semibold uppercase tracking-[0.12em] text-slate-500">Соотношение к общей прибыли</div>
        <div className="shrink-0 font-semibold text-slate-700">
          {safePercent.toFixed(1)}%
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${safePercent}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>Топ: {formatCurrency(selectedProfit)} · {selectedCount} из {totalCount}</span>
        <span>Всего: {formatCurrency(totalProfit)}</span>
      </div>
    </div>
  );
}

function SectionInfoTooltip({ text }: { text: string }) {
  return (
    <div className="group/tooltip relative flex shrink-0">
      <Info size={14} className="text-slate-400" />
      <div className="absolute left-0 top-full z-10 mt-2 hidden w-80 whitespace-pre-line rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm group-hover/tooltip:block">
        {text}
      </div>
    </div>
  );
}

function SectionAlias({ alias }: { alias: string }) {
  return (
    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
      {alias}
    </span>
  );
}

function MetricLegendThumb({ label, color }: { label: string; color: string }) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/80 text-[10px] font-semibold shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${color}22, ${color}55)`,
        color,
      }}
      aria-hidden="true"
    >
      {initials || 'A'}
    </div>
  );
}

function describePieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInRadians: number) {
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function getMarginChartColor(index: number) {
  const palette = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];
  return palette[index % palette.length];
}

