import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { ZakatMarketPrices } from '@qalb/shared';
import { RedisService } from '../../common/redis.service.js';

interface MetalsResponse {
  status: string;
  metals?: { gold?: number; silver?: number };
  timestamps?: { metal?: string };
  error_message?: string;
}

@Injectable()
export class MetalsService {
  private readonly key = 'qalb:metals:latest:usd:g';

  constructor(private readonly redis: RedisService) {}

  async getLatest(): Promise<ZakatMarketPrices> {
    const cached = await this.redis.get<ZakatMarketPrices>(this.key);
    if (cached) return cached;

    const apiKey = process.env.METALS_API_KEY;
    if (!apiKey)
      throw new ServiceUnavailableException('Market prices are unavailable.');

    const url = new URL(
      process.env.METALS_API_URL ?? 'https://api.metals.dev/v1/latest',
    );
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('currency', 'USD');
    url.searchParams.set('unit', 'g');
    const response = await fetch(url);
    const data = (await response.json()) as MetalsResponse;
    const gold = data.metals?.gold;
    const silver = data.metals?.silver;
    if (!response.ok || data.status !== 'success' || !gold || !silver) {
      throw new ServiceUnavailableException('Market prices are unavailable.');
    }
    const result = {
      goldPerGram: gold,
      silverPerGram: silver,
      updatedAt: data.timestamps?.metal ?? new Date().toISOString(),
    };
    await this.redis.set(this.key, result, 24 * 60 * 60);
    return result;
  }
}
