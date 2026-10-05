import type { DeviceHeading, HeadingPermissionStatus } from "@/types/qibla";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

interface UseDeviceHeadingOptions {
  onHeading?: (heading: number) => void;
}

const DISPLAY_UPDATE_INTERVAL = 100;

const useDeviceHeading = (options?: UseDeviceHeadingOptions): DeviceHeading => {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState(-1);
  const [hasSensor, setHasSensor] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<HeadingPermissionStatus>("checking");

  const onHeadingRef = useRef(options?.onHeading);

  useEffect(() => {
    onHeadingRef.current = options?.onHeading;
  }, [options?.onHeading]);

  const lastDisplayUpdate = useRef(0);
  const servicesEnabledRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();

        if (!mounted) return;

        let permissionGranted = permission.status === "granted";

        if (!permissionGranted) {
          const requestedPermission =
            await Location.requestForegroundPermissionsAsync();

          if (!mounted) return;

          permissionGranted = requestedPermission.status === "granted";

          if (!permissionGranted) {
            setPermissionStatus("denied");
            return;
          }
        }

        if (!permissionGranted) {
          setPermissionStatus("error");
          return;
        }

        servicesEnabledRef.current = await Location.hasServicesEnabledAsync();

        if (!mounted) return;

        setPermissionStatus("granted");

        const nextSubscription = await Location.watchHeadingAsync(
          (headingData) => {
            if (!mounted) return;

            const rawHeading =
              headingData.trueHeading >= 0
                ? headingData.trueHeading
                : headingData.magHeading;

            onHeadingRef.current?.(rawHeading);

            const now = Date.now();

            if (now - lastDisplayUpdate.current >= DISPLAY_UPDATE_INTERVAL) {
              lastDisplayUpdate.current = now;
              setHeading(rawHeading);
              setAccuracy(headingData.accuracy);
            }

            setHasSensor(true);
          },
          () => {},
        );

        if (!mounted) {
          nextSubscription.remove();
          return;
        }

        subscription = nextSubscription;
      } catch (error) {
        if (!mounted) return;

        console.warn("Failed to initialize compass:", error);
        setPermissionStatus("error");
      }
    };

    void startWatching();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return {
    heading,
    accuracy,
    hasSensor,
    permissionStatus,
  };
};

export default useDeviceHeading;
