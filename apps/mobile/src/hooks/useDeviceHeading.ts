import { useLocationStore } from "@/store/locationStore";
import type { DeviceHeading, HeadingPermissionStatus } from "@/types/qibla";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseDeviceHeadingOptions {
  onHeading?: (heading: number) => void;
}

const DISPLAY_UPDATE_INTERVAL = 100;

const useDeviceHeading = (options: UseDeviceHeadingOptions): DeviceHeading => {
  const locationPermission = useLocationStore(
    (state) => state.locationPermissionStatus,
  );
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState(-1);
  const [sensorStatus, setSensorStatus] =
    useState<DeviceHeading["sensorStatus"]>("checking");
  const [permissionStatus, setPermissionStatus] =
    useState<HeadingPermissionStatus>("checking");
  const onHeadingRef = useRef(options?.onHeading);

  useEffect(() => {
    onHeadingRef.current = options?.onHeading;
  }, [options?.onHeading]);

  const lastDisplayUpdate = useRef(0);
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      let subscription: Location.LocationSubscription | null = null;

      const startWatching = async () => {
        if (locationPermission !== "granted") {
          setPermissionStatus(
            locationPermission === "checking" ? "checking" : "denied",
          );
          if (locationPermission !== "checking") {
            setHeading(null);
            setSensorStatus("unavailable");
          }
          return;
        }
        try {
          const permission = await Location.getForegroundPermissionsAsync();

          if (!mounted) return;

          // The shared location flow owns disclosure and permission requests.
          if (!permission.granted) {
            setPermissionStatus("denied");
            setHeading(null);
            setSensorStatus("unavailable");
            return;
          }

          const servicesEnabled = await Location.hasServicesEnabledAsync();

          if (!mounted) return;

          setPermissionStatus("granted");
          if (!servicesEnabled) {
            setHeading(null);
            setSensorStatus("unavailable");
            return;
          }

          const nextSubscription = await Location.watchHeadingAsync(
            (headingData) => {
              if (!mounted) return;

              const rawHeading =
                headingData.trueHeading >= 0
                  ? headingData.trueHeading
                  : headingData.magHeading;

              onHeadingRef.current?.(rawHeading);
              setSensorStatus("available");

              const now = Date.now();

              if (now - lastDisplayUpdate.current >= DISPLAY_UPDATE_INTERVAL) {
                lastDisplayUpdate.current = now;
                setHeading(rawHeading);
                setAccuracy(headingData.accuracy);
              }

            },
            () => {
              if (!mounted) return;
              setSensorStatus("error");
              setHeading(null);
              setPermissionStatus("error");
            },
          );

          if (!mounted) {
            nextSubscription.remove();
            return;
          }

          subscription = nextSubscription;
        } catch (error) {
          if (!mounted) return;

          console.warn("Failed to initialize compass:", error);
          setSensorStatus("error");
          setPermissionStatus("error");
          setHeading(null);
        }
      };

      void startWatching();

      return () => {
        mounted = false;
        subscription?.remove();
      };
    }, [locationPermission]),
  );

  return {
    heading,
    accuracy,
    sensorStatus,
    permissionStatus,
  };
};

export default useDeviceHeading;
