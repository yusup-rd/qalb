import { formatDistance } from "@/lib/format";
import { degreesToCompassLabel } from "@/lib/qibla-calculations";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

interface CompassReadoutProps {
  bearing: number;
  distance: number;
  heading: number;
}

const CompassReadout = ({
  bearing,
  distance,
  heading,
}: CompassReadoutProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "qibla.readout",
  });
  const { t: tCompass } = useTranslation(undefined, {
    keyPrefix: "compass",
  });
  const { t: tUnits } = useTranslation(undefined, {
    keyPrefix: "units",
  });

  const qiblaDirection = degreesToCompassLabel(bearing);
  const facingDirection = degreesToCompassLabel(heading);

  const qiblaDirectionLabel = tCompass(qiblaDirection.toLowerCase());
  const facingDirectionLabel = tCompass(facingDirection.toLowerCase());

  const distanceFormatted = formatDistance(distance * 1000);

  return (
    <View className="bg-card w-full flex-row items-center justify-between rounded-xl p-4 shadow-md">
      <View className="flex-1 items-center gap-1">
        <Text className="font-sans-semibold text-foreground text-base">
          {t("qibla")}
        </Text>

        <View className="flex-row items-center gap-1">
          <Text className="font-sans-medium text-muted-foreground text-sm">
            {Math.round(bearing)}° {qiblaDirectionLabel}
          </Text>

          <Text className="text-muted-foreground text-sm">•</Text>

          <Text className="font-sans-medium text-muted-foreground text-sm">
            {distanceFormatted.value} {tUnits(`${distanceFormatted.unit}`)}
          </Text>
        </View>
      </View>

      <View className="bg-border h-10 w-px" />

      <View className="flex-1 items-center gap-1">
        <Text className="font-sans-semibold text-foreground text-base">
          {t("facing")}
        </Text>

        <Text className="font-sans-medium text-muted-foreground text-sm">
          {Math.round(heading)}° {facingDirectionLabel}
        </Text>
      </View>
    </View>
  );
};

export default CompassReadout;
