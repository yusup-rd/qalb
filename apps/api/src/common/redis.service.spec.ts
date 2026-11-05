import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RedisService, redisRequestBytes } from './redis.service.js';

const redisMock = {
  get: vi.fn(),
  set: vi.fn(),
  quit: vi.fn(),
  connect: vi.fn(),
  on: vi.fn(),
  eval: vi.fn(),
  strlen: vi.fn(),
  getrangeBuffer: vi.fn(),
};

const loggerMock = {
  setContext: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('ioredis', () => ({
  Redis: class {
    get = redisMock.get;
    set = redisMock.set;
    quit = redisMock.quit;
    connect = redisMock.connect;
    on = redisMock.on;
    eval = redisMock.eval;
    strlen = redisMock.strlen;
    getrangeBuffer = redisMock.getrangeBuffer;
  },
}));

describe('RedisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.connect.mockResolvedValue(undefined);
    redisMock.quit.mockResolvedValue('OK');
    redisMock.set.mockResolvedValue('OK');
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

    await expect(
      service.set('qalb:metals:latest:usd:g', value, 86400),
    ).resolves.toBe(true);

    expect(redisMock.set).toHaveBeenCalledWith(
      'qalb:metals:latest:usd:g',
      JSON.stringify(value),
      'EX',
      86400,
    );
  });

  it('returns null when Redis read fails', async () => {
    process.env.REDIS_URL = 'redis://test';
    const error = new Error('Redis unavailable');
    redisMock.get.mockRejectedValue(error);
    const service = new RedisService(loggerMock as unknown as PinoLogger);
    const result = await service.get('some-key');

    expect(result).toBeNull();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      {
        errorCode: 'Error',
      },
      'Redis read failed',
    );
  });

  it('does not throw when Redis write fails', async () => {
    process.env.REDIS_URL = 'redis://test';
    const error = new Error('Redis unavailable');
    redisMock.set.mockRejectedValue(error);
    const service = new RedisService(loggerMock as unknown as PinoLogger);

    await expect(service.set('some-key', { value: 'test' }, 300)).resolves.toBe(
      false,
    );

    expect(loggerMock.warn).toHaveBeenCalledWith(
      {
        ttlSeconds: 300,
        errorCode: 'Error',
      },
      'Redis write failed',
    );
  });

  it('returns false without attempting a write when Redis is disabled', async () => {
    const service = new RedisService(loggerMock as unknown as PinoLogger);

    await expect(service.set('some-key', { value: 'test' }, 300)).resolves.toBe(
      false,
    );

    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('returns false when Redis does not acknowledge the write', async () => {
    process.env.REDIS_URL = 'redis://test';
    redisMock.set.mockResolvedValue(null);
    const service = new RedisService(loggerMock as unknown as PinoLogger);

    await expect(service.set('some-key', { value: 'test' }, 300)).resolves.toBe(
      false,
    );
  });

  it('measures actual UTF-8 RESP bytes and rejects oversized cache writes locally', async () => {
    process.env.REDIS_URL = 'redis://test';
    const service = new RedisService(loggerMock as unknown as PinoLogger);
    expect(redisRequestBytes(['SET', 'key', 'س'])).toBe(
      Buffer.byteLength('*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$2\r\nس\r\n'),
    );
    expect(await service.set('key', 'x'.repeat(1_048_576), 60)).toBe(false);
    expect(redisMock.set).not.toHaveBeenCalled();
    await expect(
      service.setPersistent('key', 'x'.repeat(1_048_576)),
    ).rejects.toThrow(RangeError);
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('uses a bounded, lease-checked staging command with expiring progress', async () => {
    process.env.REDIS_URL = 'redis://test';
    redisMock.eval.mockResolvedValue(1);
    const service = new RedisService(loggerMock as unknown as PinoLogger);
    await service.writeQuranChunk(
      'chunk',
      Buffer.alloc(512 * 1024).toString('base64'),
      'lock',
      'owner',
      'progress',
      { completedBatches: 1 },
    );
    const args = redisMock.eval.mock.calls[0] as (string | number)[];
    const size = redisRequestBytes(['EVAL', ...args]);
    expect(size).toBeLessThan(710_000);
    expect(args[0]).toContain("redis.call('get', KEYS[1]) ~= ARGV[1]");
    expect(args[0]).toContain("'EX', 86400");
    redisMock.eval.mockResolvedValue(0);
    await expect(
      service.writeQuranChunk('chunk', 'data', 'lock', 'stale', 'progress', {}),
    ).rejects.toThrow(/lock/);
    redisMock.eval.mockClear();
    await expect(
      service.writeQuranChunk(
        'chunk',
        'x'.repeat(1_048_576),
        'lock',
        'owner',
        'progress',
        {},
      ),
    ).rejects.toThrow(RangeError);
    expect(redisMock.eval).not.toHaveBeenCalled();
  });

  it('protects retained chunks from cleanup and activates only small manifests', async () => {
    process.env.REDIS_URL = 'redis://test';
    redisMock.eval.mockResolvedValue(1);
    const service = new RedisService(loggerMock as unknown as PinoLogger);
    expect(
      await service.activateQuranChunks(
        'state',
        { revision: 'new' },
        'status',
        {},
        'lock',
        'owner',
        ['active', 'previous'],
        ['retired', 'previous', 'active'],
        'progress',
      ),
    ).toBe(true);
    const args = redisMock.eval.mock.calls[0] as (string | number)[];
    expect(args.slice(1, 9)).toEqual([
      7,
      'lock',
      'state',
      'status',
      'progress',
      'active',
      'previous',
      'retired',
    ]);
    const script = String(args[0]);
    expect(script.indexOf("redis.call('exists'")).toBeLessThan(
      script.indexOf("redis.call('persist'"),
    );
    expect(script).toContain("redis.call('expire', KEYS[i], 3600)");
    redisMock.eval.mockResolvedValue(-1);
    expect(
      await service.activateQuranChunks(
        'state',
        {},
        'status',
        {},
        'lock',
        'owner',
        ['missing'],
        [],
        'progress',
      ),
    ).toBe(false);
  });

  it('migrates large legacy JSON with byte-safe bounded range reads', async () => {
    process.env.REDIS_URL = 'redis://test';
    const bytes = Buffer.from(JSON.stringify({ text: 'س'.repeat(600_000) }));
    redisMock.strlen.mockResolvedValue(bytes.length);
    redisMock.getrangeBuffer.mockImplementation(
      async (_key: string, start: number, end: number) =>
        bytes.subarray(start, end + 1),
    );
    const service = new RedisService(loggerMock as unknown as PinoLogger);
    expect(await service.getLargePersistent('legacy')).toEqual({
      text: 'س'.repeat(600_000),
    });
    expect(redisMock.getrangeBuffer).toHaveBeenCalledTimes(3);
    for (const [, start, end] of redisMock.getrangeBuffer.mock.calls as [
      string,
      number,
      number,
    ][])
      expect(end - start + 1).toBeLessThanOrEqual(512 * 1024);
    expect(redisMock.get).not.toHaveBeenCalled();
  });

  it('closes the Redis connection when the module is destroyed', async () => {
    process.env.REDIS_URL = 'redis://test';
    const service = new RedisService(loggerMock as unknown as PinoLogger);

    await service.onModuleDestroy();

    expect(redisMock.quit).toHaveBeenCalledTimes(1);
  });
});
