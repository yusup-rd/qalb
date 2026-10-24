# Qalb mobile app

The mobile app is an Expo SDK 58 / React Native app for iOS and Android. It
owns the user interface, localization, local Quran SQLite database, device
permissions, prayer calculations and reminders, compass, offline Quran reading
and search, and user preferences.

## Project layout

- `src/app/` — Expo Router routes and navigation.
- `src/components/` — reusable and feature-specific UI.
- `src/hooks/` — app, location, and compass behavior.
- `src/lib/` — calculations, API helpers, and Quran database/sync logic.
- `src/store/` — Zustand application state.
- `src/i18n/` — English and Russian translations.
- `assets/` — fonts, icons, and other bundled assets.
- `scripts/` — localization checks and Jest tests.

## Setup and development

Use a supported Node.js release (22.13+, 24.3+, or 26+) and Yarn Classic
(1.x). SDK 58 uses React Native 0.88 and React 19.3. From the repository root:

```sh
yarn install --frozen-lockfile
```

Copy `.env.example` to `.env.local`. Set `EXPO_PUBLIC_API_URL` to the Qalb API
origin. For a physical device, use an address reachable on the network; device
`localhost` does not refer to the development computer. Android native builds
require `GOOGLE_MAPS_API_KEY`. Production builds require an HTTPS
`EXPO_PUBLIC_API_URL`; configure production values in the EAS build environment.

From the repository root, run one of:

```sh
yarn workspace qalb start
yarn workspace qalb start --clear
yarn workspace qalb android
yarn workspace qalb ios
yarn workspace qalb web
```

Expo Go can run supported Expo modules during development. Use a development
build for native behavior that depends on the app's configured native modules,
Android Maps key, background tasks, notifications, or release settings. Store
and production behavior should be checked in development/release builds on
physical iOS and Android devices.

## API and Quran storage

The app uses `EXPO_PUBLIC_API_URL` to reach the API documented in
[`../api/README.md`](../api/README.md). A new install downloads and validates a
Quran snapshot before the main app opens, then stores it in `quran-v2.db` using
Expo SQLite. Reading and search use that local database offline. The app checks
for Quran updates every seven days; API and network errors preserve the
last committed local content. Recitation playback and other provider-backed
features need network access unless their data is already available locally.

The Android Maps key is read by `app.config.js`; it is not sent as an API
credential. API provider credentials belong only in the API environment.

## Commands

Run from the repository root:

```sh
yarn workspace qalb lint
yarn workspace qalb tsc --noEmit
yarn workspace qalb i18n:check
yarn workspace qalb test
yarn workspace qalb test:coverage
```

After changing Expo dependencies, run `yarn workspace qalb expo install --fix`
and `yarn workspace qalb expo install --check` from the repository root, then
run `npx expo-doctor` from `apps/mobile`. Native tabs use the stable
`expo-router/native-tabs` entry point. Keep `web.output` explicit in `app.json`;
SDK 58 otherwise defaults Expo Router to server output. The `expo-router`
plugin enables `apiRoutes` to retain SDK 57's static output behavior. Metro
resolves `expo-asset` directly to React Native so Expo SDK 58 can access the
React Native 0.88 `AssetRegistry` export through Nativewind's resolver. It also
registers `.wasm` as an asset for Expo SQLite's web bundle. Hosting that web
bundle requires the `Cross-Origin-Embedder-Policy` and
`Cross-Origin-Opener-Policy` headers for SQLite's `SharedArrayBuffer` support.
Theme colors are declared with concrete values in `@theme` and overridden in
`:root` for dark mode so Tailwind can generate color opacity modifiers such as
`bg-primary/10`. `react-native-css@3.1.0-rc.0` currently drops optional
percentages when parsing the `color-mix()` generated for these modifiers. The
root `postinstall` script applies the fix in
[`patches/react-native-css+3.1.0-rc.0.patch`](../../patches/react-native-css+3.1.0-rc.0.patch)
with `patch-package`; keep slash opacity utilities and retain the patch until
the upstream release includes the fix.

Jest uses `jest-expo` and React Native Testing Library. Tests include Quran
bootstrap/sync regressions, API request diagnostics, Qibla sensor state, and
Qibla calculation edge cases.
