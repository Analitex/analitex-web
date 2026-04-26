# Frontend metric ownership

Dashboard metrics are API-owned. The web app must not reconstruct built-in KPI values, previous-period values, deltas, percentages, totals, or revenue-structure rows from other metrics.

## Current frontend behavior

- Product metric widgets read current values from `POST /api/v1/reporting/products/summary`.
- Widget diffs use only API `comparisons`.
- If an API metric or comparison is missing, the frontend shows an empty/zero value instead of calculating a fallback.
- The analytics table renders row metrics from `POST /api/v1/reporting/products/query`.
- Margin widgets use only `POST /api/v1/reporting/products/margin-top` and `POST /api/v1/reporting/products/margin-categories`.
- Revenue structure uses only `POST /api/v1/reporting/products/revenue-structure`.

## Already available in API

- `comparisons` from `POST /api/v1/reporting/products/summary` for requested metrics.
- `profitability`
- `taxBase`
- `averageLogisticsCost`
- `returnsCount`
- `gmroiYear`
- `salesTurnover`
- `ordersTurnover`
- table totals from `POST /api/v1/reporting/products/query` via `summary.total` and `summary.page`

## Remaining API/business-layer gaps

- `marginalityWithoutExpense` when `profitWithoutExpense` must display a separate percentage from `profitability`.
- `expense` if operating expense should be a first-class metric instead of a revenue-structure item.
- `drrSum` and `drrBonus` if those separate ad-efficiency cards remain enabled.

## Removed compatibility names

The frontend should use API metric names directly and should not map old TrueStats/client aliases:

- `wbFinalReward` -> use `netMarketplaceReward`.
- `drrz` / `drrOrders` -> use `drrByOrders`.
- `salesUnits` / `orderedUnits` -> use `salesCount` or the explicit API field needed by the widget.
- `revenue` for realisation -> use `realisation`.
- `taxes` -> use `tax`.
