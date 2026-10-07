import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RoutingService } from './routing.service.js';

describe('RoutingService', () => {
  const createService = () => {
    const redis = {
      get: vi.fn(),
      set: vi.fn(),
    };

    const service = new RoutingService(redis as never);

    return { service, redis };
  };

  const origin = {
    latitude: 3.139,
    longitude: 101.6869,
  };

  const destination = {
    latitude: 3.1579,
    longitude: 101.7123,
  };

  it('returns a cached route without calling the upstream API', async () => {
    const { service, redis } = createService();

    const cached = {
      distanceMeters: 4200,
      durationSeconds: 600,
      coordinates: [
        {
          latitude: 3.139,
          longitude: 101.6869,
        },
        {
          latitude: 3.1579,
          longitude: 101.7123,
        },
      ],
    };

    redis.get.mockResolvedValue(cached);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('fetch should not be called'));

    const result = await service.route(origin, destination);

    expect(result).toEqual(cached);

    expect(redis.get).toHaveBeenCalledWith(
      'qalb:route:driving:3.13900,101.68690:3.15790,101.71230',
    );

    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it('fetches and transforms a route when the cache is empty', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'Ok',
          routes: [
            {
              distance: 4200,
              duration: 600,
              geometry: {
                coordinates: [
                  [101.6869, 3.139],
                  [101.7, 3.148],
                  [101.7123, 3.1579],
                ],
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const result = await service.route(origin, destination);

    expect(result).toEqual({
      distanceMeters: 4200,
      durationSeconds: 600,
      coordinates: [
        {
          latitude: 3.139,
          longitude: 101.6869,
        },
        {
          latitude: 3.148,
          longitude: 101.7,
        },
        {
          latitude: 3.1579,
          longitude: 101.7123,
        },
      ],
    });

    expect(redis.set).toHaveBeenCalledWith(
      'qalb:route:driving:3.13900,101.68690:3.15790,101.71230',
      result,
      60 * 60,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockRestore();
  });

  it('throws 503 when the route API returns an unsuccessful response', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'NoRoute',
          message: 'No route found',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await expect(service.route(origin, destination)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(redis.set).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('returns cached metrics without calling the upstream API', async () => {
    const { service, redis } = createService();

    const destinations = [
      {
        latitude: 3.1579,
        longitude: 101.7123,
      },
      {
        latitude: 3.1501,
        longitude: 101.6955,
      },
    ];

    const cached = [
      {
        distanceMeters: 4200,
        durationSeconds: 600,
      },
      {
        distanceMeters: 2800,
        durationSeconds: 420,
      },
    ];

    redis.get.mockResolvedValue(cached);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('fetch should not be called'));

    const result = await service.metrics(origin, destinations);

    expect(result).toEqual(cached);

    expect(redis.get).toHaveBeenCalledWith(
      'qalb:route-metrics:driving:3.13900,101.68690:3.15790,101.71230:3.15010,101.69550',
    );

    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it('returns an empty array without calling the upstream API when there are no destinations', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('fetch should not be called'));

    const result = await service.metrics(origin, []);

    expect(result).toEqual([]);

    expect(redis.set).toHaveBeenCalledWith(
      'qalb:route-metrics:driving:3.13900,101.68690',
      [],
      60 * 60,
    );

    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it('fetches and transforms route metrics when the cache is empty', async () => {
    const { service, redis } = createService();

    const destinations = [
      {
        latitude: 3.1579,
        longitude: 101.7123,
      },
      {
        latitude: 3.1501,
        longitude: 101.6955,
      },
    ];

    redis.get.mockResolvedValue(null);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'Ok',
          distances: [[4200, 2800]],
          durations: [[600, 420]],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const result = await service.metrics(origin, destinations);

    expect(result).toEqual([
      {
        distanceMeters: 4200,
        durationSeconds: 600,
      },
      {
        distanceMeters: 2800,
        durationSeconds: 420,
      },
    ]);

    expect(redis.set).toHaveBeenCalledWith(
      'qalb:route-metrics:driving:3.13900,101.68690:3.15790,101.71230:3.15010,101.69550',
      result,
      60 * 60,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockRestore();
  });

  it('throws 503 when the metrics API fails', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'NoTable',
          message: 'Unable to calculate table',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await expect(service.metrics(origin, [destination])).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(redis.set).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
