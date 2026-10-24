# Qalb

Qalb is an English and Russian Islamic companion for iOS and Android. The Expo
mobile app provides Quran reading and search, recitation, prayer times and
reminders, Qibla direction, nearby mosques and routes, tasbih, spiritual-pause
counters, and a USD zakat calculator.

## Repository

- `apps/mobile` — Expo Router app and local Quran database.
- `apps/api` — NestJS API and Quran Content Sync service.
- `packages/shared` — shared API types.
- `docs/legal` — canonical English and Russian privacy and terms documents.
- `legal-site` — static GitHub Pages renderer for the legal documents.
- `.expo-shared` — Expo asset optimization metadata shared with the project.

See the [mobile app guide](apps/mobile/README.md) and [API guide](apps/api/README.md)
for setup and workspace-specific commands.

## How the app and API work together

The mobile app calls the API for Quran content, mosque search, reverse
geocoding, route estimates, Islamic calendar data, and gold/silver prices.
Quran chapters, verses, translations, transliteration, and audio metadata are
stored in SQLite after the first online bootstrap. Reading and search then work
offline; provider-backed features and uncached audio require connectivity. The
API keeps provider credentials server-side and stores its Quran dataset and
sync state in Redis.

## Prerequisites and setup

Use Node.js 22.13 or newer and Yarn Classic (1.x). From the repository root:

```sh
yarn install --frozen-lockfile
```

Configure `apps/api/.env.local` from `apps/api/.env.example` and
`apps/mobile/.env.local` from `apps/mobile/.env.example`. Start the API and
mobile app in separate terminals:

```sh
yarn workspace api start:dev
yarn workspace qalb start
```

For a physical device, set `EXPO_PUBLIC_API_URL` to an API address reachable
from that device; `localhost` points to the device itself. Production mobile
builds require an HTTPS API URL. Android builds also need a restricted
`GOOGLE_MAPS_API_KEY`. Use development builds to verify native release behavior;
Expo Go is useful for supported development flows but does not represent
production notification, background-task, or signing behavior.

## Project checks

```sh
yarn workspace qalb lint
yarn workspace qalb tsc --noEmit
yarn workspace qalb i18n:check
yarn workspace qalb test
yarn workspace api lint
yarn workspace api test
yarn workspace api test:e2e
yarn workspace api build
yarn tsc --noEmit -p apps/api/tsconfig.json
```

The legal site has its own lockfile and build commands. Run them from
`legal-site/` with `npm ci` and `npm run build`; generated output is in `dist/`.
The site is configured for the `/qalb/` GitHub Pages base path. Its source
documents remain in `docs/legal/`. The builder creates English and Russian
home pages plus privacy and terms routes in both languages. The GitHub Actions
workflow deploys after relevant pushes to `main` or a manual workflow run, once
GitHub Pages is configured to use Actions.
