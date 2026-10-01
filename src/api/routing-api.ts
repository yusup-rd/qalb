import type { Route, RouteMetrics } from "@/types/routing";

const ROUTING_ENDPOINT = "https://router.project-osrm.org";

interface OsrmRouteResponse {
  code: string;
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry?: {
      type: "LineString";
      coordinates: [number, number][];
    };
  }[];
}

interface OsrmTableResponse {
  code: string;
  message?: string;
  distances?: (number | null)[][];
  durations?: (number | null)[][];
}

interface RoutingCoordinate {
  latitude: number;
  longitude: number;
}

export const fetchRoute = async (
  origin: RoutingCoordinate,
  destination: RoutingCoordinate,
): Promise<Route> => {
  const coordinates = [
    `${origin.longitude},${origin.latitude}`,
    `${destination.longitude},${destination.latitude}`,
  ].join(";");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(
      `${ROUTING_ENDPOINT}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Routing request failed with status ${response.status}`);
  }

  const result = (await response.json()) as OsrmRouteResponse;

  if (result.code !== "Ok" || !result.routes?.[0]?.geometry) {
    throw new Error(result.message ?? "No route found");
  }

  const route = result.routes[0];
  const geometry = route.geometry;

  if (!geometry) {
    throw new Error("No route geometry found.");
  }

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    coordinates: geometry.coordinates.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
  };
};

export const fetchRouteMetrics = async (
  origin: RoutingCoordinate,
  destinations: RoutingCoordinate[],
): Promise<RouteMetrics[]> => {
  if (destinations.length === 0) {
    return [];
  }

  const coordinates = [
    `${origin.longitude},${origin.latitude}`,
    ...destinations.map(
      ({ latitude, longitude }) => `${longitude},${latitude}`,
    ),
  ].join(";");

  const destinationIndexes = destinations.map((_, index) => index + 1);

  const params = new URLSearchParams({
    sources: "0",
    destinations: destinationIndexes.join(";"),
    annotations: "duration,distance",
  });

  const url = `${ROUTING_ENDPOINT}/table/v1/driving/${coordinates}?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let response: Response;

  try {
    response = await fetch(url, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(
      `Routing metrics request failed with status ${response.status}`,
    );
  }

  const result = (await response.json()) as OsrmTableResponse;

  if (result.code !== "Ok") {
    throw new Error(
      result.message ?? `OSRM table request failed: ${result.code}`,
    );
  }

  const distances = result.distances?.[0];
  const durations = result.durations?.[0];

  if (!distances || !durations) {
    throw new Error("OSRM returned no route metrics.");
  }

  return destinations.map((_, index) => ({
    distanceMeters: distances[index] ?? Number.NaN,
    durationSeconds: durations[index] ?? Number.NaN,
  }));
};
