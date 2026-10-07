import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { IslamicEventsApiDay } from '@qalb/shared';
import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '../../common/redis.service.js';

@Injectable()
export class IslamicEventsService {
  constructor(
    private readonly redis: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(IslamicEventsService.name);
  }

  async getCalendar(
    month: number,
    year: number,
  ): Promise<IslamicEventsApiDay[]> {
    const key = `qalb:islamic-events:${year}:${String(month).padStart(2, '0')}`;
    const cached = await this.redis.get<IslamicEventsApiDay[]>(key);

    if (cached) {
      this.logger.info(
        { event: 'cache_hit', month, year },
        'Islamic events cache hit',
      );
      return cached;
    }

    this.logger.info(
      { event: 'cache_miss', month, year },
      'Islamic events cache miss',
    );

    const base =
      process.env.ALADHAN_API_URL ?? 'https://api.aladhan.com/v1/gToHCalendar';

    this.logger.info(
      {
        event: 'upstream_request',
        provider: 'aladhan',
        month,
        year,
      },
      'Requesting Islamic events',
    );

    let response: Response;

    try {
      response = await fetch(`${base}/${month}/${year}`);
    } catch (error) {
      this.logger.error(
        {
          event: 'upstream_error',
          provider: 'aladhan',
          err: error,
        },
        'Islamic events upstream request failed',
      );
      throw new ServiceUnavailableException('Islamic events are unavailable.');
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'aladhan',
          statusCode: response.status,
        },
        'Islamic events upstream returned an invalid response',
      );
      throw new ServiceUnavailableException('Islamic events are unavailable.');
    }

    let data: {
      code: number;
      status: string;
      data?: unknown[];
    };

    try {
      data = (await response.json()) as {
        code: number;
        status: string;
        data?: unknown[];
      };
    } catch (error) {
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'aladhan',
          statusCode: response.status,
          err: error,
        },
        'Islamic events upstream returned invalid JSON',
      );
      throw new ServiceUnavailableException('Islamic events are unavailable.');
    }

    if (
      data.code !== 200 ||
      data.status !== 'OK' ||
      !Array.isArray(data.data)
    ) {
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'aladhan',
          statusCode: response.status,
        },
        'Islamic events upstream returned an invalid response',
      );
      throw new ServiceUnavailableException('Islamic events are unavailable.');
    }

    this.logger.info(
      {
        event: 'upstream_success',
        provider: 'aladhan',
        statusCode: response.status,
        dayCount: data.data.length,
      },
      'Islamic events received',
    );

    const result = data.data.map((day) => {
      const value = day as {
        gregorian: { date: string };
        hijri: {
          date: string;
          holidays?: string[];
          adjustedHolidays?: string[];
        };
      };

      const [hijriDay, hijriMonth, hijriYear] = value.hijri.date
        .split('-')
        .map(Number);

      const [dayOfMonth, monthOfYear, gregorianYear] =
        value.gregorian.date.split('-');

      return {
        date: `${gregorianYear}-${monthOfYear}-${dayOfMonth}`,
        hijriDate: {
          day: hijriDay,
          month: hijriMonth,
          year: hijriYear,
        },
        events: [
          ...(value.hijri.holidays ?? []),
          ...(value.hijri.adjustedHolidays ?? []),
        ],
      };
    });

    if (await this.redis.set(key, result, 30 * 24 * 60 * 60)) {
      this.logger.info(
        {
          event: 'cache_store',
          month,
          year,
          ttlSeconds: 30 * 24 * 60 * 60,
        },
        'Islamic events cached',
      );
    }

    return result;
  }
}
