# AiStats User Platform Flow

Updated on 2026-04-18.

This document explains the current user flow of the platform from the point of view of a real customer or internal operator.

It answers a practical question:

"I am a user. What do I do first, how do I get access, how do I become an owner, how do I connect Wildberries and Ozon, and what rights do other users have?"

## 1. Current Product Reality

The platform already supports:

- login by email and password
- user profile management
- organizations
- organization membership and roles
- invitations
- Wildberries connection
- Ozon connection
- background sync
- analytics fetching after sync

The platform now exposes a public self-service registration endpoint for the first user account.

Current first owner onboarding flow:

1. user registers account
2. user is logged in immediately
3. user creates an organization
4. that user becomes the organization owner
5. owner connects marketplace shops
6. owner invites managers if needed

## 2. Main Roles

The important business roles are organization roles.

Current practical model:

- `Owner`
  - creates the organization
  - manages members
  - can transfer ownership
  - can invite other users
  - can connect shops
  - can trigger syncs
  - can view analytics

- `Admin`
  - intended for strong org-level management access
  - can typically manage organization operations except ownership transfer unless restricted by business rules
  - can connect shops
  - can trigger syncs
  - can view analytics

- `Manager`
  - day-to-day operator
  - can use analytics
  - can usually work with connected shops and sync actions according to org access rules
  - does not own the organization

If you want a clean product rule for the web app, the safest current interpretation is:

- `Owner` is the top org role
- `Manager` is the everyday business user
- `Admin` is optional elevated staff inside the org

## 3. First User Flow

This is the current recommended flow for the first company user.

### Step 1. Register account

Use:

- `POST /api/v1/auth/register`

The registration request contains:

- first name
- last name
- email
- phone
- password

Example:

```json
{
  "firstName": "Anna",
  "lastName": "Ivanova",
  "email": "owner@company.com",
  "phone": "+79990000000",
  "password": "secret"
}
```

Current behavior:

- account is created as active
- password is hashed server-side
- API returns bearer token immediately

### Step 2. Log in

The user enters:

- email
- password

The backend returns:

- access token
- token type
- expiration time
- current user info

The web app should store the access token and send it in:

`Authorization: Bearer <token>`

### Step 3. Create organization

After registration or login, if the user has no organization yet, the web app should send:

- `POST /api/v1/organizations`

Example:

```json
{
  "name": "Acme"
}
```

This creates the organization and makes the current user the owner.

### Step 4. Confirm current user and org context

Recommended calls after login:

1. `GET /api/v1/auth/me`
2. `GET /api/v1/users/me`
3. `GET /api/v1/users/me/organizations`

The web app can then decide:

- if user has zero orgs: show create-organization screen
- if user has one org: enter that org directly
- if user has several orgs: show org switcher

## 4. Owner Flow

The organization owner is the main account that sets up the platform.

Recommended owner flow:

1. log in
2. create organization
3. open marketplace connection screen
4. connect Wildberries and/or Ozon shops
5. wait for initial sync
6. open dashboard
7. invite managers

## 5. Connect Wildberries Shop

The owner first loads marketplace connector metadata:

- `GET /api/v1/marketplaces/connectors`

For Wildberries, the important credential is:

- `apiToken`

Then the owner connects the shop through:

- `POST /api/v1/marketplace-connections/connect-shop`

Example:

```json
{
  "organizationId": "ORG_GUID",
  "marketplace": "Wildberries",
  "displayName": "WB Main Shop",
  "credentials": {
    "apiToken": "WB_TOKEN"
  },
  "startInitialSync": true,
  "initialSyncDays": 14,
  "initialSyncKinds": ["catalog", "orders", "sales", "stocks", "finance"]
}
```

What happens next:

1. connection is created
2. credentials are validated against Wildberries
3. initial sync can be enqueued automatically
4. background worker starts fetching data

## 6. Connect Ozon Shop

For Ozon, the important credentials are:

- `clientId`
- `apiKey`
- optionally `performanceClientId`
- optionally `performanceClientSecret`

Connect shop request:

```json
{
  "organizationId": "ORG_GUID",
  "marketplace": "Ozon",
  "displayName": "Ozon Main Shop",
  "credentials": {
    "clientId": "12345",
    "apiKey": "OZON_SECRET",
    "performanceClientId": "seller.performance.12345",
    "performanceClientSecret": "PERFORMANCE_SECRET"
  },
  "startInitialSync": true,
  "initialSyncDays": 14,
  "initialSyncKinds": ["catalog", "postings", "finance", "returns", "stocks"]
}
```

What happens next:

1. connection is created
2. credentials are validated against Ozon
3. initial sync can be enqueued automatically
4. background worker starts fetching data

Credential rules:

- seller API credentials remain required
- performance credentials are optional
- performance credentials must be sent as a pair
- seller and performance data belong to the same Ozon shop connection

## 7. What User Sees After Connecting Shop

After connection, the frontend should show the shop card with:

- marketplace
- display name
- connection status
- validation state
- latest sync status

Useful endpoints:

- `GET /api/v1/organizations/{organizationId}/marketplace-connections`
- `GET /api/v1/marketplace-connections/{connectionId}/sync-runs`
- `GET /api/v1/marketplace-sync-runs/{syncRunId}`

Important sync fields for UI:

- `status`
- `progressPercent`
- `progressMessage`
- `error`
- `canRetry`
- `canCancel`
- `attemptCount`
- `maxAttempts`
- `nextAttemptAt`

## 8. Historical Sync Flow

If the owner migrates from another system and wants older data, the owner can manually start historical sync from the app.

Use:

- `POST /api/v1/marketplace-connections/{connectionId}/sync`

Example:

```json
{
  "dateFrom": "2026-01-01",
  "dateTo": "2026-04-18",
  "syncKinds": ["catalog", "finance", "sales", "orders", "stocks"]
}
```

For Ozon:

```json
{
  "dateFrom": "2026-01-01",
  "dateTo": "2026-04-18",
  "syncKinds": ["catalog", "finance", "postings", "returns", "stocks"]
}
```

Important product rule:

- old-period sync is manager/owner triggered from the app
- there is no automatic full historical backfill
- `catalog` sync can be triggered separately to refresh shop product master data and filter dictionaries without waiting for new sales/orders activity

## 9. Invite Another User

Once the owner has created the organization, they can invite other people.

Use:

- `POST /api/v1/organizations/{organizationId}/invitations`

Example:

```json
{
  "email": "manager@company.com",
  "role": "Manager"
}
```

Then the invited user accepts with:

- `POST /api/v1/invitations/accept`

Example:

```json
{
  "token": "INVITE_TOKEN"
}
```

SMTP setup for real invitation emails:

- `AiStats:Email:Smtp:Enabled`
- `AiStats:Email:Smtp:Host`
- `AiStats:Email:Smtp:Port`
- `AiStats:Email:Smtp:UseSsl`
- `AiStats:Email:Smtp:UserName`
- `AiStats:Email:Smtp:Password`
- `AiStats:Email:Smtp:FromEmail`
- `AiStats:Email:Smtp:FromName`
- `AiStats:Email:Invitations:ApplicationBaseUrl`
- `AiStats:Email:Invitations:AcceptPath`

Current behavior:

- invitation email is sent before invitation is persisted
- if SMTP is disabled, invitation is created without sending email
- if SMTP is enabled but misconfigured or sending fails, invitation creation fails

Important current product reality:

- invitation accept exists
- public self-service account registration still does not exist as a dedicated endpoint

So if the invited email does not already have an account, product behavior must be defined carefully on the frontend/business side.

For now the safest operating model is:

- create user account first
- then accept invitation

or

- extend backend later with a combined invitation-registration flow

## 10. Manager Flow

After being added to an organization, a manager typically does this:

1. log in
2. select organization
3. open dashboard
4. use filters
5. trigger manual sync if allowed
6. review breakdown tables and trends

Typical analytics calls:

1. `POST /api/v1/metadata/filter-options`
2. `GET /api/v1/metadata/metrics`
3. `POST /api/v1/overview/summary`
4. `POST /api/v1/analytics/trends`
5. `POST /api/v1/analytics/breakdown`
6. `POST /api/v1/analytics/explanations`

Note:
- for Ozon, seller-side organic funnel data now comes from a separate `analytics` sync kind and is stored independently from finance and Performance API data

## 11. Password Actions

Current available actions:

- change own password:
  - `POST /api/v1/users/me/change-password`
- request reset:
  - `POST /api/v1/users/request-password-reset`
- apply reset token:
  - `POST /api/v1/users/reset-password`

Current platform note:

- password reset exists in API
- but production-grade password reset hardening is still tracked as follow-up work

So for first internal launch this is usable, but it still needs stronger rollout hardening before broad public production use.

## 12. Profile Actions

Current available user self-service actions:

- `GET /api/v1/users/me`
- `PUT /api/v1/users/me`
- `POST /api/v1/users/me/change-password`
- `DELETE /api/v1/users/me`

User fields:

- first name
- last name
- email
- phone

## 13. Full Recommended User Journey

For the very first company owner:

1. user registers account
2. user is logged in automatically
3. user creates organization
4. user becomes owner
5. user connects Wildberries shop
6. user connects Ozon shop
7. user waits for initial sync completion
8. user opens summary / trends / breakdown dashboard
9. user invites managers
10. managers log in and start using analytics

## 14. Web App UX Recommendations

Recommended onboarding screens:

1. Login
2. Create organization or choose organization
3. Connect marketplaces
4. Sync progress
5. Dashboard
6. Team / invitations

Recommended connect-shop UX:

- show supported connectors first
- ask for marketplace-specific credentials
- validate immediately through `connect-shop`
- if validation succeeds, show sync progress screen
- if validation fails, display backend error from response

Recommended roles UX:

- show owner badge clearly
- allow only owner/admin to open team management
- allow only owner to transfer ownership

## 15. What Is Missing If You Want True Self-Service SaaS

For a fully polished public SaaS onboarding flow, the backend still needs:

- email verification
- combined invite + registration flow
- durable password reset token strategy
- stronger auth hardening for production rollout

## 16. Short Answer

If you are the first user of a company today, your actions are:

1. register account with name, surname, email, phone, and password
2. receive bearer token immediately
3. create your organization
4. become owner automatically
5. connect Wildberries credentials
6. connect Ozon credentials
7. wait for sync
8. open dashboard
9. invite managers with roles
