import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Files, Info, Minus, Pencil, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { MetricValue } from '../../types';
import { Sparkline } from '../charts/Sparkline';

interface MetricDocumentItem {
  label: string;
  amount: string;
  percent: string;
}

interface MetricDocuments {
  count: number;
  title: string;
  subtitle?: string;
  items: MetricDocumentItem[];
}

interface MetricCardProps {
  title: string;
  metric: MetricValue;
  format: (v: number) => string;
  formatPrevious?: (v: number) => string;
  formatDelta?: (v: number) => string;
  invertColors?: boolean;
  unit?: string;
  description?: string;
  isLoading?: boolean;
  isPlaceholder?: boolean;
  isEditMode?: boolean;
  faq?: string;
  documents?: MetricDocuments;
  onEdit?: () => void;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="mb-2.5 h-3.5 w-2/3 rounded bg-slate-100" />
      <div className="mb-1.5 h-6 w-3/4 rounded bg-slate-100" />
      <div className="mb-3 h-3 w-1/2 rounded bg-slate-100" />
      <div className="h-10 rounded-lg bg-slate-100" />
    </div>
  );
}

function PlaceholderCard({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-2.5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</div>
      <div className="mb-1 text-lg font-bold tracking-tight text-slate-300 sm:text-xl">--</div>
      <div className="text-xs text-slate-400 sm:text-sm">Нет live данных</div>
    </div>
  );
}

function FormattedValue({ value }: { value: string }) {
  const parts = value.split(/(₽|%|шт|Дн\.|п\.п\.)/g);

  return (
    <>
      {parts.map((part, index) =>
        /^(₽|%|шт|Дн\.|п\.п\.)$/.test(part) ? (
          <span key={`${part}-${index}`} className="relative -top-1 ml-0.5 text-[0.58em] font-semibold leading-none">
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}

export function MetricCard({
  title,
  metric,
  format,
  formatPrevious,
  formatDelta,
  invertColors = false,
  unit,
  description,
  isLoading = false,
  isPlaceholder = false,
  isEditMode = false,
  faq,
  documents,
  onEdit,
}: MetricCardProps) {
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const docsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDocsOpen && !isDetailsOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDocsOpen(false);
        setIsDetailsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDetailsOpen, isDocsOpen]);

  useEffect(() => {
    if (!isDocsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!docsRef.current?.contains(event.target as Node)) {
        setIsDocsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isDocsOpen]);

  if (isLoading) return <SkeletonCard />;
  if (isPlaceholder) return <PlaceholderCard title={title} />;

  const isPositive = metric.trend === 'up';
  const isNegative = metric.trend === 'down';
  const isNeutral = metric.trend === 'neutral';

  const goodTrend = invertColors ? isNegative : isPositive;
  const badTrend = invertColors ? isPositive : isNegative;

  const trendColor = goodTrend ? 'text-emerald-600' : badTrend ? 'text-red-500' : 'text-slate-400';
  const sparkColor = goodTrend ? '#10b981' : badTrend ? '#ef4444' : '#94a3b8';
  const bgColor = goodTrend
    ? 'bg-emerald-50 border-emerald-100'
    : badTrend
    ? 'bg-red-50 border-red-100'
    : 'bg-slate-50 border-slate-100';
  const cardTone = metric.sparkline.length > 1
    ? 'border-slate-200 bg-white'
    : goodTrend
    ? 'border-emerald-200 bg-emerald-50/55'
    : badTrend
    ? 'border-red-200 bg-red-50/55'
    : 'border-slate-200 bg-slate-50/75';

  const previousFormat = formatPrevious ?? format;
  const deltaValue = metric.delta ?? 0;
  const deltaPercentValue = metric.deltaPercent ?? 0;
  const deltaStr = formatDelta
    ? formatDelta(deltaValue)
    : `${deltaValue >= 0 ? '+' : ''}${deltaValue.toFixed(1)}`;
  const pctStr = `${deltaPercentValue >= 0 ? '+' : ''}${deltaPercentValue.toFixed(2)}%`;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!isEditMode) setIsDetailsOpen(true);
        }}
        onKeyDown={event => {
          if (isEditMode) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsDetailsOpen(true);
          }
        }}
        className={`relative z-0 w-full rounded-xl border p-3 text-left transition-all duration-200 focus-within:z-[140] sm:p-3.5 ${isEditMode ? 'cursor-default' : 'hover:z-[140] hover:-translate-y-0.5 hover:shadow-md'} ${cardTone}`}
      >
        {metric.sparkline.length > 1 && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl opacity-[0.16] transition-opacity">
            <div className="absolute inset-0 bg-gradient-to-b from-white via-white/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-16">
              <Sparkline data={metric.sparkline} color={sparkColor} width={320} height={84} className="h-full w-full" />
            </div>
          </div>
        )}

        <div className="relative mb-2.5 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.1em] text-slate-950">{title}</div>
              {onEdit && (
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    onEdit();
                  }}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Редактировать метрику"
                  title="Редактировать метрику"
                >
                  <Pencil size={12} />
                </button>
              )}
              {faq && (
                <PassiveFloat label="FAQ" panelClassName="right-0">
                  <Info size={14} />
                  <div className="min-w-[240px] max-w-[280px] text-sm leading-5 text-slate-600">{faq}</div>
                </PassiveFloat>
              )}
              {documents && (
                <ClickFloat
                  anchorRef={docsRef}
                  isOpen={isDocsOpen}
                  onToggle={() => setIsDocsOpen(current => !current)}
                  onClose={() => setIsDocsOpen(false)}
                  label="Документы"
                  panelClassName="right-0"
                  trigger={(
                    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      <Files size={11} />
                      {documents.count}
                    </div>
                  )}
                >
                  <div className="min-w-[260px] max-w-[340px]">
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-slate-800">{documents.title}</div>
                      {documents.subtitle && <div className="mt-1 text-xs text-slate-500">{documents.subtitle}</div>}
                    </div>
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {documents.items.map(item => (
                        <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-xs font-medium text-slate-700">{item.label}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {item.amount} / {item.percent}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ClickFloat>
              )}
            </div>
            {description && <div className="sr-only">{description}</div>}
          </div>
        </div>

        <div className="relative mb-2">
          <span className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            <FormattedValue value={format(metric.current)} />
          </span>
          {unit && (
            <span className="relative -top-1 ml-1 text-[0.58em] font-semibold text-slate-400">
              {unit}
            </span>
          )}
        </div>

        <div className="relative flex items-center gap-2">
          <div className="min-w-0 shrink">
            <div className="truncate text-xs font-semibold text-slate-600 sm:text-sm">
              <FormattedValue value={previousFormat(metric.previous)} />
            </div>
          </div>
          <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/80 bg-white px-2.5 py-1 text-[11px] font-bold shadow-sm ring-1 ring-slate-200/80 sm:text-xs ${trendColor}`}>
            {isNeutral ? <Minus size={12} /> : isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span><FormattedValue value={deltaStr} /></span>
            <span className="text-slate-300">/</span>
            <span><FormattedValue value={pctStr} /></span>
          </div>
        </div>
      </div>

      {isDetailsOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setIsDetailsOpen(false);
          }}
        >
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  <FormattedValue value={format(metric.current)} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {metric.sparkline.length > 1 && (
                <div className="h-36 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <Sparkline data={metric.sparkline} color={sparkColor} width={420} height={144} className="h-full w-full" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Текущее значение</div>
                  <div className="mt-2 text-base font-semibold text-slate-900">
                    <FormattedValue value={format(metric.current)} />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Предыдущее значение</div>
                  <div className="mt-2 text-base font-semibold text-slate-900">
                    <FormattedValue value={previousFormat(metric.previous)} />
                  </div>
                </div>
              </div>

              <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${bgColor} ${trendColor}`}>
                {isNeutral ? <Minus size={12} /> : isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span><FormattedValue value={deltaStr} /></span>
                <span className="text-slate-300">/</span>
                <span><FormattedValue value={pctStr} /></span>
              </div>

              {faq && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-900">Описание</div>
                  <div className="text-sm leading-6 text-slate-600">{faq}</div>
                </div>
              )}

              {documents && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Files size={14} className="text-slate-400" />
                    <div className="text-sm font-semibold text-slate-900">{documents.title}</div>
                  </div>
                  {documents.subtitle && <div className="mb-3 text-xs text-slate-500">{documents.subtitle}</div>}
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {documents.items.map(item => (
                      <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="text-xs font-medium text-slate-700">{item.label}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{item.amount} / {item.percent}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PassiveFloat({
  children,
  label,
  panelClassName,
}: {
  children: [ReactNode, ReactNode];
  label: string;
  panelClassName: string;
}) {
  const [icon, content] = children;
  const [anchorElement, setAnchorElement] = useState<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen || !anchorElement) return;

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      const panelWidth = Math.min(300, window.innerWidth - 24);
      setPosition({
        top: Math.min(rect.bottom + 8, window.innerHeight - 24),
        left: Math.min(Math.max(12, rect.right - panelWidth), window.innerWidth - panelWidth - 12),
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

  return (
    <div
      ref={setAnchorElement}
      className="relative z-[120] flex shrink-0"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="cursor-help text-slate-400 transition-colors hover:text-slate-600 focus-visible:text-slate-600"
        aria-label={label}
        onClick={event => event.stopPropagation()}
        onMouseDown={event => event.stopPropagation()}
      >
        {icon}
      </button>
      {isOpen && createPortal(
        <div
          className={`fixed z-[270] max-w-[min(300px,calc(100vw-24px))] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl ${panelClassName}`}
          style={{ top: position.top, left: position.left, width: 'min(300px, calc(100vw - 24px))' }}
          onClick={event => event.stopPropagation()}
          onMouseDown={event => event.stopPropagation()}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
}

const ClickFloat = ({
  isOpen,
  onToggle,
  onClose,
  label,
  panelClassName,
  trigger,
  children,
  anchorRef,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  label: string;
  panelClassName: string;
  trigger: ReactNode;
  children: ReactNode;
  anchorRef: MutableRefObject<HTMLDivElement | null>;
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const panelWidth = Math.min(340, window.innerWidth - 24);
      setPosition({
        top: Math.min(rect.bottom + 8, window.innerHeight - 24),
        left: Math.min(Math.max(12, rect.right - panelWidth), window.innerWidth - panelWidth - 12),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, isOpen]);

  return (
    <div ref={anchorRef} className="relative z-[120] flex shrink-0">
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onToggle();
        }}
        className="text-left"
        aria-label={label}
        aria-expanded={isOpen}
      >
        {trigger}
      </button>
      {isOpen && createPortal(
        <div
          className={`fixed z-[260] max-h-[min(420px,calc(100vh-32px))] max-w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl ${panelClassName}`}
          style={{ top: position.top, left: position.left, width: 'min(340px, calc(100vw - 24px))' }}
          onClick={event => event.stopPropagation()}
          onMouseDown={event => event.stopPropagation()}
        >
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                onClose();
              }}
              className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
            >
              Закрыть
            </button>
          </div>
          {children}
        </div>,
        document.body
      )}
    </div>
  );
};
