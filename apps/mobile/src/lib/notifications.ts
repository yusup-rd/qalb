import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const NOTIFICATION_CHANNEL_ID = "prayer-times";

interface ScheduleNotificationInput {
  title: string;
  body: string;
  date: Date;
  data?: Record<string, unknown>;
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

export async function scheduleNotification({
  title,
  body,
  date,
  data,
}: ScheduleNotificationInput) {
  if (date <= new Date()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
}

export async function cancelAllPrayerNotifications() {
  const scheduledNotifications =
    await Notifications.getAllScheduledNotificationsAsync();

  const prayerNotifications = scheduledNotifications.filter(
    (notification) => notification.content.data?.type === "prayer-time",
  );

  await Promise.all(
    prayerNotifications.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );
}
