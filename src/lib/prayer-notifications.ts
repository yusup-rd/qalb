import i18n from "@/i18n";
import {
  cancelAllPrayerNotifications,
  hasNotificationPermissions,
  scheduleNotification,
} from "@/lib/notifications";
import { calculatePrayerTimes } from "@/lib/prayer-calculations";
import { applyPrayerTimeAdjustment } from "@/lib/prayer-time-adjustments";
import { useLocationStore } from "@/store/locationStore";
import { usePrayerStore } from "@/store/prayerStore";
import type { PrayerName, PrayerNotificationName } from "@/types/prayer";

const NOTIFICATION_DAYS = 7;
const PRAYER_NOTIFICATION_TYPE = "prayer-time";

function getPrayerTime(
  name: PrayerName,
  times: ReturnType<typeof calculatePrayerTimes>,
) {
  switch (name) {
    case "Fajr":
      return times.fajr;
    case "Dhuhr":
      return times.dhuhr;
    case "Asr":
      return times.asr;
    case "Maghrib":
      return times.maghrib;
    case "Isha":
      return times.isha;
  }
}

function getStartDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
}

function getDateForDay(startDate: Date, dayOffset: number) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayOffset);

  return date;
}

function getAdjustedPrayerTime(
  prayerName: PrayerNotificationName,
  date: Date,
  latitude: number,
  longitude: number,
  calculationMethod: Parameters<typeof calculatePrayerTimes>[3],
  asrMethod: Parameters<typeof calculatePrayerTimes>[4],
  prayerTimeAdjustments: ReturnType<
    typeof usePrayerStore.getState
  >["prayerTimeAdjustments"],
) {
  const times = calculatePrayerTimes(
    latitude,
    longitude,
    date,
    calculationMethod,
    asrMethod,
  );

  if (prayerName === "Sunrise") {
    return times.sunrise;
  }

  const calculatedTime = getPrayerTime(prayerName, times);

  return applyPrayerTimeAdjustment(
    calculatedTime,
    prayerTimeAdjustments[prayerName],
  );
}

function getNotificationTime(prayerTime: Date, minutesBefore: number) {
  return new Date(prayerTime.getTime() - minutesBefore * 60 * 1000);
}

function getPrayerNotificationContent(
  prayerName: PrayerNotificationName,
  minutesBefore: number,
) {
  const localizedPrayerName = i18n.t(`prayers.${prayerName.toLowerCase()}`);

  const body =
    minutesBefore === 0
      ? i18n.t("notifications.prayerTime.atTime", {
          prayer: localizedPrayerName,
        })
      : i18n.t("notifications.prayerTime.minutesBefore", {
          prayer: localizedPrayerName,
          duration: i18n.t("duration.minute", {
            count: minutesBefore,
          }),
        });

  return {
    title: i18n.t("notifications.prayerTime.title"),
    body,
  };
}

async function syncPrayerNotificationsInternal() {
  const { latitude, longitude } = useLocationStore.getState();
  const {
    calculationMethod,
    asrMethod,
    prayerNotifications,
    prayerTimeAdjustments,
  } = usePrayerStore.getState();

  await cancelAllPrayerNotifications();

  if (latitude == null || longitude == null) {
    return;
  }

  const hasPermission = await hasNotificationPermissions();

  if (!hasPermission) {
    return;
  }

  const startDate = getStartDate();

  for (let dayOffset = 0; dayOffset < NOTIFICATION_DAYS; dayOffset += 1) {
    const date = getDateForDay(startDate, dayOffset);

    for (const prayerName of Object.keys(
      prayerNotifications,
    ) as PrayerNotificationName[]) {
      const settings = prayerNotifications[prayerName];

      if (!settings.enabled) {
        continue;
      }

      const prayerTime = getAdjustedPrayerTime(
        prayerName,
        date,
        latitude,
        longitude,
        calculationMethod,
        asrMethod,
        prayerTimeAdjustments,
      );

      const notificationTime = getNotificationTime(
        prayerTime,
        settings.minutesBefore,
      );

      const { title, body } = getPrayerNotificationContent(
        prayerName,
        settings.minutesBefore,
      );

      await scheduleNotification({
        title,
        body,
        date: notificationTime,
        data: {
          type: PRAYER_NOTIFICATION_TYPE,
          prayerName,
        },
      });
    }
  }
}

let syncPromise = Promise.resolve();

export function syncPrayerNotifications() {
  syncPromise = syncPromise
    .catch(() => undefined)
    .then(syncPrayerNotificationsInternal)
    .catch((error) => {
      console.error("Failed to sync prayer notifications:", error);
    });

  return syncPromise;
}
