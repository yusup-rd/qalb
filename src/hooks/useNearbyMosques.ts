import { fetchNearbyMosques } from "@/api/mosques-api";
import { fetchRouteMetrics } from "@/api/routing-api";
import {
  getMosqueCache,
  isMosqueCacheFresh,
  setMosqueCache,
} from "@/lib/mosque-cache";
import { getDistanceMeters } from "@/lib/mosque-distance";
import { useLocationStore } from "@/store/locationStore";
import type { Mosque } from "@/types/mosque";
import { useEffect, useMemo, useRef, useState } from "react";

export interface NearbyMosque extends Mosque {
  distanceMeters: number;
  durationSeconds: number | null;
  isClosest: boolean;
}

const MOSQUE_CACHE_REUSE_RADIUS_METERS = 10_000;
const ROUTE_METRICS_LIMIT = 20;

const isCacheRelevant = (
  cacheLatitude: number,
  cacheLongitude: number,
  latitude: number,
  longitude: number,
) => {
  return (
    getDistanceMeters(cacheLatitude, cacheLongitude, latitude, longitude) <=
    MOSQUE_CACHE_REUSE_RADIUS_METERS
  );
};

const createNearbyMosques = (
  mosques: Mosque[],
  latitude: number,
  longitude: number,
  radiusKm: number | null,
): NearbyMosque[] => {
  const nearbyMosques = mosques
    .map((mosque) => {
      const distanceMeters = getDistanceMeters(
        latitude,
        longitude,
        mosque.latitude,
        mosque.longitude,
      );

      return {
        ...mosque,
        distanceMeters,
        durationSeconds: null,
        isClosest: false,
      };
    })
    .filter(
      (mosque) => radiusKm == null || mosque.distanceMeters <= radiusKm * 1_000,
    )
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  if (nearbyMosques.length > 0) {
    nearbyMosques[0].isClosest = true;
  }

  return nearbyMosques;
};

export const useNearbyMosques = (
  radiusKm: number | null = 3,
): NearbyMosque[] => {
  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [routeMetrics, setRouteMetrics] = useState<
    Record<
      string,
      {
        distanceMeters: number;
        durationSeconds: number;
      }
    >
  >({});

  const lastRefreshAttemptRef = useRef<number | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      return;
    }

    let cancelled = false;

    const loadMosques = async () => {
      const cache = await getMosqueCache();

      if (cancelled) {
        return;
      }

      const canUseCache =
        cache != null &&
        isCacheRelevant(cache.latitude, cache.longitude, latitude, longitude);

      if (canUseCache && cache) {
        setMosques(cache.mosques);

        if (isMosqueCacheFresh(cache)) {
          return;
        }

        if (lastRefreshAttemptRef.current === cache.fetchedAt) {
          return;
        }

        lastRefreshAttemptRef.current = cache.fetchedAt;
      }

      try {
        const freshMosques = await fetchNearbyMosques(latitude, longitude);

        if (cancelled) {
          return;
        }

        setMosques(freshMosques);

        await setMosqueCache(latitude, longitude, freshMosques);
      } catch (error) {
        console.error("[Mosques] Failed to fetch mosques:", error);
      }
    };

    void loadMosques();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  const nearbyMosques = useMemo(() => {
    if (latitude == null || longitude == null) {
      return [];
    }

    return createNearbyMosques(mosques, latitude, longitude, radiusKm);
  }, [mosques, latitude, longitude, radiusKm]);

  useEffect(() => {
    if (latitude == null || longitude == null || nearbyMosques.length === 0) {
      return;
    }

    let cancelled = false;

    const routeMosques = nearbyMosques.slice(0, ROUTE_METRICS_LIMIT);

    const loadRouteMetrics = async () => {
      try {
        const metrics = await fetchRouteMetrics(
          {
            latitude,
            longitude,
          },
          routeMosques.map((mosque) => ({
            latitude: mosque.latitude,
            longitude: mosque.longitude,
          })),
        );

        if (cancelled) {
          return;
        }

        const nextMetrics: Record<
          string,
          {
            distanceMeters: number;
            durationSeconds: number;
          }
        > = {};

        routeMosques.forEach((mosque, index) => {
          const metric = metrics[index];

          if (
            !metric ||
            !Number.isFinite(metric.distanceMeters) ||
            !Number.isFinite(metric.durationSeconds)
          ) {
            return;
          }

          nextMetrics[mosque.id] = metric;
        });

        setRouteMetrics(nextMetrics);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("[Mosques] Failed to fetch driving metrics:", error);
      }
    };

    void loadRouteMetrics();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, nearbyMosques]);

  return nearbyMosques.map((mosque) => {
    const metrics = routeMetrics[mosque.id];

    if (!metrics) {
      return mosque;
    }

    return {
      ...mosque,
      distanceMeters: metrics.distanceMeters,
      durationSeconds: metrics.durationSeconds,
    };
  });
};
