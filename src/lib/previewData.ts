import type { AnalyticsWorkspaceData } from '../hooks/useAnalyticsWorkspaceData';
import type { ProductReportingData } from '../hooks/useProductReportingData';

const UPDATED_AT = '2026-05-08T09:00:00.000Z';

const products = [
  ['WB-1001', 'Organic cotton hoodie', 'Northline', 'Одежда', 'Wildberries', 'WB Москва'],
  ['OZ-2048', 'Smart kitchen scale', 'HomeMetric', 'Дом', 'Ozon', 'Ozon FBO'],
  ['WB-1138', 'Travel cosmetic case', 'Wayfarer', 'Аксессуары', 'Wildberries', 'WB Казань'],
  ['OZ-3321', 'LED desk lamp', 'Luma', 'Электроника', 'Ozon', 'Ozon FBS'],
  ['WB-4107', 'Kids thermal bottle', 'NordKids', 'Детские товары', 'Wildberries', 'WB СПб'],
] as const;

const metricKeys = [
  'realisation',
  'sales',
  'salesCount',
  'totalSales',
  'netMarketplaceReward',
  'orders',
  'toTransfer',
  'profit',
  'profitWithoutExpense',
  'profitability',
  'ordersCount',
  'stockBalance',
  'stockBalanceOverall',
  'userWarehouseStockBalance',
  'userWarehouseCapitalizationByCost',
  'averageRedemption',
  'averagePriceBeforeSPP',
  'averagePriceAfterSPP',
  'averageLogisticsCost',
  'averageProfitPerPiece',
  'salesTurnover',
  'ordersTurnover',
  'logistics',
  'storage',
  'returns',
  'returnsCount',
  'refunds',
  'advertisingExpense',
  'drr',
  'drrByOrders',
  'roi',
  'gmroi',
  'gmroiYear',
  'costOfSales',
  'tax',
  'taxBase',
  'commission',
  'acceptanceSum',
  'fines',
  'otherDeduction',
  'compensation',
  'capitalizationByCost',
  'capitalizationByPrice',
] as const;

function productMetrics(index: number) {
  const scale = 1 - index * 0.13;
  const realisation = Math.round(1_850_000 * scale);
  const profit = Math.round(realisation * (0.24 - index * 0.012));
  const ordersCount = Math.round(1280 * scale);
  const salesCount = Math.round(1040 * scale);

  return {
    realisation,
    sales: salesCount,
    salesCount,
    totalSales: salesCount + Math.round(80 * scale),
    orders: ordersCount,
    ordersCount,
    toTransfer: Math.round(realisation * 0.69),
    profit,
    profitWithoutExpense: Math.round(profit * 1.12),
    profitability: Number(((profit / realisation) * 100).toFixed(1)),
    stockBalance: Math.round(820 * scale),
    stockBalanceOverall: Math.round(1040 * scale),
    userWarehouseStockBalance: Math.round(210 * scale),
    userWarehouseCapitalizationByCost: Math.round(280_000 * scale),
    averageRedemption: 86 - index * 2,
    averagePriceBeforeSPP: Math.round(2200 * scale),
    averagePriceAfterSPP: Math.round(1880 * scale),
    averageLogisticsCost: Math.round(165 * scale),
    averageProfitPerPiece: Math.round(profit / Math.max(salesCount, 1)),
    salesTurnover: Number((4.8 + index * 0.4).toFixed(1)),
    ordersTurnover: Number((3.9 + index * 0.3).toFixed(1)),
    logistics: Math.round(realisation * 0.065),
    storage: Math.round(realisation * 0.018),
    returns: Math.round(realisation * 0.036),
    returnsCount: Math.round(42 * scale),
    refunds: Math.round(realisation * 0.014),
    advertisingExpense: Math.round(realisation * 0.09),
    drr: Number((9 + index * 0.6).toFixed(1)),
    drrByOrders: Number((7.5 + index * 0.5).toFixed(1)),
    roi: Number((132 - index * 8).toFixed(1)),
    gmroi: Number((42 - index * 3).toFixed(1)),
    gmroiYear: Number((118 - index * 7).toFixed(1)),
    costOfSales: Math.round(realisation * 0.38),
    tax: Math.round(realisation * 0.06),
    taxBase: Math.round(realisation * 0.9),
    commission: Math.round(realisation * 0.14),
    netMarketplaceReward: Math.round(realisation * 0.11),
    acceptanceSum: Math.round(realisation * 0.012),
    fines: Math.round(realisation * 0.004),
    otherDeduction: Math.round(realisation * 0.009),
    compensation: Math.round(realisation * 0.003),
    capitalizationByCost: Math.round(430_000 * scale),
    capitalizationByPrice: Math.round(710_000 * scale),
  };
}

const rows = products.map((product, index) => ({
  dimension: {
    vendorCode: product[0],
    marketplaceArticle: product[0],
    productName: product[1],
    brand: product[2],
    category: product[3],
    marketplace: product[4],
    accountName: product[5],
    imageUrl: `https://placehold.co/96x96/f8fafc/334155?text=${encodeURIComponent(product[0].slice(0, 2))}`,
  },
  metrics: productMetrics(index),
}));

const totalMetrics = rows.reduce<Record<string, number>>((acc, row) => {
  Object.entries(row.metrics).forEach(([key, value]) => {
    acc[key] = (acc[key] ?? 0) + value;
  });
  return acc;
}, {});

export const previewAnalyticsData: AnalyticsWorkspaceData = {
  accountIds: [101, 202, 303],
  metricsCatalog: [...metricKeys],
  filterOptions: {
    accounts: [
      { id: 101, label: 'WB Москва', marketplace: 'Wildberries' },
      { id: 202, label: 'Ozon FBO', marketplace: 'Ozon' },
      { id: 303, label: 'WB СПб', marketplace: 'Wildberries' },
    ],
    products: products.map(product => ({ id: product[0], label: product[1] })),
    brands: [...new Set(products.map(product => product[2]))].map(label => ({ id: label, label })),
    categories: [...new Set(products.map(product => product[3]))].map(label => ({ id: label, label })),
    dateRange: { minDate: '2026-04-01', maxDate: '2026-05-08' },
  },
  summary: {
    metrics: totalMetrics,
    comparisons: {
      realisation: { deltaPercent: 12.4 },
      profit: { deltaPercent: 8.1 },
      ordersCount: { deltaPercent: 15.7 },
      stockBalance: { deltaPercent: -3.2 },
    },
    meta: {
      updatedAt: UPDATED_AT,
      isPartial: false,
      taxConfigured: true,
      productCostsConfigured: true,
      economicsConfigured: true,
    },
  },
  trends: {
    grain: 'Day',
    series: Array.from({ length: 14 }, (_, index) => ({
      date: new Date(Date.UTC(2026, 3, 25 + index)).toISOString().slice(0, 10),
      metrics: {
        realisation: 280_000 + index * 18_500,
        profit: 68_000 + index * 4200,
        ordersCount: 180 + index * 8,
        sales: 145 + index * 7,
      },
    })),
    dataState: { isPartial: false, lastCompleteDate: '2026-05-08', updatedAt: UPDATED_AT },
  },
  breakdown: {
    rows: rows.map(row => ({
      dimension: row.dimension.productName,
      metrics: row.metrics,
    })),
    summary: { total: totalMetrics, page: totalMetrics },
    pagination: { total: rows.length, page: 1, limit: 25 },
    meta: { isPartial: false },
  },
  explanation: {
    metric: 'realisation',
    breakdown: [
      { key: 'orders', label: 'Рост заказов', amount: 420_000 },
      { key: 'price', label: 'Средняя цена', amount: 180_000 },
      { key: 'returns', label: 'Возвраты', amount: -55_000 },
    ],
  },
  loading: false,
  error: null,
};

export const previewProductReportingData: ProductReportingData = {
  summary: {
    metrics: totalMetrics,
    comparisons: previewAnalyticsData.summary?.comparisons ?? null,
    meta: previewAnalyticsData.summary?.meta ?? null,
  },
  overview: {
    summary: totalMetrics,
    topProducts: rows,
    meta: previewAnalyticsData.summary?.meta ?? null,
  },
  tableSummary: { total: totalMetrics, page: totalMetrics },
  revenueStructure: {
    realisation: totalMetrics.realisation,
    sales: totalMetrics.sales,
    items: [
      { key: 'commission', label: 'Commission', labelRu: 'Комиссия', effect: 'negative', amount: -totalMetrics.commission },
      { key: 'logistics', label: 'Logistics', labelRu: 'Логистика', effect: 'negative', amount: -totalMetrics.logistics },
      { key: 'advertisingExpense', label: 'Advertising', labelRu: 'Реклама', effect: 'negative', amount: -totalMetrics.advertisingExpense },
      { key: 'profit', label: 'Profit', labelRu: 'Прибыль', effect: 'positive', amount: totalMetrics.profit },
    ],
    meta: previewAnalyticsData.summary?.meta ?? null,
  },
  marginTop: {
    summary: {
      totalProducts: rows.length,
      returnedProducts: rows.length,
      otherProducts: 0,
      totalProfit: totalMetrics.profit,
      returnedProfit: totalMetrics.profit,
      otherProfit: 0,
    },
    items: rows.map((row, index) => ({
      rank: index + 1,
      kind: 'Product',
      dimension: row.dimension,
      metrics: row.metrics,
      profit: row.metrics.profit,
      profitSharePercent: Number(((row.metrics.profit / totalMetrics.profit) * 100).toFixed(1)),
    })),
    meta: previewAnalyticsData.summary?.meta ?? null,
  },
  marginCategories: {
    summary: {
      totalCategories: 4,
      returnedCategories: 4,
      otherCategories: 0,
      totalProfit: totalMetrics.profit,
      returnedProfit: totalMetrics.profit,
      otherProfit: 0,
    },
    items: [...new Set(products.map(product => product[3]))].map((category, index) => ({
      rank: index + 1,
      kind: 'Category',
      dimension: { id: category, label: category, category },
      metrics: {
        realisation: Math.round(totalMetrics.realisation * (0.32 - index * 0.04)),
        profit: Math.round(totalMetrics.profit * (0.35 - index * 0.05)),
        profitability: 22 - index,
      },
      profit: Math.round(totalMetrics.profit * (0.35 - index * 0.05)),
      profitSharePercent: 35 - index * 5,
      productCount: index + 2,
    })),
    meta: previewAnalyticsData.summary?.meta ?? null,
  },
  rows,
  metricsCatalog: [...metricKeys],
  metricCards: [
    { id: 'realisation', title: 'Выручка', primaryMetric: 'realisation', secondaryMetric: 'ordersCount', ratioMetric: 'profitability', group: 'summary', order: 1 },
    { id: 'profit', title: 'Прибыль', primaryMetric: 'profit', secondaryMetric: 'profitWithoutExpense', ratioMetric: 'roi', group: 'finance', order: 2 },
    { id: 'stock', title: 'Остатки', primaryMetric: 'stockBalance', secondaryMetric: 'capitalizationByCost', ratioMetric: 'gmroi', group: 'stock', order: 3 },
  ],
  metricDefinitions: metricKeys.map(key => ({
    key,
    label: key,
    header: key,
    meta: { suffix: key.includes('Count') || key.includes('sales') ? 'pcs' : 'rub', group: 'preview' },
  })),
  loading: false,
  marginLoading: false,
  error: null,
};

export const previewExternalTrafficRows = [
  {
    dimension: { id: 'telegram', label: 'Telegram Ads', sourceName: 'Telegram Ads', sourceType: 'Paid social', sourceKey: 'telegram', vendorTag: 'campaign-a' },
    metrics: { visits: 18400, clicks: 3920, ordersCount: 286, ordersAmount: 612000, expense: 148000 },
  },
  {
    dimension: { id: 'vk-retargeting', label: 'VK retargeting', sourceName: 'VK retargeting', sourceType: 'Paid social', sourceKey: 'vk', vendorTag: 'retargeting' },
    metrics: { visits: 12600, clicks: 2810, ordersCount: 214, ordersAmount: 438000, expense: 92000 },
  },
  {
    dimension: { id: 'bloggers', label: 'Influencer placements', sourceName: 'Influencer placements', sourceType: 'Referral', sourceKey: 'bloggers', vendorTag: 'may-drop' },
    metrics: { visits: 7400, clicks: 1340, ordersCount: 96, ordersAmount: 221000, expense: 57000 },
  },
];

export const previewSearchPhraseRows = [
  {
    dimension: { id: 'hoodie', label: 'худи хлопок oversize', campaignId: 'cmp-101', campaignName: 'WB apparel search', phrase: 'худи хлопок oversize', phraseType: 'Search', category: 'Одежда', placement: 'Search top' },
    metrics: { impressions: 118000, clicks: 7200, ordersCount: 348, ordersAmount: 766000, expense: 93000, ctr: 6.1, cpc: 12.9, drr: 12.1 },
  },
  {
    dimension: { id: 'lamp', label: 'настольная лампа led', campaignId: 'cmp-204', campaignName: 'Ozon home office', phrase: 'настольная лампа led', phraseType: 'Search', category: 'Электроника', placement: 'Catalog' },
    metrics: { impressions: 92000, clicks: 5100, ordersCount: 214, ordersAmount: 482000, expense: 71000, ctr: 5.5, cpc: 13.9, drr: 14.7 },
  },
  {
    dimension: { id: 'bottle', label: 'термос детский', campaignId: 'cmp-309', campaignName: 'Kids seasonal', phrase: 'термос детский', phraseType: 'Search', category: 'Детские товары', placement: 'Search top' },
    metrics: { impressions: 67000, clicks: 3860, ordersCount: 176, ordersAmount: 315000, expense: 42000, ctr: 5.8, cpc: 10.9, drr: 13.3 },
  },
];

export function buildPreviewDailySeries() {
  return Array.from({ length: 10 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 3, 29 + index)).toISOString().slice(0, 10),
    visits: 1100 + index * 130,
    impressions: 9800 + index * 740,
    clicks: 420 + index * 34,
    ordersCount: 28 + index * 3,
    ordersAmount: 64000 + index * 5200,
    expense: 12000 + index * 900,
    ctr: Number((5.2 + index * 0.08).toFixed(1)),
    cpc: Number((12.4 - index * 0.1).toFixed(1)),
    drr: Number((14.8 - index * 0.2).toFixed(1)),
  }));
}
