import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Mosque } from '@qalb/shared';
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
  constructor(private readonly redis: RedisService) {}

  async nearby(
    lat: number,
    lng: number,
    radius: number,
    limit: number,
  ): Promise<Mosque[]> {
    const bucket = `${lat.toFixed(2)}:${lng.toFixed(2)}`;
    const key = `qalb:mosques:${bucket}:${radius}:${limit}`;
    const cached = await this.redis.get<Mosque[]>(key);
    if (cached) return cached;
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
    const response = await fetch(url);
    const data = (await response.json()) as { data?: ProviderMosque[] };
    if (!response.ok || !Array.isArray(data.data))
      throw new ServiceUnavailableException('Mosques are unavailable.');
    const result = data.data
      .filter((mosque) => mosque.status === 'active')
      .map((mosque) => ({
        id: mosque.id,
        name: mosque.name,
        street: mosque.addressLine1 ?? undefined,
        latitude: mosque.latitude,
        longitude: mosque.longitude,
      }));
    await this.redis.set(key, result, 15 * 60);
    return result;
  }
}
