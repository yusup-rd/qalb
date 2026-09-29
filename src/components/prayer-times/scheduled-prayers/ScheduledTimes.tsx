import { formatDayMonth } from "@/lib/format";
import type { Prayer, SolarEvent } from "@/types/prayer";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import ScheduledPrayerRow from "./ScheduledPrayerRow";

interface ScheduledTimesProps {
  selectedDate: Date;
  prayers: Prayer[];
  sunriseEvent: SolarEvent | null;
  isToday: boolean;
  onPrayerPress: (prayer: Prayer | SolarEvent) => void;
}

const ScheduledTimes = ({
  selectedDate,
  prayers,
  sunriseEvent,
  isToday,
  onPrayerPress,
}: ScheduledTimesProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.schedule",
  });

  const title = isToday
    ? t("todayTitle")
    : t("title", {
        date: formatDayMonth(selectedDate),
      });

  const displayItems: (Prayer | SolarEvent)[] = [];

  prayers.forEach((prayer) => {
    displayItems.push(prayer);

    if (prayer.name === "Fajr" && sunriseEvent) {
      displayItems.push(sunriseEvent);
    }
  });

  return (
    <View className="gap-2">
      <Text className="font-sans-semibold text-foreground text-lg">
        {title}
      </Text>

      <View className="bg-card overflow-hidden rounded-xl shadow-md">
        {displayItems.map((item, index) => (
          <ScheduledPrayerRow
            key={item.name}
            prayer={item}
            onPress={() => onPrayerPress(item)}
            showBorder={index < displayItems.length - 1}
          />
        ))}
      </View>
    </View>
  );
};

export default ScheduledTimes;
