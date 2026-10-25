import i18n from "@/i18n";
import { getDistanceMeters } from "@/lib/mosque-distance";
import { withTimeout } from "@/lib/with-timeout";
import type { LocationPermissionStatus } from "@/store/locationStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";

interface UserLocation {
  latitude: number;
  longitude: number;
}

// A recent fix remains useful across short app switches. Real travel still refreshes.
const LOCATION_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const MIN_LOCATION_CHANGE_METERS = 100;

type LocationErrorKey =
  | "prayerTimes.locationError.permissionNotGranted"
  | "prayerTimes.locationError.permissionBlockedTitle"
  | "prayerTimes.locationError.unavailableMessage";

function translateLocationError(
  key: LocationErrorKey,
  t: ReturnType<typeof useTranslation>["t"],
) {
  switch (key) {
    case "prayerTimes.locationError.permissionNotGranted":
      return t("prayerTimes.locationError.permissionNotGranted");
    case "prayerTimes.locationError.permissionBlockedTitle":
      return t("prayerTimes.locationError.permissionBlockedTitle");
    case "prayerTimes.locationError.unavailableMessage":
      return t("prayerTimes.locationError.unavailableMessage");
  }
}

export function useUserLocation() {
  const { t } = useTranslation();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus>("checking");
  const [errorKey, setErrorKey] = useState<LocationErrorKey | null>(null);
  const initialRequestComplete = useRef(false);
  const requestInFlight = useRef(false);
  const wasBackgrounded = useRef(false);
  const lastLocationFixAt = useRef<number | null>(null);
  const locationRef = useRef<UserLocation | null>(null);

  const getLocation = useCallback(async (mode?: "background") => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    const silentRefresh = mode === "background" && locationRef.current !== null;
    if (!silentRefresh) setLoading(true);
    setErrorKey(null);

    let permissionConfirmed = false;

    try {
      const disclosureAccepted = await AsyncStorage.getItem(
        "@qalb/location-disclosure-v1",
      );
      if (disclosureAccepted !== "accepted") {
        const accepted = await new Promise<boolean>((resolve) => {
          Alert.alert(
            i18n.t("prayerTimes.location.disclosure.title"),
            i18n.t("prayerTimes.location.disclosure.message"),
            [
              {
                text: i18n.t("prayerTimes.location.disclosure.notNow"),
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: i18n.t("prayerTimes.location.disclosure.continue"),
                onPress: () => resolve(true),
              },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          );
        });

        if (!accepted) {
          setPermissionStatus("denied");
          setErrorKey("prayerTimes.locationError.permissionNotGranted");
          return;
        }

        await AsyncStorage.setItem("@qalb/location-disclosure-v1", "accepted");
      }

      let permission = await Location.getForegroundPermissionsAsync();

      if (!permission.granted) {
        if (!permission.canAskAgain) {
          setPermissionStatus("blocked");

          setErrorKey("prayerTimes.locationError.permissionBlockedTitle");

          return;
        }

        permission = await Location.requestForegroundPermissionsAsync();

        if (!permission.granted) {
          setPermissionStatus(permission.canAskAgain ? "denied" : "blocked");

          setErrorKey(
            permission.canAskAgain
              ? "prayerTimes.locationError.permissionNotGranted"
              : "prayerTimes.locationError.permissionBlockedTitle",
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

      const nextLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      const previousLocation = locationRef.current;
      lastLocationFixAt.current = Date.now();
      if (
        !previousLocation ||
        getDistanceMeters(
          previousLocation.latitude,
          previousLocation.longitude,
          nextLocation.latitude,
          nextLocation.longitude,
        ) >= MIN_LOCATION_CHANGE_METERS
      ) {
        locationRef.current = nextLocation;
        setLocation(nextLocation);
      }
    } catch (error) {
      console.error("Failed to get user location:", error);

      if (permissionConfirmed) {
        setPermissionStatus("granted");
      }

      if (!silentRefresh) {
        setErrorKey("prayerTimes.locationError.unavailableMessage");
      }
    } finally {
      requestInFlight.current = false;
      initialRequestComplete.current = true;
      setLoading(false);
    }
  }, []);

  const refreshPermissionOnResume = useCallback(async () => {
    if (!initialRequestComplete.current) {
      return;
    }

    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.granted) {
        const fixAge =
          lastLocationFixAt.current === null
            ? null
            : Date.now() - lastLocationFixAt.current;
        if (
          locationRef.current &&
          fixAge !== null &&
          fixAge >= 0 &&
          fixAge < LOCATION_REFRESH_INTERVAL_MS
        ) {
          return;
        }
        void getLocation("background");
        return;
      }

      locationRef.current = null;
      lastLocationFixAt.current = null;
      setLocation(null);
      setPermissionStatus(permission.canAskAgain ? "denied" : "blocked");
      setErrorKey(
        permission.canAskAgain
          ? "prayerTimes.locationError.permissionNotGranted"
          : "prayerTimes.locationError.permissionBlockedTitle",
      );
    } catch (permissionError) {
      console.warn("Failed to refresh location permission:", permissionError);
    }
  }, [getLocation]);

  useEffect(() => {
    // Intentionally starts the native Expo Location request on mount.
    // The resulting state updates happen asynchronously after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void getLocation();
  }, [getLocation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      // iOS system overlays can make the app inactive without leaving it.
      if (nextState === "background") {
        wasBackgrounded.current = true;
      } else if (nextState === "active" && wasBackgrounded.current) {
        wasBackgrounded.current = false;
        void refreshPermissionOnResume();
      }
    });

    return () => subscription.remove();
  }, [refreshPermissionOnResume]);

  return {
    location,
    loading,
    permissionStatus,
    error: errorKey ? translateLocationError(errorKey, t) : null,
    retry: getLocation,
  };
}
