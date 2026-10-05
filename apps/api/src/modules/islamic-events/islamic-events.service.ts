import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { IslamicEventsApiDay } from '@qalb/shared';
import { RedisService } from '../../common/redis.service.js';

@Injectable()
export class IslamicEventsService {
  constructor(private readonly redis: RedisService) {}

  async getCalendar(
    month: number,
    year: number,
  ): Promise<IslamicEventsApiDay[]> {
    const key = `qalb:islamic-events:${year}:${String(month).padStart(2, '0')}`;
    const cached = await this.redis.get<IslamicEventsApiDay[]>(key);
    if (cached) return cached;
    const response = await fetch(
      `${process.env.ALADHAN_API_URL ?? 'https://api.aladhan.com/v1/gToHCalendar'}/${month}/${year}`,
    );
    const data = (await response.json()) as {
      code: number;
      status: string;
      data?: unknown[];
    };
    if (
      !response.ok ||
      data.code !== 200 ||
      data.status !== 'OK' ||
      !Array.isArray(data.data)
    ) {
      throw new ServiceUnavailableException('Islamic events are unavailable.');
    }
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
        hijriDate: { day: hijriDay, month: hijriMonth, year: hijriYear },
        events: [
          ...(value.hijri.holidays ?? []),
          ...(value.hijri.adjustedHolidays ?? []),
        ],
      };
    });
    await this.redis.set(key, result, 30 * 24 * 60 * 60);
    return result;
  }
}
