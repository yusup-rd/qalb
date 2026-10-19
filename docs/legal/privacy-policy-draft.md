# Qalb Privacy Notice — Draft

**Status: Draft for review. Do not publish until the release checks in `release-audit.md` are resolved.**  
**Last reviewed: 19 October 2026**

Qalb is an Islamic companion app developed by Yusup Rejebov, based in Turkmenistan. For privacy questions or requests, contact [yusuprd@icloud.com](mailto:yusuprd@icloud.com).

## Information Qalb processes

Qalb has no account registration, advertising, analytics, or crash-reporting SDK in the inspected code. It does not create a central user profile. The app may process:

- **Location.** On launch, Qalb requests foreground location permission and reads the device’s current coordinates when permission is granted. Coordinates are used on-device to calculate prayer times and Qibla direction. After permission is granted, the app also sends coordinates and the selected language to its API to resolve the locality name shown in the app. When the user opens nearby mosques, Qalb sends coordinates and the search radius; when the user asks for a route, it sends origin and destination coordinates. Location denial leaves location-dependent results unavailable; Qalb does not request background location.
- **App preferences and activity.** Theme, language, prayer calculation and notification preferences, Quran display preferences, tasbih progress, spiritual-pause progress, last-opened Surah, and compass haptic preference are stored locally. Scheduled prayer alerts are local device notifications; notification permission is requested when needed.
- **Service cache.** Qalb caches API responses on the device (up to 100 recent entries) and may persist request keys that contain rounded coordinates for geocoding, mosque, or route lookups. Cache freshness periods vary; old entries can remain until cache pruning or app data removal. If configured, the backend also caches service results in Redis: route data for one hour, mosque results for 15 minutes, geocoding and Islamic-calendar results for 24 hours, and metals prices for 24 hours.
- **Network and device metadata.** Requests to the Qalb API and external services necessarily expose ordinary network metadata such as IP address and request headers to the relevant network operator, hosting provider, or service. The backend uses request logging and redacts URL, query, parameters, authorization, cookie, and referrer fields in its configured Pino request logs. The deployment host, its IP-log practices, and log retention period are not configured in this repository and must be confirmed before release.

## Services and disclosures

The mobile app calls the Qalb API for reverse geocoding, nearby mosques, routes, Islamic calendar events, and zakat metal prices. The API forwards relevant requests to these configured providers (defaults shown): OpenStreetMap Nominatim (coordinates and language), the public OSRM routing service (route coordinates), TakbeerTime (coordinates, radius, and result limit for nearby mosques), AlAdhan (month and year for the Hijri calendar), and metals.dev (a server-side API key plus currency and unit for prices). The providers receive the API server’s network address; their services receive the request data listed above. The actual production endpoints and hosting configuration must be checked before publishing.

Qalb displays maps using `react-native-maps` (Apple Maps on iOS by default; Google Maps on Android when configured). Map providers may process map requests, displayed coordinates, and network metadata under their own terms. Prayer audio is requested from `mirrors.quranicaudio.com` when played; the service receives the device’s network request metadata. Expo Updates is configured with an Expo-hosted update URL and may receive update-check metadata. The app’s Quran text, English and Russian translations, transliteration, and recitation metadata are presently bundled in a local SQLite database; see the content-rights release blocker in `release-audit.md`.

Qalb does not use remote push notifications in the inspected code. It does not send prayer notification schedules to a notification provider; scheduled notifications are maintained by the operating system.

## Storage, retention, and choices

Local settings and cached responses remain on the device until removed by app data controls, cache pruning, or uninstalling the app. There is no in-app account or server-side user record to delete. The backend’s configured Redis entries have the expiry periods listed above; Redis is optional and caching is disabled if no Redis connection is configured. API and hosting log retention depends on the production host and is not established by this repository.

You can deny or revoke location and notification permissions in device settings. You can remove locally stored app data by clearing the app’s data or uninstalling it. Depending on applicable law, you may ask to access, correct, block, or delete information about you, or withdraw consent where consent is the relevant basis. For a privacy question or request relating to data handled by Qalb, email [yusuprd@icloud.com](mailto:yusuprd@icloud.com) and describe the request. Qalb may need enough information to locate the relevant request or cache entry. Third-party providers may handle their own logs and data under their own policies.

## Children and changes

Qalb does not knowingly collect children’s information through an account system. The app’s store age rating and any child-directed status must be determined and disclosed by the publisher. This notice may be revised when app features, providers, or legal requirements change; the effective date will be updated when published.

## Before publication

Confirm the API host and its log retention, production providers and their current privacy terms, the app’s store privacy disclosures, the exact rights and update path for the bundled Quran content, and the applicable legal notice requirements for Turkmenistan and each distribution market. Turkmenistan’s law on private-life information contains consent, sensitive-information, access, correction, blocking, and deletion provisions; local counsel must confirm how these apply to this app and configure a compliant user-request process. Obtain qualified local legal advice on applicable privacy, consumer, and cross-border transfer obligations.
