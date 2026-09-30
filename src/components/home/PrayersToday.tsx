import { calculationMethods } from "@/constants/prayer-calculation";
import { usePrayerStore } from "@/store/prayerStore";
import type { Prayer, SolarEvent } from "@/types/prayer";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import InfoSection from "../ui/InfoSection";
import PrayerCard from "./PrayerCard";

interface PrayersTodayProps {
  prayers: Prayer[];
  sunriseEvent: SolarEvent | null;
  isSunriseCompleted: boolean;
  onPrayerPress: (prayer: Prayer | SolarEvent) => void;
}

const PrayersToday = ({
  prayers,
  sunriseEvent,
  isSunriseCompleted,
  onPrayerPress,
}: PrayersTodayProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "home.prayersToday",
  });
  const { t: tAsr } = useTranslation(undefined, {
    keyPrefix: "asrMethods.short",
  });
  const { t: tMethod } = useTranslation(undefined, {
    keyPrefix: "prayerCalculationMethods.short",
  });
  const { t: tPrayer } = useTranslation(undefined, {
    keyPrefix: "prayers",
  });
  const { t: tDuration } = useTranslation(undefined, {
    keyPrefix: "duration",
  });

  const { calculationMethod, asrMethod, prayerTimeAdjustments } =
    usePrayerStore();

  const calculationMethodOption = calculationMethods.find(
    (method) => method.id === calculationMethod,
  );

  const calculationMethodLabel = calculationMethodOption
    ? tMethod(calculationMethodOption.key)
    : calculationMethod;

  const asrLabel = tAsr(asrMethod);

  const handleSettingsPress = () => {
    router.push("/prayer-times");
  };

  const displayItems: (Prayer | SolarEvent)[] = [];

  prayers.forEach((prayer) => {
    displayItems.push(prayer);

    if (prayer.name === "Fajr" && sunriseEvent) {
      displayItems.push(sunriseEvent);
    }
  });

  const adjustedPrayers = prayers.filter(
    (prayer) => prayerTimeAdjustments[prayer.name]?.mode !== "none",
  );

  const infoMessage =
    adjustedPrayers.length === 0
      ? t("info")
      : t("manualAdjustmentInfo", {
          adjustments: adjustedPrayers
            .map((prayer) => {
              const adjustment = prayerTimeAdjustments[prayer.name];

              if (!adjustment) {
                return null;
              }

              const prayerLabel = tPrayer(prayer.name.toLowerCase());

              if (adjustment.mode === "fixed") {
                return t("manualAdjustment.fixed", {
                  prayer: prayerLabel,
                  time: adjustment.fixedTime,
                });
              }

              if (adjustment.mode === "offset") {
                const minutes = Math.abs(adjustment.offsetMinutes);
                const direction = adjustment.offsetMinutes >= 0 ? "+" : "-";

                return t("manualAdjustment.offset", {
                  prayer: prayerLabel,
                  offset: `${direction}${tDuration("minute", {
                    count: minutes,
                  })}`,
                });
              }

              return null;
            })
            .filter(Boolean)
            .join(", "),
        });

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-sans-semibold text-foreground text-lg">
          {t("title")}
        </Text>

        <Pressable
          onPress={handleSettingsPress}
          className="flex-row items-center gap-1.5 rounded-md p-1 active:opacity-75"
          accessibilityLabel={t("settingsAccessibilityLabel", {
            asrLabel,
            calculationMethodLabel,
          })}
        >
          <Text className="font-sans-semibold text-muted-foreground text-xs">
            {asrLabel} ({calculationMethodLabel})
          </Text>

          <Fa name="sliders" size={13} className="text-muted-foreground" />
        </Pressable>
      </View>

      <InfoSection message={infoMessage} collapsible />

      <View className="gap-2">
        {displayItems.map((item) => (
          <PrayerCard
            key={item.name}
            prayer={item}
            isSunriseCompleted={
              item.name === "Sunrise" ? isSunriseCompleted : false
            }
            onPress={onPrayerPress}
          />
        ))}
      </View>
    </View>
  );
};

export default PrayersToday;
