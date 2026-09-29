import MosqueMap from "@/components/mosques/MosqueMap";
import MosqueRadiusSheet from "@/components/mosques/MosqueRadiusSheet";
import MosquesList from "@/components/mosques/MosquesList";
import { useNearbyMosques } from "@/hooks/useNearbyMosques";
import { useRoute } from "@/hooks/useRoute";
import { styled } from "nativewind";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(NativeSafeAreaView);

const DEFAULT_RADIUS_KM = 10;

const Mosques = () => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "mosques.directions",
  });

  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [radiusSheetVisible, setRadiusSheetVisible] = useState(false);
  const [selectedMosqueId, setSelectedMosqueId] = useState<string | null>(null);

  const mosques = useNearbyMosques(radiusKm);

  const {
    route,
    loading: routeLoading,
    error: routeError,
    routedMosqueId,
    requestRoute,
    clearRoute,
  } = useRoute();

  const handleRadiusChange = (value: number) => {
    setRadiusKm(value);
    setSelectedMosqueId(null);
    clearRoute();
  };

  const handleSelectMosque = (mosqueId: string) => {
    setSelectedMosqueId(mosqueId);
    clearRoute();
  };

  const handleDirectionsPress = async (mosque: (typeof mosques)[number]) => {
    setSelectedMosqueId(mosque.id);
    await requestRoute(mosque);
  };

  useEffect(() => {
    if (!routeError) {
      return;
    }

    Alert.alert(t("title"), t("error"));
  }, [routeError, t]);

  return (
    <>
      <SafeAreaView className="bg-background flex-1" edges={["top"]}>
        <View className="flex-1/3">
          <MosqueMap
            mosques={mosques}
            radiusKm={radiusKm}
            selectedMosqueId={selectedMosqueId}
            onSelectMosque={handleSelectMosque}
            route={route}
          />
        </View>

        <View className="flex-2/3">
          <MosquesList
            mosques={mosques}
            radiusKm={radiusKm}
            selectedMosqueId={selectedMosqueId}
            onSelectMosque={handleSelectMosque}
            onRadiusPress={() => setRadiusSheetVisible(true)}
            onDirectionsPress={handleDirectionsPress}
            routeLoading={routeLoading}
            routedMosqueId={routedMosqueId}
            route={route}
          />
        </View>
      </SafeAreaView>

      <MosqueRadiusSheet
        visible={radiusSheetVisible}
        radiusKm={radiusKm}
        onClose={() => setRadiusSheetVisible(false)}
        onRadiusChange={handleRadiusChange}
      />
    </>
  );
};

export default Mosques;
