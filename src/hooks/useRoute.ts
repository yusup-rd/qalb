import { fetchRoute } from "@/api/routing-api";
import { useLocationStore } from "@/store/locationStore";
import type { Route } from "@/types/routing";
import { useRef, useState } from "react";
import type { NearbyMosque } from "./useNearbyMosques";

interface UseRouteResult {
  route: Route | null;
  loading: boolean;
  error: Error | null;
  routedMosqueId: string | null;
  requestRoute: (mosque: NearbyMosque) => Promise<void>;
  clearRoute: () => void;
}

export const useRoute = (): UseRouteResult => {
  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);

  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [routedMosqueId, setRoutedMosqueId] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const locationRef = useRef<{
    latitude: number | null;
    longitude: number | null;
  }>({
    latitude,
    longitude,
  });

  const clearRoute = () => {
    requestIdRef.current += 1;

    setRoute(null);
    setError(null);
    setLoading(false);
    setRoutedMosqueId(null);
  };

  const requestRoute = async (mosque: NearbyMosque) => {
    if (latitude == null || longitude == null) {
      return;
    }

    const requestId = ++requestIdRef.current;

    locationRef.current = {
      latitude,
      longitude,
    };

    setLoading(true);
    setError(null);
    setRoute(null);
    setRoutedMosqueId(mosque.id);

    try {
      const nextRoute = await fetchRoute(
        {
          latitude,
          longitude,
        },
        {
          latitude: mosque.latitude,
          longitude: mosque.longitude,
        },
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      const current = useLocationStore.getState();
      if (current.latitude !== latitude || current.longitude !== longitude) {
        clearRoute();
        return;
      }

      setRoute(nextRoute);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const current = useLocationStore.getState();
      if (current.latitude !== latitude || current.longitude !== longitude) {
        clearRoute();
        return;
      }

      setRoute(null);
      setError(
        error instanceof Error ? error : new Error("Failed to calculate route"),
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  return {
    route,
    loading,
    error,
    routedMosqueId,
    requestRoute,
    clearRoute,
  };
};
