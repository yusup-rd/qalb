import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ReverseGeocodingService } from './reverse-geocoding.service.js';

describe('ReverseGeocodingService', () => {
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

    const service = new ReverseGeocodingService(
      redis as never,
      logger as never,
    );

    return { service, redis, logger };
  };

  it('returns cached location without calling the upstream API', async () => {
    const { service, redis } = createService();
    const cached = {
      city: 'Kuala Lumpur',
      country: 'Malaysia',
    };

    redis.get.mockResolvedValue(cached);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('fetch should not be called'));

    const result = await service.reverse(3.139, 101.6869, 'en');

    expect(result).toEqual(cached);
    expect(redis.get).toHaveBeenCalledWith('qalb:geocode:3.1390:101.6869:en');
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it('fetches and transforms the Nominatim response when the cache is empty', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          address: {
            city: 'Kuala Lumpur',
            country: 'Malaysia',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const result = await service.reverse(3.139, 101.6869, 'en');

    expect(result).toEqual({
      city: 'Kuala Lumpur',
      country: 'Malaysia',
    });

    expect(redis.set).toHaveBeenCalledWith(
      'qalb:geocode:3.1390:101.6869:en',
      result,
      24 * 60 * 60,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockRestore();
  });

  it('uses the requested language when calling Nominatim', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          address: {
            city: 'Москва',
            country: 'Россия',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await service.reverse(55.7558, 37.6173, 'ru');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.stringContaining('accept-language=ru'),
      }),
      expect.objectContaining({
        headers: {
          'User-Agent': 'Qalb/1.0 (prayer times app)',
        },
      }),
    );

    fetchMock.mockRestore();
  });

  it('falls back through available address fields when city is missing', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          address: {
            town: 'Petaling Jaya',
            country: 'Malaysia',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const result = await service.reverse(3.1073, 101.6067, 'en');

    expect(result).toEqual({
      city: 'Petaling Jaya',
      country: 'Malaysia',
    });

    vi.restoreAllMocks();
  });

  it('throws 503 when the Nominatim API fails', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'API unavailable',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await expect(service.reverse(3.139, 101.6869, 'en')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(redis.set).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
