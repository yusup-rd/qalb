import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Mosque } from '@qalb/shared';
import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '../../common/redis.service.js';

interface ProviderMosque {
  id: string;
  name: string;
  addressLine1: string | null;
  latitude: number;
  longitude: number;
  status: string;
}

@Injectable()
export class MosquesService {
  constructor(
    private readonly redis: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MosquesService.name);
  }

  async nearby(
    lat: number,
    lng: number,
    radius: number,
    limit: number,
  ): Promise<Mosque[]> {
    const bucket = `${lat.toFixed(2)}:${lng.toFixed(2)}`;
    const key = `qalb:mosques:${bucket}:${radius}:${limit}`;
    const cached = await this.redis.get<Mosque[]>(key);

    if (cached) {
      this.logger.info(
        { event: 'cache_hit', radius, limit },
        'Mosques cache hit',
      );
      return cached;
    }

    this.logger.info(
      { event: 'cache_miss', radius, limit },
      'Mosques cache miss',
    );

    const base =
      process.env.MOSQUES_API_URL ??
      'https://takbeertime.com/api/mosques/nearby';
    const url = new URL(base);

    url.search = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(radius),
      limit: String(limit),
    }).toString();

    this.logger.info(
      { event: 'upstream_request', provider: 'takbeertime' },
      'Requesting nearby mosques',
    );

    let response: Response;

    try {
      response = await fetch(url);
    } catch (error) {
      this.logger.error(
        {
          event: 'upstream_error',
          provider: 'takbeertime',
          error: String(error),
        },
        'Mosques upstream request failed',
      );
      throw new ServiceUnavailableException('Mosques are unavailable.');
    }

    const data = response.ok
      ? ((await response.json().catch(() => null)) as {
          data?: ProviderMosque[];
        } | null)
      : null;

    if (!Array.isArray(data?.data)) {
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'takbeertime',
          statusCode: response.status,
        },
        'Mosques upstream returned an invalid response',
      );
      throw new ServiceUnavailableException('Mosques are unavailable.');
    }

    const result = data.data
      .filter((mosque) => mosque.status === 'active')
      .map((mosque) => ({
        id: mosque.id,
        name: mosque.name,
        street: mosque.addressLine1 ?? undefined,
        latitude: mosque.latitude,
        longitude: mosque.longitude,
      }));

    this.logger.info(
      {
        event: 'upstream_success',
        provider: 'takbeertime',
        statusCode: response.status,
        count: result.length,
      },
      'Nearby mosques received',
    );

    await this.redis.set(key, result, 15 * 60);

    this.logger.info(
      { event: 'cache_store', ttlSeconds: 15 * 60 },
      'Nearby mosques cached',
    );

    return result;
  }
}
