import type { NearbyMosque } from "@/hooks/useNearbyMosques";
import type { Route } from "@/types/routing";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, Text, View } from "react-native";
import MosqueCard from "./MosqueCard";

interface MosquesListProps {
  mosques: NearbyMosque[];
  radiusKm: number;
  selectedMosqueId: string | null;
  onSelectMosque: (mosqueId: string) => void;
  onRadiusPress: () => void;
  onDirectionsPress: (mosque: NearbyMosque) => void;
  routeLoading: boolean;
  routedMosqueId: string | null;
  route: Route | null;
}

const MosquesList = ({
  mosques,
  radiusKm,
  selectedMosqueId,
  onSelectMosque,
  onRadiusPress,
  onDirectionsPress,
  routeLoading,
  routedMosqueId,
  route,
}: MosquesListProps) => {
  const { t, i18n } = useTranslation(undefined, {
    keyPrefix: "mosques.list",
  });
  const kilometerUnit = i18n.t("units.kilometer");

  const listRef = useRef<FlatList<NearbyMosque>>(null);

  useEffect(() => {
    if (selectedMosqueId == null) return;

    const mosqueIndex = mosques.findIndex(
      (mosque) => mosque.id === selectedMosqueId,
    );

    if (mosqueIndex === -1) return;

    listRef.current?.scrollToIndex({
      index: mosqueIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, [selectedMosqueId, mosques]);

  const handleScrollToIndexFailed = ({
    index,
  }: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    listRef.current?.scrollToOffset({
      offset: Math.max(0, index * 100),
      animated: false,
    });

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    });
  };

  return (
    <FlatList
      ref={listRef}
      className="bg-background flex-1 px-5"
      data={mosques}
      keyExtractor={(item) => item.id}
      stickyHeaderIndices={[0]}
      ListHeaderComponent={
        <View className="bg-background -mx-5 px-5 pt-5 pb-4">
          <View className="flex-row items-center justify-between gap-5">
            <View className="gap-0.5">
              <Text className="font-sans-bold text-foreground text-xl">
                {t("title")}
              </Text>

              <Text className="font-sans-regular text-muted-foreground text-sm">
                {t("found", { count: mosques.length })}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("changeRadius")}
              onPress={onRadiusPress}
              className="bg-muted flex-row items-center gap-1.5 rounded-full px-3 py-2"
            >
              <Text className="font-sans-semibold text-foreground text-sm">
                {t("radius", {
                  radius: radiusKm,
                  unit: kilometerUnit,
                })}
              </Text>

              <Fa
                name="chevron-down"
                size={10}
                className="text-muted-foreground"
              />
            </Pressable>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <MosqueCard
          mosque={item}
          selected={item.id === selectedMosqueId}
          onPress={() => onSelectMosque(item.id)}
          onDirectionsPress={() => onDirectionsPress(item)}
          routeLoading={routeLoading && routedMosqueId === item.id}
          routeMetricsLoading={item.routeMetricsLoading}
          route={routedMosqueId === item.id ? route : null}
        />
      )}
      onScrollToIndexFailed={handleScrollToIndexFailed}
      contentContainerStyle={{
        gap: 15,
        paddingBottom: 15,
      }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default MosquesList;
