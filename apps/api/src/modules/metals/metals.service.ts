import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { ZakatMarketPrices } from '@qalb/shared';
import { PinoLogger } from 'nestjs-pino';
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

  constructor(
    private readonly redis: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MetalsService.name);
  }

  async getLatest(): Promise<ZakatMarketPrices> {
    const cached = await this.redis.get<ZakatMarketPrices>(this.key);

    if (cached) {
      this.logger.info({ event: 'cache_hit' }, 'Metals cache hit');
      return cached;
    }

    this.logger.info({ event: 'cache_miss' }, 'Metals cache miss');

    const apiKey = process.env.METALS_API_KEY;

    if (!apiKey) {
      this.logger.error(
        { event: 'config_error' },
        'Metals API key is not configured',
      );
      throw new ServiceUnavailableException('Market prices are unavailable.');
    }

    const url = new URL(
      process.env.METALS_API_URL ?? 'https://api.metals.dev/v1/latest',
    );
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('currency', 'USD');
    url.searchParams.set('unit', 'g');

    this.logger.info(
      { event: 'upstream_request', provider: 'metals.dev' },
      'Requesting metals prices',
    );

    let response: Response;

    try {
      response = await fetch(url);
    } catch (error) {
      this.logger.error(
        {
          event: 'upstream_error',
          provider: 'metals.dev',
          error: String(error),
        },
        'Metals upstream request failed',
      );
      throw new ServiceUnavailableException('Market prices are unavailable.');
    }

    const data = (await response.json()) as MetalsResponse;
    const gold = data.metals?.gold;
    const silver = data.metals?.silver;

    if (!response.ok || data.status !== 'success' || !gold || !silver) {
      this.logger.warn(
        {
          event: 'upstream_error',
          provider: 'metals.dev',
          statusCode: response.status,
        },
        'Metals upstream returned an invalid response',
      );
      throw new ServiceUnavailableException('Market prices are unavailable.');
    }

    this.logger.info(
      {
        event: 'upstream_success',
        provider: 'metals.dev',
        statusCode: response.status,
      },
      'Metals prices received',
    );

    const result = {
      goldPerGram: gold,
      silverPerGram: silver,
      updatedAt: data.timestamps?.metal ?? new Date().toISOString(),
    };

    if (await this.redis.set(this.key, result, 24 * 60 * 60)) {
      this.logger.info(
        { event: 'cache_store', ttlSeconds: 24 * 60 * 60 },
        'Metals prices cached',
      );
    }

    return result;
  }
}
