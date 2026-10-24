# Qalb API

The API is a NestJS service for Quran Content Sync, mosque search, reverse
geocoding, route estimates, Islamic calendar events, and gold/silver prices.
The Expo app consumes these endpoints; see the [mobile guide](../mobile/README.md)
and [repository overview](../../README.md).

## Structure

- `src/main.ts` — Nest application startup and global configuration.
- `src/modules/` — controllers and providers grouped by API feature.
- `test/` — Vitest unit and end-to-end tests.
- `dist/` — compiled output created by the build command.

The modules isolate upstream integrations and validate their inputs and
responses. Quran Content Sync writes the app's projected dataset and sync
metadata to Redis as a single committed value, preserving the last valid data
when refreshes fail. Credentials and sync tokens remain server-side.

## Setup and commands

Use Node.js 22.13 or newer and Yarn Classic (1.x). From the repository root:

```sh
yarn install --frozen-lockfile
```

Copy `.env.example` to `.env.local`, set values for the integrations you use,
and start the development server:

```sh
yarn workspace api start:dev
```

Available scripts, run from the repository root:

```sh
yarn workspace api start
yarn workspace api start:dev
yarn workspace api start:debug
yarn workspace api lint
yarn workspace api test
yarn workspace api test:watch
yarn workspace api test:cov
yarn workspace api test:e2e
yarn workspace api build
yarn tsc --noEmit -p apps/api/tsconfig.json
```

The project uses Vitest for unit and e2e tests and Oxlint for linting. The
repository-level TypeScript command checks the API tsconfig.

## Environment

Set variables in `.env.local` or the API runtime environment. Do not place API
credentials in mobile `EXPO_PUBLIC_*` variables.

- `PORT`, `LOG_LEVEL` — server port and logging level.
- `REDIS_URL` — durable Quran dataset, sync state, and shared request limiting.
- `QURAN_FOUNDATION_ENV`, `QURAN_FOUNDATION_CLIENT_ID`,
  `QURAN_FOUNDATION_CLIENT_SECRET` — Quran.Foundation Content Sync environment
  and credentials.
- `QURAN_SYNC_TIMEZONE`, `QURAN_SYNC_HOUR` — weekly sync schedule settings.
- `METALS_API_KEY`, `METALS_API_URL` — metals data provider.
- `ALADHAN_API_URL` — Islamic calendar provider.
- `MOSQUES_API_URL` — nearby mosque provider.
- `NOMINATIM_API_URL` — reverse geocoding provider.
- `ROUTING_API_URL` — route estimation provider.

The example file documents current defaults and local values. Supply real
credentials through an untracked local file or deployment configuration.

## Routes and integrations

- `GET /api/quran/status`, `/api/quran/snapshot`, `/api/quran/changes`
  — Quran availability, full content snapshot, and revision changes.
- `GET /api/mosques/nearby` — nearby mosque results.
- `GET /api/reverse-geocoding` — locality lookup.
- `POST /api/routing/route`, `/api/routing/metrics` — route estimates and
  routing metrics.
- `GET /api/islamic-events/calendar` — Islamic calendar data.
- `GET /api/metals/latest` — latest gold and silver prices.

Quran sync is scheduled for Monday at the configured hour (default 03:00 UTC)
and also checks for a due catch-up run when the service starts or the Quran
status endpoint is requested. The mobile client caches its local snapshot and
uses the API revision endpoints for updates. The API does not bundle Quran
content into the mobile app.

Public Nominatim requests share a Redis rate-limit slot; if Redis or the slot is
unavailable, locality lookup returns 503 so the mobile app can use its
platform-geocoder fallback. Upstream requests have a ten-second deadline.
Public demo routing/geocoding services do not guarantee production availability.
