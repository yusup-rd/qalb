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
        const errorCode = error instanceof Error ? error.name : 'UnknownError';
        this.logger.warn({ errorCode }, 'Redis connection error');
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
      const errorCode = error instanceof Error ? error.name : 'UnknownError';
      this.logger.warn({ errorCode }, 'Redis read failed');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      return (
        (await this.client.set(
          key,
          JSON.stringify(value),
          'EX',
          ttlSeconds,
        )) === 'OK'
      );
    } catch (error) {
      const errorCode = error instanceof Error ? error.name : 'UnknownError';
      this.logger.warn({ ttlSeconds, errorCode }, 'Redis write failed');
      return false;
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async getPersistent<T>(key: string): Promise<T | null> {
    if (!this.client) return null;

    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      const errorCode = error instanceof Error ? error.name : 'UnknownError';
      this.logger.warn({ errorCode }, 'Redis persistent read failed');
      throw error;
    }
  }

  async setPersistent<T>(key: string, value: T): Promise<boolean> {
    if (!this.client) return false;

    try {
      return (await this.client.set(key, JSON.stringify(value))) === 'OK';
    } catch (error) {
      const errorCode = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error({ errorCode }, 'Redis persistent write failed');
      throw error;
    }
  }

  async setPersistentWithLock<T>(
    dataKey: string,
    value: T,
    lockKey: string,
    lockValue: string,
    additionalWrite?: { key: string; value: unknown },
  ): Promise<boolean> {
    if (!this.client) return false;

    try {
      return (
        (await this.client.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then redis.call('set', KEYS[2], ARGV[2]); if KEYS[3] then redis.call('set', KEYS[3], ARGV[3]); end; return 1 else return 0 end",
          additionalWrite ? 3 : 2,
          lockKey,
          dataKey,
          ...(additionalWrite ? [additionalWrite.key] : []),
          lockValue,
          JSON.stringify(value),
          ...(additionalWrite ? [JSON.stringify(additionalWrite.value)] : []),
        )) === 1
      );
    } catch (error) {
      const errorCode = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error(
        { errorCode },
        'Redis persistent conditional write failed',
      );
      throw error;
    }
  }

  async acquireLock(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<boolean> {
    if (!this.client) return false;

    try {
      return (await this.client.set(key, value, 'PX', ttlMs, 'NX')) === 'OK';
    } catch (error) {
      const errorCode = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error({ errorCode }, 'Redis lock acquisition failed');
      throw error;
    }
  }

  async renewLock(key: string, value: string, ttlMs: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      return (
        (await this.client.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end",
          1,
          key,
          value,
          String(ttlMs),
        )) === 1
      );
    } catch (error) {
      const errorCode = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error({ errorCode }, 'Redis lock renewal failed');
      throw error;
    }
  }

  async releaseLock(key: string, value: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        key,
        value,
      );
    } catch (error) {
      const errorCode = error instanceof Error ? error.name : 'UnknownError';
      this.logger.warn({ errorCode }, 'Redis lock release failed');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }
}
