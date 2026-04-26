import type { MetricValue } from '../types';

export function buildMetricValue(
  current: number,
  previous: number,
  sparklineData: number[]
): MetricValue {
  const delta = current - previous;
  const deltaPercent = previous !== 0 ? (delta / Math.abs(previous)) * 100 : 0;
  return {
    current,
    previous,
    delta,
    deltaPercent,
    trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
    sparkline: sparklineData,
  };
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}М ₽`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}К ₽`;
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}М`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}К`;
  }
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDelta(value: number, isCurrency = false): string {
  const sign = value >= 0 ? '+' : '';
  if (isCurrency) return `${sign}${formatCurrency(value, true)}`;
  return `${sign}${formatNumber(value, true)}`;
}

export function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')} – ${end.getDate()}.${String(end.getMonth() + 1).padStart(2, '0')}`;
}

export function getDaysInRange(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}

export function subDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
