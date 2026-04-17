import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, Files } from 'lucide-react';
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
  formatDelta?: (v: number) => string;
  invertColors?: boolean;
  unit?: string;
  description?: string;
  isLoading?: boolean;
  faq?: string;
  documents?: MetricDocuments;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-2/3 mb-4" />
      <div className="h-7 bg-slate-100 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
    </div>
  );
}

export function MetricCard({
  title, metric, format, formatDelta, invertColors = false, unit, description, isLoading = false, faq, documents
}: MetricCardProps) {
  if (isLoading) return <SkeletonCard />;

  const isPositive = metric.trend === 'up';
  const isNegative = metric.trend === 'down';
  const isNeutral = metric.trend === 'neutral';

  const goodTrend = invertColors ? isNegative : isPositive;
  const badTrend = invertColors ? isPositive : isNegative;

  const trendColor = goodTrend
    ? 'text-emerald-600'
    : badTrend
    ? 'text-red-500'
    : 'text-slate-400';

  const sparkColor = goodTrend
    ? '#10b981'
    : badTrend
    ? '#ef4444'
    : '#94a3b8';

  const bgColor = goodTrend
    ? 'bg-emerald-50 border-emerald-100'
    : badTrend
    ? 'bg-red-50 border-red-100'
    : 'bg-slate-50 border-slate-100';

  const deltaStr = formatDelta
    ? formatDelta(metric.delta)
    : `${metric.delta >= 0 ? '+' : ''}${metric.delta.toFixed(1)}`;

  const pctStr = `${metric.deltaPercent >= 0 ? '+' : ''}${metric.deltaPercent.toFixed(2)}%`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</div>
            {faq && (
              <HoverIcon label="FAQ" panelClassName="-left-2">
                <Info size={14} />
                <div className="max-w-xs text-sm leading-5 text-slate-600">{faq}</div>
              </HoverIcon>
            )}
            {documents && (
              <HoverIcon label="Документы" panelClassName="right-0">
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  <Files size={12} />
                  {documents.count}
                </div>
                <div className="w-72 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{documents.title}</div>
                    {documents.subtitle && <div className="mt-1 text-xs text-slate-500">{documents.subtitle}</div>}
                  </div>
                  <div className="space-y-2">
                    {documents.items.map(item => (
                      <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="text-xs font-medium text-slate-700">{item.label}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{item.amount}</div>
                        <div className="text-xs text-slate-500">{item.percent}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </HoverIcon>
            )}
          </div>
          {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
        </div>
        {metric.sparkline.length > 1 && (
          <div className="opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
            <Sparkline data={metric.sparkline} color={sparkColor} width={64} height={28} />
          </div>
        )}
      </div>

      <div className="mb-3">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">
          {format(metric.current)}
        </span>
        {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="mt-1 truncate text-sm text-slate-500">{format(metric.previous)}</div>
        </div>
        <div className={`inline-flex shrink-0 items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${bgColor} ${trendColor}`}>
          <span>{deltaStr}({pctStr})</span>
        </div>
      </div>
    </div>
  );
}

function HoverIcon({
  children,
  label,
  panelClassName,
}: {
  children: [ReactNode, ReactNode];
  label: string;
  panelClassName: string;
}) {
  const [icon, content] = children;

  return (
    <div className="relative group/tooltip">
      <div
        className="cursor-help text-slate-400 transition-colors hover:text-slate-600"
        aria-label={label}
        title={label}
      >
        {icon}
      </div>
      <div className={`pointer-events-none absolute top-full z-20 mt-2 hidden rounded-xl border border-slate-200 bg-white p-3 shadow-xl group-hover/tooltip:block ${panelClassName}`}>
        {content}
      </div>
    </div>
  );
}
