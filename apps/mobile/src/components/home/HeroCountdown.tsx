import useQiblaBearing from "@/hooks/useQiblaBearing";
import { degreesToCompassLabel } from "@/lib/qibla-calculations";
import type { Prayer } from "@/types/prayer";
import {
  FontAwesome6 as Fa,
  MaterialCommunityIcons as Mi,
} from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

interface HeroCountdownProps {
  previousPrayer: Prayer | null;
  nextPrayer: Prayer | null;
  countdown: string;
  elapsedPercent: number;
  solarEvent: {
    label: "Sunrise" | "Sunset";
    remainingFormatted: string;
  } | null;
}

const HeroCountdown = ({
  previousPrayer,
  nextPrayer,
  countdown,
  elapsedPercent,
  solarEvent,
}: HeroCountdownProps) => {
  const { t } = useTranslation(undefined, { keyPrefix: "home.hero" });
  const { t: tPrayer } = useTranslation(undefined, {
    keyPrefix: "prayers",
  });
  const { t: tCompass } = useTranslation(undefined, { keyPrefix: "compass" });

  const qibla = useQiblaBearing();

  const qiblaDegrees = qibla ? Math.round(qibla.bearing) : null;
  const qiblaDirection = qibla
    ? tCompass(degreesToCompassLabel(qibla.bearing).toLowerCase())
    : null;
  const qiblaLabel = qibla ? `${qiblaDegrees}° ${qiblaDirection}` : null;

  if (!nextPrayer || !previousPrayer || !solarEvent) {
    return (
      <View className="bg-primary relative overflow-hidden rounded-xl p-6 shadow-md">
        <View className="pointer-events-none absolute -top-12 -right-5 opacity-10">
          <Fa name="star-and-crescent" size={224} color="white" />
        </View>

        <View className="relative gap-2">
          <Text className="font-sans-semibold text-primary-foreground text-lg">
            {t("unavailable.title")}
          </Text>

          <Text className="text-primary-foreground/80 font-sans text-sm">
            {t("unavailable.description")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-primary relative overflow-hidden rounded-xl p-6 shadow-md">
      <View className="pointer-events-none absolute -top-12 -right-5 opacity-10">
        <Fa name="star-and-crescent" size={224} color="white" />
      </View>

      <View className="relative gap-2">
        <View className="flex-row items-center justify-between gap-3">
          <View className="bg-background/10 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1">
            <View className="bg-secondary size-2 animate-pulse rounded-full" />

            <Text className="font-sans-semibold text-primary-foreground">
              {t("nextPrayer")}
            </Text>
          </View>

          <Text className="font-sans-semibold text-primary-foreground/80 text-xs">
            {tPrayer(nextPrayer.name.toLowerCase())} •{" "}
            {nextPrayer.formattedTime}
          </Text>
        </View>

        <View>
          <Text className="text-primary-foreground/80 font-sans text-xs">
            {t("timeRemaining")}
          </Text>

          <Text className="font-sans-semibold text-primary-foreground text-3xl tabular-nums">
            {countdown}
          </Text>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-semibold text-primary-foreground/80 text-xs">
              {tPrayer(previousPrayer.name.toLowerCase())} (
              {previousPrayer.formattedTime})
            </Text>

            <Text className="font-sans-semibold text-secondary text-xs">
              {t("percentElapsed", { percent: Math.round(elapsedPercent) })}
            </Text>

            <Text className="font-sans-semibold text-primary-foreground/80 text-xs">
              {tPrayer(nextPrayer.name.toLowerCase())}
            </Text>
          </View>

          <View className="bg-primary-foreground/20 h-2 w-full overflow-hidden rounded-full">
            <View
              className="bg-secondary h-full rounded-full"
              style={{
                width: `${elapsedPercent}%`,
              }}
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between pt-2">
          <View className="flex-row gap-1.5">
            <Mi name="weather-sunset" size={14} className="text-secondary" />

            <Text className="text-primary-foreground/80 font-sans text-xs">
              {t("solarEventIn", {
                label: tPrayer(solarEvent.label.toLowerCase()),
                time: solarEvent.remainingFormatted,
              })}
            </Text>
          </View>

          {qiblaLabel && (
            <Text className="font-sans-semibold text-primary-foreground text-xs">
              {t("qiblaAt", {
                degrees: qiblaDegrees,
                direction: qiblaDirection,
              })}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default HeroCountdown;
