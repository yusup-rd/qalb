import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IslamicEventsService } from './islamic-events.service.js';

describe('IslamicEventsService', () => {
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

    const service = new IslamicEventsService(redis as never, logger as never);

    return { service, redis, logger };
  };

  it('returns cached calendar without calling the upstream API', async () => {
    const { service, redis } = createService();
    const cached = [
      {
        date: '2026-10-01',
        hijriDate: {
          day: 10,
          month: 4,
          year: 1448,
        },
        events: ['Some Event'],
      },
    ];

    redis.get.mockResolvedValue(cached);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('fetch should not be called'));

    const result = await service.getCalendar(10, 2026);

    expect(result).toEqual(cached);
    expect(redis.get).toHaveBeenCalledWith('qalb:islamic-events:2026:10');
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it.each([true, false])(
    'fetches and transforms the calendar when the cache is empty (cache stored: %s)',
    async (stored) => {
      const { service, redis, logger } = createService();
      redis.set.mockResolvedValue(stored);

      redis.get.mockResolvedValue(null);

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 200,
            status: 'OK',
            data: [
              {
                gregorian: {
                  date: '01-10-2026',
                },
                hijri: {
                  date: '19-04-1448',
                  holidays: ['Islamic New Year'],
                  adjustedHolidays: [],
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

      const result = await service.getCalendar(10, 2026);

      expect(result).toEqual([
        {
          date: '2026-10-01',
          hijriDate: {
            day: 19,
            month: 4,
            year: 1448,
          },
          events: ['Islamic New Year'],
        },
      ]);

      const cacheStoreLogs = logger.info.mock.calls.filter(
        ([fields]) => fields.event === 'cache_store',
      );
      expect(cacheStoreLogs).toHaveLength(stored ? 1 : 0);

      expect(redis.set).toHaveBeenCalledWith(
        'qalb:islamic-events:2026:10',
        result,
        30 * 24 * 60 * 60,
      );

      vi.restoreAllMocks();
    },
  );

  it('combines regular and adjusted holidays', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 200,
          status: 'OK',
          data: [
            {
              gregorian: {
                date: '10-10-2026',
              },
              hijri: {
                date: '28-04-1448',
                holidays: ['Eid al-Fitr'],
                adjustedHolidays: ['Adjusted Eid date'],
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

    const result = await service.getCalendar(10, 2026);

    expect(result[0]?.events).toEqual(['Eid al-Fitr', 'Adjusted Eid date']);

    vi.restoreAllMocks();
  });

  it('throws 503 when the upstream API fails', async () => {
    const { service, redis } = createService();

    redis.get.mockResolvedValue(null);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 500,
          status: 'ERROR',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await expect(service.getCalendar(10, 2026)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(redis.set).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
