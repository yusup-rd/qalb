import { formatDayMonth, formatDuration, formatTime } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import DayScene from "./scenes/DayScene";
import NightScene from "./scenes/NightScene";

interface DaylightArcProps {
  sunrise: Date;
  sunset: Date;
  now: Date;
  isToday: boolean;
  selectedDate: Date;
}

const DaylightArc = ({
  sunrise,
  sunset,
  now,
  isToday,
  selectedDate,
}: DaylightArcProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.daylightArc",
  });

  const sunriseTime = sunrise.getTime();
  const sunsetTime = sunset.getTime();
  const nowTime = now.getTime();

  const daylightDuration = sunsetTime - sunriseTime;

  const rawProgress =
    daylightDuration > 0 ? (nowTime - sunriseTime) / daylightDuration : 0;

  const isBeforeSunrise = nowTime < sunriseTime;
  const isAfterSunset = nowTime > sunsetTime;
  const isDaytime = !isBeforeSunrise && !isAfterSunset;

  const progress = Math.min(1, Math.max(0, rawProgress));
  const remainingDaylight = Math.max(0, sunsetTime - nowTime);
  const daylightProgress = Math.min(100, Math.max(0, progress * 100));

  /*
   * Other dates
   */
  if (!isToday) {
    return (
      <View className="bg-card rounded-2xl p-5 shadow-md">
        <View className="gap-1">
          <Text className="font-sans-semibold text-foreground text-base">
            {t("titleWithDate", {
              date: formatDayMonth(selectedDate),
            })}
          </Text>

          <Text className="text-muted-foreground font-sans text-xs">
            {t("description")}
          </Text>
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <View className="gap-0.5">
            <Text className="text-muted-foreground font-sans text-xs">
              {t("sunrise")}
            </Text>

            <Text className="font-sans-semibold text-foreground text-base">
              {formatTime(sunrise)}
            </Text>
          </View>

          <View className="items-center gap-0.5">
            <Text className="text-muted-foreground font-sans text-xs">
              {t("daylight")}
            </Text>

            <Text className="font-sans-semibold text-primary text-base">
              {formatDuration(daylightDuration)}
            </Text>
          </View>

          <View className="items-end gap-0.5">
            <Text className="text-muted-foreground font-sans text-xs">
              {t("sunset")}
            </Text>

            <Text className="font-sans-semibold text-foreground text-base">
              {formatTime(sunset)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  /*
   * Today
   */
  return (
    <View className="bg-card rounded-2xl p-5 shadow-md">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="gap-1">
          <Text className="font-sans-semibold text-foreground text-base">
            {t("title")}
          </Text>

          <Text className="text-muted-foreground font-sans text-xs">
            {t("description")}
          </Text>
        </View>

        <View className="bg-primary-soft rounded-full px-3 py-1.5">
          <Text className="font-sans-semibold text-primary text-xs">
            {isDaytime
              ? `${Math.round(daylightProgress)}%`
              : isBeforeSunrise
                ? t("beforeSunrise")
                : t("afterSunset")}
          </Text>
        </View>
      </View>

      {/* Day / Night illustration */}
      <View className="mt-5">
        {isDaytime ? <DayScene progress={progress} /> : <NightScene />}
      </View>

      {/* Sunrise / Sunset */}
      <View className="mt-3 flex-row justify-between px-1">
        <View className="gap-0.5">
          <Text className="font-sans-semibold text-foreground text-sm">
            {formatTime(sunrise)}
          </Text>

          <Text className="text-muted-foreground font-sans text-xs">
            {t("sunrise")}
          </Text>
        </View>

        <View className="items-end gap-0.5">
          <Text className="font-sans-semibold text-foreground text-sm">
            {formatTime(sunset)}
          </Text>

          <Text className="text-muted-foreground font-sans text-xs">
            {t("sunset")}
          </Text>
        </View>
      </View>

      {/* Current information */}
      <View className="border-border mt-4 flex-row items-center justify-between border-t pt-4">
        <View className="gap-0.5">
          <Text className="text-muted-foreground font-sans text-xs">
            {t("currentTime")}
          </Text>

          <Text className="font-sans-semibold text-foreground text-sm">
            {formatTime(now)}
          </Text>
        </View>

        <View className="items-end gap-0.5">
          <Text className="text-muted-foreground font-sans text-xs">
            {isDaytime
              ? t("daylightRemaining")
              : isBeforeSunrise
                ? t("untilSunrise")
                : t("daylightEnded")}
          </Text>

          {isDaytime || isBeforeSunrise ? (
            <Text className="font-sans-semibold text-primary text-sm">
              {formatDuration(
                isBeforeSunrise ? sunriseTime - nowTime : remainingDaylight,
              )}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default DaylightArc;
