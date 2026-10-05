import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Route, RouteMetrics } from '@qalb/shared';
import { RedisService } from '../../common/redis.service.js';

type Coordinate = { latitude: number; longitude: number };
interface OsrmRoute {
  distance: number;
  duration: number;
  geometry?: { coordinates: [number, number][] };
}

@Injectable()
export class RoutingService {
  private readonly base =
    process.env.ROUTING_API_URL ?? 'https://router.project-osrm.org';
  private readonly cacheTtlSeconds = 60 * 60;

  constructor(private readonly redis: RedisService) {}

  private coordinateKey(coordinate: Coordinate): string {
    return `${coordinate.latitude.toFixed(5)},${coordinate.longitude.toFixed(5)}`;
  }

  async route(origin: Coordinate, destination: Coordinate): Promise<Route> {
    const cacheKey = `qalb:route:driving:${this.coordinateKey(origin)}:${this.coordinateKey(destination)}`;
    const cached = await this.redis.get<Route>(cacheKey);
    if (cached) return cached;

    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const response = await fetch(
      `${this.base}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
    );
    const data = (await response.json()) as {
      code: string;
      message?: string;
      routes?: OsrmRoute[];
    };
    const route = data.routes?.[0];
    if (!response.ok || data.code !== 'Ok' || !route?.geometry)
      throw new ServiceUnavailableException(
        data.message ?? 'Route is unavailable.',
      );
    const result = {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({
        latitude,
        longitude,
      })),
    };
    await this.redis.set(cacheKey, result, this.cacheTtlSeconds);
    return result;
  }

  async metrics(
    origin: Coordinate,
    destinations: Coordinate[],
  ): Promise<RouteMetrics[]> {
    const cacheKey = [
      'qalb:route-metrics:driving',
      this.coordinateKey(origin),
      ...destinations.map((destination) => this.coordinateKey(destination)),
    ].join(':');
    const cached = await this.redis.get<RouteMetrics[]>(cacheKey);
    if (cached) return cached;
    if (destinations.length === 0) {
      await this.redis.set(cacheKey, [], this.cacheTtlSeconds);
      return [];
    }
    const coordinates = [origin, ...destinations]
      .map(({ latitude, longitude }) => `${longitude},${latitude}`)
      .join(';');
    const params = new URLSearchParams({
      sources: '0',
      destinations: destinations.map((_, index) => String(index + 1)).join(';'),
      annotations: 'duration,distance',
    });
    const response = await fetch(
      `${this.base}/table/v1/driving/${coordinates}?${params}`,
    );
    const data = (await response.json()) as {
      code: string;
      message?: string;
      distances?: (number | null)[][];
      durations?: (number | null)[][];
    };
    if (
      !response.ok ||
      data.code !== 'Ok' ||
      !data.distances?.[0] ||
      !data.durations?.[0]
    )
      throw new ServiceUnavailableException(
        data.message ?? 'Route metrics are unavailable.',
      );
    const result = destinations.map((_, index) => ({
      distanceMeters: data.distances![0]![index] ?? Number.NaN,
      durationSeconds: data.durations![0]![index] ?? Number.NaN,
    }));
    await this.redis.set(cacheKey, result, this.cacheTtlSeconds);
    return result;
  }
}
