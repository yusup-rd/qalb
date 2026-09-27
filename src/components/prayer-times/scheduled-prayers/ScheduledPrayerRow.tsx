import { usePrayerStore } from "@/store/prayerStore";
import type { Prayer } from "@/types/prayer";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

interface ScheduledPrayerRowProps {
  prayer: Prayer;
  onPress: () => void;
  showBorder: boolean;
}

const ScheduledPrayerRow = ({
  prayer,
  showBorder,
  onPress,
}: ScheduledPrayerRowProps) => {
  const { t: tPrayer } = useTranslation(undefined, {
    keyPrefix: "prayers",
  });
  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.schedule.notification",
  });

  const notificationSettings = usePrayerStore(
    (state) => state.prayerNotifications[prayer.name],
  );

  const prayerKey = prayer.name.toLowerCase();
  const descriptionKey = prayer.description.toLowerCase();

  const getNotificationLabel = () => {
    if (!notificationSettings.enabled) {
      return t("status.off");
    }

    if (notificationSettings.minutesBefore === 0) {
      return t("status.atTime");
    }

    return t("status.minutesBefore", {
      count: notificationSettings.minutesBefore,
    });
  };

  const notificationLabel = getNotificationLabel();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("accessibility.settings", {
        prayer: tPrayer(prayerKey),
      })}
      className={clsx(
        "active:bg-muted flex-row items-center justify-between px-4 py-3.5",
        showBorder && "border-border border-b",
      )}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        <View className="bg-muted size-9 shrink-0 items-center justify-center rounded-full">
          <Ionicons name={prayer.icon} size={16} className="text-primary" />
        </View>

        <View className="min-w-0 flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text className="font-sans-semibold text-foreground text-sm">
              {tPrayer(prayerKey)}
            </Text>

            <View className="flex-row items-center gap-1">
              <Ionicons
                name={
                  notificationSettings.enabled
                    ? "notifications"
                    : "notifications-off"
                }
                size={12}
                className={
                  notificationSettings.enabled
                    ? "text-primary"
                    : "text-muted-foreground"
                }
              />

              <Text
                className={
                  notificationSettings.enabled
                    ? "font-sans-medium text-primary text-xs"
                    : "text-muted-foreground font-sans text-xs"
                }
              >
                {notificationLabel}
              </Text>
            </View>
          </View>

          <Text
            className="text-muted-foreground font-sans text-xs"
            numberOfLines={1}
          >
            {tPrayer(descriptionKey)}
          </Text>
        </View>
      </View>

      <View className="ml-3 flex-row items-center gap-3">
        <Text className="font-sans-semibold text-foreground text-base">
          {prayer.formattedTime}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={14}
          className="text-muted-foreground"
        />
      </View>
    </Pressable>
  );
};

export default ScheduledPrayerRow;
