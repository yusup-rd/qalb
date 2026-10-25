import { useLocationName } from "@/hooks/useLocationName";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useLocationStore } from "@/store/locationStore";
import { useEffect } from "react";

const LocationInitializer = () => {
  const { location, loading, error, permissionStatus, retry } =
    useUserLocation();

  const setLocation = useLocationStore((state) => state.setLocation);
  const setLocationLoading = useLocationStore(
    (state) => state.setLocationLoading,
  );
  const setLocationError = useLocationStore((state) => state.setLocationError);
  const setLocationPermissionStatus = useLocationStore(
    (state) => state.setLocationPermissionStatus,
  );
  const setRetryLocation = useLocationStore((state) => state.setRetryLocation);

  useLocationName();

  useEffect(() => {
    setRetryLocation(retry);
  }, [retry, setRetryLocation]);

  useEffect(() => {
    if (location && !error) {
      setLocation(location.latitude, location.longitude);
    }

    setLocationLoading(loading);
    setLocationError(error);
    setLocationPermissionStatus(permissionStatus);
  }, [
    location,
    loading,
    error,
    permissionStatus,
    setLocation,
    setLocationError,
    setLocationLoading,
    setLocationPermissionStatus,
  ]);

  return null;
};

export default LocationInitializer;
