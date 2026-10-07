import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { LocationAddress } from '@qalb/shared';
import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '../../common/redis.service.js';

@Injectable()
export class ReverseGeocodingService {
  constructor(
    private readonly redis: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ReverseGeocodingService.name);
  }

  async reverse(
    lat: number,
    lon: number,
    language: string,
  ): Promise<LocationAddress> {
    const key = `qalb:geocode:${lat.toFixed(4)}:${lon.toFixed(4)}:${language.toLowerCase()}`;
    const cached = await this.redis.get<LocationAddress>(key);

    if (cached) {
      this.logger.info(
        { event: 'cache_hit', language },
        'Reverse geocoding cache hit',
      );
      return cached;
    }

    this.logger.info(
      { event: 'cache_miss', language },
      'Reverse geocoding cache miss',
    );

    const url = new URL(
      process.env.NOMINATIM_API_URL ??
        'https://nominatim.openstreetmap.org/reverse',
    );

    url.search = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
      zoom: '10',
      'accept-language': language,
    }).toString();

    this.logger.info(
      {
        event: 'upstream_request',
        provider: 'nominatim',
        language,
      },
      'Requesting reverse geocoding',
    );

    let response: Response;

    try {
      response = await fetch(url, {
        headers: { 'User-Agent': 'Qalb/1.0 (prayer times app)' },
      });
    } catch (error) {
      this.logger.error(
        {
          event: 'upstream_error',
          provider: 'nominatim',
          err: error,
        },
        'Reverse geocoding upstream request failed',
      );
      throw new ServiceUnavailableException('Location lookup is unavailable.');
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'nominatim',
          statusCode: response.status,
        },
        'Reverse geocoding upstream returned an error',
      );
      throw new ServiceUnavailableException('Location lookup is unavailable.');
    }

    const data = (await response.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
        country?: string;
      };
    };

    const address = data.address;

    const result = {
      city:
        address?.city ??
        address?.town ??
        address?.village ??
        address?.county ??
        address?.state ??
        null,
      country: address?.country ?? null,
    };

    this.logger.info(
      {
        event: 'upstream_success',
        provider: 'nominatim',
        statusCode: response.status,
      },
      'Reverse geocoding result received',
    );

    if (await this.redis.set(key, result, 24 * 60 * 60)) {
      this.logger.info(
        { event: 'cache_store', ttlSeconds: 24 * 60 * 60 },
        'Reverse geocoding result cached',
      );
    }

    return result;
  }
}
