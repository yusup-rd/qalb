import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const NOTIFICATION_CHANNEL_ID = "prayer-times";
const PRAYER_NOTIFICATION_TYPE = "prayer-time";

interface SchedulePrayerNotificationInput {
  prayerName: string;
  prayerTime: Date;
  minutesBefore: number;
}

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function setupNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: "Prayer times",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function requestNotificationPermissions() {
  await setupNotificationChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === Notifications.PermissionStatus.GRANTED) {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();

  return status === Notifications.PermissionStatus.GRANTED;
}

export async function hasNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();

  return status === Notifications.PermissionStatus.GRANTED;
}

export async function schedulePrayerNotification({
  prayerName,
  prayerTime,
  minutesBefore,
}: SchedulePrayerNotificationInput) {
  const notificationTime = new Date(
    prayerTime.getTime() - minutesBefore * 60 * 1000,
  );

  if (notificationTime <= new Date()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Sabr",
      body:
        minutesBefore === 0
          ? `${prayerName} time`
          : `${prayerName} in ${minutesBefore} minutes`,
      data: {
        type: PRAYER_NOTIFICATION_TYPE,
        prayerName,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notificationTime,
    },
  });
}

async function cancelNotification(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllPrayerNotifications() {
  const scheduledNotifications =
    await Notifications.getAllScheduledNotificationsAsync();

  const prayerNotifications = scheduledNotifications.filter(
    (notification) =>
      notification.content.data?.type === PRAYER_NOTIFICATION_TYPE,
  );

  await Promise.all(
    prayerNotifications.map((notification) =>
      cancelNotification(notification.identifier),
    ),
  );
}
