import { formatCurrency, formatNumber } from './calculations';
import type { AnalyticsColumnDefinition, AnalyticsTableRow } from '../components/dashboard/AnalyticsTableRowView';

type ProductReportingApiRow = {
  dimension?: {
    vendorCode?: string | null;
    marketplaceArticle?: string | null;
    productName?: string | null;
    brand?: string | null;
    category?: string | null;
    accountName?: string | null;
    marketplace?: string | null;
    imageUrl?: string | null;
  } | null;
  metrics?: Record<string, number | null> | null;
};

export function getAnalyticsComparableValue(row: AnalyticsTableRow, columnId: AnalyticsColumnDefinition['id'] | string) {
  if (columnId === 'photo') return row.photoLabel;
  if (columnId === 'article') return row.productName;
  return row[columnId as keyof AnalyticsTableRow];
}

export function getAnalyticsBarcode(row: AnalyticsTableRow) {
  const raw = row.marketplaceArticleId.replace(/\D/g, '');
  return raw ? `20${raw.padStart(11, '0').slice(0, 11)}` : `20${row.id.replace(/\D/g, '').padStart(11, '0').slice(0, 11)}`;
}

export function getMetricNumber(metrics: Record<string, number | null> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metrics?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

export function buildAnalyticsRowsFromApi(rows: ProductReportingApiRow[]) {
  return rows.map((row, index) => {
    const metrics = row.metrics ?? {};
    const dimension = row.dimension ?? {};
    const realisation = getMetricNumber(metrics, ['realisation']);
    const salesCount = getMetricNumber(metrics, ['salesCount']);
    const sales = getMetricNumber(metrics, ['sales']);
    const ordersCount = getMetricNumber(metrics, ['ordersCount']);
    const commission = getMetricNumber(metrics, ['commission']);
    const logistics = getMetricNumber(metrics, ['logistics']);
    const storage = getMetricNumber(metrics, ['storage']);
    const returns = getMetricNumber(metrics, ['returns']);
    const toTransfer = getMetricNumber(metrics, ['toTransfer']);
    const tax = getMetricNumber(metrics, ['tax']);
    const advertisingExpense = getMetricNumber(metrics, ['advertisingExpense']);
    const costOfSales = getMetricNumber(metrics, ['costOfSales']);
    const stockBalance = getMetricNumber(metrics, ['stockBalance']);
    const stockBalanceOwn = getMetricNumber(metrics, ['userWarehouseStockBalance']);
    const stockBalanceToClient = getMetricNumber(metrics, ['stockBalanceInWayToClient']);
    const stockBalanceFromClient = getMetricNumber(metrics, ['stockBalanceInWayFromClient']);
    const capitalizationByCost = getMetricNumber(metrics, ['capitalizationByCost']);
    const capitalizationByRetail = getMetricNumber(metrics, ['capitalizationByPrice']);
    const capitalizationOwnWarehouse = getMetricNumber(metrics, ['userWarehouseCapitalizationByCost']);
    const rejectionsAndReturns = getMetricNumber(metrics, ['returnsCount']);
    const profit = getMetricNumber(metrics, ['profit']);
    const profitWithoutExpense = getMetricNumber(metrics, ['profitWithoutExpense']);
    const advertisingExpenseBonus = getMetricNumber(metrics, ['advertisingExpenseBonus']);
    const drrBonus = getMetricNumber(metrics, ['drrBonus']);
    const drrByOrders = getMetricNumber(metrics, ['drrByOrders']);
    const drr = getMetricNumber(metrics, ['drr']);
    const drrTotal = getMetricNumber(metrics, ['drrSum']);
    const marginalityWithoutExpense = getMetricNumber(metrics, ['marginalityWithoutExpense']);
    const operationalExpense = getMetricNumber(metrics, ['expense']);
    const otherDeduction = getMetricNumber(metrics, ['otherDeduction']);
    const netMarketplaceReward = getMetricNumber(metrics, ['netMarketplaceReward']);
    const compensation = getMetricNumber(metrics, ['compensation']);
    const fines = getMetricNumber(metrics, ['fines']);
    const acceptanceSum = getMetricNumber(metrics, ['acceptanceSum']);
    const avgSalePrice = getMetricNumber(metrics, ['averagePriceAfterSPP']);
    const avgPriceBeforeDiscount = getMetricNumber(metrics, ['averagePriceBeforeSPP']);
    const buyoutRate = getMetricNumber(metrics, ['averageRedemption']);
    const roi = getMetricNumber(metrics, ['roi']);
    const gmroi = getMetricNumber(metrics, ['gmroi']);
    const gmroiYear = getMetricNumber(metrics, ['gmroiYear']);

    return {
      id: dimension.marketplaceArticle ?? dimension.vendorCode ?? dimension.productName ?? `product-${index + 1}`,
      photoLabel: dimension.productName ?? dimension.marketplaceArticle ?? `Товар ${index + 1}`,
      articleLabel: dimension.marketplaceArticle ?? dimension.vendorCode ?? `Товар ${index + 1}`,
      productName: dimension.productName ?? dimension.marketplaceArticle ?? `Товар ${index + 1}`,
      imageUrl: dimension.imageUrl ?? undefined,
      marketplace: dimension.marketplace ?? '—',
      store: dimension.accountName ?? '—',
      brand: dimension.brand ?? '—',
      category: dimension.category ?? '—',
      group: dimension.category ?? '—',
      marketplaceArticleId: dimension.marketplaceArticle ?? dimension.vendorCode ?? '—',
      avgCost: 0,
      operationalExpense,
      otherDeduction,
      avgPriceBeforeDiscount,
      avgSalePrice,
      realisation,
      turnoverSales: getMetricNumber(metrics, ['salesTurnover']),
      turnoverOrders: getMetricNumber(metrics, ['ordersTurnover']),
      sales,
      toTransfer,
      returns,
      costOfSales,
      fines,
      ordersCount,
      ordersAmount: realisation,
      commission,
      netMarketplaceReward,
      compensation,
      averageLogisticsCost: getMetricNumber(metrics, ['averageLogisticsCost']),
      capitalizationByCost,
      capitalizationByRetail,
      capitalizationOwnWarehouse,
      gmroi,
      gmroiYear,
      logisticsCost: logistics,
      storage,
      rejectionsAndReturns,
      totalSales: getMetricNumber(metrics, ['totalSales']),
      buyoutRate,
      averageProfitPerPiece: getMetricNumber(metrics, ['averageProfitPerPiece']),
      tax,
      taxBase: getMetricNumber(metrics, ['taxBase']),
      profit,
      profitWithoutExpense,
      roi,
      shareOfRevenue: 0,
      marginality: getMetricNumber(metrics, ['marginality']),
      marginalityWithoutExpense,
      advertisingExpense,
      drr: drr,
      advertisingExpenseBonus,
      drrBonus,
      advertisingExpenseTotal: advertisingExpense,
      drrTotal,
      drrByOrders,
      acceptanceSum,
      abcProfit: '—',
      abcRevenue: '—',
      stockBalanceMP: stockBalance,
      stockBalanceOwn,
      stockBalanceToClient,
      stockBalanceFromClient,
      salesCount,
    } satisfies AnalyticsTableRow;
  });
}

export function formatAnalyticsCell(row: AnalyticsTableRow, columnId: AnalyticsColumnDefinition['id']) {
  const value = row[columnId as keyof AnalyticsTableRow];
  if (typeof value === 'number') {
    if (String(columnId).includes('Rate') || String(columnId).includes('roi') || String(columnId).includes('drr') || String(columnId).includes('margin') || columnId === 'shareOfRevenue' || columnId === 'buyoutRate' || columnId === 'gmroi' || columnId === 'gmroiYear' || columnId === 'marginality' || columnId === 'marginalityWithoutExpense') {
      return `${value.toFixed(1)}%`;
    }
    if (
      ['sales', 'returns', 'ordersCount', 'stockBalanceMP', 'stockBalanceOwn', 'stockBalanceToClient', 'stockBalanceFromClient', 'salesCount', 'rejectionsAndReturns', 'totalSales'].includes(String(columnId))
    ) {
      return formatNumber(value);
    }
    return formatCurrency(value);
  }
  return value ?? '—';
}

export function getAnalyticsExportValue(row: AnalyticsTableRow, columnId: AnalyticsColumnDefinition['id']) {
  if (columnId === 'photo') return '';
  if (columnId === 'article') return row.productName;
  const value = row[columnId as keyof AnalyticsTableRow];
  return typeof value === 'number' ? value : value ?? '';
}



