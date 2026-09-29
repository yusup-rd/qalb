import { usePrayerStore } from "@/store/prayerStore";
import type { Prayer, SolarEvent } from "@/types/prayer";
import { Feather, Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

interface ScheduledPrayerRowProps {
  prayer: Prayer | SolarEvent;
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

  const isSolarEvent = prayer.name === "Sunrise";
  const prayerKey = prayer.name.toLowerCase();
  const descriptionKey = !isSolarEvent
    ? prayer.description.toLowerCase()
    : null;

  const getNotificationLabel = () => {
    if (!notificationSettings.enabled) {
      return t("status.off");
    }

    if (notificationSettings.minutesBefore === 0) {
      return isSolarEvent ? t("status.solarEventAtTime") : t("status.atTime");
    }

    return t("status.minutesBefore", {
      count: notificationSettings.minutesBefore,
    });
  };

  const notificationLabel = getNotificationLabel();

  const accessibilityLabel = isSolarEvent
    ? t("accessibility.solarEventSettings", {
        prayer: tPrayer(prayerKey),
      })
    : t("accessibility.settings", {
        prayer: tPrayer(prayerKey),
      });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={clsx(
        "active:bg-muted flex-row items-center justify-between px-4 py-3.5",
        showBorder && "border-border border-b",
      )}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        <View className="bg-muted size-9 shrink-0 items-center justify-center rounded-full">
          {isSolarEvent ? (
            <Feather name="sunrise" size={16} className="text-primary" />
          ) : (
            <Ionicons name={prayer.icon} size={16} className="text-primary" />
          )}
        </View>

        <View className={clsx("min-w-0 flex-1", !isSolarEvent && "gap-0.5")}>
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
                className={clsx(
                  notificationSettings.enabled
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />

              <Text
                className={clsx(
                  "text-xs",
                  notificationSettings.enabled
                    ? "font-sans-medium text-primary"
                    : "text-muted-foreground font-sans",
                )}
              >
                {notificationLabel}
              </Text>
            </View>
          </View>

          {!isSolarEvent && descriptionKey && (
            <Text
              className="text-muted-foreground font-sans text-xs"
              numberOfLines={1}
            >
              {tPrayer(descriptionKey)}
            </Text>
          )}
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
