import { formatDuration, formatTime } from "@/lib/format";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import NightPortionsHeader from "./NightPortionsHeader";
import NightSummary from "./NightSummary";
import NightThirds from "./NightThirds";
import TahajjudSection from "./TahajjudSection";

interface NightPortionsProps {
  sunset: Date;
  fajr: Date;
  now: Date;
  isToday: boolean;
  selectedDate: Date;
}

const NightPortions = ({
  sunset,
  fajr,
  now,
  isToday,
  selectedDate,
}: NightPortionsProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.nightPortions",
  });

  const sunsetTime = sunset.getTime();
  const fajrTime = fajr.getTime();
  const nowTime = now.getTime();

  const nightDuration = fajrTime - sunsetTime;

  if (nightDuration <= 0) {
    return null;
  }

  const thirdDuration = nightDuration / 3;

  const firstThirdEnd = sunsetTime + thirdDuration;

  const secondThirdStart = firstThirdEnd;
  const secondThirdEnd = sunsetTime + thirdDuration * 2;

  const lastThirdStart = secondThirdEnd;
  const lastThirdEnd = fajrTime;

  const isBeforeNight = nowTime < sunsetTime;
  const isAfterNight = nowTime >= fajrTime;

  const isFirstThird =
    isToday && nowTime >= sunsetTime && nowTime < firstThirdEnd;

  const isSecondThird =
    isToday && nowTime >= secondThirdStart && nowTime < secondThirdEnd;

  const isLastThird =
    isToday && nowTime >= lastThirdStart && nowTime < lastThirdEnd;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const selectedDateStart = new Date(selectedDate);
  selectedDateStart.setHours(0, 0, 0, 0);

  const isPastDate =
    !isToday && selectedDateStart.getTime() < todayStart.getTime();

  const lastThirdHasBegun = isToday ? nowTime >= lastThirdStart : isPastDate;

  const lastThirdLabel = lastThirdHasBegun
    ? t("lastThirdBeganAt")
    : t("lastThirdBeginsAt");

  const status = (() => {
    if (!isToday) {
      return null;
    }

    if (isBeforeNight) {
      return {
        label: t("beforeNight"),
        className: "bg-muted",
        textClassName: "text-muted-foreground",
      };
    }

    if (isAfterNight) {
      return {
        label: t("nightEnded"),
        className: "bg-muted",
        textClassName: "text-muted-foreground",
      };
    }

    if (isLastThird) {
      return {
        label: t("lastThird"),
        className: "bg-primary-soft",
        textClassName: "text-primary",
      };
    }

    if (isSecondThird) {
      return {
        label: t("secondThird"),
        className: "bg-primary-soft",
        textClassName: "text-primary",
      };
    }

    if (isFirstThird) {
      return {
        label: t("firstThird"),
        className: "bg-primary-soft",
        textClassName: "text-primary",
      };
    }

    return null;
  })();

  return (
    <View className="bg-card gap-3 rounded-2xl p-5 shadow-md">
      <NightPortionsHeader
        isToday={isToday}
        selectedDate={selectedDate}
        status={status}
      />

      <NightSummary sunset={sunset} fajr={fajr} nightDuration={nightDuration} />

      <NightThirds
        sunset={sunset}
        fajr={fajr}
        firstThirdEnd={firstThirdEnd}
        secondThirdStart={secondThirdStart}
        secondThirdEnd={secondThirdEnd}
        lastThirdStart={lastThirdStart}
        isFirstThird={isFirstThird}
        isSecondThird={isSecondThird}
        isLastThird={isLastThird}
      />

      <View className="border-border flex-row items-center justify-between border-t pt-4">
        <View className="flex-1 gap-0.5">
          <Text className="text-muted-foreground font-sans text-xs">
            {lastThirdLabel}
          </Text>

          <Text className="font-sans-semibold text-foreground text-sm">
            {formatTime(new Date(lastThirdStart))}
          </Text>
        </View>

        <View className="items-end gap-0.5">
          <Text className="text-muted-foreground font-sans text-xs">
            {t("duration")}
          </Text>

          <Text className="font-sans-semibold text-primary text-sm">
            {formatDuration(lastThirdEnd - lastThirdStart)}
          </Text>
        </View>
      </View>

      {isToday && !isBeforeNight && !isAfterNight && (
        <Text className="text-muted-foreground text-center font-sans text-xs">
          {isLastThird
            ? t("lastThirdMessage")
            : t("lastThirdCountdown", {
                duration: formatDuration(lastThirdStart - nowTime),
              })}
        </Text>
      )}

      <TahajjudSection sunset={sunset} fajr={fajr} />
    </View>
  );
};

export default NightPortions;
