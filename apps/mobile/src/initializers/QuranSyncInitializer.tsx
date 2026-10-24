import { refreshQuranDatabase } from "@/lib/quran/sync";
import { useSQLiteContext } from "expo-sqlite";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { useEffect } from "react";

let lastRefreshAttemptAt = 0;

export default function QuranSyncInitializer() {
  const db = useSQLiteContext();

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (Date.now() - lastRefreshAttemptAt < 60_000) return;
      lastRefreshAttemptAt = Date.now();
      void refreshQuranDatabase(db).catch((error: unknown) => {
        if (active && __DEV__) {
          console.warn(
            "Quran update unavailable; continuing with the saved database.",
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      });
    };

    refresh();
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) refresh();
    });
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") refresh();
      },
    );

    return () => {
      active = false;
      networkSubscription();
      appStateSubscription.remove();
    };
  }, [db]);

  return null;
}
