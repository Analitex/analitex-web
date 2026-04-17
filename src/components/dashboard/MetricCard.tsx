import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MetricValue } from '../../types';
import { Sparkline } from '../charts/Sparkline';

interface MetricCardProps {
  title: string;
  metric: MetricValue;
  format: (v: number) => string;
  formatDelta?: (v: number) => string;
  invertColors?: boolean;
  unit?: string;
  description?: string;
  isLoading?: boolean;
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
  title, metric, format, formatDelta, invertColors = false, unit, description, isLoading = false
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

  const pctStr = `${metric.deltaPercent >= 0 ? '+' : ''}${metric.deltaPercent.toFixed(1)}%`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</div>
          {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
        </div>
        {metric.sparkline.length > 1 && (
          <div className="opacity-70 group-hover:opacity-100 transition-opacity">
            <Sparkline data={metric.sparkline} color={sparkColor} width={64} height={28} />
          </div>
        )}
      </div>

      <div className="mb-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">
          {format(metric.current)}
        </span>
        {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </div>

      <div className="flex items-center gap-2">
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${bgColor} ${trendColor}`}>
          {isNeutral ? (
            <Minus size={11} />
          ) : isPositive ? (
            <TrendingUp size={11} />
          ) : (
            <TrendingDown size={11} />
          )}
          {pctStr}
        </div>
        <span className="text-xs text-slate-400">
          {deltaStr} vs прошлый период
        </span>
      </div>
    </div>
  );
}
