import { usePrayerStore } from "@/store/prayerStore";
import type { Prayer, SolarEvent } from "@/types/prayer";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

interface PrayerCardProps {
  prayer: Prayer | SolarEvent;
  isSunriseCompleted?: boolean;
  onPress: (prayer: Prayer | SolarEvent) => void;
}

const PrayerCard = ({
  prayer,
  isSunriseCompleted = false,
  onPress,
}: PrayerCardProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "home.prayersToday",
  });
  const { t: tPrayer } = useTranslation(undefined, {
    keyPrefix: "prayers",
  });

  const notificationEnabled = usePrayerStore(
    (state) => state.prayerNotifications[prayer.name].enabled,
  );

  const isSolarEvent = prayer.name === "Sunrise";
  const isSoon = !isSolarEvent && prayer.status === "soon";

  const isCompleted = isSolarEvent
    ? isSunriseCompleted
    : prayer.status === "completed";

  return (
    <Pressable
      onPress={() => onPress(prayer)}
      className="bg-card flex-row items-center justify-between gap-2 rounded-xl p-3.5 shadow-md active:opacity-70"
    >
      <View className="flex-row items-center gap-3">
        <View
          className={clsx(
            "size-8 items-center justify-center rounded-full",
            isSoon ? "bg-secondary/30" : "bg-background/70",
          )}
        >
          {isSolarEvent ? (
            <Feather
              name="sunrise"
              size={16}
              className="text-muted-foreground"
            />
          ) : (
            <Ionicons
              name={prayer.icon}
              size={16}
              className={clsx(
                isSoon
                  ? "text-secondary-soft-foreground"
                  : "text-muted-foreground",
              )}
            />
          )}
        </View>

        <View className={clsx(isSolarEvent ? "justify-center" : "gap-0.5")}>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-sans-semibold text-foreground text-sm">
              {tPrayer(prayer.name.toLowerCase())}
            </Text>

            {isSoon && <View className="bg-secondary size-1.5 rounded-full" />}

            {notificationEnabled && (
              <Ionicons
                name="notifications"
                size={13}
                className="text-muted-foreground"
              />
            )}
          </View>

          {!isSolarEvent && (
            <Text
              className={clsx(
                "text-xs",
                isSoon
                  ? "text-secondary font-sans-semibold"
                  : "text-muted-foreground font-sans",
              )}
            >
              {isSoon
                ? t("nextIn", {
                    time: prayer.remainingFormatted,
                  })
                : tPrayer(prayer.description.toLowerCase())}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        <Text
          className={clsx(
            isSoon
              ? "font-sans-bold text-primary text-lg"
              : "font-sans-medium text-foreground text-sm",
          )}
        >
          {prayer.formattedTime}
        </Text>

        <View
          className={clsx(
            "size-6 items-center justify-center rounded-full",
            isSoon
              ? "bg-secondary/30"
              : isCompleted
                ? "bg-success/30"
                : "bg-background/70",
          )}
        >
          {isCompleted ? (
            <MaterialIcons name="check" size={13} className="text-success" />
          ) : (
            <MaterialIcons
              name={isSoon ? "notifications-active" : "notifications"}
              size={13}
              className={clsx(
                isSoon
                  ? "text-secondary-soft-foreground"
                  : "text-muted-foreground",
              )}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default PrayerCard;
