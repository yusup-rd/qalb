import { syncPrayerNotifications } from "@/lib/prayer-notifications";
import { useLocationStore } from "@/store/locationStore";
import { usePrayerStore } from "@/store/prayerStore";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

const NotificationInitializer = () => {
  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);
  const calculationMethod = usePrayerStore((state) => state.calculationMethod);
  const asrMethod = usePrayerStore((state) => state.asrMethod);
  const prayerNotifications = usePrayerStore(
    (state) => state.prayerNotifications,
  );
  const prayerTimeAdjustments = usePrayerStore(
    (state) => state.prayerTimeAdjustments,
  );
  const prayerStoreHydrated = useRef(usePrayerStore.persist.hasHydrated());
  const previousAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const syncIfReady = () => {
      prayerStoreHydrated.current = true;
      const { latitude, longitude } = useLocationStore.getState();

      if (latitude == null || longitude == null) {
        return;
      }

      void syncPrayerNotifications();
    };

    if (usePrayerStore.persist.hasHydrated()) {
      prayerStoreHydrated.current = true;

      return;
    }
    const unsubscribe = usePrayerStore.persist.onFinishHydration(syncIfReady);

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!prayerStoreHydrated.current) {
      return;
    }

    if (latitude == null || longitude == null) {
      return;
    }

    void syncPrayerNotifications();
  }, [
    latitude,
    longitude,
    calculationMethod,
    asrMethod,
    prayerNotifications,
    prayerTimeAdjustments,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const wasInactive =
        previousAppState.current === "inactive" ||
        previousAppState.current === "background";
      const returnedToApp = wasInactive && nextAppState === "active";

      if (returnedToApp && prayerStoreHydrated.current) {
        void syncPrayerNotifications();
      }

      previousAppState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
};

export default NotificationInitializer;
