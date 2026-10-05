import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { LocationAddress } from '@qalb/shared';
import { RedisService } from '../../common/redis.service.js';

@Injectable()
export class ReverseGeocodingService {
  constructor(private readonly redis: RedisService) {}

  async reverse(
    lat: number,
    lon: number,
    language: string,
  ): Promise<LocationAddress> {
    const key = `qalb:geocode:${lat.toFixed(4)}:${lon.toFixed(4)}:${language.toLowerCase()}`;
    const cached = await this.redis.get<LocationAddress>(key);
    if (cached) return cached;
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
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Qalb/1.0 (prayer times app)' },
    });
    if (!response.ok)
      throw new ServiceUnavailableException('Location lookup is unavailable.');
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
    await this.redis.set(key, result, 24 * 60 * 60);
    return result;
  }
}
