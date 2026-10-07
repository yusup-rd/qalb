import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Route, RouteMetrics } from '@qalb/shared';
import { PinoLogger } from 'nestjs-pino';
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

  constructor(
    private readonly redis: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RoutingService.name);
  }

  private coordinateKey(coordinate: Coordinate): string {
    return `${coordinate.latitude.toFixed(5)},${coordinate.longitude.toFixed(5)}`;
  }

  async route(origin: Coordinate, destination: Coordinate): Promise<Route> {
    const cacheKey = `qalb:route:driving:${this.coordinateKey(origin)}:${this.coordinateKey(destination)}`;
    const cached = await this.redis.get<Route>(cacheKey);

    if (cached) {
      this.logger.info(
        { event: 'cache_hit', operation: 'route' },
        'Route cache hit',
      );
      return cached;
    }

    this.logger.info(
      { event: 'cache_miss', operation: 'route' },
      'Route cache miss',
    );

    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

    this.logger.info(
      { event: 'upstream_request', provider: 'osrm', operation: 'route' },
      'Requesting route',
    );

    let response: Response;

    try {
      response = await fetch(
        `${this.base}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
      );
    } catch (error) {
      this.logger.error(
        {
          event: 'upstream_error',
          provider: 'osrm',
          operation: 'route',
          err: error,
        },
        'Route upstream request failed',
      );
      throw new ServiceUnavailableException('Route is unavailable.');
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'osrm',
          operation: 'route',
          statusCode: response.status,
        },
        'Route upstream returned an invalid response',
      );
      throw new ServiceUnavailableException('Route is unavailable.');
    }

    let data: {
      code: string;
      message?: string;
      routes?: OsrmRoute[];
    };

    try {
      data = (await response.json()) as {
        code: string;
        message?: string;
        routes?: OsrmRoute[];
      };
    } catch (error) {
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'osrm',
          operation: 'route',
          statusCode: response.status,
          err: error,
        },
        'Route upstream returned invalid JSON',
      );
      throw new ServiceUnavailableException('Route is unavailable.');
    }

    const route = data.routes?.[0];

    if (data.code !== 'Ok' || !route?.geometry) {
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'osrm',
          operation: 'route',
          statusCode: response.status,
        },
        'Route upstream returned an invalid response',
      );
      throw new ServiceUnavailableException(
        data.message ?? 'Route is unavailable.',
      );
    }

    this.logger.info(
      {
        event: 'upstream_success',
        provider: 'osrm',
        operation: 'route',
        statusCode: response.status,
      },
      'Route received',
    );

    const result = {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({
        latitude,
        longitude,
      })),
    };

    if (await this.redis.set(cacheKey, result, this.cacheTtlSeconds)) {
      this.logger.info(
        {
          event: 'cache_store',
          operation: 'route',
          ttlSeconds: this.cacheTtlSeconds,
        },
        'Route cached',
      );
    }

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

    if (cached) {
      this.logger.info(
        { event: 'cache_hit', operation: 'metrics' },
        'Route metrics cache hit',
      );
      return cached;
    }

    this.logger.info(
      {
        event: 'cache_miss',
        operation: 'metrics',
        destinationCount: destinations.length,
      },
      'Route metrics cache miss',
    );

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

    this.logger.info(
      {
        event: 'upstream_request',
        provider: 'osrm',
        operation: 'metrics',
        destinationCount: destinations.length,
      },
      'Requesting route metrics',
    );

    let response: Response;

    try {
      response = await fetch(
        `${this.base}/table/v1/driving/${coordinates}?${params}`,
      );
    } catch (error) {
      this.logger.error(
        {
          event: 'upstream_error',
          provider: 'osrm',
          operation: 'metrics',
          err: error,
        },
        'Route metrics upstream request failed',
      );
      throw new ServiceUnavailableException('Route metrics are unavailable.');
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'osrm',
          operation: 'metrics',
          statusCode: response.status,
        },
        'Route metrics upstream returned an invalid response',
      );
      throw new ServiceUnavailableException('Route metrics are unavailable.');
    }

    let data: {
      code: string;
      message?: string;
      distances?: (number | null)[][];
      durations?: (number | null)[][];
    };

    try {
      data = (await response.json()) as {
        code: string;
        message?: string;
        distances?: (number | null)[][];
        durations?: (number | null)[][];
      };
    } catch (error) {
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'osrm',
          operation: 'metrics',
          statusCode: response.status,
          err: error,
        },
        'Route metrics upstream returned invalid JSON',
      );
      throw new ServiceUnavailableException('Route metrics are unavailable.');
    }

    if (data.code !== 'Ok' || !data.distances?.[0] || !data.durations?.[0]) {
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'osrm',
          operation: 'metrics',
          statusCode: response.status,
        },
        'Route metrics upstream returned an invalid response',
      );
      throw new ServiceUnavailableException(
        data.message ?? 'Route metrics are unavailable.',
      );
    }

    this.logger.info(
      {
        event: 'upstream_success',
        provider: 'osrm',
        operation: 'metrics',
        statusCode: response.status,
        destinationCount: destinations.length,
      },
      'Route metrics received',
    );

    const result = destinations.map((_, index) => ({
      distanceMeters: data.distances![0]![index] ?? Number.NaN,
      durationSeconds: data.durations![0]![index] ?? Number.NaN,
    }));

    if (await this.redis.set(cacheKey, result, this.cacheTtlSeconds)) {
      this.logger.info(
        {
          event: 'cache_store',
          operation: 'metrics',
          ttlSeconds: this.cacheTtlSeconds,
        },
        'Route metrics cached',
      );
    }

    return result;
  }
}
