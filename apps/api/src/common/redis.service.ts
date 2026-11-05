import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis as RedisClient } from 'ioredis';
import { PinoLogger } from 'nestjs-pino';

// RESP includes UTF-8 byte lengths, bulk-string framing, and the command name.
export function redisRequestBytes(args: (string | Buffer | number)[]): number {
  return (
    Buffer.byteLength(`*${args.length}\r\n`) +
    args.reduce<number>((size, arg) => {
      const bytes = Buffer.isBuffer(arg)
        ? arg.length
        : Buffer.byteLength(String(arg));
      return size + Buffer.byteLength(`$${bytes}\r\n`) + bytes + 2;
    }, 0)
  );
}

const MAX_REQUEST_BYTES = 1024 * 1024;

function checkRequest(args: (string | Buffer | number)[]) {
  const requestBytes = redisRequestBytes(args);
  if (requestBytes > MAX_REQUEST_BYTES) {
    throw new RangeError(
      `Redis request exceeds application limit: ${requestBytes} bytes`,
    );
  }
}

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
      const serialized = JSON.stringify(value);
      checkRequest(['SET', key, serialized, 'EX', ttlSeconds]);
      return (
        (await this.client.set(key, serialized, 'EX', ttlSeconds)) === 'OK'
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
      const serialized = JSON.stringify(value);
      checkRequest(['SET', key, serialized]);
      return (await this.client.set(key, serialized)) === 'OK';
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
      const script =
        "if redis.call('get', KEYS[1]) == ARGV[1] then redis.call('set', KEYS[2], ARGV[2]); if KEYS[3] then redis.call('set', KEYS[3], ARGV[3]); end; return 1 else return 0 end";
      const args = [
        lockKey,
        dataKey,
        ...(additionalWrite ? [additionalWrite.key] : []),
        lockValue,
        JSON.stringify(value),
        ...(additionalWrite ? [JSON.stringify(additionalWrite.value)] : []),
      ];
      checkRequest(['EVAL', script, additionalWrite ? 3 : 2, ...args]);
      return (
        (await this.client.eval(script, additionalWrite ? 3 : 2, ...args)) === 1
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

  // Legacy monolithic values are read in bounded ranges during migration.
  async getLargePersistent<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const bytes = await this.client.strlen(key);
    if (!bytes) return null;
    const parts: Buffer[] = [];
    for (let offset = 0; offset < bytes; offset += 512 * 1024) {
      parts.push(
        await this.client.getrangeBuffer(
          key,
          offset,
          Math.min(bytes - 1, offset + 512 * 1024 - 1),
        ),
      );
    }
    return JSON.parse(Buffer.concat(parts).toString('utf8')) as T;
  }

  async writeQuranChunk(
    key: string,
    value: string,
    lockKey: string,
    owner: string,
    progressKey: string,
    progress: unknown,
  ): Promise<void> {
    if (!this.client) throw new Error('Redis is not configured.');
    // Only the lease owner can create staged chunks. Failed attempts expire automatically.
    const script =
      "if redis.call('get', KEYS[1]) ~= ARGV[1] then return 0 end; redis.call('set', KEYS[2], ARGV[2], 'EX', 86400); redis.call('set', KEYS[3], ARGV[3], 'EX', 86400); return 1";
    const args = [
      lockKey,
      key,
      progressKey,
      owner,
      JSON.stringify(value),
      JSON.stringify(progress),
    ];
    checkRequest(['EVAL', script, 3, ...args]);
    if ((await this.client.eval(script, 3, ...args)) !== 1)
      throw new Error('Quran staging lost its Redis lock.');
  }

  async activateQuranChunks(
    stateKey: string,
    state: unknown,
    statusKey: string,
    status: unknown,
    lockKey: string,
    owner: string,
    activeKeys: string[],
    retiredKeys: string[],
    progressKey: string,
  ): Promise<boolean> {
    if (!this.client) return false;
    // Preflight all required keys before mutating anything: Lua errors do not roll back writes.
    // Retired chunks have a grace period for readers holding an older manifest.
    const script =
      "if redis.call('get', KEYS[1]) ~= ARGV[1] then return 0 end; local n = tonumber(ARGV[4]); for i=5,4+n do if redis.call('exists', KEYS[i]) == 0 then return -1 end end; for i=5,4+n do redis.call('persist', KEYS[i]) end; redis.call('set', KEYS[2], ARGV[2]); redis.call('set', KEYS[3], ARGV[3]); for i=5+n,#KEYS do redis.call('expire', KEYS[i], 3600) end; redis.call('del', KEYS[4]); return 1";
    const retained = new Set(activeKeys);
    const keys = [
      lockKey,
      stateKey,
      statusKey,
      progressKey,
      ...activeKeys,
      ...retiredKeys.filter((key) => !retained.has(key)),
    ];
    const args = [
      owner,
      JSON.stringify(state),
      JSON.stringify(status),
      String(activeKeys.length),
    ];
    checkRequest(['EVAL', script, keys.length, ...keys, ...args]);
    return (
      (await this.client.eval(script, keys.length, ...keys, ...args)) === 1
    );
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
