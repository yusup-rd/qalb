import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MetalsService } from './metals.service.js';

describe('MetalsService', () => {
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

    const service = new MetalsService(redis as never, logger as never);

    return { service, redis, logger };
  };

  it('returns cached prices without calling the upstream API', async () => {
    const { service, redis } = createService();
    const cached = {
      goldPerGram: 140,
      silverPerGram: 2,
      updatedAt: '2026-10-07T00:00:00.000Z',
    };

    redis.get.mockResolvedValue(cached);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('fetch should not be called'));

    const result = await service.getLatest();

    expect(result).toEqual(cached);
    expect(redis.get).toHaveBeenCalledWith('qalb:metals:latest:usd:g');
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it.each([true, false])(
    'fetches prices when the cache is empty (cache stored: %s)',
    async (stored) => {
      const { service, redis, logger } = createService();
      redis.set.mockResolvedValue(stored);

      redis.get.mockResolvedValue(null);
      process.env.METALS_API_KEY = 'test-api-key';

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'success',
            metals: {
              gold: 140.7815,
              silver: 2.1302,
            },
            timestamps: {
              metal: '2026-10-07T00:00:00.000Z',
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

      const result = await service.getLatest();

      expect(result).toEqual({
        goldPerGram: 140.7815,
        silverPerGram: 2.1302,
        updatedAt: '2026-10-07T00:00:00.000Z',
      });

      const cacheStoreLogs = logger.info.mock.calls.filter(
        ([fields]) => fields.event === 'cache_store',
      );
      expect(cacheStoreLogs).toHaveLength(stored ? 1 : 0);

      expect(redis.set).toHaveBeenCalledWith(
        'qalb:metals:latest:usd:g',
        result,
        24 * 60 * 60,
      );

      vi.restoreAllMocks();
    },
  );

  it('throws 503 when the upstream API fails', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);
    process.env.METALS_API_KEY = 'test-api-key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'error',
          error_message: 'API unavailable',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await expect(service.getLatest()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(redis.set).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
