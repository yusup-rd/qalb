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
import type { RouteMetrics } from "@/types/routing";
import { useEffect, useMemo, useRef, useState } from "react";

interface RouteMetricsState {
  requestKey: string;
  metrics: Record<string, RouteMetrics>;
}

interface RouteMetricsDestination {
  id: string;
  latitude: number;
  longitude: number;
}

export interface NearbyMosque extends Mosque {
  distanceMeters: number;
  drivingDistanceMeters: number | null;
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
        drivingDistanceMeters: null,
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

  const routeMosques = useMemo(
    () => nearbyMosques.slice(0, ROUTE_METRICS_LIMIT),
    [nearbyMosques],
  );

  const routeMetricsDestinationsSignature = routeMosques
    .map((mosque): RouteMetricsDestination => ({
      id: mosque.id,
      latitude: mosque.latitude,
      longitude: mosque.longitude,
    }))
    .map(({ id, latitude, longitude }) => `${id},${latitude},${longitude}`)
    .join("|");

  const routeMetricsRequestKey = [
    latitude,
    longitude,
    routeMetricsDestinationsSignature,
  ].join(":");

  const routeMetricMosqueIds = useMemo(
    () => new Set(routeMosques.map((mosque) => mosque.id)),
    [routeMosques],
  );

  useEffect(() => {
    if (
      latitude == null ||
      longitude == null ||
      routeMetricsDestinationsSignature === ""
    ) {
      return;
    }

    const destinations: RouteMetricsDestination[] =
      routeMetricsDestinationsSignature.split("|").map((destination) => {
        const [id, latitudeString, longitudeString] = destination.split(",");

        return {
          id,
          latitude: Number(latitudeString),
          longitude: Number(longitudeString),
        };
      });

    let cancelled = false;

    const loadRouteMetrics = async () => {
      try {
        const metrics = await fetchRouteMetrics(
          {
            latitude,
            longitude,
          },
          destinations.map(({ latitude, longitude }) => ({
            latitude,
            longitude,
          })),
        );

        if (cancelled) {
          return;
        }

        const nextMetrics: Record<string, RouteMetrics> = {};

        destinations.forEach((mosque, index) => {
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
  }, [
    latitude,
    longitude,
    routeMetricsDestinationsSignature,
    routeMetricsRequestKey,
  ]);

  const routeMetricsLoading =
    routeMetricsState?.requestKey !== routeMetricsRequestKey;

  return useMemo(() => {
    const currentRouteMetrics =
      routeMetricsState?.requestKey === routeMetricsRequestKey
        ? routeMetricsState.metrics
        : {};

    return nearbyMosques.map((mosque) => {
      const metrics = currentRouteMetrics[mosque.id];

      return {
        ...mosque,
        drivingDistanceMeters: metrics?.distanceMeters ?? null,
        durationSeconds: metrics?.durationSeconds ?? null,
        routeMetricsLoading:
          routeMetricMosqueIds.has(mosque.id) && routeMetricsLoading,
      };
    });
  }, [
    nearbyMosques,
    routeMetricsState,
    routeMetricsRequestKey,
    routeMetricMosqueIds,
    routeMetricsLoading,
  ]);
};
