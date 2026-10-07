import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis as RedisClient } from 'ioredis';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client?: RedisClient;

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(RedisService.name);

    const url = process.env.REDIS_URL;

    if (url) {
      this.client = new RedisClient(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });

      this.client.on('error', (error: unknown) => {
        this.logger.warn({ error: String(error) }, 'Redis connection error');
      });

      void this.client.connect().catch(() => {});
    } else {
      this.logger.warn(
        'REDIS_URL is not configured; Redis caching is disabled',
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;

    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.warn({ key, error: String(error) }, 'Redis read failed');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(
        { key, ttlSeconds, error: String(error) },
        'Redis write failed',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }
}
