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

  const { calculationMethod, asrMethod } = usePrayerStore();

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

      <InfoSection message={t("info")} collapsible />

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
