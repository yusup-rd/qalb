interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface Route {
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteMetrics {
  distanceMeters: number;
  durationSeconds: number;
}
