import QiblaCompass from "@/components/qibla/compass/QiblaCompass";
import CompassControls from "@/components/qibla/controls/CompassControls";
import CompassReadout from "@/components/qibla/readouts/CompassReadout";
import CalibrationCard from "@/components/qibla/status/CalibrationCard";
import NoSensorFallback from "@/components/qibla/status/NoSensorFallback";
import QiblaAlignmentStatus from "@/components/qibla/status/QiblaAlignmentStatus";
import useQiblaCompass from "@/hooks/useQiblaCompass";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styled } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(NativeSafeAreaView);

const HAPTICS_STORAGE_KEY = "@app/compass-haptics";

const Qibla = () => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "qibla",
  });

  const [hapticsEnabled, setHapticsEnabled] = useState(false);
  const [hapticsLoaded, setHapticsLoaded] = useState(false);

  useEffect(() => {
    const loadHapticsSetting = async () => {
      try {
        const value = await AsyncStorage.getItem(HAPTICS_STORAGE_KEY);
        setHapticsEnabled(value === null ? true : value === "true");
      } catch {
        setHapticsEnabled(true);
      } finally {
        setHapticsLoaded(true);
      }
    };

    loadHapticsSetting();
  }, []);

  const handleHapticsChange = useCallback(async (enabled: boolean) => {
    setHapticsEnabled(enabled);

    try {
      await AsyncStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
    } catch {}
  }, []);

  const {
    heading,
    qibla,
    hasSensor,
    permissionStatus,
    showCalibration,
    isFacingQibla,
    rotation,
  } = useQiblaCompass({
    hapticsEnabled: hapticsLoaded && hapticsEnabled,
  });

  return (
    <SafeAreaView className="bg-background flex-1 p-5">
      {qibla === null ? (
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="font-sans-semibold text-foreground text-lg">
            {t("location.unavailableTitle")}
          </Text>

          <Text className="text-muted-foreground px-8 text-center font-sans text-sm">
            {t("location.unavailableDescription")}
          </Text>
        </View>
      ) : permissionStatus === "checking" ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground font-sans text-sm">
            {t("compass.starting")}
          </Text>
        </View>
      ) : permissionStatus === "denied" ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Text className="font-sans-semibold text-foreground text-lg">
            {t("permission.requiredTitle")}
          </Text>

          <Text className="text-muted-foreground text-center font-sans text-sm">
            {t("permission.requiredDescription")}
          </Text>
        </View>
      ) : heading === null && !hasSensor ? (
        <View className="flex-1 items-center justify-center">
          <NoSensorFallback />
        </View>
      ) : heading === null ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground font-sans text-sm">
            {t("compass.findingDirection")}
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <View className="h-28 items-center justify-start gap-4">
            <QiblaAlignmentStatus isFacingQibla={isFacingQibla} />

            <View className="w-full">
              <CalibrationCard visible={showCalibration} />
            </View>
          </View>

          <View className="flex-1 items-center justify-center">
            <QiblaCompass bearing={qibla.bearing} rotation={rotation} />
          </View>

          <View className="w-full justify-end gap-2">
            <CompassControls
              hapticsEnabled={hapticsEnabled}
              hapticsLoaded={hapticsLoaded}
              onHapticsChange={handleHapticsChange}
            />

            <CompassReadout
              bearing={qibla.bearing}
              distance={qibla.distance}
              heading={heading}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Qibla;
