import type { Route, RouteMetrics } from "@qalb/shared";
import { apiRequest } from "./client";
import { requestCached } from "./client-cache";

const ROUTE_CACHE_TTL_MS = 60 * 60 * 1000;
const ROUTE_METRICS_CACHE_TTL_MS = 60 * 60 * 1000;

// Five decimal places keeps roughly meter-level precision while collapsing
// insignificant floating-point GPS noise.
const coordinateKey = (coordinate: RoutingCoordinate) =>
  `${coordinate.latitude.toFixed(5)},${coordinate.longitude.toFixed(5)}`;

interface RoutingCoordinate {
  latitude: number;
  longitude: number;
}

export const fetchRoute = (
  origin: RoutingCoordinate,
  destination: RoutingCoordinate,
) => {
  const key = `route:driving:${coordinateKey(origin)}:${coordinateKey(destination)}`;
  return requestCached(key, ROUTE_CACHE_TTL_MS, () =>
    apiRequest<Route>("/api/routing/route", {
      method: "POST",
      body: JSON.stringify({ origin, destination }),
    }),
  );
};

export const fetchRouteMetrics = (
  origin: RoutingCoordinate,
  destinations: RoutingCoordinate[],
) => {
  const key = [
    "route-metrics:driving",
    coordinateKey(origin),
    ...destinations.map(coordinateKey),
  ].join(":");
  return requestCached(key, ROUTE_METRICS_CACHE_TTL_MS, () =>
    apiRequest<RouteMetrics[]>("/api/routing/metrics", {
      method: "POST",
      body: JSON.stringify({ origin, destinations }),
    }),
  );
};
