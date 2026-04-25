# AiStats Web API

Updated on 2026-04-25.

This document is the working API reference for the web frontend.

It is intentionally practical:
- it focuses on the endpoints the web app should call,
- it describes the current behavior of the backend,
- it calls out places where the platform is still prototype-backed.

## Current Direction

The web API intentionally keeps reporting concerns split instead of copying a monolithic TrueStats-style `reporting/main` response.

Current product-reporting direction:
- keep separate endpoints for:
  - metric metadata
  - overview cards / top products
  - product table query
  - product details
  - grouped metric breakdowns
  - trends
- keep diff/comparison semantics as explicit reporting data, not as implicit frontend-only math
- keep the backend as the source of truth for:
  - metric labels and units
  - precision
  - whether positive growth is good or bad
  - where a metric is available

Current frontend implication:
- the frontend should not expect one backend endpoint equivalent to `https://api.truestats.ru/reporting/main`
- the frontend should compose the screen from the split contracts documented below
- `GET /api/v1/reporting/product-metrics` is metadata only; it tells the frontend how to render metrics, but it does not return previous-period values or diffs by itself

Current backend gap to be aware of:
- metric definitions, generic metadata, and custom metric variables are not yet fully centralized into one metric registry
- while wiring the frontend, treat `GET /api/v1/reporting/product-metrics` as the authoritative product-screen metric catalog
- expect some remaining drift between:
  - product metric catalog
  - generic metadata catalog
  - custom metric formula capabilities

## Base Rules

- Base path: `/api/v1`
- Auth: `Authorization: Bearer <access_token>` for protected endpoints
- JSON enums are serialized as strings
- Date format: `YYYY-MM-DD`
- Date-time format: ISO 8601 UTC

Operational endpoints:
- `GET /health/live`
- `GET /health/ready`
- `GET /openapi/v1.json`
- `GET /swagger`

## Auth

### `POST /api/v1/auth/register`

Creates a new active user account and immediately returns a bearer token.

Request:

```json
{
  "firstName": "Anna",
  "lastName": "Ivanova",
  "email": "owner@company.com",
  "phone": "+79990000000",
  "password": "secret"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "tokenType": "Bearer",
  "expiresAt": "2026-04-18T18:00:00Z",
  "user": {
    "id": "guid",
    "firstName": "Anna",
    "lastName": "Ivanova",
    "email": "owner@company.com",
    "phone": "+79990000000",
    "status": "Active"
  }
}
```

### `POST /api/v1/auth/login`

Request:

```json
{
  "email": "owner@company.com",
  "password": "secret"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "tokenType": "Bearer",
  "expiresAt": "2026-04-17T18:00:00Z",
  "user": {
    "id": "guid",
    "firstName": "Anna",
    "lastName": "Ivanova",
    "email": "owner@company.com",
    "phone": "+79990000000",
    "status": "Active"
  }
}
```

### `GET /api/v1/auth/me`

Returns the authenticated user from the JWT context.

## Users

### `GET /api/v1/users/me`
### `PUT /api/v1/users/me`
### `POST /api/v1/users/me/change-password`
### `DELETE /api/v1/users/me`

Current profile management endpoints for the signed-in user.

Also available:
- `POST /api/v1/users/request-password-reset`
- `POST /api/v1/users/reset-password`

## Organizations

### `GET /api/v1/users/me/organizations`

Returns organizations available to the current user.

### `POST /api/v1/organizations`

Request:

```json
{
  "name": "Acme"
}
```

### `GET /api/v1/organizations/{organizationId}/members`
### `PATCH /api/v1/organizations/{organizationId}/members/{userId}/role`
### `DELETE /api/v1/organizations/{organizationId}/members/{userId}`
### `PATCH /api/v1/organizations/{organizationId}`
### `POST /api/v1/organizations/{organizationId}/transfer-ownership`

Org membership and admin operations.

## Invitations

### `GET /api/v1/organizations/{organizationId}/invitations`
### `POST /api/v1/organizations/{organizationId}/invitations`

Request:

```json
{
  "email": "manager@company.com",
  "role": "Manager"
}
```

### `POST /api/v1/invitations/accept`

Request:

```json
{
  "token": "invite-token"
}
```

### `POST /api/v1/invitations/{invitationId}/revoke`

## Marketplace Connectors

### `GET /api/v1/marketplaces/connectors`

Returns supported marketplaces, supported sync kinds, and credential fields for the connect-shop flow.

Example response shape:

```json
[
  {
    "marketplace": "Wildberries",
    "label": "Wildberries",
    "supportedSyncKinds": ["catalog", "orders", "sales", "stocks", "finance"],
    "credentialFields": [
      { "key": "apiToken", "label": "API token", "secret": true }
    ]
  },
  {
    "marketplace": "Ozon",
    "label": "Ozon",
    "supportedSyncKinds": [
      "catalog",
      "postings",
      "finance",
      "storage",
      "returns",
      "stocks",
      "analytics",
      "performanceProducts",
      "performanceOrders",
      "performancePhrases",
      "performanceExternalTraffic"
    ],
    "credentialFields": [
      { "key": "clientId", "label": "Client ID", "secret": true },
      { "key": "apiKey", "label": "API key", "secret": true },
      { "key": "performanceClientId", "label": "Performance client ID", "secret": true },
      { "key": "performanceClientSecret", "label": "Performance client secret", "secret": true }
    ]
  }
]
```

## Marketplace Connections

### `POST /api/v1/marketplace-connections/connect-shop`

Recommended endpoint for the frontend.

Request:

```json
{
  "organizationId": "guid",
  "marketplace": "Wildberries",
  "credentials": {
    "apiToken": "token"
  },
  "startInitialSync": true,
  "initialSyncDays": 14,
  "initialSyncKinds": ["catalog", "orders", "sales", "stocks", "finance"]
}
```

For Ozon:

```json
{
  "organizationId": "guid",
  "marketplace": "Ozon",
  "credentials": {
    "clientId": "12345",
    "apiKey": "secret",
    "performanceClientId": "seller.performance.12345",
    "performanceClientSecret": "perf-secret"
  },
  "startInitialSync": true,
  "initialSyncDays": 14,
  "initialSyncKinds": ["catalog", "postings", "finance", "returns", "stocks"]
}
```

Response:
- created connection
- validation result
- optional initial sync enqueue result

Current behavior:
- `displayName` is no longer required for `connect-shop`
- the backend validates marketplace credentials immediately
- if the marketplace returns a shop/account name, that name is saved into the connection automatically
- `displayName` can still be sent as an optional fallback label when the provider does not return a name
- for Ozon, `performanceClientId` and `performanceClientSecret` are optional and belong to the same shop connection
- if one performance field is sent, the other must also be sent
- seller API credentials remain required even when performance credentials are present
- Ozon `analytics` sync kind now pulls seller-side organic funnel data from `/v1/analytics/data`
- Ozon `storage` sync kind pulls `FBO -> Стоимость размещения -> По товарам` via `/v1/report/placement/by-products/create` plus `/v1/report/info`
- Ozon `finance` sync now also pulls the same storage report automatically, so storage is fetched by default for the standard financial pipeline
- if both Ozon `finance` and `storage` are requested in one sync request, the standalone `storage` run is skipped to avoid double import

### `GET /api/v1/organizations/{organizationId}/marketplace-connections`
### `POST /api/v1/marketplace-connections`
### `PATCH /api/v1/marketplace-connections/{connectionId}`
### `POST /api/v1/marketplace-connections/{connectionId}/validate`
### `DELETE /api/v1/marketplace-connections/{connectionId}`

## Marketplace Accounting Config

These endpoints provide explicit seller-side accounting inputs for parity metrics that marketplaces do not expose directly in product-level sync data.

### `GET /api/v1/config/marketplace-connections/{connectionId}/finance-settings`
### `PUT /api/v1/config/marketplace-connections/{connectionId}/finance-settings`

Request:

```json
{
  "taxEnabled": true,
  "taxRatePercent": 6.0,
  "taxSystem": "usn_income"
}
```

Response:

```json
{
  "marketplaceConnectionId": "guid",
  "accountId": 123456789,
  "taxEnabled": true,
  "taxRatePercent": 6.0,
  "taxSystem": "usn_income",
  "updatedAt": "2026-04-20T09:40:00Z"
}
```

### `GET /api/v1/config/marketplace-connections/{connectionId}/product-costs`
### `PUT /api/v1/config/marketplace-connections/{connectionId}/product-costs`

Request:

```json
{
  "items": [
    {
      "marketplaceArticle": "1583892593",
      "vendorCode": "Полиуретановый клей 1 литр 1 шт",
      "productName": "Полиуретановый клей 1 литр 1 шт",
      "costPerUnit": 450.0,
      "currencyCode": "RUB"
    }
  ]
}
```

Behavior:
- replace semantics per connection
- reporting match priority:
  - `marketplaceArticle`
  - `vendorCode`
  - `productName`
- configured values are applied at reporting time for:
  - `tax`
  - `taxBase`
  - `costOfSales`
  - `profit`
  - `profitWithoutExpense`
  - `averageProfitPerPiece`
  - `profitability`
  - `roi`
  - `gmroi`
  - `gmroiYear`

Mode-specific reporting behavior:
- `Management` mode keeps product-level management math from normalized product aggregates
- `Financial` mode currently changes unfiltered summary/detail behavior for metrics backed by account-level finance totals
- current financial-mode account-level overlay applies to:
  - `totalPaid`
  - `commission`
  - `logistics`
  - `returns`
  - `compensation`
  - `otherDeduction`
- for unfiltered `products/query`, those financial-mode totals are also allocated across product rows proportionally:
  - `commission`, `logistics`, `returns` use their management-mode row share when available
  - `compensation`, `otherDeduction`, `totalPaid` use sales share
- derived summary metrics recomputed from those overlaid values:
  - `profit`
  - `profitWithoutExpense`
  - `profitability`
  - `roi`
  - `gmroi`
  - `gmroiYear`
  - `averageProfitPerPiece`
  - `capitalizationByCost`
- row-level product allocation for financial-mode-only expenses is still intentionally not applied

`connect-shop` is preferred for the UI, but the lower-level endpoints are still available.

Current behavior:
- organization connection list includes `latestSyncRun` when one exists
- product reporting `meta` now also exposes accounting readiness for the selected scope:
  - `taxConfigured`
  - `productCostsConfigured`
  - `economicsConfigured`
- these flags indicate whether configured tax settings and configured product costs were actually found for the selected reporting scope
- they are intended to help the web app explain why `tax`, `costOfSales`, `profit`, `roi`, and `gmroi` may still behave like source-only metrics when business inputs are missing
- this lets the web app render sync state on shop cards without making an immediate extra sync-runs request for every connection

## Marketplace Sync

### `POST /api/v1/marketplace-connections/{connectionId}/sync`

Manual sync enqueue endpoint.

Use this for:
- product-master/catalog refresh
- recent resync
- manual historical backfill
- manager-triggered sync from the app

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "syncKinds": ["catalog", "sales", "orders"]
}
```

Response:

```json
{
  "marketplaceConnectionId": "guid",
  "syncRunIds": ["guid", "guid"],
  "enqueuedAt": "2026-04-17T12:00:00Z"
}
```

Current behavior:
- if an identical sync kind for the same connection and date range is already `Queued` or `Running`, the backend reuses that active sync run id instead of creating a duplicate
- `catalog` is a first-class sync kind for Wildberries and Ozon
- `catalog` refresh persists canonical product identity and snapshot data without creating sales/finance/inventory facts
- use `catalog` when the web app needs richer filters or refreshed product master data without waiting for commercial activity

### `GET /api/v1/marketplace-connections/{connectionId}/sync-runs`

Returns sync runs for one connected shop.

### `GET /api/v1/marketplace-sync-runs/{syncRunId}`

Returns one sync run:
- `Queued`
- `Running`
- `Cancelled`
- `Succeeded`
- `Failed`

Important response fields:
- `canRetry`
- `canCancel`
- `attemptCount`
- `maxAttempts`
- `nextAttemptAt`
- `progressPercent`
- `progressMessage`

Frontend recommendation:
- use `canRetry` and `canCancel` directly instead of reimplementing status-to-action logic in the client
- use `attemptCount`, `maxAttempts`, and `nextAttemptAt` to show automatic retry state
- use `progressPercent` and `progressMessage` directly for sync cards and progress rows

### `POST /api/v1/marketplace-sync-runs/{syncRunId}/retry`

Retries a previous sync run by reusing:
- connection id
- sync kind
- date range

Current behavior:
- response shape is the same as the normal sync enqueue endpoint
- duplicate suppression still applies, so retrying an already active identical run reuses the active run id

### `POST /api/v1/marketplace-sync-runs/{syncRunId}/cancel`

Cancels a queued or running sync run.

Current behavior:
- queued and running syncs can be moved to `Cancelled`
- completed syncs keep their existing final status

Current sync progress behavior:
- `Queued` runs start at `progressPercent = 0`
- `Running` runs move through connector fetch, artifact persistence, normalization, and finalization stages
- `Succeeded` runs finish at `progressPercent = 100`
- `Failed` and `Cancelled` runs keep the last progress marker plus an explanatory `progressMessage`

Current retry behavior:
- sync runs are created with up to `3` total attempts
- failed attempts are retried automatically with backoff
- retry delays are currently `1 minute`, then `5 minutes`, then final failure
- when automatic retry is scheduled, the run returns to `Queued` and exposes `nextAttemptAt`

### `GET /api/v1/marketplace-sync-runs/{syncRunId}/artifacts`

Debug/admin endpoint.

Returns sync artifact metadata persisted from the sync pipeline.

Important:
- WB and Ozon first-sync rows are persisted into typed staging tables
- the artifact response exposes metadata only and marks storage as `typed-staging`
- the normal web dashboard should not need this endpoint for everyday rendering

Example response:

```json
[
  {
    "id": "guid",
    "marketplaceSyncRunId": "guid",
    "marketplaceConnectionId": "guid",
    "marketplace": "Ozon",
    "syncKind": "finance",
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-17",
    "recordCount": 542,
    "storageType": "typed-staging",
    "createdAt": "2026-04-19T10:00:00Z"
  }
]
```

## Analytics Query Model

The analytics API is query-oriented.

Shared request fields:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "mode": "Management",
  "accountIds": [123456],
  "marketplaces": ["Wildberries", "Ozon"],
  "filters": {
    "productIds": [],
    "groupIds": [],
    "brandIds": [],
    "categoryIds": [],
    "tags": []
  }
}
```

Notes:
- `accountIds` are stable ids for connected shops in the normalized analytics path
- `marketplaces` can be omitted to use all available sources
- `mode` is present in contracts even where business logic is still evolving

## Product Reporting

### `GET /api/v1/reporting/product-metrics`

Returns frontend-oriented metric definitions for the product reporting grid.

Current intent:
- stable metric keys for the web app
- UI headers and filter metadata
- sorting/filter capabilities per metric
- explicit semantics for period vs snapshot values
- explicit source semantics for computed vs catalog-backed values
- typed product dimension field catalog for table/drawer rendering

Response shape:
- `metrics[]`
- `cards[]`
- `dimensionFields[]`

Current response additions in `meta` per metric:
- `precision`
- `valueSource`
- `temporalKind`
- `availableIn`
- `group`
- `hint`

Current semantics:
- `valueSource = periodAggregate` for derived reporting metrics
- `valueSource = catalogSnapshot` for latest connector-side price/discount/VAT snapshot values
- `temporalKind = period` for aggregated period metrics
- `temporalKind = snapshot` for latest point-in-time product snapshot metrics
- `dimensionFields[]` mirrors the product dimension contract used by `products/query` and `products/details`
- the frontend can use `dimensionFields[]` to drive product table columns, drawer headers, and field grouping
- the backend now serves this product field catalog from one shared source that is also used by `GET /api/v1/metadata/dimensions`
- `meta.displayDiff` is a rendering hint only:
  - it tells the frontend whether a delta vs the previous range should normally be shown for this metric
  - it does not include previous-period values by itself
- `meta.positiveIfGrow` is also a rendering hint:
  - it tells the frontend whether a larger value should be colored as positive or negative
  - the frontend should not guess this from the metric key

Current `cards[]` catalog:
- provides backend-owned TrueStats-style KPI card composition metadata
- each card includes:
  - `id`
  - `title`
  - `primaryMetric`
  - optional `secondaryMetric`
  - optional `ratioMetric`
  - `hint`
  - `group`
  - `order`
- the frontend should use `cards[]` for KPI titles, metric composition, and tooltips
- the frontend still owns layout, visibility, responsive behavior, and visual design
- values for the card metrics come from `POST /api/v1/reporting/products/summary`

Current Ozon Performance-backed product metrics:
- `adOrdersCount`
- `adOrdersAmount`
- `adSalesAmount`
- `adAddToCartCount`

Current Ozon Seller Analytics-backed product metrics:
- `orderedUnits`
- `deliveredUnits`
- `returnsUnits`
- `cancellations`
- `hitsViewSearch`
- `hitsViewPdp`
- `hitsView`
- `hitsToCartSearch`
- `hitsToCartPdp`
- `hitsToCart`
- `sessionViewSearch`
- `sessionViewPdp`
- `sessionView`
- `convToCartSearch`
- `convToCartPdp`
- `convToCart`
- `positionCategory`

Current limitation:
- search phrase rows are staged but not yet normalized into product-level reporting metrics because they are not product-attributable in the current read model
- the product metric catalog still lags behind the actual backend metric context in a few areas
- when wiring the frontend, treat these gaps as three separate categories:

Already available and exposed in `GET /api/v1/reporting/product-metrics`:
- `totalPaid`
- `profit`
- `profitWithoutExpense`
- `profitability`
- `sales`
- `salesCount`
- `realisation`
- `netMarketplaceReward`
- `orders`
- `ordersCount`
- `averageRedemption`
- `logistics`
- `storage`
- `acceptanceSum`
- `otherDeduction`
- `roi`
- `tax`
- `taxBase`
- `commission`
- `averagePriceBeforeSPP`
- `stockBalance`
- `gmroi`
- `gmroiYear`
- `fines`
- `compensation`
- `advertisingExpense`
- `costOfSales`
- `averagePriceAfterSPP`
- `averageLogisticsCost`
- `averageProfitPerPiece`
- `returns`
- `returnsUnits`
- `returnsCount`
- `refunds`
- `salesTurnover`
- `ordersTurnover`
- `capitalizationByCost`
- `capitalizationByPrice`
- `userWarehouseStockBalance`
- `userWarehouseCapitalizationByCost`

Requires a new business bucket or a new explicit formula, not just catalog exposure:
- `operatingExpense`
- a genuinely distinct `profitWithoutExpense` / `marginalityWithoutExpense` card if it must differ from `profit`
- any bonus-split advertising metrics such as `advertisingExpenseBonus`
- any total/bonus/sum DRR variants beyond the current `drr` and `drrByOrders`
- any ABC-segmentation metrics such as `profitAbc` or `realisationAbc`

Frontend composition note:
- several TrueStats-style cards are composite display blocks rather than standalone raw metrics
- this composition is now exposed through `GET /api/v1/reporting/product-metrics` as `cards[]`
- examples:
  - `Продажи, ₽/шт` = `sales` + `salesCount`
  - `Заказы, ₽/шт` = `orders` + `ordersCount`
  - `Реклама / ДРР` = `advertisingExpense` + `drr`
  - `Реклама / ДРРз` = `advertisingExpense` + `drrByOrders`
  - `Возвраты, ₽/шт` = `returns` + `returnsUnits`
  - `Логистика, ₽/%` = `logistics` + a share formula in the web layer or a future summary contract
  - `Хранение, ₽/%` = `storage` + a share formula in the web layer or a future summary contract

TrueStats-style KPI card mapping:
- `Реализация` -> `realisation`
- `Продажи` -> `sales` plus `salesCount` or `totalSales`
- `Заказы` -> `orders` plus `ordersCount`
- `Итого к оплате` -> `totalPaid`
- `Итоговое вознаграждение ВБ` -> `netMarketplaceReward`
- `Чистая прибыль / Марж-сть` -> `profit` plus `profitability`
- `Прибыль / Марж. без опер. расх.` -> `profitWithoutExpense` plus `marginalityWithoutExpense` when exposed; until then it matches `profit`/`profitability`
- `ROI` -> `roi`
- `% Выкупа` -> `averageRedemption`
- `Логистика` -> `logistics`
- `Реклама / ДРР` -> `advertisingExpense` plus `drr`
- `Реклама / ДРРз` -> `advertisingExpense` plus `drrByOrders`
- `Хранение` -> `storage`
- `Плат. приемка` -> `acceptanceSum`
- `Прочие удержания` -> `otherDeduction`
- `Себестоимость продаж` -> `costOfSales`
- `Налоги` -> `tax`
- `Налоговая База` -> `taxBase`
- `Комиссия` -> `commission`
- `Сред. цена до скидок МП` -> `averagePriceBeforeSPP`
- `Сред. цена продажи` -> `averagePriceAfterSPP`
- `Сред. стоимость логистики на 1 шт.` -> `averageLogisticsCost`
- `Средняя прибыль на 1 шт.` -> `averageProfitPerPiece`
- `Капитализация по себес.` -> `capitalizationByCost`
- `Капитализация по розн.` -> `capitalizationByPrice`
- `Остатки` -> `stockBalanceOverall` for the full tooltip total, or `stockBalance` for visible warehouse stock only
- `Остатки на моих складах` -> `userWarehouseStockBalance`
- `Капитализ. на моих складах` -> `userWarehouseCapitalizationByCost`
- `GMROI` -> `gmroi`
- `Годовой GMROI` -> `gmroiYear`
- `Штрафы` -> `fines`
- `Компенсации` -> `compensation`
- `Возвраты` -> `returns` plus `returnsCount`
- `Оборачиваемость по прод.` -> `salesTurnover`
- `Оборачиваемость по зак.` -> `ordersTurnover`

Important mapping notes:
- `realisation` and `sales` are intentionally different. Do not display `sales` under the `Реализация` label.
- `products/summary` returns account-level totals and comparisons for KPI cards; `products/query` returns row/table metrics.
- Financial summary COGS/profit metrics are based on row-level product costs where configured. A single product cost must not be applied to all account-level sold units.

### `POST /api/v1/reporting/products/overview`

High-level product screen endpoint for:
- top KPI cards
- top products widget
- initial screen load before opening the full product table

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "mode": "Management",
  "accountIds": [123456],
  "filters": {
    "productIds": [],
    "brandIds": [],
    "categoryIds": []
  },
  "summaryMetrics": [
    "sales",
    "profit",
    "ordersCount",
    "stockBalance",
    "totalPaid"
  ],
  "topProductMetrics": [
    "sales",
    "profit",
    "ordersCount",
    "stockBalance"
  ],
  "topProductsSortMetric": "sales",
  "topProductsSortDirection": "Desc",
  "topProductsLimit": 5
}
```

Response shape:
- `scope`
- `query`
- `summary`
- `topProducts[]`
- `meta`

Current behavior:
- powered by `analytics_product_period_aggregates`
- organic funnel metrics are additionally powered by `analytics_product_traffic_daily_facts`
- product rows are now enriched through canonical `analytics_product_catalog` when matching catalog identity exists
- intended to replace multiple top-of-screen fetches with one reporting-oriented request
- returns the same `dimension + metrics` row model used by `POST /api/v1/reporting/products/query`
- current response does not include previous-period comparison objects
- if the frontend needs product KPI card deltas for rich product metrics, it should call `POST /api/v1/reporting/products/summary`, not `POST /api/v1/overview/summary`
- `POST /api/v1/overview/summary` is only for the lightweight dashboard metric set documented in the Overview section

### `POST /api/v1/reporting/products/summary`

Reporting summary endpoint for product-screen cards.

Purpose:
- returns rich product/reporting metrics for the requested period
- computes previous-period comparison data on the backend using the same product-reporting formulas
- intended to back KPI cards that need:
  - current value
  - previous value
  - delta
  - delta percent

Request:

```json
{
  "dateFrom": "2026-04-13",
  "dateTo": "2026-04-19",
  "mode": "Financial",
  "accountIds": [123456],
  "marketplaces": ["Wildberries"],
  "metrics": [
    "sales",
    "profit",
    "profitWithoutExpense",
    "totalPaid",
    "orders",
    "ordersCount",
    "salesCount",
    "averageRedemption",
    "logistics",
    "drr",
    "drrByOrders",
    "roi",
    "costOfSales",
    "tax",
    "taxBase",
    "commission",
    "capitalizationByCost",
    "capitalizationByPrice",
    "gmroi",
    "gmroiYear"
  ]
}
```

Response shape:
- `scope`
- `query`
- `metrics`
- `comparisons`
- `meta`

Each `comparisons[metric]` item includes:
- `previous`
- `delta`
- `deltaPercent`

Frontend usage:
- use this endpoint for KPI card values and previous-period comparisons
- use `GET /api/v1/reporting/product-metrics` `cards[]` for KPI card titles, tooltips, and composite metric mapping
- use `POST /api/v1/reporting/products/overview` for top-products and overview payloads
- use `POST /api/v1/reporting/products/query` for the table
- when comparing against TrueStats, make sure frontend URL parameters such as `dateStart`/`dateEnd` are converted to API request fields `dateFrom`/`dateTo`; otherwise the backend will use whatever request dates the web app sends

### `POST /api/v1/reporting/products`

Legacy-compatible product table route.

Current behavior:
- still supported
- uses the same backend path as the new query-oriented contract
- new frontend work should prefer `POST /api/v1/reporting/products/query`

### `POST /api/v1/reporting/products/query`

Primary product reporting endpoint for the new web app.

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "mode": "Management",
  "accountIds": [123456],
  "filters": {
    "productIds": ["Р Полиуретановый клей 1 литр 1 шт"],
    "brandIds": [],
    "categoryIds": []
  },
  "metrics": [
    "sales",
    "profit",
    "ordersCount",
    "stockBalance",
    "commission",
    "logistics",
    "storage",
    "returns",
    "totalPaid"
  ],
  "sort": {
    "metric": "sales",
    "direction": "Desc"
  },
  "page": 1,
  "limit": 30
}
```

Response shape:
- `scope`
- `query`
- `rows[]`
- `summary.total`
- `summary.page`
- `pagination`
- `meta`

Each row includes:
- stable `id`
- `dimension`
  - `id`
  - `label`
  - `vendorCode`
  - `marketplaceArticle`
  - `productName`
  - `brand`
  - `category`
  - optional `subjectId`
  - `accountName`
  - `marketplace`
  - optional `imageUrl` and `productUrl`
  - optional connector-side product snapshot fields:
    - `currencyCode`
    - `currentPrice`
    - `oldPrice`
    - `marketingPrice`
    - `minimumPrice`
    - `netPrice`
    - `vatRate`
    - `sellerDiscountPercent`
    - `marketplaceDiscountPercent`
    - `barcode`
    - `sizeName`
- metric dictionary under `metrics`

Current behavior:
- powered by `analytics_product_period_aggregates`
- Ozon organic funnel metrics are merged from `analytics_product_traffic_daily_facts`
- row identity and dimension enrichment now prefer canonical `analytics_product_catalog`
- stable row `id` includes marketplace and account scope to avoid cross-shop collisions
- intended as the main table API for the new frontend
- richer than the old generic breakdown endpoint for product screens
- migration compatibility with TrueStats is not required
- current response does not include previous-period row comparisons or diff objects
- if the table UI needs previous-period comparisons, those should come from explicit backend comparison support, not client-side ad hoc second guessing
- the current richer metric set includes:
  - `cost`
  - `currentPrice`
  - `oldPrice`
  - `marketingPrice`
  - `minimumPrice`
  - `netPrice`
  - `vatRate`
  - `sellerDiscountPercent`
  - `marketplaceDiscountPercent`
  - `averagePriceBeforeSPP`
  - `averagePriceAfterSPP`
  - `orderPrice`
  - `averageLogisticsCost`
  - `averageProfitPerPiece`
  - `averageRedemption`
  - `drr`
  - `drrByOrders`
  - `salesTurnover`
  - `ordersTurnover`
  - `gmroi`
  - `gmroiYear`
  - `shareInTotalRevenue`
  - `shareInTotalProfit`
  - `orderedUnits`
  - `deliveredUnits`
  - `returnsUnits`
  - `cancellations`
  - `hitsViewSearch`
  - `hitsViewPdp`
  - `hitsView`
  - `hitsToCartSearch`
  - `hitsToCartPdp`
  - `hitsToCart`
  - `sessionViewSearch`
  - `sessionViewPdp`
  - `sessionView`
  - `convToCartSearch`
  - `convToCartPdp`
  - `convToCart`
  - `positionCategory`

Wildberries reporting formulas currently fixed in code:
- `logistics`
  - based on WB finance rows only
  - includes only operation families matching marketplace logistics and logistics corrections
  - explicitly excludes `Возмещение издержек по перевозке/по складским операциям с товаром`
- `returns`
  - WB finance can represent refunds as signed negative `Возврат` rows
  - normalization keeps the signed revenue impact in `realisation`, `sales`, and `totalPaid`
  - return metrics still expose the absolute return amount and refund count
- `ordersCount`
  - reporting prefers date-scoped commerce order rows when they exist
  - seller analytics `orderedUnits` is used only as fallback when commerce order count is absent
  - this avoids applying a wider period-end seller analytics row to a narrower requested period
- `orders`
  - WB order sync persists date-scoped order amount from order-side price fields
  - source priority for order amount is `priceWithDisc`, then close WB order-price fallbacks
  - seller analytics `revenue` is used only when its `orderedUnits` match the selected `ordersCount`
- `toTransfer`
  - direct sum of WB finance payout rows from `wildberries_finance_sync_rows.to_transfer`
- `totalPaid`
  - financial-mode row formula is:
  - `toTransfer - logistics - storage - acceptanceSum - fines - otherDeduction - advertisingExpense`
  - management-mode business formula remains:
  - `sales - commission - logistics - storage - acceptanceSum - fines - otherDeduction - advertisingExpense + compensation`
  - both are intentionally distinct from raw WB payout `toTransfer`
  - unfiltered financial product summaries allocate account-level/synthetic WB rows such as unmatched fines across product rows before recomputing summary totals, so summary `fines`, `totalPaid`, and `profit` include those rows
- `costOfSales`
  - when product cost config exists, reporting derives `costOfSales = cost * soldUnits`
  - for WB financial filtered rows, raw-finance count overrides can adjust `salesCount`, `totalSales`, `returnsCount`, and `refunds`
  - after those overrides, financial derived metrics recompute configured COGS from updated `totalSales`
- `taxBase`
  - tax is config-backed, not read from WB
  - for `usn_income`, current formula is:
  - `sales - storage - acceptanceSum - fines - otherDeduction - advertisingExpense`
- `drr`
  - ad spend share is recomputed from period totals, not summed from row percentages
  - current formula is `advertisingExpense / realisation * 100`
- `drrByOrders`
  - ad spend by orders is recomputed from period totals, not summed from row percentages
  - current formula is `advertisingExpense / orders * 100`
- `salesTurnover`
  - recomputed from summary totals, not summed from row turnover values
  - current formula is `stockBalanceOverall / (totalSales / periodDays)` when `stockBalanceOverall` is available, otherwise visible `stockBalance` is used
- `ordersTurnover`
  - recomputed from summary totals, not summed from row turnover values
  - current formula is `stockBalanceOverall / (ordersCount / periodDays)` when `stockBalanceOverall` is available, otherwise visible `stockBalance` is used
- `gmroiYear`
  - annualized from the selected period length, not multiplied by a fixed 365 on an already period-level GMROI
  - current formula is `gmroi * 365 / periodDays`
- `stockBalance`
  - product row `stockBalance` is marketplace/seller warehouse visible stock
  - `stockBalanceOverall` is `stockBalanceInWh + stockBalanceInWayToClient + stockBalanceInWayFromClient`
  - source drilldown rows preserve source-bucket quantities, including `В пути до получателей` and `В пути возвраты на склад WB`

Wildberries parity notes:
- Article `558517903`, week `2026-04-13..2026-04-19`, is the current focused WB parity check.
- Exact or near-exact after the recent updates:
  - `realisation`
  - `sales`
  - `toTransfer`
  - `returns`
  - `costOfSales`
  - `logistics`
  - `ordersCount`
  - `orders`
  - `salesCount`
  - `totalSales`
  - `returnsCount`
  - `averageRedemption`
- Known remaining source/config deltas:
  - `advertisingExpense`: AiStats uses current WB performance product rows; TrueStats appears to apply additional attribution or filtering not exposed in its detailization response.
  - `stockBalance`: AiStats matches current raw WB stock staging; TrueStats can differ by stock source version or stock architecture.
  - `tax` / `taxBase`: config-backed USN calculation is implemented, but exact parity still depends on the same taxable-base policy and source values.
- WB parity analysis must account for source granularity:
  - seller analytics rows can represent period totals stored at period end
  - commerce order rows are date-scoped and should be preferred for narrow date windows
  - stock rows are snapshots, not additive time-series facts

### `POST /api/v1/reporting/products/details`

Metric detail endpoint for drawers and explanation cards on the product screen.

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "mode": "Management",
  "accountIds": [123456],
  "filters": {
    "productIds": ["558517903"],
    "brandIds": [],
    "categoryIds": []
  },
  "metric": "commission"
}
```

Response shape:
- `scope`
- `query`
- `product`
- `summary`
- `metric`
- `total`
- `breakdown[]`
- `metricBreakdowns`
- `meta`

Current behavior:
- returns a richer product drawer payload, not only one metric total
- `product` exposes the primary matched product identity from canonical product catalog when one can be resolved for the requested scope
- `product` now also exposes normalized connector-side snapshot fields when available:
  - `subjectId`
  - `currencyCode`
  - current and old price snapshots
  - marketing/min/net price snapshots
  - VAT and discount snapshots
  - `barcode`
  - `sizeName`
- metric breakdowns now prefer dedicated persistent `analytics_product_metric_breakdowns` rows and only fallback to runtime derivation when that read model has no matching rows yet
- traffic/funnel totals like `hitsView`, `hitsToCart`, `sessionView`, `convToCart`, and `positionCategory` are resolved from normalized `analytics_product_traffic_daily_facts`
- `summary` currently includes:
  - `sales`
  - `profit`
  - `ordersCount`
  - `stockBalance`
  - `totalPaid`
- `commission` breaks into marketplace commission and acquiring
- when available from marketplace finance payloads, `commission` detail exposes:
  - `nominalCommission`
  - `marketplaceDiscount`
  - `acquiring`
- `stockBalance` breaks into stock on marketplace warehouses and in-way balances
- `profit` returns an operating-structure style breakdown
- `storage`, `returns`, `advertisingExpense`, `toTransfer`, and `totalPaid` also support persistent grouped breakdown rows
- `metricBreakdowns` provides grouped breakdown families for several product metrics in one response
- other supported metrics return one normalized total row
- snapshot-backed query metrics like `currentPrice` and `oldPrice` are resolved from the latest available product snapshot within scope

### `POST /api/v1/reporting/products/metric-breakdowns`

Dedicated grouped breakdown endpoint for product finance and stock drilldowns.

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "mode": "Management",
  "accountIds": [123456],
  "filters": {
    "productIds": ["Р Полиуретановый клей 1 литр 1 шт"],
    "brandIds": [],
    "categoryIds": []
  },
  "metrics": ["commission", "profit", "stockBalance", "totalPaid"]
}
```

Response shape:
- `scope`
- `query`
- `product`
- `summary`
- `metricBreakdowns`
- `meta`

Current behavior:
- returns grouped metric families without the single-metric wrapper used by `products/details`
- backed by persistent `analytics_product_metric_breakdowns` rows when present
- intended for drawers, tabs, and finance/inventory explanation blocks
- if no `metrics` are specified, the backend uses its current default product breakdown metric set
- current default grouped breakdown metric set includes:
  - `commission`
  - `stockBalance`
  - `profit`
  - `logistics`
  - `storage`
  - `tax`
  - `costOfSales`
  - `returns`
  - `advertisingExpense`
  - `hitsView`
  - `hitsToCart`
  - `sessionView`
  - `convToCart`
  - `positionCategory`
  - `toTransfer`
  - `totalPaid`
  - ad-efficiency percentages such as `drr` and `drrByOrders` are available as product metrics, while grouped ad drilldown still comes from `advertisingExpense`

### `POST /api/v1/reporting/products/stock-history`

Dedicated inventory history endpoint for product screens and stock drawers.

Request:

```json
{
  "dateFrom": "2026-04-12",
  "dateTo": "2026-04-18",
  "mode": "Management",
  "accountIds": [123456],
  "filters": {
    "productIds": ["Р Полиуретановый клей 1 литр 1 шт"],
    "brandIds": [],
    "categoryIds": []
  }
}
```

Response shape:
- `scope`
- `query`
- `series[]`
  - `date`
  - `quantity`
  - `marketplaceQty`
  - `userWarehouseQty`
  - `inWayToClientQty`
  - `inWayFromClientQty`
- `meta`

Current behavior:
- built from dedicated `analytics_stock_daily_snapshots`
- `userWarehouseQty` is currently `0` until a dedicated user-warehouse stock source is introduced
- intended as the first-class stock chart API for the product screen

### `POST /api/v1/reporting/products/traffic-history`

Dedicated organic funnel history endpoint for product screens.

Request:

```json
{
  "dateFrom": "2026-04-12",
  "dateTo": "2026-04-18",
  "mode": "Management",
  "accountIds": [123456],
  "filters": {
    "productIds": ["Р Полиуретановый клей 1 литр 1 шт"],
    "brandIds": [],
    "categoryIds": []
  }
}
```

Response shape:
- `scope`
- `query`
- `product`
- `series[]`
  - `date`
  - `orderedUnits`
  - `deliveredUnits`
  - `returnsUnits`
  - `cancellations`
  - `hitsViewSearch`
  - `hitsViewPdp`
  - `hitsView`
  - `hitsToCartSearch`
  - `hitsToCartPdp`
  - `hitsToCart`
  - `sessionViewSearch`
  - `sessionViewPdp`
  - `sessionView`
  - `convToCartSearch`
  - `convToCartPdp`
  - `convToCart`
  - `positionCategory`
- `meta`

Current behavior:
- built from normalized `analytics_product_traffic_daily_facts`
- intended for Ozon organic funnel charts and traffic drawers
- returns the primary matched product identity in `product`
- if the selected scope has no seller analytics data yet, returns an empty `series`

### `POST /api/v1/reporting/products/stock-sources`

Latest stock source breakdown for the selected scope.

Request:

```json
{
  "dateFrom": "2026-04-12",
  "dateTo": "2026-04-18",
  "mode": "Management",
  "accountIds": [123456],
  "filters": {
    "productIds": ["Р Полиуретановый клей 1 литр 1 шт"],
    "brandIds": [],
    "categoryIds": []
  }
}
```

Response shape:
- `scope`
- `query`
- `product`
- `snapshotDate`
- `summary`
  - `totalQuantity`
  - `warehouseQuantity`
  - `marketplaceWarehouseQuantity`
  - `sellerWarehouseQuantity`
  - `sourceBucketQuantity`
  - `unknownQuantity`
  - `distinctSources`
  - `distinctRegions`
- `sourceKindTotals[]`
  - `sourceKind`
  - `label`
  - `quantity`
- `items[]`
  - `sourceKind`
  - `sourceLabel`
  - `sourceType`
  - `sourceKey`
  - `sourceName`
  - `regionName`
  - `quantity`
- `meta`

Current behavior:
- built from dedicated `analytics_stock_source_snapshots`
- returns the latest available source-level snapshot within the requested date range
- Wildberries source rows are warehouse-oriented
- Ozon source rows are source-bucket-oriented from the catalog stock payload
- now returns an inventory drawer-style payload:
  - top-level stock source summary
  - grouped totals by normalized source kind
  - detailed source rows
- the API now normalizes source semantics for the frontend:
  - WB warehouses -> `sourceKind = Warehouse`
  - Ozon `fbo` -> `sourceKind = MarketplaceWarehouse`
  - Ozon `fbs` -> `sourceKind = SellerWarehouse`
  - unknown marketplace buckets -> `sourceKind = SourceBucket` or `Unknown`
- intended for stock drawers and warehouse/source detail blocks

### `POST /api/v1/reporting/external-traffic/query`

Dedicated source-level external traffic table for Ozon Performance attribution data.

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "mode": "Management",
  "marketplaces": ["Ozon"],
  "accountIds": [123456],
  "sort": {
    "metric": "ordersAmount",
    "direction": "Desc"
  },
  "page": 1,
  "limit": 30
}
```

Response shape:
- `scope`
- `query`
- `rows[]`
  - `dimension`
    - `id`
    - `label`
    - `sourceName`
    - `sourceType`
    - `sourceKey`
    - `vendorTag`
  - `metrics`
    - `visits`
    - `clicks`
    - `ordersCount`
    - `ordersAmount`
    - `expense`
- `summary`
  - `total`
  - `page`
- `pagination`
- `meta`

Current behavior:
- built from normalized `analytics_external_traffic_daily_facts`
- source-level, not product-level
- currently ignores product/brand/category filters because upstream external traffic is not yet product-attributable
- intended for traffic source tables and attribution overview screens

### `POST /api/v1/reporting/external-traffic/history`

Dedicated time series for one external traffic source or vendor tag.

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "mode": "Management",
  "marketplaces": ["Ozon"],
  "accountIds": [123456],
  "sourceKey": "telegram",
  "vendorTag": "spring-campaign"
}
```

Response shape:
- `scope`
- `query`
- `dimension`
- `series[]`
  - `date`
  - `visits`
  - `clicks`
  - `ordersCount`
  - `ordersAmount`
  - `expense`
- `meta`

Current behavior:
- built from normalized `analytics_external_traffic_daily_facts`
- returns one merged time series for the selected source scope
- if neither `sourceKey` nor `vendorTag` is specified, it returns the merged series for the full filtered source set

### `POST /api/v1/reporting/search-phrases/query`

Dedicated campaign/query-level search phrase table for Ozon Performance phrase analytics.

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "mode": "Management",
  "marketplaces": ["Ozon"],
  "accountIds": [123456],
  "campaignIds": ["12345678"],
  "phraseTypes": ["SEARCH"],
  "sort": {
    "metric": "ordersAmount",
    "direction": "Desc"
  },
  "page": 1,
  "limit": 30
}
```

Response shape:
- `scope`
- `query`
- `rows[]`
  - `dimension`
    - `id`
    - `label`
    - `campaignId`
    - `campaignName`
    - `phrase`
    - `phraseType`
    - `category`
    - `placement`
  - `metrics`
    - `impressions`
    - `clicks`
    - `ordersCount`
    - `ordersAmount`
    - `expense`
    - `ctr`
    - `cpc`
    - `drr`
- `summary`
  - `total`
  - `page`
- `pagination`
- `meta`

Current behavior:
- built from normalized `analytics_search_phrase_daily_facts`
- campaign/query-level, not product-level
- intended for search phrase tables, campaign keyword analysis, and paid query drilldowns

### `POST /api/v1/reporting/search-phrases/history`

Dedicated daily time series for one search phrase scope.

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "mode": "Management",
  "marketplaces": ["Ozon"],
  "accountIds": [123456],
  "campaignId": "12345678",
  "phrase": "полиуретановый клей"
}
```

Response shape:
- `scope`
- `query`
- `dimension`
- `series[]`
  - `date`
  - `impressions`
  - `clicks`
  - `ordersCount`
  - `ordersAmount`
  - `expense`
  - `ctr`
  - `cpc`
  - `drr`
- `meta`

Current behavior:
- built from normalized `analytics_search_phrase_daily_facts`
- returns one merged time series for the selected campaign/phrase scope
- if neither `campaignId` nor `phrase` is specified, it returns the merged series for the full filtered phrase set

## Overview

### `POST /api/v1/overview/summary`

Purpose:
- lightweight cross-screen summary endpoint
- backed by normalized daily facts, not the richer product reporting engine
- intended for simple dashboard totals plus previous-period comparison deltas

Request:

```json
  {
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-17",
    "mode": "Management",
    "accountIds": [123456],
      "metrics": ["sales", "commission", "logistics", "storage", "returns", "ordersCount", "stockBalance"]
  }
  ```

Response:

```json
{
  "scope": {
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-17",
    "mode": "Management"
  },
  "query": {
    "accountIds": [123456],
    "filters": {
      "productIds": [],
      "groupIds": [],
      "brandIds": [],
      "categoryIds": [],
      "tags": []
    }
  },
  "metrics": {
    "sales": 100000.50,
    "ordersCount": 42,
    "stockBalance": 180
  },
  "comparisons": {
    "sales": {
      "previous": 93000.47,
      "delta": 7000.03,
      "deltaPercent": 7.53
    }
  },
  "meta": {
    "updatedAt": "2026-04-17T12:30:00Z",
    "isPartial": false
  }
}
```

Current real-data coverage:
  - `sales`
  - `commission`
  - `logistics`
  - `storage`
  - `returns`
  - `ordersCount`
  - `stockBalance`

Contract note:
- this endpoint does not support richer product-reporting metrics such as:
  - `profit`
  - `advertisingExpense`
  - `drr`
  - `drrByOrders`
  - `totalPaid`
  - `salesCount`
  - `costOfSales`
  - `tax`
- unsupported metrics now return `400 Bad Request` instead of silently coming back as `null`
- for rich product KPIs, use:
  - `POST /api/v1/reporting/products/overview`
  - `POST /api/v1/reporting/products/query`

Current empty-state behavior:
- if no synced normalized data exists for the requested scope, the endpoint returns requested metrics with zero values and zeroed comparisons instead of prototype placeholder totals

## Trends

### `POST /api/v1/analytics/trends`

Request:

```json
  {
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-17",
    "grain": "Day",
    "accountIds": [123456],
      "metrics": ["sales", "commission", "logistics", "storage", "returns", "ordersCount"]
  }
  ```

Response:

```json
{
  "scope": { "...": "..." },
  "query": { "...": "..." },
  "grain": "Day",
  "series": [
    {
      "date": "2026-04-01",
      "metrics": {
        "sales": 15200.11,
        "ordersCount": 7
      }
    }
  ],
  "dataState": {
    "isPartial": false,
    "lastCompleteDate": "2026-04-17",
    "updatedAt": "2026-04-17T12:30:00Z"
  }
}
```

Supported grains:
- `Day`
- `Week`
- `Month`

Current empty-state behavior:
- if no synced normalized data exists for the requested scope, the endpoint returns an empty `series` array with a non-partial data state

## Breakdown

### `POST /api/v1/analytics/breakdown`

Request:

```json
  {
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-17",
    "groupBy": "Product",
    "accountIds": [123456],
      "metrics": ["sales", "commission", "logistics", "storage", "returns", "ordersCount", "stockBalance"],
    "sort": {
      "metric": "sales",
      "direction": "Desc"
  },
  "page": 1,
  "limit": 50
}
```

Response shape:
- `rows[].dimension`
- `rows[].metrics`
- `summary.total`
- `summary.page`
- `pagination`
- `meta`

Current real-data dimensions:
- `Product`
- `Brand`
- `Category`
- `Account`
- `Marketplace`
- `Date`
- `Week`
- `Month`

Current empty-state behavior:
- if no synced normalized data exists for the requested scope, the endpoint returns empty `rows`, zero summaries, and `pagination.total = 0`

## Explanations

### `POST /api/v1/analytics/explanations`

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "accountIds": [123456],
  "metric": "sales"
}
```

Current behavior:
  - real-data path supports `sales`, `commission`, `logistics`, `storage`, `returns`, `ordersCount`, `stockBalance`
- real-data breakdown prefers account-level explanation when multiple shops are present, otherwise falls back to top products, then marketplace
- `commission` uses normalized finance data when available
- prototype fallback is used for `commission` only when no normalized finance data exists yet
- unsupported non-normalized metrics now return an empty explanation instead of prototype-derived totals

## Metadata

### `GET /api/v1/metadata/metrics`

Returns metric catalog for the UI.

Current sync-backed metrics explicitly documented here:
  - `sales`
  - `commission`
  - `logistics`
  - `storage`
  - `returns`
  - `ordersCount`
  - `stockBalance`

### `GET /api/v1/metadata/dimensions`

Returns supported dimensions and field shapes for breakdown/pivot-like screens.

Field shape contract:
- each dimension now returns typed `fields[]` entries, not only raw field names
- each field includes:
  - `key`
  - `label`
  - `type`
  - `role`
  - `filterable`
  - `sortable`
  - `valueSource`
  - `temporalKind`

Current product field semantics:
- identity fields like `vendorCode`, `marketplaceArticle`, `barcode`
- classification fields like `brand`, `category`, `subjectId`
- media/navigation fields like `imageUrl`, `productUrl`
- snapshot fields like:
  - `currencyCode`
  - `currentPrice`
  - `oldPrice`
  - `marketingPrice`
  - `minimumPrice`
  - `netPrice`
  - `vatRate`
  - `sellerDiscountPercent`
  - `marketplaceDiscountPercent`

Current source semantics:
- `valueSource = dimension` for identity/classification fields
- `valueSource = catalogSnapshot` for connector-derived product snapshot fields
- `temporalKind = identity` for stable identity/classification fields
- `temporalKind = snapshot` for latest connector-side snapshot fields
- the product field contract is shared with `GET /api/v1/reporting/product-metrics`, so reporting and metadata no longer drift on product field semantics

Current first-class dimensions:
- `Product`
- `Brand`
- `Category`
- `Account`
- `Marketplace`
- `Date`
- `Week`
- `Month`
- `Campaign`
- `Warehouse`
- `Country`

### `POST /api/v1/metadata/filter-options`

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "accountIds": [123456],
  "marketplaces": ["Wildberries"],
  "filters": {
    "productIds": [],
    "brandIds": [],
    "categoryIds": [],
    "groupIds": [],
    "tags": []
  }
}
```

Response:
- `accounts`
- `products`
- `brands`
- `categories`
- `groups`
- `dateRange`

Current behavior:
- normalized facts and canonical product catalog are both used
- `products` now use a canonical product catalog read model built during normalization
- product, brand, category, and account dictionaries are no longer limited only by the requested activity window
- they are built from the canonical product catalog under the requested marketplace/account/filter subtree
- product filter `id` prefers seller-facing product identity:
  - primary key returned to the frontend: canonical product identity for the current scope
- product filter `label` prefers:
  - `vendorCode`
  - fallback: `productName`
  - fallback: `marketplaceArticle`
- the endpoint now behaves as a cascading filter dictionary:
  - `marketplaces` narrow shops and all child options
  - `accountIds` narrow products, brands, and categories
  - `filters.brandIds`, `filters.categoryIds`, and `filters.productIds` narrow the returned dictionaries to the current subtree
- `dateRange` remains scoped to the requested date window data that is actually available
- when the frontend sends marketplace-level scope like `marketplaces = ["Ozon"]`, the response returns only:
  - Ozon shops
  - Ozon products
  - Ozon brands
  - Ozon categories
- when no synced data exists yet, the endpoint returns empty filter lists and echoes the requested date range instead of prototype placeholder data

## Custom Metrics

### `GET /api/v1/config/custom-metrics`
### `POST /api/v1/config/custom-metrics`
### `PATCH /api/v1/config/custom-metrics/{id}`
### `POST /api/v1/config/custom-metrics/validate`
### `POST /api/v1/config/custom-metrics/preview`

Example create request:

```json
{
  "name": "Sales Mirror",
  "formula": "sales",
  "unit": 0,
  "unitLabel": "RUB",
  "active": true
}
```

Validation request:

```json
{
  "formula": "(sales - commission - logistics) / sales"
}
```

Validation response:

```json
{
  "isValid": true,
  "errors": [],
  "referencedMetrics": ["commission", "logistics", "sales"]
}
```

Preview request:

```json
{
  "formula": "(sales - commission - logistics) / sales",
  "sampleMetrics": {
    "sales": 100000,
    "commission": 12000,
    "logistics": 4500
  }
}
```

Preview response:

```json
{
  "isValid": true,
  "value": 0.84,
  "errors": [],
  "referencedMetrics": ["commission", "logistics", "sales"]
}
```

Current behavior:
- supported formula operators are `+`, `-`, `*`, `/`, and parentheses
- unknown metric keys are rejected by the validation endpoint and by create/update
- preview uses the provided `sampleMetrics` values and treats missing referenced metrics as `0`
- current custom metric functionality is intentionally much narrower than the product metric catalog
- currently allowed base variables are only:
  - `sales`
  - `commission`
  - `logistics`
  - `returns`
  - `ordersCount`
  - `stockBalance`
- custom metrics can also reference previously created custom metrics by their generated key, for example `customMetric1323`
- `unit` is currently stored as a raw integer plus optional `unitLabel`
- the frontend should therefore treat custom metric units as user-configured display metadata, not as a fully normalized typed unit system yet

## Frontend Recommendations

### Product Screen Composition

Recommended product-screen fetch pattern:

1. `GET /api/v1/reporting/product-metrics`
2. `POST /api/v1/reporting/products/overview`
3. `POST /api/v1/reporting/products/query`
4. `POST /api/v1/reporting/products/details` on demand for drawer header / one-metric detail
5. `POST /api/v1/reporting/products/metric-breakdowns` on demand for grouped finance and stock drilldowns
6. `POST /api/v1/reporting/products/stock-history` and `traffic-history` for charts

Recommended frontend responsibility split:
- backend:
  - computes metric values
  - defines metric metadata
  - defines whether growth is positive
  - defines which metrics should show diff
- frontend:
  - chooses where and how to display cards, tables, drawers, and charts
  - renders deltas only when the backend exposes comparison values for that surface
  - should not hardcode metric labels, suffixes, or positivity rules

### Example Dashboard Payload Set

Example summary request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "mode": "Management",
  "accountIds": [123456],
  "metrics": ["sales", "commission", "logistics", "storage", "returns", "ordersCount", "stockBalance"]
}
```

Example summary response:

```json
{
  "scope": {
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-17",
    "mode": "Management"
  },
  "query": {
    "accountIds": [123456],
    "filters": {
      "productIds": [],
      "groupIds": [],
      "brandIds": [],
      "categoryIds": [],
      "tags": []
    }
  },
  "metrics": {
    "sales": 5042088.32,
    "commission": 711240.10,
    "logistics": 128320.55,
    "storage": 42110.22,
    "returns": 94220.40,
    "ordersCount": 8849,
    "stockBalance": 467
  },
  "comparisons": {
    "sales": {
      "previous": 4710000.12,
      "delta": 332088.20,
      "deltaPercent": 7.05
    }
  },
  "meta": {
    "updatedAt": "2026-04-18T09:42:11Z",
    "isPartial": false
  }
}
```

Example trends response:

```json
{
  "scope": {
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-17",
    "mode": "Management"
  },
  "query": {
    "accountIds": [123456],
    "filters": {
      "productIds": [],
      "groupIds": [],
      "brandIds": [],
      "categoryIds": [],
      "tags": []
    }
  },
  "grain": "Day",
  "series": [
    {
      "date": "2026-04-15",
      "metrics": {
        "sales": 315700.54,
        "commission": 44220.18,
        "logistics": 8211.32,
        "storage": 2410.80,
        "returns": 5100.00,
        "ordersCount": 530
      }
    }
  ],
  "dataState": {
    "isPartial": true,
    "lastCompleteDate": "2026-04-15",
    "updatedAt": "2026-04-18T09:42:11Z"
  }
}
```

Example breakdown response:

```json
{
  "scope": {
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-17",
    "mode": "Management"
  },
  "query": {
    "accountIds": [123456],
    "filters": {
      "productIds": [],
      "groupIds": [],
      "brandIds": [],
      "categoryIds": [],
      "tags": []
    }
  },
  "groupBy": "Product",
  "rows": [
    {
      "dimension": {
        "id": "233313363",
        "label": "233313363",
        "brand": "kleyberg",
        "category": "Клей",
        "accountName": "WB Main Shop"
      },
      "metrics": {
        "sales": 46921.87,
        "commission": 6320.44,
        "logistics": 1180.20,
        "storage": 310.55,
        "returns": 0,
        "ordersCount": 71,
        "stockBalance": 467
      }
    }
  ],
  "summary": {
    "total": {
      "sales": 1483181.93,
      "commission": 211203.44,
      "logistics": 38411.10,
      "storage": 14210.33,
      "returns": 25000.00,
      "ordersCount": 2820,
      "stockBalance": 9021
    },
    "page": {
      "sales": 46921.87,
      "commission": 6320.44,
      "logistics": 1180.20,
      "storage": 310.55,
      "returns": 0,
      "ordersCount": 71,
      "stockBalance": 467
    }
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 390
  },
  "meta": {
    "updatedAt": "2026-04-18T09:42:11Z",
    "isPartial": false
  }
}
```

### Error Model

Validation-style endpoint errors use FastEndpoints `ThrowError(...)`.

Typical shape:

```json
{
  "statusCode": 400,
  "message": "One or more errors occurred.",
  "errors": {
    "GeneralErrors": [
      "Metric formula is required."
    ]
  }
}
```

Notes for the web app:
- treat `errors.GeneralErrors` as the primary place for user-displayable messages when present
- connection, sync, and custom-metric validation failures are expected to come back as `400` responses
- marketplace upstream API failures are now normalized into clearer messages when the provider returns structured error payloads
- sync-run failures also expose the latest failure text through the sync-run resource `error` field

Recommended dashboard load sequence:

1. `GET /api/v1/auth/me`
2. `GET /api/v1/users/me/organizations`
3. `GET /api/v1/organizations/{organizationId}/marketplace-connections`
4. `POST /api/v1/metadata/filter-options`
5. `GET /api/v1/metadata/metrics`
6. `POST /api/v1/overview/summary`
7. `POST /api/v1/analytics/trends`
8. `POST /api/v1/analytics/breakdown`

Recommended product screen load sequence:

1. `GET /api/v1/reporting/product-metrics`
2. `POST /api/v1/reporting/products/overview`
3. `POST /api/v1/reporting/products/query`
4. `POST /api/v1/reporting/products/details` on demand for drawer header/summary
5. `POST /api/v1/reporting/products/metric-breakdowns` for grouped finance and stock drilldowns
6. `POST /api/v1/reporting/products/stock-history` for inventory chart/drawer
7. `POST /api/v1/reporting/products/traffic-history` for organic funnel chart/drawer
8. `POST /api/v1/reporting/products/stock-sources` for latest warehouse/source breakdown

Recommended first-owner onboarding:

1. `POST /api/v1/auth/register`
2. `POST /api/v1/organizations`
3. `GET /api/v1/marketplaces/connectors`
4. `POST /api/v1/marketplace-connections/connect-shop`
5. poll sync status
6. load analytics endpoints

Recommended connect-shop flow:

1. `GET /api/v1/marketplaces/connectors`
2. `POST /api/v1/marketplace-connections/connect-shop`
3. poll `GET /api/v1/marketplace-connections/{connectionId}/sync-runs`
4. once sync succeeds, load analytics endpoints

Recommended product-master refresh flow:

1. manager changes marketplace credentials or suspects stale catalog/filter dictionaries
2. app calls `POST /api/v1/marketplace-connections/{connectionId}/sync`
3. request uses `syncKinds: ["catalog"]`
4. app polls sync-run status
5. app reloads `POST /api/v1/metadata/filter-options` and product reporting screens

Recommended historical backfill flow:

1. manager chooses a custom date range in the app
2. app calls `POST /api/v1/marketplace-connections/{connectionId}/sync`
3. app polls sync-run status
4. app reloads analytics when the sync succeeds

## Current Backend Status

Already usable:
- auth
- orgs / invites / roles
- connect shop
- background sync
- sync status polling
- artifact inspection
- DB-backed summary / trends / breakdown / filter options for core normalized metrics

Still evolving:
  - `commission`, `logistics`, `storage`, and `returns` are now sync-backed, but deeper financial decomposition is still limited
  - Ozon finance historical pulls are chunked month-by-month in the connector for safer backfills
  - real connector coverage is stronger than before, but still not feature-complete for every marketplace report family
  - no build/test verification has been run automatically
  - password-reset flow is stronger than before, but still needs production-grade durable token storage

## Health Endpoints

### `GET /health/live`

Lightweight liveness endpoint for container/process supervision.

Current behavior:
- returns healthy when the app process is up and the ASP.NET pipeline is serving requests

### `GET /health/ready`

Readiness endpoint for deploy checks and orchestration.

Current behavior:
- reports `storageMode = prototype` when no PostgreSQL connection string is configured
- reports healthy in prototype mode
- when PostgreSQL is configured, attempts a DB connectivity check
- reports unhealthy when PostgreSQL mode is configured but the DB is unreachable

## Maintenance Note

When backend contracts change, update this file in the same task.

Minimum required updates:
- new endpoint path
- request/response shape changes
- new supported metrics or dimensions
- auth/permission changes
- sync behavior changes
