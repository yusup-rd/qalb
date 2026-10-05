import type { LocationPermissionStatus } from "@/store/locationStore";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

interface UserLocation {
  latitude: number;
  longitude: number;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    let permissionConfirmed = false;

    try {
      let permission = await Location.getForegroundPermissionsAsync();

      if (!permission.granted) {
        if (!permission.canAskAgain) {
          setPermissionStatus("blocked");

          setError(
            "Location permission is disabled. Please enable it in Settings.",
          );

          return;
        }

        permission = await Location.requestForegroundPermissionsAsync();

        if (!permission.granted) {
          setPermissionStatus(permission.canAskAgain ? "denied" : "blocked");

          setError(
            permission.canAskAgain
              ? "Location permission was not granted."
              : "Location permission is disabled. Please enable it in Settings.",
          );

          return;
        }
      }

      setPermissionStatus("granted");
      permissionConfirmed = true;

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error("Failed to get user location:", error);

      if (permissionConfirmed) {
        setPermissionStatus("granted");
      }

      setError("Unable to get your current location.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Intentionally starts the native Expo Location request on mount.
    // The resulting state updates happen asynchronously after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void getLocation();
  }, [getLocation]);

  return {
    location,
    loading,
    permissionStatus,
    error,
    retry: getLocation,
  };
}
