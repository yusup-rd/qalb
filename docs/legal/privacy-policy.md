# Qalb Privacy Policy

**Last updated: 19 October 2026**

Qalb is a free, noncommercial Islamic companion app maintained as a personal hobby project by an independent developer. For privacy questions or requests, contact [yusuprd@icloud.com](mailto:yusuprd@icloud.com).

## Information Qalb processes

**Location.** When Qalb starts, it asks for permission to use location while the app is in use. If you grant permission, the app reads your current coordinates. Prayer times and Qibla direction are calculated on your device; your coordinates are also sent to the Qalb API with your app language to look up the locality name. If that lookup fails, Qalb may send the coordinates to the device platform’s geocoder. When nearby mosques are shown on the home screen or in the mosque feature, Qalb sends your coordinates, search radius, and result limit to the Qalb API. Qalb then requests driving estimates for up to 20 nearby mosques, sending your coordinates and their coordinates to its routing provider. When you request directions, the route’s start and destination coordinates are sent for routing. Qalb does not request background location.

**Device data.** Qalb stores your language, theme, prayer calculation and notification settings, Quran display preferences, tasbih and spiritual-pause progress, last-opened Surah, compass haptics setting, and cached API responses on your device. The cache keeps up to 100 recent entries. Its entries can include rounded coordinates in cache keys. Quran text, English and Russian translations, English transliteration, and recitation metadata are downloaded from the Qalb API and saved in SQLite after a successful first sync. A new installation needs an internet connection before Quran reading and search become available; after that download, reading and search use the local database and work offline. Quran searches and reading activity are not sent to the Qalb API or Quran.Foundation.

**Notifications.** If you enable prayer reminders and allow notifications, Qalb calculates prayer times on your device and schedules reminders locally through the operating system, up to seven days ahead. Qalb does not send your schedule to a remote push-notification service. Notification content may be visible to people with access to your device.

**Network and diagnostics.** When your device contacts the Qalb API, the API host receives ordinary connection data such as your IP address and request time. The application request logger records request methods and is configured to remove request URLs, query strings, route parameters, authorization headers, cookies, and referrers. Error logs may contain additional diagnostic details. Network providers and third-party services may also process connection data.

## Services that receive information

Qalb is independent and is not an official Quran.Foundation or Quran.com app. The Qalb API uses Quran.Foundation Content Sync to maintain the Quran resources used in the app. The app downloads and refreshes its local copy through the Qalb API; it does not contact Quran.Foundation directly or send Quran searches or reading activity to either service.

The Qalb API forwards request data to the service needed for the feature:

- [OpenStreetMap Nominatim](https://operations.osmfoundation.org/policies/nominatim/) receives coordinates and language for locality lookup.
- [TakbeerTime](https://takbeertime.com/privacy.html) receives coordinates, search radius, and result limit for nearby mosque results.
- The public [OSRM routing service](https://project-osrm.org/docs/v5.24.0/api/) receives your coordinates and nearby mosque coordinates for driving estimates, or the selected route’s start and destination coordinates for directions.
- [AlAdhan](https://aladhan.com/prayer-times-api) receives the requested calendar month and year. Qalb does not send your coordinates for this request.
- [metals.dev](https://metals.dev/policy/terms) receives a server request for gold and silver prices in USD per gram. The API key is used by the server and is not included in the app.

Maps are displayed using Apple Maps on iOS and Google Maps on Android. Those providers may receive map requests and information used to display your location and selected places. If the Qalb API locality lookup fails, the device platform’s geocoder may receive your coordinates. When you play Quran recitation, the app streams audio from [QuranicAudio mirrors](https://quranicaudio.com/about), which receive the audio request and ordinary network information. [Expo Updates](https://expo.dev/privacy) checks for app updates when Qalb loads and may receive update-check information such as device operating system and a randomized update identifier.

Qalb’s API is hosted through Render and can use Upstash Redis for temporary response caching when Redis is configured. Upstash receives the cached API responses and cache keys described below. The providers process requests under their own terms and privacy notices; Qalb does not control their independent retention or processing locations.

Qalb has no user accounts, advertising, analytics, crash-reporting SDK, remote push notifications, paid features, or payment processing. Using an Islamic companion app and its location features may reveal religious interests from your device or network activity, but Qalb does not create a user profile from that information. Contacting the developer opens your email app; Qalb does not send the email itself.

## Storage and retention

Preferences and the downloaded Quran database remain on your device until you clear Qalb’s app data or uninstall the app. Cached API responses are considered fresh for 24 hours for locality results, mosque results, and metal prices; one hour for routes and route estimates; and 30 days for calendar events. The cache may retain older entries after they become stale until cache pruning, app-data removal, or uninstalling the app.

When configured, Upstash Redis temporarily caches mosque results for 15 minutes; routes and route estimates for one hour; locality results and metal prices for 24 hours; and calendar events for 30 days. The API uses Redis as a cache, not for accounts or user histories. Render states that logs for a Hobby workspace are available in its dashboard for seven days; the actual deployment plan, settings, and any external log exports may change how long logs are available. Other providers set their own retention periods under their policies.

## Your choices and privacy requests

You can deny or revoke location and notification permissions in your device settings. You can remove preferences, cached responses, and other locally stored app data by clearing Qalb’s data or uninstalling it. There is no Qalb account or server-side reading history to delete. Depending on the law that applies to you, you may have additional rights regarding personal information. To ask a privacy question or make a request about information handled by Qalb, email [yusuprd@icloud.com](mailto:yusuprd@icloud.com). Please avoid sending sensitive information by email. Third-party providers handle requests about information they process under their own policies.

This policy may be updated if Qalb’s features or data practices change. The date above shows when it was last revised.

## Provider information

See the current policies and service information from [Render](https://render.com/docs/logging), [Upstash](https://upstash.com/trust/privacy), [OpenStreetMap](https://operations.osmfoundation.org/policies/nominatim/), [TakbeerTime](https://takbeertime.com/privacy.html), [AlAdhan](https://aladhan.com/prayer-times-api), [metals.dev](https://metals.dev/policy/terms), [Apple](https://www.apple.com/legal/privacy/data/en/apple-maps/), [Google](https://policies.google.com/privacy), [Quran.Foundation](https://api-docs.quran.com/legal/developer-terms/), [QuranicAudio](https://quranicaudio.com/about), and [Expo](https://expo.dev/privacy).
