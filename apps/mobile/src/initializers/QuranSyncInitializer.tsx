import {
  hasLocalQuran,
  initializeQuranDatabase,
  refreshQuranDatabase,
} from "@/lib/quran/sync";
import {
  BackgroundTaskResult,
  BackgroundTaskStatus,
  getStatusAsync,
  registerTaskAsync,
} from "expo-background-task";
import { defineTask, isTaskRegisteredAsync } from "expo-task-manager";
import {
  openDatabaseAsync,
  useSQLiteContext,
  type SQLiteDatabase,
} from "expo-sqlite";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { useEffect } from "react";

const QURAN_BACKGROUND_SYNC_TASK = "qalb-quran-content-sync";
const QURAN_DATABASE_NAME = "quran-v2.db";
const BACKGROUND_SYNC_INTERVAL_MINUTES = 24 * 60;

let lastRefreshAttemptAt = 0;

defineTask(QURAN_BACKGROUND_SYNC_TASK, async () => {
  let database: SQLiteDatabase | undefined;
  try {
    database = await openDatabaseAsync(QURAN_DATABASE_NAME);
    if (await hasLocalQuran(database)) {
      await refreshQuranDatabase(database);
    } else {
      await initializeQuranDatabase(database);
    }
    return BackgroundTaskResult.Success;
  } catch (error) {
    if (__DEV__) {
      console.warn(
        "Background Quran content sync failed.",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
    return BackgroundTaskResult.Failed;
  } finally {
    await database?.closeAsync().catch(() => undefined);
  }
});

export default function QuranSyncInitializer() {
  const db = useSQLiteContext();

  useEffect(() => {
    let active = true;
    let refreshInFlight = false;
    let refreshRequestedWhileInFlight = false;
    void (async () => {
      try {
        if ((await getStatusAsync()) !== BackgroundTaskStatus.Available) return;
        if (!(await isTaskRegisteredAsync(QURAN_BACKGROUND_SYNC_TASK))) {
          await registerTaskAsync(QURAN_BACKGROUND_SYNC_TASK, {
            minimumInterval: BACKGROUND_SYNC_INTERVAL_MINUTES,
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn(
            "Could not register background Quran content sync.",
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      }
    })();

    const refresh = (force = false) => {
      if (refreshInFlight) {
        if (force) refreshRequestedWhileInFlight = true;
        return;
      }
      if (!force && Date.now() - lastRefreshAttemptAt < 60_000) return;
      lastRefreshAttemptAt = Date.now();
      refreshInFlight = true;
      void refreshQuranDatabase(db)
        .catch((error: unknown) => {
          if (active && __DEV__) {
            console.warn(
              "Quran update unavailable; continuing with the saved database.",
              error instanceof Error ? error.message : "Unknown error",
            );
          }
        })
        .finally(() => {
          refreshInFlight = false;
          if (refreshRequestedWhileInFlight && active) {
            refreshRequestedWhileInFlight = false;
            refresh(true);
          }
        });
    };

    refresh();
    const refreshInterval = setInterval(refresh, 24 * 60 * 60 * 1000);
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) refresh(true);
    });
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") refresh(true);
      },
    );

    return () => {
      active = false;
      clearInterval(refreshInterval);
      networkSubscription();
      appStateSubscription.remove();
    };
  }, [db]);

  return null;
}
