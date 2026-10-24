# Qalb API

NestJS service for Quran Content Sync, locality lookup, mosque search, driving
routes, Islamic calendar events, and gold/silver prices. See the [root README](../../README.md)
for workspace setup.

Start from the repository root with `yarn workspace api start:dev`. Configure
server-only values using `.env.example` or the deployment environment. Never
copy provider credentials into `EXPO_PUBLIC_*` variables.

Public Nominatim requests use a shared Redis slot (one request per 1.1 seconds).
Cache hits do not consume a slot. If Redis or a slot is unavailable, locality
lookup returns 503 and mobile can use its disclosed platform-geocoder fallback.
All other service requests have a ten-second upstream deadline. Configure a
suitable routing/geocoding provider before increasing traffic; public demo
services are not a production availability guarantee.

### Quran Content Sync

Set `REDIS_URL`, `QURAN_FOUNDATION_CLIENT_ID`, and
`QURAN_FOUNDATION_CLIENT_SECRET` in the API deployment environment. The Content
API credentials are used only by this backend. `QURAN_FOUNDATION_ENV` selects
`production` (default) or `prelive`; use matching credentials for each.

The service synchronizes `quran_core:1`, translations `45`, `57`, and `85`, and
ayah recitation `6` using the Content Sync filter
`quran_core:1;translations:45,57,85;recitations:6`. It runs on Mondays at
03:00 in `QURAN_SYNC_TIMEZONE` (default `UTC`); `QURAN_SYNC_HOUR` changes the
local hour. The process checks once a minute, catches up on startup, and checks
when `/api/quran/status` is requested. These checks allow a sleeping service to
catch up on its next start/request; an external scheduler is not configured in
this repository.

Transient failures retry with exponential backoff, jitter, and a 24-hour cap.
A renewed Redis lock prevents concurrent workers from advancing the cursor;
the final dataset write checks the lock owner atomically. Redis stores the
complete app dataset and Content Sync token together in one
non-expiring key; failed requests, validation errors, and failed Redis writes
leave the previous committed dataset and token intact. The API exposes only a
revision, sync timestamp, row counts, the app's content snapshot, and changes
between the latest two revisions. A client on an older revision receives a
full snapshot. It never returns QF credentials or sync tokens.

`GET /api/quran/status` reports the current public revision and starts a due
catch-up run in the background. `GET /api/quran/changes?revision=...` returns
the insert/update/delete patch when the revision is the retained previous
revision, or a full snapshot for new/stale clients. `GET /api/quran/snapshot`
returns the current full projection. The mobile app downloads a full first
snapshot from this API and applies it to SQLite in one transaction. A new
installation needs internet access for that first download; after a successful
download, reading and search use the local database offline. Existing local
data is kept when updates fail. The app checks on launch, when connectivity
returns, and on foregrounding. It also registers an Expo background refresh
with a 24-hour minimum interval. OS scheduling is best effort and can be
deferred or stopped, especially after the user force-quits on iOS; it cannot
promise an exact seven-day deadline. The API catches up with QF weekly when a
sync is due and connectivity to QF permits.

The current local development setup uses a Redis endpoint configured in
`apps/api/.env.local`. Configure the same durable storage and QF variables in
the deployed API environment before a mobile release. If Redis is unavailable
or exceeds its storage limit, synchronization fails closed and retains the last
valid dataset; it does not fall back to ephemeral storage.

Content Sync supplies recitation metadata and audio URLs, not audio recordings.
This integration does not establish redistribution rights for Quran text,
translations, transliteration, or recitation recordings. Review the applicable
Quran.Foundation terms and each content provider's rights before release.

### Mobile manual verification

The mobile workspace has a Node test for snapshot validation, but native SQLite
behavior still needs device verification. Before a release, verify on iOS and
Android: (1) install with network disabled and confirm the app explains that
Quran reading is unavailable until the first download; (2) connect and confirm
all required data is downloaded and chapter/verse ordering is correct; (3)
reconnect after bootstrap and confirm the API revision is applied; (4) test a
changed row and deletion through a test backend revision and confirm rows and
revision change together; (5) interrupt a snapshot or return a malformed patch
and confirm the last committed database remains readable; and (6) launch offline
again and confirm reading/search work. Use a disposable test backend/database
for destructive patch scenarios. Do not package a QF content database in the
app binary: the Developer Terms state that Content Sync's storage exception
does not authorize a prepackaged database or build-time bundle.
