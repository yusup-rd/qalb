import { fetchNearbyMosques } from "@/api/mosques-api";
import { fetchRouteMetrics } from "@/api/routing-api";
import { getDistanceMeters } from "@/lib/mosque-distance";
import { useLocationStore } from "@/store/locationStore";
import type { Mosque } from "@/types/mosque";
import type { RouteMetrics } from "@/types/routing";
import { useCallback, useEffect, useMemo, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

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

interface NearbyMosquesResult {
  mosques: NearbyMosque[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}

const ROUTE_METRICS_LIMIT = 20;
const EMPTY_MOSQUES: Mosque[] = [];

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
): NearbyMosquesResult => {
  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);
  const locationLoading = useLocationStore((state) => state.locationLoading);
  const [attempt, setAttempt] = useState(0);
  const [failedLocationKey, setFailedLocationKey] = useState<string | null>(
    null,
  );

  const [mosquesState, setMosquesState] = useState<{
    locationKey: string;
    mosques: Mosque[];
  } | null>(null);
  const [loadedLocationKey, setLoadedLocationKey] = useState<string | null>(
    null,
  );
  const retry = useCallback(() => {
    setLoadedLocationKey(null);
    setFailedLocationKey(null);
    setAttempt((value) => value + 1);
  }, []);
  const [routeMetricsState, setRouteMetricsState] =
    useState<RouteMetricsState | null>(null);
  const locationKey =
    latitude == null || longitude == null ? null : `${latitude}:${longitude}`;

  useEffect(() => {
    if (locationKey == null || latitude == null || longitude == null) {
      return;
    }

    let cancelled = false;

    const loadMosques = async () => {
      try {
        const freshMosques = await fetchNearbyMosques(latitude, longitude);

        if (cancelled) {
          return;
        }

        setMosquesState({ locationKey, mosques: freshMosques });
        setFailedLocationKey(null);
      } catch (error) {
        if (!cancelled) setFailedLocationKey(locationKey);
        console.error("[Mosques] Failed to fetch mosques:", error);
      } finally {
        if (!cancelled) {
          setLoadedLocationKey(locationKey);
        }
      }
    };

    void loadMosques();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, locationKey, attempt]);

  useEffect(() => {
    if (failedLocationKey === null) return;
    let wasOffline = false;
    return NetInfo.addEventListener((state) => {
      const online =
        state.isConnected === true && state.isInternetReachable !== false;
      if (wasOffline && online) retry();
      wasOffline = !online;
    });
  }, [failedLocationKey, retry]);

  const currentMosques =
    mosquesState?.locationKey === locationKey
      ? mosquesState.mosques
      : EMPTY_MOSQUES;

  const nearbyMosques = useMemo(() => {
    if (latitude == null || longitude == null) {
      return [];
    }

    return createNearbyMosques(currentMosques, latitude, longitude, radiusKm);
  }, [currentMosques, latitude, longitude, radiusKm]);

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

  const nearbyMosquesWithMetrics = useMemo(() => {
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

  return {
    mosques: nearbyMosquesWithMetrics,
    error: locationKey !== null && failedLocationKey === locationKey,
    retry,
    loading:
      locationLoading ||
      (locationKey !== null && loadedLocationKey !== locationKey),
  };
};
