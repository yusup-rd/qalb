import { reverseGeocode } from "@/lib/location";
import { useLocationStore } from "@/store/locationStore";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface ResolvedLocation {
  latitude: number;
  longitude: number;
  language: string;
}

export function useLocationName() {
  const { i18n } = useTranslation();
  const language = i18n.language;

  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);
  const locationName = useLocationStore((state) => state.locationName);
  const locationLoading = useLocationStore((state) => state.locationLoading);
  const locationError = useLocationStore((state) => state.locationError);
  const setLocationName = useLocationStore((state) => state.setLocationName);
  const setLocationNameStatus = useLocationStore(
    (state) => state.setLocationNameStatus,
  );

  const resolvedLocation = useRef<ResolvedLocation | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      return;
    }

    const hasResolvedCurrentLocation =
      locationName &&
      resolvedLocation.current?.latitude === latitude &&
      resolvedLocation.current?.longitude === longitude &&
      resolvedLocation.current?.language === language;

    if (hasResolvedCurrentLocation) {
      return;
    }

    let cancelled = false;

    const loadLocationName = async () => {
      setLocationNameStatus("loading");

      try {
        const address = await reverseGeocode(latitude, longitude, language);

        if (cancelled) {
          return;
        }

        const name =
          address.city && address.country
            ? `${address.city}, ${address.country}`
            : (address.country ?? address.city ?? null);

        resolvedLocation.current = {
          latitude,
          longitude,
          language,
        };

        setLocationName(name);
        setLocationNameStatus(name ? "resolved" : "failed");
      } catch {
        if (cancelled) {
          return;
        }

        setLocationName(null);
        setLocationNameStatus("failed");
      }
    };

    void loadLocationName();

    return () => {
      cancelled = true;
    };
  }, [
    latitude,
    longitude,
    locationName,
    language,
    setLocationName,
    setLocationNameStatus,
  ]);

  return {
    locationName: locationName ?? "Location unavailable",
    loading: locationLoading,
    error: locationError,
  };
}
