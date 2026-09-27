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
import { RouteMetrics } from "@/types/routing";
import { useEffect, useMemo, useRef, useState } from "react";

interface RouteMetricsState {
  requestKey: string;
  metrics: Record<string, RouteMetrics>;
}

export interface NearbyMosque extends Mosque {
  distanceMeters: number;
  durationSeconds: number | null;
  isClosest: boolean;
  routeMetricsLoading: boolean;
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
        routeMetricsLoading: false,
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
  const [routeMetricsState, setRouteMetricsState] =
    useState<RouteMetricsState | null>(null);

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

        if (
          isMosqueCacheFresh(cache) &&
          cache.latitude === latitude &&
          cache.longitude === longitude
        ) {
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

  const routeMosques = nearbyMosques.slice(0, ROUTE_METRICS_LIMIT);

  const routeMetricsRequestKey = [
    latitude,
    longitude,
    radiusKm,
    routeMosques.map((mosque) => mosque.id).join(","),
  ].join(":");

  const routeMetricMosqueIds = new Set(routeMosques.map((mosque) => mosque.id));

  useEffect(() => {
    if (latitude == null || longitude == null || routeMosques.length === 0) {
      return;
    }

    let cancelled = false;

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

        const nextMetrics: Record<string, RouteMetrics> = {};

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

        setRouteMetricsState({
          requestKey: routeMetricsRequestKey,
          metrics: nextMetrics,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("[Mosques] Failed to fetch driving metrics:", error);

        setRouteMetricsState({
          requestKey: routeMetricsRequestKey,
          metrics: {},
        });
      }
    };

    void loadRouteMetrics();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, routeMetricsRequestKey, routeMosques]);

  const currentRouteMetrics =
    routeMetricsState?.requestKey === routeMetricsRequestKey
      ? routeMetricsState.metrics
      : {};

  const routeMetricsLoading =
    routeMetricsState?.requestKey !== routeMetricsRequestKey;

  return nearbyMosques.map((mosque) => {
    const metrics = currentRouteMetrics[mosque.id];

    return {
      ...mosque,
      distanceMeters: metrics?.distanceMeters ?? mosque.distanceMeters,
      durationSeconds: metrics?.durationSeconds ?? mosque.durationSeconds,
      routeMetricsLoading:
        routeMetricMosqueIds.has(mosque.id) && routeMetricsLoading,
    };
  });
};
