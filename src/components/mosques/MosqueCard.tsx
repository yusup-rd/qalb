import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import type { NearbyMosque } from "@/hooks/useNearbyMosques";
import { formatDistance, formatDuration } from "@/lib/format";
import type { Route } from "@/types/routing";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

interface MosqueCardProps {
  mosque: NearbyMosque;
  selected: boolean;
  onPress: () => void;
  onDirectionsPress: () => void;
  routeLoading: boolean;
  routeMetricsLoading: boolean;
  route: Route | null;
}

const MosqueCard = ({
  mosque,
  selected,
  onPress,
  onDirectionsPress,
  routeLoading,
  routeMetricsLoading,
  route,
}: MosqueCardProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "mosques.card",
  });
  const { t: tUnits, i18n } = useTranslation(undefined, {
    keyPrefix: "units",
  });

  const distanceMeters = route
    ? route.distanceMeters
    : (mosque.drivingDistanceMeters ?? mosque.distanceMeters);

  const distance = Number.isFinite(distanceMeters)
    ? formatDistance(distanceMeters, i18n.language)
    : null;

  const durationSeconds = route
    ? route.durationSeconds
    : mosque.durationSeconds;

  const validDurationSeconds = Number.isFinite(durationSeconds)
    ? durationSeconds
    : null;

  return (
    <SmoothPressable
      onPress={onPress}
      className={clsx(
        "gap-2 rounded-xl border p-4",
        selected ? "bg-primary-soft border-primary" : "bg-card border-border",
      )}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={clsx(
            "size-11 items-center justify-center rounded-full",
            selected ? "bg-primary" : "bg-primary-soft",
          )}
        >
          <Fa
            name="mosque"
            size={20}
            className={clsx(
              selected
                ? "text-primary-foreground"
                : "text-primary-soft-foreground",
            )}
          />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text
              className={clsx(
                "font-sans-semibold flex-1",
                selected ? "text-primary" : "text-foreground",
              )}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {mosque.name}
            </Text>

            {mosque.isClosest ? (
              <View className="bg-secondary-soft items-center justify-center rounded-full px-3 py-1">
                <Text className="font-sans-semibold text-secondary-soft-foreground text-xs">
                  {t("closest")}
                </Text>
              </View>
            ) : null}
          </View>

          {mosque.street ? (
            <Text className="font-sans-regular text-muted-foreground text-sm">
              {mosque.street}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        {validDurationSeconds !== null ? (
          <>
            <View className="flex-row items-center gap-1">
              <Fa name="car" size={12} className="text-muted-foreground" />

              <Text className="font-sans-medium text-muted-foreground text-sm">
                {formatDuration(validDurationSeconds * 1000)}
              </Text>
            </View>

            <View className="bg-muted-foreground size-1 rounded-full" />
          </>
        ) : routeMetricsLoading ? (
          <Text className="font-sans-medium text-muted-foreground text-sm">
            {t("calculating")}
          </Text>
        ) : null}

        {distance ? (
          <Text className="font-sans-regular text-muted-foreground text-sm">
            {distance.value} {tUnits(`${distance.unit}`)}
          </Text>
        ) : null}
      </View>

      <SmoothPressable
        onPress={onDirectionsPress}
        disabled={routeLoading}
        className={clsx(
          "flex-row items-center justify-center gap-2 rounded-lg px-4 py-3",
          selected ? "bg-primary" : "bg-muted",
          routeLoading && "opacity-70",
        )}
      >
        {routeLoading ? (
          <ActivityIndicator size="small" className="text-primary" />
        ) : (
          <Fa
            name="diamond-turn-right"
            size={16}
            className={selected ? "text-primary-foreground" : "text-primary"}
          />
        )}

        <Text
          className={clsx(
            "font-sans-semibold",
            selected ? "text-primary-foreground" : "text-primary",
          )}
        >
          {routeLoading ? t("loading") : t("directions")}
        </Text>
      </SmoothPressable>
    </SmoothPressable>
  );
};

export default MosqueCard;
