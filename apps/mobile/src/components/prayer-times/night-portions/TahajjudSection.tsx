import InfoSection from "@/components/ui/InfoSection";
import { formatDuration, formatTime } from "@/lib/format";
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

interface TahajjudSectionProps {
  sunset: Date;
  fajr: Date;
}

const TahajjudSection = ({ sunset, fajr }: TahajjudSectionProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.nightPortions",
  });

  const nightPrayerDuration = fajr.getTime() - sunset.getTime();

  return (
    <View className="border-border gap-3 border-t pt-4">
      <View className="flex-row items-start gap-3">
        <View className="bg-primary-soft h-9 w-9 items-center justify-center rounded-full">
          <AntDesign name="moon" size={17} className="text-primary" />
        </View>

        <View className="flex-1 gap-1">
          <Text className="font-sans-semibold text-foreground text-sm">
            {t("tahajjud")}
          </Text>

          <Text className="text-muted-foreground font-sans text-xs leading-5">
            {t("tahajjudDescription")}
          </Text>
        </View>
      </View>

      <View className="bg-muted rounded-xl px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 gap-0.5">
            <Text className="text-muted-foreground font-sans text-xs">
              {t("nightPrayerWindow")}
            </Text>

            <Text className="font-sans-semibold text-foreground text-sm">
              {formatTime(sunset)} – {formatTime(fajr)}
            </Text>
          </View>

          <View className="items-end gap-0.5">
            <Text className="text-muted-foreground font-sans text-xs">
              {t("duration")}
            </Text>

            <Text className="font-sans-semibold text-primary text-sm">
              {formatDuration(nightPrayerDuration)}
            </Text>
          </View>
        </View>
      </View>

      <InfoSection message={t("tahajjudInfo")} />
    </View>
  );
};

export default TahajjudSection;
