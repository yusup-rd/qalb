import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RedisService } from './redis.service.js';

const redisMock = {
  get: vi.fn(),
  set: vi.fn(),
  quit: vi.fn(),
  connect: vi.fn(),
  on: vi.fn(),
};

const loggerMock = {
  setContext: vi.fn(),
  warn: vi.fn(),
};

vi.mock('ioredis', () => ({
  Redis: class {
    get = redisMock.get;
    set = redisMock.set;
    quit = redisMock.quit;
    connect = redisMock.connect;
    on = redisMock.on;
  },
}));

describe('RedisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.connect.mockResolvedValue(undefined);
    redisMock.quit.mockResolvedValue('OK');
    delete process.env.REDIS_URL;
  });

  it('returns parsed JSON from Redis', async () => {
    process.env.REDIS_URL = 'redis://test';

    redisMock.get.mockResolvedValue(
      JSON.stringify({
        goldPerGram: 140.78,
        silverPerGram: 2.13,
      }),
    );

    const service = new RedisService(loggerMock as unknown as PinoLogger);

    const result = await service.get<{
      goldPerGram: number;
      silverPerGram: number;
    }>('qalb:metals:latest:usd:g');

    expect(result).toEqual({
      goldPerGram: 140.78,
      silverPerGram: 2.13,
    });

    expect(redisMock.get).toHaveBeenCalledWith('qalb:metals:latest:usd:g');
  });

  it('serializes values and applies the TTL when setting Redis data', async () => {
    process.env.REDIS_URL = 'redis://test';

    const service = new RedisService(loggerMock as unknown as PinoLogger);

    const value = {
      goldPerGram: 140.78,
      silverPerGram: 2.13,
    };

    await service.set('qalb:metals:latest:usd:g', value, 86400);

    expect(redisMock.set).toHaveBeenCalledWith(
      'qalb:metals:latest:usd:g',
      JSON.stringify(value),
      'EX',
      86400,
    );
  });

  it('returns null when Redis read fails', async () => {
    process.env.REDIS_URL = 'redis://test';

    redisMock.get.mockRejectedValue(new Error('Redis unavailable'));

    const service = new RedisService(loggerMock as unknown as PinoLogger);

    const result = await service.get('some-key');

    expect(result).toBeNull();

    expect(loggerMock.warn).toHaveBeenCalledWith(
      {
        key: 'some-key',
        error: 'Error: Redis unavailable',
      },
      'Redis read failed',
    );
  });

  it('does not throw when Redis write fails', async () => {
    process.env.REDIS_URL = 'redis://test';

    redisMock.set.mockRejectedValue(new Error('Redis unavailable'));

    const service = new RedisService(loggerMock as unknown as PinoLogger);

    await expect(
      service.set('some-key', { value: 'test' }, 300),
    ).resolves.toBeUndefined();

    expect(loggerMock.warn).toHaveBeenCalledWith(
      {
        key: 'some-key',
        ttlSeconds: 300,
        error: 'Error: Redis unavailable',
      },
      'Redis write failed',
    );
  });

  it('closes the Redis connection when the module is destroyed', async () => {
    process.env.REDIS_URL = 'redis://test';

    const service = new RedisService(loggerMock as unknown as PinoLogger);

    await service.onModuleDestroy();

    expect(redisMock.quit).toHaveBeenCalledTimes(1);
  });
});
