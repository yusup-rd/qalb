# Quran preparation progress

Fresh installations prepare content through the existing Qalb API. No content is bundled and no API contract or licensing assumption has changed.

## Stages and measurement

1. **Checking saved content:** SQLite opens `quran-v2.db`, creates any missing schema, and checks local dataset counts. Complete existing data immediately unlocks the app without a bootstrap network request.
2. **Connecting:** requests `/api/quran/status`, using the existing timeout and retry policy.
3. **Downloading:** requests `/api/quran/changes`. The fetch client receives and parses one JSON response. There is no byte counter or reliable transfer percentage, so this stage is indeterminate.
4. **Checking downloaded content:** the existing synchronous snapshot validator checks required resources, counts and relationships. This stage can finish too quickly to be individually visible; its step then shows completed.
5. **Writing content:** within the existing exclusive transaction, counts successful row inserts across all snapshot tables. The UI updates every 250 rows and at the last row. The percentage describes row writes only, not overall preparation. It can reach 100% before the transaction commits.
6. **Finishing:** writes the revision, checks the stored counts, and waits for the transaction to commit. This is indeterminate. Only successful completion of initialization unlocks the Quran routes.

The progress screen is outside `SQLiteProvider`, because the provider withholds its children until `onInit` resolves. Query consumers remain inside the provider and behind the readiness gate. A 300 ms presentation delay avoids flashing the preparation screen for a fast existing-database check; it never changes progress values. Network stages and errors bypass that delay. The splash can now hide while preparation is running.

Retry starts with a new progress state. The existing initialization lock and offline-to-online retry listener remain in place. Failures clear the measured percentage; a finishing/commit failure marks writing as failed rather than suggesting it was saved. No writes or commit decisions depend on observers. Existing foreground/background refreshes do not show this screen.

## Development diagnostics

Run `yarn workspace qalb start`, open the app in iOS Expo Go, and watch Metro's terminal output for `[QuranBootstrap]`. Use a fresh installation/test app database to exercise downloading; an existing complete database intentionally skips it. Do not erase a user's database to force this test.

Events include `start`, `local_checked` (`localReady`), `stage_started`, `stage_complete`, `request_start`, `request_response`, `request_complete`, `request_retry`/`request_failure`, `transaction_started`, `transaction_committed`, and `success`/`failure`. They include total/stage elapsed milliseconds; request events also carry attempt number, per-attempt elapsed milliseconds, status or retry delay where applicable. Transaction events include the actual total row count.

- `request_response` means the fetch implementation made a response available. It is not a guaranteed first-byte timestamp on React Native.
- `request_complete` means JSON parsing succeeded and the HTTP status was successful. The interval may include body receipt and parsing; it cannot isolate radio transfer time. `request_invalid_response` identifies malformed JSON returned with a successful HTTP status.
- Long `connecting` or `downloading` stages point to API/network waits or retries; they do not by themselves establish a Render cold start.
- Long `validating`, `saving`, or `finishing` stages identify client validation, writes, or final checks/commit respectively.
- After 20 seconds on a stage, the screen adds a localized explanation and actual time on that step. Time is never converted into a percentage or ETA.

These structured events are development-only and contain no Quran text, response bodies, credentials, tokens, request query strings, or raw error messages. No extra diagnostics screen or production logging was added. The previous device delay cannot be diagnosed retrospectively without a trace from that run.

## Verification limits and device checklist

Node tests run the production initialization and transaction orchestration with mocked API and native database boundaries. They cover real callback ordering, row counts, failed requests/retry reset, invalid snapshots, write/final-validation/commit failures, and complete existing data. They do not prove native SQLite rollback behavior or rendering.

On iOS and Android, verify:

- Fresh online start: the preparation screen appears during `onInit`; steps advance, only writing shows a numeric bar, and Quran routes appear after commit. Check English/Russian, light/dark, large text, small screens, VoiceOver/TalkBack, and scrolling to Retry.
- Slow/offline network: indeterminate stages show no fabricated percentage; the long-running hint appears after 20 seconds. Failure shows Retry. Restoring connectivity retries automatically; repeated button presses do not duplicate initialization.
- Interrupt download, send malformed JSON/content, or exhaust test-device storage: preparation never reports success. Retry starts from checking with no stale percentage.
- Fail final validation or commit after all inserts: 100% writing must not unlock routes or remain displayed as success. Existing data must roll back on native SQLite.
- Upgrade with complete existing data and an unavailable API: reading/search open without a download screen or bootstrap network dependency.

Native rendering, device SQLite behavior, and builds were not verified by these Node tests.
