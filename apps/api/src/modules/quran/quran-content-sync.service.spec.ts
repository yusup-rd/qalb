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
  const redisMock = {
    isConfigured: () => true,
    getPersistent: vi.fn(async () => persisted),
    setPersistent: vi.fn(async (_key: string, value: unknown) => {
      persisted = value;
      return true;
    }),
    setPersistentWithLock: vi.fn(async (_key: string, value: unknown) => {
      persisted = value;
      return true;
    }),
    acquireLock: vi.fn(async () => true),
    renewLock: vi.fn(async () => true),
    releaseLock: vi.fn(async () => undefined),
  };
  const redis = redisMock as unknown as RedisService;
  const logger = {
    setContext: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  } as unknown as PinoLogger;
  const service = new QuranContentSyncService(redis, logger);
  return { service, redisMock, readPersisted: () => persisted };
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
    expect(redisMock.setPersistentWithLock).toHaveBeenCalledOnce();
    expect(state.syncToken).toBe('bootstrap-token');
    expect(state.revision).toMatch(/^[a-f0-9]{64}$/);
    expect(state.dataset.chapters).toHaveLength(114);
    expect(state.dataset.verses).toHaveLength(6236);
    expect(state.dataset.translations).toHaveLength(12_472);
    expect(state.dataset.transliterations).toHaveLength(6236);
    expect(state.dataset.ayahAudio).toHaveLength(6236);
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

    expect(redisMock.setPersistentWithLock).not.toHaveBeenCalled();
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

    expect(redisMock.setPersistentWithLock).not.toHaveBeenCalled();
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

    expect(redisMock.setPersistentWithLock).not.toHaveBeenCalled();
    expect(readPersisted()).toBe(previous);
  });

  it('does not start another sync when a different worker holds the Redis lock', async () => {
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_ID', 'client-id');
    vi.stubEnv('QURAN_FOUNDATION_CLIENT_SECRET', 'client-secret');
    const { service, redisMock } = createService();
    redisMock.acquireLock.mockResolvedValue(false);

    await (service as unknown as { runSync: () => Promise<void> }).runSync();

    expect(redisMock.getPersistent).not.toHaveBeenCalled();
    expect(redisMock.setPersistentWithLock).not.toHaveBeenCalled();
  });

  it('returns incremental table changes only for the retained prior revision', async () => {
    const oldDataset = {
      chapters: [{ id: 1, name_simple: 'Old' }],
      verses: [],
      translations: [],
      transliterations: [],
      reciters: [{ id: 6, name: 'Reciter' }],
      ayahAudio: [],
      chapterAudio: [],
    };
    const newDataset = {
      ...oldDataset,
      chapters: [{ id: 1, name_simple: 'New' }],
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
    await expect(service.getChanges('stale-revision')).resolves.toMatchObject({
      kind: 'full',
      revision: 'revision-new',
      chapters: [{ id: 1, name_simple: 'New' }],
    });
  });
});
