import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { calculationMethods } from "@/constants/prayer-calculation";
import { useLocationStore } from "@/store/locationStore";
import type { AsrMethod, CalculationMethodId } from "@/types/prayer";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

interface PrayerCalculationSelectorProps {
  calculationMethod: CalculationMethodId;
  asrMethod: AsrMethod;
  onPress: () => void;
}

const PrayerCalculationSelector = ({
  calculationMethod,
  asrMethod,
  onPress,
}: PrayerCalculationSelectorProps) => {
  const { t: tMethod } = useTranslation(undefined, {
    keyPrefix: "prayerCalculationMethods.short",
  });
  const { t: tAsr } = useTranslation(undefined, {
    keyPrefix: "asrMethods.short",
  });
  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes",
  });

  const locationName = useLocationStore((state) => state.locationName);
  const locationNameStatus = useLocationStore(
    (state) => state.locationNameStatus,
  );

  const method = calculationMethods.find(
    (item) => item.id === calculationMethod,
  );

  const calculationMethodLabel = method ? tMethod(method.key) : "—";

  const asrLabel = tAsr(asrMethod);

  return (
    <SmoothPressable
      onPress={onPress}
      className="bg-card rounded-2xl px-4 py-3.5 shadow-md"
    >
      <View className="flex-row items-center gap-2">
        <Fa name="location-dot" size={12} className="text-primary" />

        <Text
          className="text-muted-foreground font-sans-medium flex-1 text-xs"
          numberOfLines={1}
        >
          {locationNameStatus === "loading"
            ? t("location.loading")
            : (locationName ?? t("location.unavailable"))}
        </Text>

        <Fa name="chevron-right" size={11} className="text-muted-foreground" />
      </View>

      <View className="bg-border my-3 h-px" />

      <View className="flex-row">
        <View className="flex-1">
          <Text className="text-muted-foreground font-sans-medium text-xs">
            {t("prayerCalculation.calculationMethod")}
          </Text>

          <Text
            className="text-foreground font-sans-semibold mt-1 text-sm"
            numberOfLines={1}
          >
            {calculationMethodLabel}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-muted-foreground font-sans-medium text-xs">
            {t("prayerCalculation.asrMethod")}
          </Text>

          <Text className="text-foreground font-sans-semibold mt-1 text-sm">
            {asrLabel}
          </Text>
        </View>
      </View>
    </SmoothPressable>
  );
};

export default PrayerCalculationSelector;
