import { randomBytes } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import type { QuranDataset } from './quran-content-sync.service.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PinoLogger } from 'nestjs-pino';
import type { RedisService } from '../../common/redis.service.js';
import {
  mostRecentMondaySchedule,
  QuranContentSyncService,
  QURAN_RESOURCE_FILTER,
} from './quran-content-sync.service.js';

const chapterRecords = Array.from({ length: 114 }, (_, index) => ({
  record_type: 'chapter',
  id: index + 1,
  chapter_number: index + 1,
  name_simple: `Chapter ${index + 1}`,
  name_arabic: `سورة ${index + 1}`,
  verses_count: 1,
}));
const verseRecords = Array.from({ length: 6236 }, (_, index) => ({
  record_type: 'verse',
  id: index + 1,
  chapter_id: (index % 114) + 1,
  verse_number: index + 1,
  verse_index: index + 1,
  verse_key: `${(index % 114) + 1}:${index + 1}`,
  text_uthmani: `text ${index + 1}`,
}));

const resourceList = [
  ['quran_core', 1],
  ['translations', 45],
  ['translations', 57],
  ['translations', 85],
  ['recitations', 6],
] as const;

function snapshots(omitVerse = false) {
  return new Map<string, Record<string, unknown>[]>([
    ['quran_core:1', [...chapterRecords, ...(omitVerse ? [] : verseRecords)]],
    ...([45, 57, 85] as const).map(
      (id) =>
        [
          `translations:${id}`,
          verseRecords.map((verse) => ({
            id: verse.id + id * 10_000,
            verse_id: verse.id,
            verse_key: verse.verse_key,
            text: `resource ${id} verse ${verse.id}`,
            foot_notes: null,
          })),
        ] as const,
    ),
    [
      'recitations:6',
      verseRecords.map((verse) => ({
        id: verse.id + 60_000,
        record_type: 'audio_file',
        verse_id: verse.id,
        verse_key: verse.verse_key,
        url: `https://audio.example/${verse.id}.mp3`,
        segments: [],
      })),
    ],
  ]);
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockBootstrapFetch(
  options: { rejectOldToken?: boolean; omitVerse?: boolean } = {},
) {
  const data = snapshots(options.omitVerse);
  let oldTokenRejected = false;
  return vi.fn(async (input: RequestInfo | URL) => {
    const requestUrl =
      input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : input;
    const url = new URL(requestUrl);
    if (url.pathname.endsWith('/oauth2/token')) {
      return response({ access_token: 'test-access-token' });
    }
    if (url.pathname.endsWith('/resources/sync')) {
      if (
        options.rejectOldToken &&
        url.searchParams.has('sync_token') &&
        !oldTokenRejected
      ) {
        oldTokenRejected = true;
        return response({ message: 'Invalid sync token' }, 422);
      }
      const bootstrap = url.searchParams.get('bootstrap') === 'true';
      if (!bootstrap) {
        return response({
          sync: {
            has_more: false,
            next_page_url: null,
            next_sync_token: 'next-token',
            mutations: [],
          },
        });
      }
      return response({
        sync: {
          has_more: false,
          next_page_url: null,
          next_sync_token: 'bootstrap-token',
          mutations: resourceList.map(([resource_group, resource_id]) => ({
            sequence: 1,
            type: 'RESOURCE_CREATE',
            resource_group,
            resource_id,
            record_type: null,
            record_key: null,
            data: null,
            snapshot_url: `/api/v4/resources/snapshots/${resource_group}/${resource_id}`,
          })),
        },
      });
    }
    const match = url.pathname.match(/snapshots\/([^/]+)\/(\d+)$/);
    if (match) {
      const resource = `${match[1]}:${match[2]}`;
      return response({
        resource_group: match[1],
        resource_id: Number(match[2]),
        schema_version: 1,
        sync_sequence: 1,
        records: data.get(resource),
      });
    }
    return response({ message: 'not found' }, 404);
  });
}

function createService(initialState: unknown = null) {
  let persisted = initialState;
  const values = new Map<string, unknown>();
  const redisMock = {
    isConfigured: () => true,
    getPersistent: vi.fn(async (key: string): Promise<unknown> => {
      if (key.endsWith('content-sync:v2') || key.includes(':chunks:'))
        return values.get(key) ?? null;
      return values.get(key) ?? persisted;
    }),
    getLargePersistent: vi.fn(async () => persisted),
    setPersistent: vi.fn(async (_key: string, value: unknown) => {
      persisted = value;
      return true;
    }),
    setPersistentWithLock: vi.fn(),
    writeQuranChunk: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    activateQuranChunks: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
      const stored = value as {
        dataset: { keys: string[] };
        previous: { revision: string; dataset: { keys: string[] } } | null;
      };
      const decode = (d: { keys: string[] }) =>
        JSON.parse(
          gunzipSync(
            Buffer.concat(
              d.keys.map((k) => Buffer.from(values.get(k) as string, 'base64')),
            ),
          ).toString('utf8'),
        ) as unknown;
      persisted = {
        ...stored,
        dataset: decode(stored.dataset),
        previous: stored.previous
          ? {
              revision: stored.previous.revision,
              dataset: decode(stored.previous.dataset),
            }
          : null,
      };
      return true;
    }),
    acquireLock: vi.fn(async () => true),
    renewLock: vi.fn(async () => true),
    releaseLock: vi.fn(async () => undefined),
  };
  const redis = redisMock as unknown as RedisService;
  const loggerMock = {
    setContext: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
  const logger = loggerMock as unknown as PinoLogger;
  const service = new QuranContentSyncService(redis, logger);
  return { service, redisMock, loggerMock, readPersisted: () => persisted };
}

describe('QuranContentSyncService', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses one canonical filter containing Qalb’s current resources', () => {
    expect(QURAN_RESOURCE_FILTER).toBe(
      'quran_core:1;translations:45,57,85;recitations:6',
    );
  });

  it('calculates Monday schedule time in a configured timezone and catches up after it', () => {
    const mondayBeforeRun = new Date('2026-06-01T01:00:00.000Z');
    const mondayAfterRun = new Date('2026-06-01T04:00:00.000Z');
    const tuesday = new Date('2026-06-02T12:00:00.000Z');
    expect(mostRecentMondaySchedule(mondayBeforeRun, 'UTC').toISOString()).toBe(
      '2026-05-25T03:00:00.000Z',
    );
    expect(mostRecentMondaySchedule(mondayAfterRun, 'UTC').toISOString()).toBe(
      '2026-06-01T03:00:00.000Z',
    );
    expect(mostRecentMondaySchedule(tuesday, 'UTC').toISOString()).toBe(
      '2026-06-01T03:00:00.000Z',
    );
  });

  it('bootstraps all snapshots and commits dataset with its final token together', async () => {
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_ID', 'client-id');
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('QURAN_FOUNDATION_ENV', 'production');
    vi.stubEnv('QURAN_SYNC_TIMEZONE', 'UTC');
    vi.stubGlobal('fetch', mockBootstrapFetch());
    const { service, redisMock, readPersisted } = createService();

    await (service as unknown as { runSync: () => Promise<void> }).runSync();

    const state = readPersisted() as {
      syncToken: string;
      dataset: {
        chapters: unknown[];
        verses: unknown[];
        translations: unknown[];
        transliterations: unknown[];
        ayahAudio: unknown[];
      };
      revision: string;
    };
    expect(redisMock.activateQuranChunks).toHaveBeenCalledOnce();
    expect(state.syncToken).toBe('bootstrap-token');
    expect(state.revision).toMatch(/^[a-f0-9]{64}$/);
    expect(state.dataset.chapters).toHaveLength(114);
    expect(state.dataset.verses).toHaveLength(6236);
    expect(state.dataset.translations).toHaveLength(12_472);
    expect(state.dataset.transliterations).toHaveLength(6236);
    expect(state.dataset.ayahAudio).toHaveLength(6236);
  });

  it('round-trips more than 10 MB with Unicode in independent bounded batches', async () => {
    const { service, redisMock } = createService();
    const dataset: QuranDataset = {
      chapters: [],
      verses: [],
      translations: [
        { text: randomBytes(8_000_000).toString('base64') + 'القرآن Русский' },
      ],
      transliterations: [],
      reciters: [],
      ayahAudio: [],
      chapterAudio: [],
    };
    type Descriptor = {
      keys: string[];
      hashes: string[];
      hash: string;
      bytes: number;
    };
    const storage = service as unknown as {
      stageDataset: (
        dataset: QuranDataset,
        owner: string,
        role: string,
      ) => Promise<Descriptor>;
      readChunks: (descriptor: Descriptor) => Promise<QuranDataset>;
    };
    const descriptor = await storage.stageDataset(dataset, 'owner', 'current');
    expect(descriptor.bytes).toBeGreaterThan(10_000_000);
    expect(descriptor.keys.length).toBeGreaterThan(1);
    expect(redisMock.writeQuranChunk).toHaveBeenCalledTimes(
      descriptor.keys.length,
    );
    for (const call of redisMock.writeQuranChunk.mock.calls) {
      expect(Buffer.byteLength(JSON.stringify(call))).toBeLessThan(710_000);
    }
    expect(await storage.readChunks(descriptor)).toEqual(dataset);
    expect(redisMock.activateQuranChunks).not.toHaveBeenCalled();
  });

  it('retries a failed batch without rewriting successful batches', async () => {
    const { service, redisMock, loggerMock } = createService();
    redisMock.writeQuranChunk.mockRejectedValueOnce(
      new Error('temporary failure'),
    );
    const dataset = {
      chapters: [],
      verses: [],
      translations: [],
      transliterations: [],
      reciters: [],
      ayahAudio: [],
      chapterAudio: [],
    };
    await (
      service as unknown as {
        stageDataset: (
          d: QuranDataset,
          owner: string,
          role: string,
        ) => Promise<unknown>;
      }
    ).stageDataset(dataset, 'owner', 'current');
    expect(redisMock.writeQuranChunk).toHaveBeenCalledTimes(2);
    expect(redisMock.writeQuranChunk.mock.calls[0][0]).toBe(
      redisMock.writeQuranChunk.mock.calls[1][0],
    );
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'storage_batch_retry' }),
      expect.any(String),
    );
  });

  it.each([
    'missing',
    'corrupt',
    'write failure',
    'activation failure',
  ] as const)('retains the active dataset on %s', async (failure) => {
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_ID', 'client-id');
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_SECRET', 'client-secret');
    vi.stubGlobal('fetch', mockBootstrapFetch());
    const { service, redisMock, readPersisted } = createService();
    const run = () =>
      (service as unknown as { runSync: () => Promise<void> }).runSync();
    await run();
    const active = readPersisted();
    const activeKeys = new Set(
      redisMock.writeQuranChunk.mock.calls.map((call) => call[0]),
    );
    redisMock.activateQuranChunks.mockClear();
    const upstream = mockBootstrapFetch({ rejectOldToken: true });
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const result = await upstream(input);
      return new Response(
        (await result.text()).replace(
          '"text_uthmani":"text 1"',
          '"text_uthmani":"changed"',
        ),
        { status: result.status },
      );
    });
    const original = redisMock.getPersistent.getMockImplementation()!;
    redisMock.getPersistent.mockImplementation(async (key) => {
      if (key.includes(':status:'))
        return { lastSuccessfulSyncAt: '2020-01-01' };
      if (
        key.includes(':chunks:') &&
        !activeKeys.has(key) &&
        (failure === 'missing' || failure === 'corrupt')
      )
        return failure === 'missing' ? null : 'invalid-data';
      return original(key);
    });
    if (failure === 'write failure')
      redisMock.writeQuranChunk.mockRejectedValue(new Error('failed'));
    if (failure === 'activation failure')
      redisMock.activateQuranChunks.mockResolvedValue(false);
    await expect(run()).rejects.toThrow();
    expect(readPersisted()).toBe(active);
    if (failure !== 'activation failure')
      expect(redisMock.activateQuranChunks).not.toHaveBeenCalled();
    expect((await service.getDataset()).verses[0].text_uthmani).toBe('text 1');
  });

  it('keeps incremental changes for the previous version across changed and unchanged syncs', async () => {
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_ID', 'client-id');
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_SECRET', 'client-secret');
    vi.stubGlobal('fetch', mockBootstrapFetch());
    const { service, redisMock, readPersisted } = createService();
    const run = () =>
      (service as unknown as { runSync: () => Promise<void> }).runSync();
    await run();
    const firstRevision = (readPersisted() as { revision: string }).revision;
    const original = redisMock.getPersistent.getMockImplementation()!;
    redisMock.getPersistent.mockImplementation(async (key) =>
      key.includes(':status:')
        ? { lastSuccessfulSyncAt: '2020-01-01' }
        : original(key),
    );
    const upstream = mockBootstrapFetch({ rejectOldToken: true });
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const result = await upstream(input);
      return new Response(
        (await result.text()).replace(
          '"text_uthmani":"text 1"',
          '"text_uthmani":"changed"',
        ),
        { status: result.status },
      );
    });
    await run();
    const writes = redisMock.writeQuranChunk.mock.calls.length;
    expect((await service.getChanges(firstRevision)).kind).toBe('incremental');
    (service as unknown as { cachedState: unknown }).cachedState = null;
    const changes = await service.getChanges(firstRevision);
    expect(changes.kind).toBe('incremental');
    if (changes.kind === 'incremental')
      expect(
        changes.changes.find((c) => c.table === 'verses')?.upserts,
      ).toEqual([expect.objectContaining({ text_uthmani: 'changed' })]);
    await run();
    expect(redisMock.writeQuranChunk).toHaveBeenCalledTimes(writes);
    expect((await service.getChanges(firstRevision)).kind).toBe('incremental');
  });

  it('reuses unchanged versions and reloads chunked content after a restart', async () => {
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_ID', 'client-id');
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_SECRET', 'client-secret');
    vi.stubGlobal('fetch', mockBootstrapFetch());
    const { service, redisMock, readPersisted } = createService();
    const run = () =>
      (service as unknown as { runSync: () => Promise<void> }).runSync();
    await run();
    const first = readPersisted();
    const writes = redisMock.writeQuranChunk.mock.calls.length;
    const original = redisMock.getPersistent.getMockImplementation()!;
    redisMock.getPersistent.mockImplementation(async (key) =>
      key.includes(':status:')
        ? { lastSuccessfulSyncAt: '2020-01-01' }
        : original(key),
    );
    await run();
    expect(redisMock.writeQuranChunk).toHaveBeenCalledTimes(writes);
    expect(readPersisted()).toMatchObject({
      revision: (first as { revision: string }).revision,
      syncToken: 'next-token',
    });
    (service as unknown as { cachedState: unknown }).cachedState = null;
    expect((await service.getDataset()).verses).toHaveLength(6236);
    expect(redisMock.getLargePersistent).toHaveBeenCalledOnce();
  });

  it('logs a safe Quran.Foundation stage and status when sync fails', async () => {
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_ID', 'client-id');
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('QURAN_FOUNDATION_ENV', 'production');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({}, 401)),
    );
    const { service, loggerMock } = createService();

    await (
      service as unknown as { syncIfDue: () => Promise<void> }
    ).syncIfDue();

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'sync_failed',
        syncStage: 'quran_foundation_auth',
        failureReason: 'quran_foundation_http',
        errorCode: 'QuranFoundationHttpError',
        upstreamStatus: 401,
        quranFoundationEnvironment: 'production',
        quranFoundationCredentialsConfigured: true,
        redisConfigured: true,
      }),
      expect.any(String),
    );
    expect(JSON.stringify(loggerMock.warn.mock.calls)).not.toContain(
      'client-secret',
    );
    expect(JSON.stringify(loggerMock.warn.mock.calls)).not.toContain(
      'client-id',
    );
  });

  it('does not replace a previous dataset or cursor when a bootstrap snapshot is incomplete', async () => {
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_ID', 'client-id');
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('QURAN_FOUNDATION_ENV', 'production');
    vi.stubEnv('QURAN_SYNC_TIMEZONE', 'UTC');
    vi.stubGlobal(
      'fetch',
      mockBootstrapFetch({ rejectOldToken: true, omitVerse: true }),
    );
    const previous = {
      schemaVersion: 1,
      resourcesFilter: QURAN_RESOURCE_FILTER,
      syncToken: 'previous-token',
      lastSuccessfulSyncAt: '2026-05-01T00:00:00.000Z',
      revision: 'previous-revision',
      dataset: {},
    };
    const { service, redisMock, readPersisted } = createService(previous);

    await expect(
      (service as unknown as { runSync: () => Promise<void> }).runSync(),
    ).rejects.toThrow(/incomplete/i);

    expect(redisMock.activateQuranChunks).not.toHaveBeenCalled();
    expect(readPersisted()).toBe(previous);
  });

  it('does not advance the cursor when the required core resource is deleted', async () => {
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_ID', 'client-id');
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('QURAN_FOUNDATION_ENV', 'production');
    vi.stubEnv('QURAN_SYNC_TIMEZONE', 'UTC');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const requestUrl =
          input instanceof URL
            ? input.href
            : input instanceof Request
              ? input.url
              : input;
        const url = new URL(requestUrl);
        if (url.pathname.endsWith('/oauth2/token')) {
          return response({ access_token: 'test-access-token' });
        }
        return response({
          sync: {
            has_more: false,
            next_page_url: null,
            next_sync_token: 'new-token',
            mutations: [
              {
                sequence: 1,
                type: 'RESOURCE_DELETE',
                resource_group: 'quran_core',
                resource_id: 1,
                record_type: null,
                record_key: null,
                data: null,
                snapshot_url: null,
              },
            ],
          },
        });
      }),
    );
    const previous = {
      schemaVersion: 1,
      resourcesFilter: QURAN_RESOURCE_FILTER,
      syncToken: 'previous-token',
      lastSuccessfulSyncAt: '2026-05-01T00:00:00.000Z',
      revision: 'previous-revision',
      dataset: {
        chapters: chapterRecords.map(({ record_type: _type, ...row }) => row),
        verses: verseRecords.map(({ record_type: _type, ...row }) => row),
        translations: [],
        transliterations: [],
        reciters: [{ id: 6, name: 'reciter' }],
        ayahAudio: [],
        chapterAudio: [],
      },
    };
    const { service, redisMock, readPersisted } = createService(previous);

    await expect(
      (service as unknown as { runSync: () => Promise<void> }).runSync(),
    ).rejects.toThrow(/required Quran core resource was deleted/i);

    expect(redisMock.activateQuranChunks).not.toHaveBeenCalled();
    expect(readPersisted()).toBe(previous);
  });

  it('retains the prior dataset and cursor if its Redis lease is lost before commit', async () => {
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_ID', 'client-id');
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('QURAN_FOUNDATION_ENV', 'production');
    vi.stubEnv('QURAN_SYNC_TIMEZONE', 'UTC');
    vi.stubGlobal('fetch', mockBootstrapFetch({ rejectOldToken: true }));
    const previous = {
      schemaVersion: 1,
      resourcesFilter: QURAN_RESOURCE_FILTER,
      syncToken: 'previous-token',
      lastSuccessfulSyncAt: '2026-05-01T00:00:00.000Z',
      revision: 'previous-revision',
      dataset: {},
    };
    const { service, redisMock, readPersisted } = createService(previous);
    redisMock.renewLock.mockResolvedValue(false);

    await expect(
      (service as unknown as { runSync: () => Promise<void> }).runSync(),
    ).rejects.toThrow(/lost its Redis lock before commit/i);

    expect(redisMock.activateQuranChunks).not.toHaveBeenCalled();
    expect(readPersisted()).toBe(previous);
  });

  it('does not start another sync when a different worker holds the Redis lock', async () => {
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_ID', 'client-id');
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_SECRET', 'client-secret');
    const { service, redisMock } = createService();
    redisMock.acquireLock.mockResolvedValue(false);

    await (service as unknown as { runSync: () => Promise<void> }).runSync();

    expect(redisMock.getPersistent).not.toHaveBeenCalled();
    expect(redisMock.activateQuranChunks).not.toHaveBeenCalled();
  });

  it('returns incremental table changes only for the retained prior revision', async () => {
    const oldDataset = {
      chapters: [{ id: 1, name_simple: 'Old' }],
      verses: [],
      translations: [
        {
          id: 5,
          verse_id: 1,
          verse_key: '1:1',
          language: 'en',
          resource_id: 85,
          text: 'Old',
        },
      ],
      transliterations: [],
      reciters: [{ id: 6, name: 'Reciter' }],
      ayahAudio: [],
      chapterAudio: [],
    };
    const newDataset = {
      ...oldDataset,
      chapters: [{ id: 1, name_simple: 'New' }],
      translations: [
        {
          id: 5,
          verse_id: 1,
          verse_key: '1:1',
          language: 'en',
          resource_id: 85,
          text: 'New',
        },
      ],
    };
    const { service } = createService({
      schemaVersion: 1,
      resourcesFilter: QURAN_RESOURCE_FILTER,
      syncToken: 'internal-token',
      lastSuccessfulSyncAt: '2026-06-01T03:00:00.000Z',
      revision: 'revision-new',
      previous: { revision: 'revision-old', dataset: oldDataset },
      dataset: newDataset,
    });

    const incremental = await service.getChanges('revision-old');
    expect(incremental).toMatchObject({
      kind: 'incremental',
      fromRevision: 'revision-old',
      revision: 'revision-new',
    });
    expect(
      incremental.kind === 'incremental' && incremental.changes[0],
    ).toMatchObject({
      table: 'chapters',
      upserts: [{ id: 1, name_simple: 'New' }],
    });
    const translationChange =
      incremental.kind === 'incremental'
        ? incremental.changes.find((change) => change.table === 'translations')
        : undefined;
    expect(translationChange?.upserts[0]).toEqual({
      id: 5,
      verse_id: 1,
      language: 'en',
      resource_id: 85,
      text: 'New',
    });
    await expect(service.getChanges('stale-revision')).resolves.toMatchObject({
      kind: 'full',
      revision: 'revision-new',
      chapters: [{ id: 1, name_simple: 'New' }],
    });
  });
});
