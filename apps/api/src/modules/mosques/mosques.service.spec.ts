import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MosquesService } from './mosques.service.js';

describe('MosquesService', () => {
  const createService = () => {
    const redis = {
      get: vi.fn(),
      set: vi.fn(),
    };

    const logger = {
      setContext: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const service = new MosquesService(redis as never, logger as never);

    return { service, redis, logger };
  };

  it('returns cached mosques without calling the upstream API', async () => {
    const { service, redis } = createService();
    const cached = [
      {
        id: 'mosque-1',
        name: 'Central Mosque',
        street: 'Main Street',
        latitude: 3.139,
        longitude: 101.6869,
      },
    ];

    redis.get.mockResolvedValue(cached);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('fetch should not be called'));

    const result = await service.nearby(3.139, 101.6869, 10000, 20);

    expect(result).toEqual(cached);
    expect(redis.get).toHaveBeenCalledWith('qalb:mosques:3.14:101.69:10000:20');
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it('fetches and transforms mosques when the cache is empty', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'mosque-1',
              name: 'Central Mosque',
              addressLine1: 'Main Street',
              latitude: 3.139,
              longitude: 101.6869,
              status: 'active',
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

    const result = await service.nearby(3.139, 101.6869, 10000, 20);

    expect(result).toEqual([
      {
        id: 'mosque-1',
        name: 'Central Mosque',
        street: 'Main Street',
        latitude: 3.139,
        longitude: 101.6869,
      },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      'qalb:mosques:3.14:101.69:10000:20',
      result,
      15 * 60,
    );

    fetchMock.mockRestore();
  });

  it('filters out inactive mosques', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'mosque-1',
              name: 'Active Mosque',
              addressLine1: 'Active Street',
              latitude: 3.139,
              longitude: 101.6869,
              status: 'active',
            },
            {
              id: 'mosque-2',
              name: 'Inactive Mosque',
              addressLine1: 'Inactive Street',
              latitude: 3.14,
              longitude: 101.687,
              status: 'inactive',
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

    const result = await service.nearby(3.139, 101.6869, 10000, 20);

    expect(result).toEqual([
      {
        id: 'mosque-1',
        name: 'Active Mosque',
        street: 'Active Street',
        latitude: 3.139,
        longitude: 101.6869,
      },
    ]);

    vi.restoreAllMocks();
  });

  it('uses the requested coordinates and search parameters', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    await service.nearby(3.139, 101.6869, 5000, 10);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.stringContaining('lat=3.139'),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.stringContaining('lng=101.6869'),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.stringContaining('radius=5000'),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.stringContaining('limit=10'),
      }),
    );

    vi.restoreAllMocks();
  });

  it.each([
    { status: 503, body: JSON.stringify({ error: 'API unavailable' }) },
    { status: 503, body: '<html>Service unavailable</html>' },
    { status: 200, body: 'not JSON' },
    { status: 200, body: 'null' },
    { status: 200, body: '{}' },
  ])(
    'throws 503 for an invalid upstream response: $status $body',
    async ({ status, body }) => {
      const { service, redis, logger } = createService();
      redis.get.mockResolvedValue(null);
      const response = new Response(body, { status });
      const jsonSpy = vi.spyOn(response, 'json');
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(response);

      try {
        await expect(
          service.nearby(3.139, 101.6869, 10000, 20),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);

        expect(logger.warn).toHaveBeenCalledWith(
          {
            event: 'upstream_error',
            provider: 'takbeertime',
            statusCode: status,
          },
          'Mosques upstream returned an invalid response',
        );
        expect(redis.set).not.toHaveBeenCalled();
        if (status === 503) expect(jsonSpy).not.toHaveBeenCalled();
      } finally {
        fetchMock.mockRestore();
        jsonSpy.mockRestore();
      }
    },
  );
});
