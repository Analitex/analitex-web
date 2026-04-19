# AiStats Web API

Updated on 2026-04-19.

This document is the working API reference for the web frontend.

It is intentionally practical:
- it focuses on the endpoints the web app should call,
- it describes the current behavior of the backend,
- it calls out places where the platform is still prototype-backed.

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
    "supportedSyncKinds": ["orders", "sales", "stocks", "finance"],
    "credentialFields": [
      { "key": "apiToken", "label": "API token", "secret": true }
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
  "initialSyncKinds": ["orders", "sales", "stocks", "finance"]
}
```

For Ozon:

```json
{
  "organizationId": "guid",
  "marketplace": "Ozon",
  "credentials": {
    "clientId": "12345",
    "apiKey": "secret"
  },
  "startInitialSync": true,
  "initialSyncDays": 14,
  "initialSyncKinds": ["postings", "finance", "returns", "stocks"]
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

### `GET /api/v1/organizations/{organizationId}/marketplace-connections`
### `POST /api/v1/marketplace-connections`
### `PATCH /api/v1/marketplace-connections/{connectionId}`
### `POST /api/v1/marketplace-connections/{connectionId}/validate`
### `DELETE /api/v1/marketplace-connections/{connectionId}`

`connect-shop` is preferred for the UI, but the lower-level endpoints are still available.

Current behavior:
- organization connection list includes `latestSyncRun` when one exists
- this lets the web app render sync state on shop cards without making an immediate extra sync-runs request for every connection

## Marketplace Sync

### `POST /api/v1/marketplace-connections/{connectionId}/sync`

Manual sync enqueue endpoint.

Use this for:
- recent resync
- manual historical backfill
- manager-triggered sync from the app

Request:

```json
{
  "dateFrom": "2026-04-01",
  "dateTo": "2026-04-17",
  "syncKinds": ["sales", "orders"]
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
- powered by unified `analytics_product_metric_aggregates`
- intended to replace multiple top-of-screen fetches with one reporting-oriented request
- returns the same `dimension + metrics` row model used by `POST /api/v1/reporting/products`

### `POST /api/v1/reporting/products`

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
- `dimension`
  - `vendorCode`
  - `marketplaceArticle`
  - `productName`
  - `brand`
  - `category`
  - `accountName`
  - `marketplace`
  - optional `imageUrl` and `productUrl`
- metric dictionary under `metrics`

Current behavior:
- powered by unified `analytics_product_metric_aggregates`
- intended as the main table API for the new frontend
- richer than the old generic breakdown endpoint for product screens
- migration compatibility with TrueStats is not required

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
- `metric`
- `total`
- `breakdown[]`
- `meta`

Current behavior:
- `commission` breaks into marketplace commission and acquiring
- when available from marketplace finance payloads, `commission` detail exposes:
  - `nominalCommission`
  - `marketplaceDiscount`
  - `acquiring`
- `stockBalance` breaks into stock on marketplace warehouses and in-way balances
- `profit` returns an operating-structure style breakdown
- other supported metrics return one normalized total row

## Overview

### `POST /api/v1/overview/summary`

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
  "marketplaces": ["Wildberries"]
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
- normalized facts are used when available
- `products` is moving to a canonical product catalog read model built during normalization
- product filter `id` prefers seller-facing product identity:
  - `vendorCode`
  - fallback: `marketplaceArticle`
- product filter `label` prefers:
  - `vendorCode`
  - fallback: `productName`
  - fallback: `marketplaceArticle`
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

## Frontend Recommendations

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
3. `POST /api/v1/reporting/products`
4. `POST /api/v1/reporting/products/details` on demand for drawers/details

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
