import { API_BASE_URL } from './env';

export const API_BASE_PATH = API_BASE_URL;

export const WEB_API_ROUTES = [
  'GET /health/live',
  'GET /health/ready',
  'GET /openapi/v1.json',
  'GET /swagger',
  'POST /auth/register',
  'POST /auth/login',
  'GET /auth/me',
  'GET /users/me',
  'PUT /users/me',
  'POST /users/me/change-password',
  'DELETE /users/me',
  'GET /users/me/organizations',
  'POST /organizations',
  'GET /organizations/{organizationId}/members',
  'PATCH /organizations/{organizationId}/members/{userId}/role',
  'DELETE /organizations/{organizationId}/members/{userId}',
  'PATCH /organizations/{organizationId}',
  'POST /organizations/{organizationId}/transfer-ownership',
  'GET /organizations/{organizationId}/invitations',
  'POST /organizations/{organizationId}/invitations',
  'POST /invitations/accept',
  'POST /invitations/{invitationId}/revoke',
  'GET /marketplaces/connectors',
  'POST /marketplace-connections/connect-shop',
  'GET /organizations/{organizationId}/marketplace-connections',
  'POST /marketplace-connections',
  'PATCH /marketplace-connections/{connectionId}',
  'POST /marketplace-connections/{connectionId}/validate',
  'DELETE /marketplace-connections/{connectionId}',
  'POST /marketplace-connections/{connectionId}/sync',
  'GET /marketplace-connections/{connectionId}/sync-runs',
  'GET /marketplace-sync-runs/{syncRunId:guid}',
  'POST /marketplace-sync-runs/{syncRunId:guid}/retry',
  'POST /marketplace-sync-runs/{syncRunId:guid}/cancel',
  'GET /marketplace-sync-runs/{syncRunId:guid}/artifacts',
  'POST /overview/summary',
  'POST /analytics/trends',
  'POST /analytics/breakdown',
  'POST /analytics/explanations',
  'GET /metadata/metrics',
  'GET /metadata/dimensions',
  'POST /metadata/filter-options',
  'GET /config/marketplace-connections/{connectionId}/finance-settings',
  'PUT /config/marketplace-connections/{connectionId}/finance-settings',
  'GET /config/marketplace-connections/{connectionId}/product-costs',
  'PUT /config/marketplace-connections/{connectionId}/product-costs',
  'GET /reporting/product-metrics',
  'POST /reporting/products/overview',
  'POST /reporting/products/query',
  'POST /reporting/products',
  'POST /reporting/products/details',
  'POST /reporting/products/metric-breakdowns',
  'POST /reporting/products/stock-history',
  'POST /reporting/products/traffic-history',
  'POST /reporting/products/stock-sources',
  'POST /reporting/external-traffic/query',
  'POST /reporting/external-traffic/history',
  'POST /reporting/search-phrases/query',
  'POST /reporting/search-phrases/history',
  'GET /config/custom-metrics',
  'POST /config/custom-metrics',
  'PATCH /config/custom-metrics/{id}',
  'DELETE /config/custom-metrics/{id}',
  'POST /config/custom-metrics/validate',
  'POST /config/custom-metrics/preview',
];

export const CONNECTOR_CATALOG = [
  {
    marketplace: 'Wildberries',
    label: 'Wildberries',
    supportedSyncKinds: ['catalog', 'orders', 'sales', 'stocks', 'finance'],
    credentialFields: [
      { key: 'apiToken', label: 'API token', secret: true },
    ],
  },
  {
    marketplace: 'Ozon',
    label: 'Ozon',
    supportedSyncKinds: [
      'catalog',
      'postings',
      'finance',
      'returns',
      'stocks',
      'analytics',
      'performanceProducts',
      'performanceOrders',
      'performancePhrases',
      'performanceExternalTraffic',
    ],
    credentialFields: [
      { key: 'clientId', label: 'Client ID', secret: true },
      { key: 'apiKey', label: 'API key', secret: true },
      { key: 'performanceClientId', label: 'Performance client ID', secret: true },
      { key: 'performanceClientSecret', label: 'Performance client secret', secret: true },
    ],
  },
] as const;

export const METRICS_CATALOG = [
  'sales',
  'commission',
  'logistics',
  'storage',
  'returns',
  'ordersCount',
  'stockBalance',
  'profit',
  'profitWithoutExpense',
  'profitability',
  'roi',
  'gmroi',
  'gmroiYear',
  'totalPaid',
] as const;

export const PRODUCT_REPORT_METRICS_CATALOG = [
  'realisation',
  'sales',
  'revenue',
  'totalSales',
  'salesCount',
  'netMarketplaceReward',
  'orders',
  'toTransfer',
  'profit',
  'profitWithoutExpense',
  'profitability',
  'costOfSales',
  'advertisingExpense',
  'drr',
  'drrByOrders',
  'returns',
  'returnsUnits',
  'returnsCount',
  'refunds',
  'tax',
  'taxBase',
  'totalPaid',
  'ordersCount',
  'averageRedemption',
  'averagePriceBeforeSPP',
  'averagePriceAfterSPP',
  'orderPrice',
  'averageLogisticsCost',
  'averageProfitPerPiece',
  'salesTurnover',
  'ordersTurnover',
  'roi',
  'gmroi',
  'gmroiYear',
  'stockBalance',
  'stockBalanceOverall',
  'cost',
  'currentPrice',
  'oldPrice',
  'marketingPrice',
  'minimumPrice',
  'netPrice',
  'vatRate',
  'sellerDiscountPercent',
  'marketplaceDiscountPercent',
  'shareInTotalRevenue',
  'shareInTotalProfit',
  'deliveredUnits',
  'cancellations',
  'hitsViewSearch',
  'hitsViewPdp',
  'hitsView',
  'hitsToCartSearch',
  'hitsToCartPdp',
  'hitsToCart',
  'sessionViewSearch',
  'sessionViewPdp',
  'sessionView',
  'convToCartSearch',
  'convToCartPdp',
  'convToCart',
  'positionCategory',
  'commission',
  'logistics',
  'storage',
  'salesUnits',
  'orderedUnits',
  'acceptanceSum',
  'fines',
  'otherDeduction',
  'compensation',
  'capitalizationByCost',
  'capitalizationByPrice',
  'userWarehouseStockBalance',
  'userWarehouseCapitalizationByCost',
  'advertisingExpenseBonus',
  'drrSales',
  'drrSum',
] as const;

export const DIMENSIONS_CATALOG = [
  'Product',
  'Brand',
  'Category',
  'Account',
  'Marketplace',
  'Date',
  'Week',
  'Month',
  'Campaign',
  'Warehouse',
  'Country',
] as const;

export const RECOMMENDED_LOAD_SEQUENCE = [
  'GET /api/v1/auth/me',
  'GET /api/v1/users/me/organizations',
  'GET /api/v1/organizations/{organizationId}/marketplace-connections',
  'POST /api/v1/metadata/filter-options',
  'GET /api/v1/metadata/metrics',
  'POST /api/v1/overview/summary',
  'POST /api/v1/analytics/trends',
  'POST /api/v1/analytics/breakdown',
] as const;

export const RECOMMENDED_PRODUCT_LOAD_SEQUENCE = [
  'GET /api/v1/reporting/product-metrics',
  'POST /api/v1/reporting/products/overview',
  'POST /api/v1/reporting/products/query',
  'POST /api/v1/reporting/products/details',
] as const;

export const FIRST_OWNER_FLOW = [
  'POST /api/v1/auth/register',
  'POST /api/v1/organizations',
  'GET /api/v1/marketplaces/connectors',
  'POST /api/v1/marketplace-connections/connect-shop',
  'poll sync status',
  'load analytics endpoints',
] as const;

export const CONNECT_SHOP_FLOW = [
  'GET /api/v1/marketplaces/connectors',
  'POST /api/v1/marketplace-connections/connect-shop',
  'poll sync-runs',
  'load analytics once sync succeeds',
] as const;

export const HISTORICAL_SYNC_FLOW = [
  'choose a custom date range',
  'POST /api/v1/marketplace-connections/{connectionId}/sync',
  'poll sync-run status',
  'reload analytics after success',
] as const;

export const ERROR_MODEL_EXAMPLE = {
  statusCode: 400,
  message: 'One or more errors occurred.',
  errors: {
    GeneralErrors: ['Metric formula is required.'],
  },
};

export const SAMPLE_SUMMARY_RESPONSE = {
  scope: {
    dateFrom: '2026-04-01',
    dateTo: '2026-04-17',
    mode: 'Management',
  },
  query: {
    accountIds: [123456],
    filters: {
      productIds: [],
      groupIds: [],
      brandIds: [],
      categoryIds: [],
      tags: [],
    },
  },
  metrics: {
    sales: 5042088.32,
    commission: 711240.1,
    logistics: 128320.55,
    storage: 42110.22,
    returns: 94220.4,
    ordersCount: 8849,
    stockBalance: 467,
  },
  comparisons: {
    sales: {
      previous: 4710000.12,
      delta: 332088.2,
      deltaPercent: 7.05,
    },
  },
  meta: {
    updatedAt: '2026-04-18T09:42:11Z',
    isPartial: false,
  },
};

export const SAMPLE_TRENDS_RESPONSE = {
  scope: {
    dateFrom: '2026-04-01',
    dateTo: '2026-04-17',
    mode: 'Management',
  },
  query: {
    accountIds: [123456],
    filters: {
      productIds: [],
      groupIds: [],
      brandIds: [],
      categoryIds: [],
      tags: [],
    },
  },
  grain: 'Day',
  series: [
    {
      date: '2026-04-15',
      metrics: {
        sales: 315700.54,
        commission: 44220.18,
        logistics: 8211.32,
        storage: 2410.8,
        returns: 5100,
        ordersCount: 530,
      },
    },
  ],
  dataState: {
    isPartial: true,
    lastCompleteDate: '2026-04-15',
    updatedAt: '2026-04-18T09:42:11Z',
  },
};

export const SAMPLE_BREAKDOWN_RESPONSE = {
  scope: {
    dateFrom: '2026-04-01',
    dateTo: '2026-04-17',
    mode: 'Management',
  },
  query: {
    accountIds: [123456],
    filters: {
      productIds: [],
      groupIds: [],
      brandIds: [],
      categoryIds: [],
      tags: [],
    },
  },
  groupBy: 'Product',
  rows: [
    {
      dimension: {
        id: '233313363',
        label: '233313363',
        brand: 'kleyberg',
        category: 'Клей',
        accountName: 'WB Main Shop',
      },
      metrics: {
        sales: 46921.87,
        commission: 6320.44,
        logistics: 1180.2,
        storage: 310.55,
        returns: 0,
        ordersCount: 71,
        stockBalance: 467,
      },
    },
  ],
  summary: {
    total: {
      sales: 1483181.93,
      commission: 211203.44,
      logistics: 38411.1,
      storage: 14210.33,
      returns: 25000,
      ordersCount: 2820,
      stockBalance: 9021,
    },
    page: {
      sales: 46921.87,
      commission: 6320.44,
      logistics: 1180.2,
      storage: 310.55,
      returns: 0,
      ordersCount: 71,
      stockBalance: 467,
    },
  },
  pagination: {
    page: 1,
    limit: 50,
    total: 390,
  },
  meta: {
    updatedAt: '2026-04-18T09:42:11Z',
    isPartial: false,
  },
};

export const SAMPLE_EXPLANATION_RESPONSE = {
  scope: {
    dateFrom: '2026-04-01',
    dateTo: '2026-04-17',
    mode: 'Management',
  },
  query: {
    accountIds: [123456],
    metric: 'sales',
  },
  explanation: [
    { label: 'Account', value: 'WB Main Shop', share: '48%' },
    { label: 'Top product', value: '233313363', share: '32%' },
    { label: 'Marketplace', value: 'Wildberries', share: '20%' },
  ],
};

export const SAMPLE_CUSTOM_METRIC = {
  id: 'custom-sales-mirror',
  name: 'Sales Mirror',
  formula: 'sales',
  unit: 'RUB',
  active: true,
};
