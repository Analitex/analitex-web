import { buildMetricValue, formatCurrency, formatNumber } from './calculations';
import type { MetricValue } from '../types';

type ApiComparison = { previous?: number | null; delta?: number | null; deltaPercent?: number | null };
type ApiComparisons = Record<string, ApiComparison | null> | null;

export function buildApiMetricValue(current: number | null | undefined, comparison?: ApiComparison | null): MetricValue {
  if (!Number.isFinite(current ?? NaN)) {
    return buildMetricValue(0, 0, []);
  }

  const currentValue = Number(current ?? 0);
  const previousValue = Number.isFinite(comparison?.previous ?? NaN) ? Number(comparison?.previous ?? 0) : 0;
  const deltaValue = Number.isFinite(comparison?.delta ?? NaN) ? Number(comparison?.delta ?? 0) : 0;
  const deltaPercentValue =
    previousValue !== 0 && Number.isFinite(comparison?.deltaPercent ?? NaN)
      ? Number(comparison?.deltaPercent ?? 0)
      : 0;

  return {
    current: currentValue,
    previous: previousValue,
    delta: deltaValue,
    deltaPercent: deltaPercentValue,
    trend: deltaValue > 0 ? 'up' : deltaValue < 0 ? 'down' : 'neutral',
    sparkline: [],
  };
}

export function buildFormulaMetricValues(summaryMetrics: Record<string, number | null> | null = null, summaryComparisons: ApiComparisons = null) {
  const metric = (key: string) => buildApiMetricValue(readApiMetric(summaryMetrics, key), summaryComparisons?.[key]);
  const metricAny = (keys: string[]) => {
    const key = keys.find(candidate => readApiMetric(summaryMetrics, candidate) !== null);
    return key ? metric(key) : buildApiMetricValue(null);
  };
  const hasMetric = (key: string) => readApiMetric(summaryMetrics, key) !== null;

  const realisation = metric('realisation');
  const profit = metric('profit');
  const operatingExpenses = metricAny(['operatingExpenses', 'expense']);
  const profitWithoutExpense = hasMetric('profitWithoutExpense')
    ? metric('profitWithoutExpense')
    : buildMetricValue(
        profit.current + operatingExpenses.current,
        profit.previous + operatingExpenses.previous,
        []
      );
  const profitability = metric('profitability');
  const marginalityWithoutExpense = hasMetric('marginalityWithoutExpense')
    ? metric('marginalityWithoutExpense')
    : buildMetricValue(
        calculatePercent(profitWithoutExpense.current, realisation.current),
        calculatePercent(profitWithoutExpense.previous, realisation.previous),
        []
      );

  return {
    averagePriceAfterSPP: metric('averagePriceAfterSPP'),
    averagePriceBeforeSPP: metric('averagePriceBeforeSPP'),
    realisation,
    sales: metric('totalSales'),
    salesCount: metric('salesCount'),
    toTransfer: metric('toTransfer'),
    returns: metric('returns'),
    costOfSales: metric('costOfSales'),
    fines: metric('fines'),
    compensationForSubstitutedGoods: metric('compensationForSubstitutedGoods'),
    reimbursementOfTransportationCosts: metric('reimbursementOfTransportationCosts'),
    paymentForMarriageAndLostGoods: metric('paymentForMarriageAndLostGoods'),
    averageLogisticsCost: metric('averageLogisticsCost'),
    logistics: metric('logistics'),
    storage: metric('storage'),
    rejectionsAndReturns: metric('refunds'),
    totalSales: metric('totalSales'),
    totalSalesAmount: metric('sales'),
    averageRedemption: metric('averageRedemption'),
    averageProfitPerPiece: metric('averageProfitPerPiece'),
    tax: metric('tax'),
    taxBase: metric('taxBase'),
    profit,
    profitWithoutExpense,
    roi: metric('roi'),
    profitability,
    marginality: profitability,
    advertisingExpense: metric('advertisingExpense'),
    advertisingExpenseBonus: metric('advertisingExpenseBonus'),
    advertisingExpenseSum: metric('advertisingExpenseSum'),
    drr: metric('drr'),
    drrBonus: metric('drrBonus'),
    drrSum: metric('drrSum'),
    drrByOrders: metric('drrByOrders'),
    acceptanceSum: metric('acceptanceSum'),
    otherDeduction: metric('otherDeduction'),
    operatingExpenses,
    expense: operatingExpenses,
    orders: metric('orders'),
    ordersCount: metric('ordersCount'),
    commission: metric('commission'),
    compensation: metric('compensation'),
    netMarketplaceReward: metric('netMarketplaceReward'),
    totalPaid: metric('totalPaid'),
    stockBalance: metric('stockBalance'),
    stockBalanceOverall: metric('stockBalanceOverall'),
    stockBalanceInWh: metric('stockBalanceInWh'),
    stockBalanceInWayToClient: metric('stockBalanceInWayToClient'),
    stockBalanceInWayFromClient: metric('stockBalanceInWayFromClient'),
    capitalizationByCost: metric('capitalizationByCost'),
    capitalizationByPrice: metric('capitalizationByPrice'),
    commissionAcquiring: metric('commissionAcquiring'),
    nominalCommission: metric('nominalCommission'),
    mpDiscount: metric('mpDiscount'),
    refunds: metric('refunds'),
    daysCount: metric('daysCount'),
    userWarehouseStockBalance: metric('userWarehouseStockBalance'),
    userWarehouseCapitalizationByCost: metric('userWarehouseCapitalizationByCost'),
    gmroi: metric('gmroi'),
    gmroiYear: metric('gmroiYear'),
    salesTurnover: metric('salesTurnover'),
    ordersTurnover: metric('ordersTurnover'),
    marginalityWithoutExpense,
  };
}

export type FormulaMetricValues = ReturnType<typeof buildFormulaMetricValues>;

export function buildCustomMetricValue(formula: string, variables: FormulaMetricValues) {
  const current = evaluateFormula(formula, variables, 'current');
  const previous = evaluateFormula(formula, variables, 'previous');
  return {
    current,
    previous,
    delta: 0,
    deltaPercent: 0,
    trend: 'neutral' as const,
    sparkline: [],
  };
}

export function formatCustomMetricValue(value: number, unit: string) {
  switch (unit) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${value.toFixed(1)} дн`;
    case 'number':
    default:
      return formatNumber(value);
  }
}

export function formatCustomMetricDelta(value: number, unit: string) {
  const sign = value >= 0 ? '+' : '';
  switch (unit) {
    case 'currency':
      return `${sign}${formatCurrency(value)}`;
    case 'percent':
      return `${sign}${value.toFixed(1)} п.п.`;
    case 'days':
      return `${sign}${value.toFixed(1)} дн`;
    case 'number':
    default:
      return `${sign}${formatNumber(value)}`;
  }
}

export function describeCustomMetricFormula(formula: string, variables: Array<{ label: string; value: string }>) {
  const labels = Array.from(
    new Set(
      Array.from(formula.matchAll(/@([\w]+)/g))
        .map(([, key]) => variables.find(variable => variable.value === key)?.label)
        .filter((label): label is string => Boolean(label))
    )
  );

  if (labels.length === 0) {
    return 'Пользовательская метрика, рассчитанная по заданной формуле.';
  }

  return `Пользовательская метрика. Использует: ${labels.join(', ')}.`;
}

function readApiMetric(metrics: Record<string, number | null> | null, key: string) {
  const value = metrics?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function calculatePercent(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

function evaluateFormula(formula: string, variables: FormulaMetricValues, field: 'current' | 'previous') {
  const normalized = formula.replace(/@([\w]+)/g, (_, key: string) => String(variables[key as keyof FormulaMetricValues]?.[field] ?? 0));
  if (!/^[\d+\-*/().,\s]+$/.test(normalized)) return 0;

  try {
    const expression = normalized.replace(/,/g, '.');
    const result = Function(`"use strict"; return (${expression});`)();
    return Number.isFinite(result) ? Number(result) : 0;
  } catch {
    return 0;
  }
}
