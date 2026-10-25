import { requestNotificationPermissions } from "@/lib/notifications";
import { usePrayerStore } from "@/store/prayerStore";
import type { Prayer, PrayerTimeAdjustment, SolarEvent } from "@/types/prayer";
import { useState } from "react";

export function usePrayerTimeSettings() {
  const prayerNotifications = usePrayerStore(
    (state) => state.prayerNotifications,
  );
  const prayerTimeAdjustments = usePrayerStore(
    (state) => state.prayerTimeAdjustments,
  );
  const setPrayerNotification = usePrayerStore(
    (state) => state.setPrayerNotification,
  );
  const setPrayerTimeAdjustment = usePrayerStore(
    (state) => state.setPrayerTimeAdjustment,
  );

  const [visible, setVisible] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<
    Prayer | SolarEvent | null
  >(null);

  const open = (prayer: Prayer | SolarEvent) => {
    setSelectedPrayer(prayer);
    setVisible(true);
  };

  const close = () => {
    setVisible(false);
  };

  const handleNotificationEnabledChange = async (enabled: boolean) => {
    if (!selectedPrayer) {
      return;
    }

    const prayerName = selectedPrayer.name;

    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        return;
      }
    }

    const currentSettings =
      usePrayerStore.getState().prayerNotifications[prayerName];

    setPrayerNotification(prayerName, {
      enabled,
      minutesBefore: currentSettings.minutesBefore,
    });
  };

  const handleNotificationMinutesChange = (minutes: number) => {
    if (!selectedPrayer) {
      return;
    }

    const currentSettings = prayerNotifications[selectedPrayer.name];

    setPrayerNotification(selectedPrayer.name, {
      enabled: currentSettings.enabled,
      minutesBefore: minutes,
    });
  };

  const handleAdjustmentChange = (adjustment: PrayerTimeAdjustment) => {
    if (!selectedPrayer || selectedPrayer.name === "Sunrise") {
      return;
    }

    setPrayerTimeAdjustment(selectedPrayer.name, adjustment);
  };

  const selectedPrayerNotification = selectedPrayer
    ? prayerNotifications[selectedPrayer.name]
    : null;

  const selectedPrayerAdjustment =
    selectedPrayer && selectedPrayer.name !== "Sunrise"
      ? prayerTimeAdjustments[selectedPrayer.name]
      : null;

  return {
    visible,
    selectedPrayer,
    selectedPrayerNotification,
    selectedPrayerAdjustment,
    open,
    close,
    handleNotificationEnabledChange,
    handleNotificationMinutesChange,
    handleAdjustmentChange,
  };
}
