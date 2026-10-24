# Qalb

Qalb is an English/Russian Islamic companion for iOS and Android, built with
Expo SDK 57 and React Native. It includes Quran reading and search, streaming
recitation, calculated prayer times and local reminders, Qibla, nearby mosques
and driving routes, tasbih, spiritual-pause counters, and a USD zakat calculator.

## Repository

- `apps/mobile`: Expo Router application.
- `apps/api`: NestJS API, provider integration, and durable Quran Content Sync.
- `packages/shared`: shared API types.
- `docs/legal`: English and Russian privacy policy and terms.
- `legal-site`: GitHub Pages rendering of those documents.

## Development

Use a supported Node version for Expo SDK 57 and Yarn Classic. From this root:

```sh
yarn install --frozen-lockfile
yarn workspace api start:dev
yarn workspace qalb start --clear
```

Configure the API's server-only environment from `apps/api/.env.example`.
Configure `apps/mobile/.env.local` from its example. On a physical device,
`EXPO_PUBLIC_API_URL` must reach your hosted API or development machine;
`localhost` points to the device itself. Production requires HTTPS. QF, Redis,
and metals credentials belong only on the API. Restrict the Android Maps key
to the application identifier and signing certificate in Google Cloud.

Use development builds for native release testing. Expo Go does not reproduce
production notification, background execution, permission, or signing behavior.

## Content and offline behavior

New installations require internet and an available Qalb API to download and
validate Quran content before the main application opens. No Quran database is
bundled. After a successful download, reading and search work offline. Audio,
new maps, routes, and uncached provider data require connectivity. Existing
local Quran data is preserved when refresh fails. Background refresh is subject
to operating-system scheduling and cannot guarantee an exact weekly execution.

## Checks

```sh
yarn workspace qalb lint
yarn workspace qalb tsc --noEmit
yarn workspace qalb i18n:check
yarn workspace qalb test:quran
yarn workspace qalb test:release
yarn workspace api lint
yarn workspace api test
yarn workspace api test:e2e
yarn tsc --noEmit -p apps/api/tsconfig.json
greenlight preflight .
```

The automated tests include mocked native boundaries. Device verification and
store-console declarations are separate requirements.
