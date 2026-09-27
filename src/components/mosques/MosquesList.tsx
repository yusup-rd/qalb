import type { NearbyMosque } from "@/hooks/useNearbyMosques";
import type { Route } from "@/types/routing";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
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
  return (
    <FlatList
      className="bg-background flex-1 px-5"
      data={mosques}
      keyExtractor={(item) => item.id}
      stickyHeaderIndices={[0]}
      ListHeaderComponent={
        <View className="bg-background -mx-5 px-5 pt-5 pb-4">
          <View className="flex-row items-center justify-between gap-5">
            <View className="gap-0.5">
              <Text className="font-sans-bold text-foreground text-xl">
                Mosques nearby
              </Text>

              <Text className="font-sans-regular text-muted-foreground text-sm">
                {mosques.length} found nearby
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change mosque search radius"
              onPress={onRadiusPress}
              className="bg-muted flex-row items-center gap-1.5 rounded-full px-3 py-2"
            >
              <Text className="font-sans-semibold text-foreground text-sm">
                {radiusKm} km
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
          route={routedMosqueId === item.id ? route : null}
        />
      )}
      contentContainerStyle={{
        gap: 15,
        paddingBottom: 15,
      }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default MosquesList;
