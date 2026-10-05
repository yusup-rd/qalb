import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client?: RedisClient;

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      this.client = new RedisClient(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      void this.client.connect().catch((error: unknown) => {
        this.logger.warn(
          `Redis unavailable; requests will use upstream directly: ${String(error)}`,
        );
      });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.warn(`Redis read failed for ${key}: ${String(error)}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Redis write failed for ${key}: ${String(error)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }
}
