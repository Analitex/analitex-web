# AiStats MVP Checklist

Updated on 2026-04-19.

This file is the current project checklist for the API/backend MVP.

Legend:
- `[x]` done
- `[-]` in progress
- `[ ]` not started

## Product Goal

Manager can:
- sign in
- belong to an organization
- connect Wildberries or Ozon shop
- run initial sync
- manually enqueue historical sync
- wait for background processing
- open dashboard and see real synced data

## Platform Foundation

- [x] FastEndpoints API foundation
- [x] JWT authentication
- [x] current-user context
- [x] user profile endpoints
- [x] organization model
- [x] org membership model
- [x] org roles and access rules
- [x] invitation flows
- [x] in-memory prototype persistence
- [x] PostgreSQL persistence foundation
- [x] EF-backed repositories kept alongside in-memory repositories

## Marketplace Connections

- [x] marketplace connection domain
- [x] structured credential contracts
- [x] typed connector response DTO refactor
- [x] active marketplace sync flows no longer depend on raw response traversal
- [x] connector metadata endpoint
- [x] connect-shop endpoint
- [x] connection validation endpoint
- [x] keep prototype connectors in repo
- [x] real Wildberries connector wired as active implementation
- [x] real Ozon connector wired as active implementation

## Sync Pipeline

- [x] sync enqueue endpoint
- [x] background sync queue
- [x] background worker
- [x] sync run persistence
- [x] sync artifact metadata persistence
- [x] sync artifact inspection endpoint
- [-] typed WB/Ozon staging persistence replacing raw artifact payload storage
- [x] manual old-period sync from app
- [x] no automatic historical backfill
- [x] duplicate sync suppression for active identical requests
- [x] retry failed sync from API
- [x] cancel queued or running sync from API
- [x] retry / backoff policy
- [x] richer sync progress reporting

## Wildberries Connector

- [x] credential validation with real API
- [x] orders sync
- [x] sales sync
- [x] stocks sync
- [x] finance sync
- [x] typed response models for validation / orders / sales / stocks / finance
- [x] validation and finance DTOs aligned to real captured WB responses
- [-] hardening around live response variations
- [ ] richer catalog enrichment
- [ ] ads sync
- [ ] search/funnel sync

## Ozon Connector

- [x] credential validation with real API
- [x] postings sync
- [x] finance sync
- [x] finance sync date-range chunking for historical backfills
- [x] stocks sync
- [x] returns sync
- [x] postings pagination
- [x] finance pagination
- [x] product metadata enrichment for synced rows
- [x] typed response models for validation / catalog / postings / returns / stocks / finance
- [-] hardening around live response variations
- [ ] analytics sync
- [ ] richer catalog sync

## Ingestion And Normalization

- [-] remove raw artifact payload storage from sync pipeline
- [-] typed WB/Ozon staging tables for first-sync persistence
- [-] richer unified product aggregate storage for frontend-facing reporting
- [-] unified product metric details/explanation API on top of product aggregates
- [-] product overview endpoint on top of unified product aggregates
- [x] typed raw commerce artifact refactor
- [x] typed raw finance artifact refactor
- [x] typed raw returns artifact refactor
- [x] typed raw stocks artifact refactor
- [x] normalized daily facts
- [x] event-date aware normalization
- [x] sync-kind-aware metric normalization
- [x] stable account id in normalized facts
- [x] stock balance in normalized facts
- [ ] richer normalized catalog entities
- [ ] deduplication rules across overlapping connector families
- [x] returns normalization
- [-] fees / ads normalization

## Analytics API

- [x] overview summary endpoint
- [x] trends endpoint
- [x] breakdown endpoint
- [x] explanations endpoint
- [-] frontend-facing product reporting API on richer product aggregates
- [-] frontend-facing product metric detail endpoint on richer product aggregates
- [-] frontend-facing product overview endpoint on richer product aggregates
- [x] DB-backed summary for core normalized metrics
- [x] real previous-period comparisons for sync-backed summary
- [x] DB-backed trends for core normalized metrics
- [x] DB-backed breakdowns for product / brand / category / account / marketplace
- [x] DB-backed breakdowns for date / week / month
- [x] accountId-aware filtering in real-data path
- [x] partial-data metadata in real-data path
- [x] stockBalance metric support
- [x] explanations are real-data-first with `commission` using normalized data when available
- [x] returns metrics in analytics
- [-] fees / ads metrics in analytics
- [x] remove main prototype fallback from primary dashboard path

## Metadata API

- [x] metrics endpoint
- [x] dimensions endpoint
- [x] filter-options endpoint
- [x] custom metrics endpoints
- [x] dimensions formally documented in API
- [x] sync-backed metric definitions for `sales`, `commission`, `logistics`, `storage`, `returns`, `ordersCount`, `stockBalance`
- [x] first-class dimensions catalog independent of prototype snapshot
- [x] sync-backed filter options for accounts / products / brands / categories / date range
- [x] metadata endpoints no longer depend on prototype fallback for primary web paths
- [x] validation / preview endpoints for custom metrics

## Frontend Support

- [x] frontend-oriented API design document
- [x] web API reference markdown
- [x] connect-shop flow documented
- [x] sync workflow documented
- [x] example dashboard payloads for common screens
- [x] error model reference for frontend

## Operational Readiness

- [x] migrations workflow
- [x] environment configuration guide
- [x] structured logging for sync and connector failures
- [x] monitoring / health endpoints
- [x] secrets handling hardening
- [-] production auth / password-reset hardening

## Current MVP Readiness

- [x] auth and org foundation
- [x] shop connection flow
- [x] background sync flow
- [x] real WB/Ozon connector path exists
- [x] synced data can reach analytics endpoints
- [x] primary manager dashboard path uses real data or explicit empty-state responses
- [x] active WB/Ozon connector flows use typed response models instead of raw response traversal
- [x] MVP considered complete

## Raw JSON Refactor

- [x] active WB/Ozon sync pipelines moved off raw response traversal
- [-] persisted marketplace artifacts no longer expose raw payloads
- [-] first-sync staging persists into typed WB/Ozon tables before unified normalization
- [x] remove remaining `JsonElement` / `JsonDocument` helper usage from shared connector support
- [x] remove raw JSON handling from prototype-only data loaders
- [x] replace placeholder integration contract `AdditionalData` bags with non-`JsonElement` extension data
- [x] remove obsolete generic raw JSON helper paths once no active caller remains

## Post-MVP Expansion

- [ ] Wildberries ads sync
- [ ] Wildberries search / funnel sync
- [ ] Ozon analytics sync
- [ ] richer normalized catalog entities
- [ ] deduplication rules across overlapping connector families
- [ ] fees / ads normalization
- [ ] fees / ads metrics in analytics
- [ ] richer catalog sync
- [ ] additional live-response hardening for edge marketplace cases
- [ ] production auth / password-reset hardening

## Immediate Next Priorities

1. Finish enrichment of unified product aggregates with stronger product identity and finance decomposition from WB/Ozon.
2. Finish product overview/dashboard API on top of product aggregates and align the web flow to it.
3. Split broader financial costs beyond `commission`, `logistics`, and `storage` into clearer buckets like ads.
4. Tighten production auth / password-reset behavior before public rollout.
