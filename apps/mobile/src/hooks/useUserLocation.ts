import type { LocationPermissionStatus } from "@/store/locationStore";
import { withTimeout } from "@/lib/with-timeout";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, type AppStateStatus } from "react-native";

interface UserLocation {
  latitude: number;
  longitude: number;
}

export function useUserLocation() {
  const { t } = useTranslation();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const initialRequestComplete = useRef(false);
  const requestInFlight = useRef(false);
  const previousAppState = useRef<AppStateStatus>(AppState.currentState);

  const getLocation = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    setError(null);

    let permissionConfirmed = false;

    try {
      const disclosureAccepted = await AsyncStorage.getItem(
        "@qalb/location-disclosure-v1",
      );
      if (disclosureAccepted !== "accepted") {
        const accepted = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t("prayerTimes.location.disclosure.title"),
            t("prayerTimes.location.disclosure.message"),
            [
              {
                text: t("prayerTimes.location.disclosure.notNow"),
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: t("prayerTimes.location.disclosure.continue"),
                onPress: () => resolve(true),
              },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          );
        });

        if (!accepted) {
          setPermissionStatus("denied");
          setError(t("prayerTimes.locationError.permissionNotGranted"));
          return;
        }

        await AsyncStorage.setItem("@qalb/location-disclosure-v1", "accepted");
      }

      let permission = await Location.getForegroundPermissionsAsync();

      if (!permission.granted) {
        if (!permission.canAskAgain) {
          setPermissionStatus("blocked");

          setError(t("prayerTimes.locationError.permissionBlockedTitle"));

          return;
        }

        permission = await Location.requestForegroundPermissionsAsync();

        if (!permission.granted) {
          setPermissionStatus(permission.canAskAgain ? "denied" : "blocked");

          setError(
            permission.canAskAgain
              ? t("prayerTimes.locationError.permissionNotGranted")
              : t("prayerTimes.locationError.permissionBlockedTitle"),
          );

          return;
        }
      }

      setPermissionStatus("granted");
      permissionConfirmed = true;

      const currentLocation = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        20_000,
      );

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error("Failed to get user location:", error);

      if (permissionConfirmed) {
        setPermissionStatus("granted");
      }

      setError(t("prayerTimes.locationError.unavailableMessage"));
    } finally {
      requestInFlight.current = false;
      initialRequestComplete.current = true;
      setLoading(false);
    }
  }, [t]);

  const refreshPermissionOnResume = useCallback(async () => {
    if (!initialRequestComplete.current) {
      return;
    }

    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.granted) {
        void getLocation();
        return;
      }

      setLocation(null);
      setPermissionStatus(permission.canAskAgain ? "denied" : "blocked");
      setError(
        permission.canAskAgain
          ? t("prayerTimes.locationError.permissionNotGranted")
          : t("prayerTimes.locationError.permissionBlockedTitle"),
      );
    } catch (permissionError) {
      console.warn("Failed to refresh location permission:", permissionError);
    }
  }, [getLocation, t]);

  useEffect(() => {
    // Intentionally starts the native Expo Location request on mount.
    // The resulting state updates happen asynchronously after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void getLocation();
  }, [getLocation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const returnedToApp =
        previousAppState.current !== "active" && nextState === "active";
      previousAppState.current = nextState;

      if (returnedToApp) {
        void refreshPermissionOnResume();
      }
    });

    return () => subscription.remove();
  }, [refreshPermissionOnResume]);

  return {
    location,
    loading,
    permissionStatus,
    error,
    retry: getLocation,
  };
}
