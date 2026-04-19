# AiStats Backend Operations

Updated on 2026-04-18.

This document is the practical launch/runtime guide for the API.

It covers:
- environment configuration
- storage mode selection
- health endpoints
- migration workflow

## Runtime Modes

The API now chooses platform storage mode at startup:

- `prototype` mode when no PostgreSQL connection string is configured
- `postgresql` mode when an AiStats PostgreSQL connection string is configured

Prototype mode is useful for local UI exploration.

PostgreSQL mode is the intended launch path.

## Required Configuration

### Auth

Configure JWT/auth values through the existing auth settings used by the API.

If these are weak or left as dev defaults, the system is not production-ready.

### Storage

Use either of these configuration paths:

```json
{
  "ConnectionStrings": {
    "AiStats": "Host=localhost;Port=5432;Database=aistats;Username=postgres;Password=postgres"
  }
}
```

or:

```json
{
  "AiStats": {
    "Database": {
      "Postgresql": {
        "ConnectionString": "Host=localhost;Port=5432;Database=aistats;Username=postgres;Password=postgres",
        "Schema": "public"
      }
    }
  }
}
```

If neither connection string is present, the app falls back to in-memory prototype storage.

### Marketplace Credentials

Marketplace shop credentials are supplied by API requests during connect-shop flows.

They should not be hardcoded in app settings.

### Logging

The app uses standard ASP.NET logging configuration.

Minimal example:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

Current structured logs now include:
- HTTP request method/path/status/duration
- sync enqueue events
- sync start/completion events
- retry scheduling
- permanent sync failures
- background worker processing failures

## Credential And Secret Handling

Marketplace credentials are now protected at rest through ASP.NET Data Protection before they are stored by the application.

Compatibility behavior:
- newly saved credentials are stored in protected form
- previously stored plain JSON credentials can still be read during transition

Operational recommendation:
- persist Data Protection keys in a stable shared location for non-local environments
- do not rotate or lose Data Protection keys without a credential migration plan

## Auth Hardening

Outside Development:
- the API now refuses to start with the built-in dev JWT signing key
- the JWT signing key must be explicitly configured
- the JWT signing key must be at least 32 characters long

Password reset tokens are now generated from cryptographically secure random bytes.

Remaining follow-up:
- durable password-reset token persistence for full production readiness

## Health Endpoints

### `GET /health/live`

Use for:
- container liveness probes
- simple process-up checks

### `GET /health/ready`

Use for:
- readiness probes
- deploy verification
- support diagnostics

Current readiness behavior:
- healthy in prototype mode
- healthy in PostgreSQL mode when DB connectivity succeeds
- unhealthy in PostgreSQL mode when DB connectivity fails

## Migration Workflow

This project already contains PostgreSQL persistence infrastructure.

Recommended workflow:

1. Ensure the PostgreSQL connection string is configured.
2. Create or update EF Core migrations in the database project.
3. Apply migrations to the target environment before switching traffic.
4. Start the API in PostgreSQL mode.
5. Verify `GET /health/ready`.

Recommended command examples:

```powershell
dotnet ef migrations add <MigrationName> --project src/AiStats.Database.Postgresql --startup-project src/AiStats.Api
dotnet ef database update --project src/AiStats.Database.Postgresql --startup-project src/AiStats.Api
```

Notes:
- run migration generation only when model changes require schema updates
- run `database update` before production rollout
- keep the API and DB schema in sync across environments

## Launch Recommendation

For internal/demo use:
- prototype mode is acceptable

For real managers:
- use PostgreSQL mode
- apply migrations before rollout
- verify `/health/ready`
- monitor sync logs after first marketplace connections are added
