import { usePrayerTimesData } from "@/hooks/usePrayerTimes";
import { formatDate, formatHijriDate } from "@/lib/format";
import { useLocationStore } from "@/store/locationStore";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

const DateWithLocation = () => {
  const today = new Date();

  const { t, i18n } = useTranslation(undefined, {
    keyPrefix: "home.dateLocation",
  });

  const { now, sunset } = usePrayerTimesData();

  const isAfterSunset = sunset != null && now.getTime() >= sunset.getTime();
  const locationName = useLocationStore((state) => state.locationName);
  const locationNameStatus = useLocationStore(
    (state) => state.locationNameStatus,
  );

  return (
    <View>
      <View className="flex-row items-center gap-1">
        <Fa name="location-dot" className="text-primary size-3" />

        <Text
          className="text-muted-foreground font-sans-semibold text-xs"
          numberOfLines={1}
        >
          {locationNameStatus === "loading"
            ? t("loading")
            : (locationName ?? t("unavailable"))}
        </Text>

        <View className="bg-muted-foreground/50 size-1 rounded-full" />

        <Text className="font-sans-semibold text-secondary text-xs">
          {formatHijriDate(today, i18n.language, isAfterSunset)}
        </Text>
      </View>

      <Text className="font-sans-semibold text-foreground text-lg">
        {formatDate(today, i18n.language, "long")}
      </Text>
    </View>
  );
};

export default memo(DateWithLocation);
