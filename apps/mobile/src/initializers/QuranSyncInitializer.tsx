import { hasLocalQuran, refreshQuranDatabase } from "@/lib/quran/sync";
import NetInfo from "@react-native-community/netinfo";
import {
  BackgroundTaskResult,
  BackgroundTaskStatus,
  getStatusAsync,
  registerTaskAsync,
} from "expo-background-task";
import {
  openDatabaseAsync,
  useSQLiteContext,
  type SQLiteDatabase,
} from "expo-sqlite";
import { defineTask, isTaskRegisteredAsync } from "expo-task-manager";
import { useEffect } from "react";
import { AppState } from "react-native";

const QURAN_BACKGROUND_SYNC_TASK = "qalb-quran-content-sync";
const QURAN_DATABASE_NAME = "quran-v2.db";
const BACKGROUND_SYNC_INTERVAL_MINUTES = 24 * 60;

defineTask(QURAN_BACKGROUND_SYNC_TASK, async () => {
  let database: SQLiteDatabase | undefined;
  try {
    // Closing this task's handle must never close the UI's cached connection.
    database = await openDatabaseAsync(QURAN_DATABASE_NAME, {
      useNewConnection: true,
    });
    await refreshQuranDatabase(database);
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

export default function QuranSyncInitializer({
  onInitialize,
}: {
  onInitialize: () => Promise<void>;
}) {
  const db = useSQLiteContext();

  useEffect(() => {
    let active = true;
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

    const refresh = async () => {
      if (await hasLocalQuran(db)) {
        await refreshQuranDatabase(db);
      } else {
        await onInitialize();
      }
    };

    const refreshSafely = () => {
      void refresh().catch((error: unknown) => {
        if (active && __DEV__) {
          console.warn(
            "Quran update unavailable; continuing without blocking the app.",
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      });
    };

    refreshSafely();
    const refreshInterval = setInterval(refreshSafely, 24 * 60 * 60 * 1000);
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        refreshSafely();
      }
    });
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") refreshSafely();
      },
    );

    return () => {
      active = false;
      clearInterval(refreshInterval);
      networkSubscription();
      appStateSubscription.remove();
    };
  }, [db, onInitialize]);

  return null;
}
