import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '../../common/redis.service.js';

export const QURAN_RESOURCE_FILTER =
  'quran_core:1;translations:45,57,85;recitations:6';
const STATE_KEY = 'qalb:quran:content-sync:v1';
const STATUS_KEY = 'qalb:quran:content-sync:status:v1';
const LOCK_KEY = 'qalb:quran:content-sync:lock';
const LOCK_TTL_MS = 15 * 60 * 1000;
const EXPECTED_VERSES = 6236;
const EXPECTED_CHAPTERS = 114;
const RECITER_NAME = 'Mahmoud Khalil Al-Husary';

export interface QuranDataset {
  chapters: Record<string, unknown>[];
  verses: Record<string, unknown>[];
  translations: Record<string, unknown>[];
  transliterations: Record<string, unknown>[];
  reciters: { id: number; name: string }[];
  ayahAudio: Record<string, unknown>[];
  chapterAudio: Record<string, unknown>[];
}

interface QuranSyncState {
  schemaVersion: 1;
  resourcesFilter: string;
  syncToken: string;
  lastSuccessfulSyncAt: string;
  revision: string;
  dataset: QuranDataset;
  previous?: { revision: string; dataset: QuranDataset } | null;
}

interface QuranSyncMetadata {
  revision: string;
  lastSuccessfulSyncAt: string;
  counts: {
    chapters: number;
    verses: number;
    translations: number;
    transliterations: number;
    ayahAudio: number;
  };
}

interface SyncEnvelope {
  sync: {
    has_more: boolean;
    next_page_url: string | null;
    next_sync_token: string;
    mutations: SyncMutation[];
  };
}

interface SyncMutation {
  sequence: number;
  type: string;
  resource_group: string;
  resource_id: number;
  record_type: string | null;
  record_key: string | null;
  data: Record<string, unknown> | null;
  snapshot_url: string | null;
}

interface QfSnapshot {
  resource_group: string;
  resource_id: number;
  schema_version: number;
  sync_sequence: number;
  records: Record<string, unknown>[];
}

export function mostRecentMondaySchedule(
  now: Date,
  timeZone: string,
  hour = 3,
): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;
  const localDay = new Date(
    Date.UTC(parts.year!, parts.month! - 1, parts.day!),
  );
  const daysSinceMonday = (localDay.getUTCDay() + 6) % 7;
  localDay.setUTCDate(localDay.getUTCDate() - daysSinceMonday);

  const toUtc = (year: number, month: number, day: number) => {
    let candidate = Date.UTC(year, month - 1, day, hour);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const actual = Object.fromEntries(
        formatter
          .formatToParts(new Date(candidate))
          .filter((part) => part.type !== 'literal')
          .map((part) => [part.type, Number(part.value)]),
      ) as Record<string, number>;
      const intended = Date.UTC(year, month - 1, day, hour);
      const represented = Date.UTC(
        actual.year!,
        actual.month! - 1,
        actual.day!,
        actual.hour!,
        actual.minute!,
        actual.second!,
      );
      candidate += intended - represented;
    }
    return new Date(candidate);
  };

  let dueAt = toUtc(
    localDay.getUTCFullYear(),
    localDay.getUTCMonth() + 1,
    localDay.getUTCDate(),
  );
  if (dueAt.getTime() > now.getTime()) {
    localDay.setUTCDate(localDay.getUTCDate() - 7);
    dueAt = toUtc(
      localDay.getUTCFullYear(),
      localDay.getUTCMonth() + 1,
      localDay.getUTCDate(),
    );
  }
  return dueAt;
}

const numberField = (record: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(+value)) {
      return +value;
    }
  }
  return null;
};

const stringField = (record: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
};

const chapterRecord = (record: Record<string, unknown>) => ({
  id: numberField(record, 'id'),
  chapter_number: numberField(record, 'chapter_number'),
  name_simple: stringField(record, 'name_simple'),
  name_arabic: stringField(record, 'name_arabic'),
  name_complex: stringField(record, 'name_complex'),
  translated_name: stringField(record, 'translated_name'),
  revelation_place: stringField(record, 'revelation_place'),
  revelation_order: numberField(record, 'revelation_order'),
  verses_count: numberField(record, 'verses_count'),
});

const verseRecord = (record: Record<string, unknown>) => ({
  id: numberField(record, 'id'),
  chapter_id: numberField(record, 'chapter_id'),
  verse_number: numberField(record, 'verse_number'),
  verse_index: numberField(record, 'verse_index'),
  verse_key: stringField(record, 'verse_key'),
  text_uthmani: stringField(record, 'text_uthmani'),
});

const translationRecord = (
  record: Record<string, unknown>,
  resourceId: number,
) => ({
  id: numberField(record, 'id'),
  verse_id: numberField(record, 'verse_id'),
  verse_key: stringField(record, 'verse_key'),
  language: resourceId === 85 ? 'en' : 'ru',
  resource_id: resourceId,
  text: stringField(record, 'text'),
  foot_notes: stringField(record, 'foot_notes', 'footnotes'),
});

const transliterationRecord = (record: Record<string, unknown>) => ({
  id: numberField(record, 'id'),
  verse_id: numberField(record, 'verse_id'),
  verse_key: stringField(record, 'verse_key'),
  resource_id: 57,
  text: stringField(record, 'text'),
});

const audioRecord = (record: Record<string, unknown>) => ({
  id: numberField(record, 'id'),
  verse_id: numberField(record, 'verse_id'),
  verse_key: stringField(record, 'verse_key'),
  reciter_id: 6,
  url: stringField(record, 'url', 'audio_url'),
  duration: numberField(record, 'duration'),
  format: stringField(record, 'format'),
  mime_type: stringField(record, 'mime_type'),
  segments_json: JSON.stringify(record.segments ?? null),
  updated_at: stringField(record, 'updated_at'),
});

const emptyDataset = (): QuranDataset => ({
  chapters: [],
  verses: [],
  translations: [],
  transliterations: [],
  reciters: [{ id: 6, name: RECITER_NAME }],
  ayahAudio: [],
  chapterAudio: [],
});

const projectSnapshot = (snapshot: QfSnapshot): QuranDataset => {
  const dataset = emptyDataset();
  const records = snapshot.records;
  if (!Array.isArray(records))
    throw new Error('Snapshot has no records array.');

  if (snapshot.resource_group === 'quran_core' && snapshot.resource_id === 1) {
    dataset.chapters = records
      .filter((record) => record.record_type === 'chapter')
      .map(chapterRecord) as Record<string, unknown>[];
    dataset.verses = records
      .filter((record) => record.record_type === 'verse')
      .map(verseRecord) as Record<string, unknown>[];
  } else if (snapshot.resource_group === 'translations') {
    if (![45, 57, 85].includes(snapshot.resource_id)) {
      throw new Error('Unexpected translation resource in snapshot.');
    }
    if (snapshot.resource_id === 57) {
      dataset.transliterations = records.map(transliterationRecord) as Record<
        string,
        unknown
      >[];
    } else {
      dataset.translations = records.map((record) =>
        translationRecord(record, snapshot.resource_id),
      ) as Record<string, unknown>[];
    }
  } else if (
    snapshot.resource_group === 'recitations' &&
    snapshot.resource_id === 6
  ) {
    dataset.ayahAudio = records
      .filter((record) => record.record_type === 'audio_file')
      .map(audioRecord) as Record<string, unknown>[];
  } else {
    throw new Error(
      'Snapshot resource is not in the configured Qalb resource set.',
    );
  }

  return dataset;
};

const uniqueBy = <T extends Record<string, unknown>>(
  records: T[],
  key: keyof T,
) => new Set(records.map((record) => record[key])).size === records.length;

function validateCompleteDataset(dataset: QuranDataset): void {
  if (
    dataset.chapters.length !== EXPECTED_CHAPTERS ||
    dataset.verses.length !== EXPECTED_VERSES ||
    !uniqueBy(dataset.chapters, 'id') ||
    !uniqueBy(dataset.verses, 'id') ||
    !uniqueBy(dataset.verses, 'verse_key')
  ) {
    throw new Error(
      'Quran core snapshot is incomplete or contains duplicate rows.',
    );
  }
  for (const resourceId of [45, 57, 85]) {
    const rows =
      resourceId === 57
        ? dataset.transliterations
        : dataset.translations.filter((row) => row.resource_id === resourceId);
    if (
      rows.length !== EXPECTED_VERSES ||
      !uniqueBy(rows, 'id') ||
      !uniqueBy(rows, 'verse_key') ||
      rows.some((row) => !row.text || !row.verse_key)
    ) {
      throw new Error(`Quran resource ${resourceId} snapshot is incomplete.`);
    }
  }
  if (
    !uniqueBy(
      dataset.translations as (Record<string, unknown> & { id: unknown })[],
      'id',
    )
  ) {
    throw new Error('Translation snapshot IDs are not globally unique.');
  }
  if (
    dataset.ayahAudio.length !== EXPECTED_VERSES ||
    !uniqueBy(dataset.ayahAudio, 'id') ||
    !uniqueBy(dataset.ayahAudio, 'verse_key') ||
    dataset.ayahAudio.some((row) => !row.url || !row.verse_key)
  ) {
    throw new Error('Selected recitation snapshot is incomplete.');
  }
  const chapterIds = new Set(dataset.chapters.map((row) => row.id));
  const verseKeys = new Set(dataset.verses.map((row) => row.verse_key));
  if (
    dataset.verses.some(
      (row) => !chapterIds.has(row.chapter_id) || !row.text_uthmani,
    ) ||
    [
      ...dataset.translations,
      ...dataset.transliterations,
      ...dataset.ayahAudio,
    ].some((row) => !verseKeys.has(row.verse_key))
  ) {
    throw new Error(
      'Quran snapshots contain invalid verse or chapter references.',
    );
  }
}

const mergeSnapshot = (
  dataset: QuranDataset,
  snapshot: QfSnapshot,
  bootstrap = false,
) => {
  const projected = projectSnapshot(snapshot);
  validateResourceSnapshot(snapshot, projected);
  if (snapshot.resource_group === 'quran_core') {
    dataset.chapters = projected.chapters;
    dataset.verses = projected.verses;
  } else if (snapshot.resource_group === 'translations') {
    if (snapshot.resource_id === 57) {
      dataset.transliterations = projected.transliterations;
    } else {
      dataset.translations = dataset.translations.filter(
        (row) => row.resource_id !== snapshot.resource_id,
      );
      dataset.translations.push(...projected.translations);
    }
  } else if (snapshot.resource_group === 'recitations') {
    dataset.ayahAudio = projected.ayahAudio;
  }
};

function validateResourceSnapshot(
  snapshot: QfSnapshot,
  projected: QuranDataset,
): void {
  if (
    !Number.isInteger(snapshot.schema_version) ||
    !Number.isFinite(snapshot.sync_sequence) ||
    !Array.isArray(snapshot.records) ||
    snapshot.records.length === 0
  ) {
    throw new Error(
      'Content Sync snapshot metadata or records are incomplete.',
    );
  }
  if (snapshot.resource_group === 'quran_core') {
    if (
      projected.chapters.length !== EXPECTED_CHAPTERS ||
      projected.verses.length !== EXPECTED_VERSES ||
      !uniqueBy(projected.chapters, 'id') ||
      !uniqueBy(projected.verses, 'id') ||
      !uniqueBy(projected.verses, 'verse_key')
    ) {
      throw new Error(
        'Quran core snapshot is incomplete or contains duplicate rows.',
      );
    }
    return;
  }

  const rows =
    snapshot.resource_group === 'translations'
      ? snapshot.resource_id === 57
        ? projected.transliterations
        : projected.translations
      : projected.ayahAudio;
  const validCount = rows.length === EXPECTED_VERSES;
  if (
    !validCount ||
    !uniqueBy(rows, 'id') ||
    !uniqueBy(rows, 'verse_key') ||
    rows.some(
      (row) =>
        (!row.text && snapshot.resource_group === 'translations') ||
        (!row.url && snapshot.resource_group === 'recitations') ||
        !row.verse_key,
    )
  ) {
    throw new Error(
      `Quran ${snapshot.resource_group}:${snapshot.resource_id} snapshot is incomplete.`,
    );
  }
}

const applyMutation = (dataset: QuranDataset, mutation: SyncMutation) => {
  if (mutation.type === 'RESOURCE_UPDATE') return;
  if (mutation.type === 'RESOURCE_DELETE') {
    if (
      mutation.resource_group === 'quran_core' &&
      mutation.resource_id === 1
    ) {
      throw new Error(
        'The required Quran core resource was deleted; retaining the last valid dataset.',
      );
    }
    if (mutation.resource_group === 'translations') {
      dataset.translations = dataset.translations.filter(
        (row) => row.resource_id !== mutation.resource_id,
      );
      if (mutation.resource_id === 57) dataset.transliterations = [];
    } else if (
      mutation.resource_group === 'recitations' &&
      mutation.resource_id === 6
    ) {
      dataset.ayahAudio = [];
    }
    return;
  }
  if (!['ROW_CREATE', 'ROW_UPDATE', 'ROW_DELETE'].includes(mutation.type)) {
    throw new Error(`Unsupported Content Sync mutation type: ${mutation.type}`);
  }

  let rows: Record<string, unknown>[] | null = null;
  let mapper:
    ((row: Record<string, unknown>) => Record<string, unknown>) | null = null;
  let key: 'id' | 'verse_key' = 'id';
  if (mutation.resource_group === 'quran_core') {
    if (mutation.record_type === 'chapter') {
      rows = dataset.chapters;
      mapper = chapterRecord;
    } else if (mutation.record_type === 'verse') {
      rows = dataset.verses;
      mapper = verseRecord;
      key = 'id';
    } else return;
  } else if (mutation.resource_group === 'translations') {
    if (mutation.resource_id === 57) {
      rows = dataset.transliterations;
      mapper = transliterationRecord;
    } else if ([45, 85].includes(mutation.resource_id)) {
      rows = dataset.translations;
      mapper = (record) => translationRecord(record, mutation.resource_id);
    } else return;
  } else if (
    mutation.resource_group === 'recitations' &&
    mutation.resource_id === 6
  ) {
    if (mutation.record_type !== 'audio_file') return;
    rows = dataset.ayahAudio;
    mapper = audioRecord;
  } else return;

  if (!rows || !mapper) return;
  const recordId = mutation.record_key;
  if (typeof recordId !== 'string' || recordId.length === 0) {
    throw new Error('Row mutation has no record key.');
  }
  const belongsToResource = (row: Record<string, unknown>) =>
    mutation.resource_group !== 'translations' ||
    Number(row.resource_id) === mutation.resource_id;
  if (mutation.type === 'ROW_DELETE') {
    rows.splice(
      0,
      rows.length,
      ...rows.filter(
        (row) =>
          !belongsToResource(row) ||
          (String(row.id) !== String(recordId) &&
            String(row.verse_key) !== String(recordId)),
      ),
    );
    return;
  }
  if (!mutation.data) throw new Error('Row mutation has no data payload.');
  const mapped = mapper(mutation.data);
  const mappedId = String(mapped[key]);
  const index = rows.findIndex(
    (row) =>
      belongsToResource(row) &&
      (String(row[key]) === mappedId || String(row[key]) === String(recordId)),
  );
  if (index === -1) rows.push(mapped);
  else rows[index] = mapped;
};

@Injectable()
export class QuranContentSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly stateKey = STATE_KEY;
  private timer?: NodeJS.Timeout;
  private inFlight?: Promise<void>;
  private retryAt = 0;
  private failures = 0;
  private closing = false;
  private lastCatchUpRequestAt = 0;
  private cachedState: QuranSyncState | null = null;
  private readonly cachedDiffs = new Map<
    string,
    { fromRevision: string; changes: ReturnType<typeof diffDatasets> }
  >();

  constructor(
    private readonly redis: RedisService,
    private readonly pino: PinoLogger,
  ) {
    this.pino.setContext(QuranContentSyncService.name);
  }

  onModuleInit(): void {
    this.timer = setInterval(() => void this.syncIfDue(), 60_000);
    this.timer.unref?.();
    setTimeout(() => void this.syncIfDue(), 2_000).unref?.();
  }

  onModuleDestroy(): void {
    this.closing = true;
    if (this.timer) clearInterval(this.timer);
  }

  async getStatus() {
    const metadata =
      await this.redis.getPersistent<QuranSyncMetadata>(STATUS_KEY);
    if (!metadata)
      return {
        available: false,
        revision: null,
        lastSuccessfulSyncAt: null,
        counts: null,
      };
    return { available: true, ...metadata };
  }

  requestCatchUp(): void {
    const now = Date.now();
    if (now - this.lastCatchUpRequestAt < 5 * 60_000) return;
    this.lastCatchUpRequestAt = now;
    void this.syncIfDue();
  }

  async getDataset(): Promise<
    QuranDataset & { revision: string; syncedAt: string }
  > {
    const metadata =
      await this.redis.getPersistent<QuranSyncMetadata>(STATUS_KEY);
    if (!metadata)
      throw new ServiceUnavailableException(
        'Quran content is not available yet.',
      );
    let state =
      this.cachedState?.revision === metadata.revision
        ? this.cachedState
        : null;
    if (!state) {
      state = await this.redis.getPersistent<QuranSyncState>(this.stateKey);
      if (!state)
        throw new ServiceUnavailableException(
          'Quran content is not available yet.',
        );
      this.cachedState = state;
    }
    return {
      ...state.dataset,
      revision: state.revision,
      syncedAt: state.lastSuccessfulSyncAt,
    };
  }

  async getChanges(revision: string | null) {
    const metadata =
      await this.redis.getPersistent<QuranSyncMetadata>(STATUS_KEY);
    if (!metadata)
      throw new ServiceUnavailableException(
        'Quran content is not available yet.',
      );
    let state =
      this.cachedState?.revision === metadata.revision
        ? this.cachedState
        : null;
    if (!state) {
      state = await this.redis.getPersistent<QuranSyncState>(this.stateKey);
      if (!state)
        throw new ServiceUnavailableException(
          'Quran content is not available yet.',
        );
      this.cachedState = state;
    }
    if (revision && state.previous?.revision === revision) {
      let cached = this.cachedDiffs.get(state.revision);
      if (!cached || cached.fromRevision !== revision) {
        cached = {
          fromRevision: revision,
          changes: diffDatasets(state.previous.dataset, state.dataset),
        };
        this.cachedDiffs.set(state.revision, cached);
        if (this.cachedDiffs.size > 2)
          this.cachedDiffs.delete(this.cachedDiffs.keys().next().value!);
      }
      return {
        kind: 'incremental' as const,
        fromRevision: revision,
        revision: state.revision,
        syncedAt: state.lastSuccessfulSyncAt,
        changes: cached.changes,
      };
    }
    return {
      kind: 'full' as const,
      ...state.dataset,
      revision: state.revision,
      syncedAt: state.lastSuccessfulSyncAt,
    };
  }

  private async syncIfDue(): Promise<void> {
    if (this.closing || this.inFlight || Date.now() < this.retryAt) return;
    this.inFlight = this.runSync();
    try {
      await this.inFlight;
      this.failures = 0;
      this.retryAt = 0;
    } catch (error) {
      this.failures += 1;
      const baseMs = Math.min(
        24 * 60 * 60_000,
        5 * 60_000 * 2 ** Math.min(this.failures - 1, 8),
      );
      const jitterMs = Math.floor(
        Math.random() * Math.min(baseMs * 0.2, 60_000),
      );
      this.retryAt = Date.now() + baseMs + jitterMs;
      const errorCode = error instanceof Error ? error.name : 'UnknownError';
      this.pino.warn(
        {
          event: 'sync_failed',
          errorCode,
          retryAt: new Date(this.retryAt).toISOString(),
        },
        'Quran Content Sync failed; retaining the last committed dataset and cursor',
      );
    } finally {
      this.inFlight = undefined;
    }
  }

  private async runSync(): Promise<void> {
    if (!this.redis.isConfigured()) {
      throw new Error(
        'Durable Redis storage is required for Quran Content Sync.',
      );
    }
    const clientId = process.env.QURAN_FOUNDATION_CLIENT_ID;
    const clientSecret = process.env.QURAN_FOUNDATION_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error(
        'Quran.Foundation Content API credentials are not configured.',
      );
    }

    const lockValue = randomUUID();
    if (!(await this.redis.acquireLock(LOCK_KEY, lockValue, LOCK_TTL_MS)))
      return;
    let lockLost = false;
    const lockRenewalTimer = setInterval(() => {
      void this.redis
        .renewLock(LOCK_KEY, lockValue, LOCK_TTL_MS)
        .then((renewed) => {
          if (!renewed) lockLost = true;
        })
        .catch(() => {
          lockLost = true;
        });
    }, 60_000);
    lockRenewalTimer.unref?.();
    try {
      const metadata =
        await this.redis.getPersistent<QuranSyncMetadata>(STATUS_KEY);
      const timeZone = process.env.QURAN_SYNC_TIMEZONE ?? 'UTC';
      const scheduleHour = Number(process.env.QURAN_SYNC_HOUR ?? 3);
      if (
        !Number.isInteger(scheduleHour) ||
        scheduleHour < 0 ||
        scheduleHour > 23
      ) {
        throw new Error('QURAN_SYNC_HOUR must be an integer from 0 to 23.');
      }
      const dueAt = mostRecentMondaySchedule(
        new Date(),
        timeZone,
        scheduleHour,
      );
      if (
        metadata &&
        Date.parse(metadata.lastSuccessfulSyncAt) >= dueAt.getTime()
      )
        return;
      const previous = await this.redis.getPersistent<QuranSyncState>(
        this.stateKey,
      );

      const token = await this.getAccessToken(clientId, clientSecret);
      let dataset: QuranDataset;
      let syncToken: string | null = previous?.syncToken ?? null;
      let pages: SyncEnvelope[];
      try {
        pages = await this.getSyncPages(token, clientId, syncToken);
      } catch (error) {
        if (!syncToken || !this.isRejectedSyncToken(error)) throw error;
        this.pino.warn(
          { event: 'token_recovery' },
          'Quran Content Sync cursor rejected; rebuilding from a fresh bootstrap',
        );
        syncToken = null;
        pages = await this.getSyncPages(token, clientId, null);
      }

      const mutations = pages.flatMap((page) => page.sync.mutations);
      const finalToken = pages.at(-1)?.sync.next_sync_token;
      if (!finalToken)
        throw new Error('Content Sync final page has no next sync token.');

      if (!previous || !syncToken) {
        dataset = emptyDataset();
        const snapshotMutations = mutations.filter(
          (item) =>
            item.type === 'RESOURCE_CREATE' ||
            item.type === 'RESOURCE_INVALIDATE',
        );
        for (const expected of [
          ['quran_core', 1],
          ['translations', 45],
          ['translations', 57],
          ['translations', 85],
          ['recitations', 6],
        ] as const) {
          if (
            !snapshotMutations.some(
              (item) =>
                item.resource_group === expected[0] &&
                item.resource_id === expected[1],
            )
          ) {
            throw new Error(
              `Content Sync bootstrap omitted ${expected[0]}:${expected[1]}.`,
            );
          }
        }
        for (const mutation of snapshotMutations) {
          if (!mutation.snapshot_url)
            throw new Error('Bootstrap resource has no snapshot URL.');
          const snapshot = await this.fetchSnapshot(
            token,
            clientId,
            mutation.snapshot_url,
          );
          mergeSnapshot(dataset, snapshot, true);
        }
        validateCompleteDataset(dataset);
      } else {
        dataset = structuredClone(previous.dataset);
        for (const mutation of mutations.sort(
          (left, right) => left.sequence - right.sequence,
        )) {
          if (
            mutation.type === 'RESOURCE_CREATE' ||
            mutation.type === 'RESOURCE_INVALIDATE'
          ) {
            if (!mutation.snapshot_url)
              throw new Error('Invalidation has no snapshot URL.');
            mergeSnapshot(
              dataset,
              await this.fetchSnapshot(token, clientId, mutation.snapshot_url),
            );
          } else {
            applyMutation(dataset, mutation);
          }
        }
        validateDatasetIntegrity(dataset);
        validateCompleteDataset(dataset);
      }

      const lastSuccessfulSyncAt = new Date().toISOString();
      const revision = createHash('sha256')
        .update(JSON.stringify(dataset))
        .digest('hex');
      const nextState: QuranSyncState = {
        schemaVersion: 1,
        resourcesFilter: QURAN_RESOURCE_FILTER,
        syncToken: finalToken,
        lastSuccessfulSyncAt,
        revision,
        dataset,
        previous: previous
          ? revision === previous.revision
            ? (previous.previous ?? null)
            : { revision: previous.revision, dataset: previous.dataset }
          : null,
      };
      if (
        lockLost ||
        !(await this.redis.renewLock(LOCK_KEY, lockValue, LOCK_TTL_MS))
      ) {
        throw new Error(
          'Quran Content Sync lost its Redis lock before commit; retaining the last committed dataset and cursor.',
        );
      }
      if (
        !(await this.redis.setPersistentWithLock(
          this.stateKey,
          nextState,
          LOCK_KEY,
          lockValue,
          {
            key: STATUS_KEY,
            value: {
              revision,
              lastSuccessfulSyncAt,
              counts: {
                chapters: dataset.chapters.length,
                verses: dataset.verses.length,
                translations: dataset.translations.length,
                transliterations: dataset.transliterations.length,
                ayahAudio: dataset.ayahAudio.length,
              },
            } satisfies QuranSyncMetadata,
          },
        ))
      ) {
        throw new Error('Durable Quran dataset commit failed.');
      }
      this.cachedState = nextState;
      this.cachedDiffs.clear();
      this.pino.info(
        {
          event: previous ? 'incremental_sync_complete' : 'bootstrap_complete',
          revision,
          chapters: dataset.chapters.length,
          verses: dataset.verses.length,
          translations: dataset.translations.length,
          transliterations: dataset.transliterations.length,
          ayahAudio: dataset.ayahAudio.length,
          lastSuccessfulSyncAt,
        },
        'Quran Content Sync committed',
      );
    } finally {
      clearInterval(lockRenewalTimer);
      await this.redis.releaseLock(LOCK_KEY, lockValue);
    }
  }

  private async getAccessToken(clientId: string, clientSecret: string) {
    const environment = process.env.QURAN_FOUNDATION_ENV ?? 'production';
    if (!['production', 'prelive'].includes(environment)) {
      throw new Error('QURAN_FOUNDATION_ENV must be production or prelive.');
    }
    const endpoint =
      environment === 'prelive'
        ? 'https://prelive-oauth2.quran.foundation/oauth2/token'
        : 'https://oauth2.quran.foundation/oauth2/token';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'content',
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(
        `Quran.Foundation token request failed (${response.status}).`,
      );
    }
    const body = (await response.json()) as { access_token?: unknown };
    if (typeof body.access_token !== 'string' || !body.access_token) {
      throw new Error('Quran.Foundation token response was invalid.');
    }
    return body.access_token;
  }

  private getApiBases() {
    const environment = process.env.QURAN_FOUNDATION_ENV ?? 'production';
    if (environment === 'prelive') {
      return {
        api: 'https://apis-prelive.quran.foundation/content/api/v4',
        content: 'https://apis-prelive.quran.foundation/content',
      };
    }
    return {
      api: 'https://apis.quran.foundation/content/api/v4',
      content: 'https://apis.quran.foundation/content',
    };
  }

  private async requestQf(
    url: string,
    token: string,
    clientId: string,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'x-auth-token': token,
        'x-client-id': clientId,
      },
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(
        `Quran.Foundation Content Sync request failed (${response.status}).`,
      );
    }
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Quran.Foundation returned an invalid response.');
    }
    return body as Record<string, unknown>;
  }

  private async getSyncPages(
    token: string,
    clientId: string,
    syncToken: string | null,
  ): Promise<SyncEnvelope[]> {
    const { api, content } = this.getApiBases();
    const first = new URL(`${api}/resources/sync`);
    first.searchParams.set('resources', QURAN_RESOURCE_FILTER);
    first.searchParams.set('per_page', '100');
    if (syncToken) first.searchParams.set('sync_token', syncToken);
    else first.searchParams.set('bootstrap', 'true');

    const pages: SyncEnvelope[] = [];
    let url: string | null = first.toString();
    let maxPages = 1000;
    while (url && maxPages-- > 0) {
      const response = await this.requestQf(url, token, clientId);
      const envelope = response as unknown as SyncEnvelope;
      if (
        !envelope.sync ||
        !Array.isArray(envelope.sync.mutations) ||
        typeof envelope.sync.has_more !== 'boolean' ||
        typeof envelope.sync.next_sync_token !== 'string'
      ) {
        throw new Error(
          'Quran.Foundation returned an invalid Content Sync page.',
        );
      }
      pages.push(envelope);
      if (!envelope.sync.has_more) return pages;
      const nextPath = envelope.sync.next_page_url;
      if (!nextPath || !nextPath.startsWith('/')) {
        throw new Error('Quran.Foundation pagination link was invalid.');
      }
      const next = new URL(nextPath, content);
      if (next.origin !== new URL(content).origin) {
        throw new Error('Quran.Foundation pagination link changed host.');
      }
      url = next.toString();
    }
    throw new Error('Content Sync pagination exceeded the safety limit.');
  }

  private async fetchSnapshot(
    token: string,
    clientId: string,
    path: string,
  ): Promise<QfSnapshot> {
    const { content } = this.getApiBases();
    if (!path.startsWith('/'))
      throw new Error('Content Sync snapshot URL was invalid.');
    const url = new URL(path, content);
    if (url.origin !== new URL(content).origin) {
      throw new Error('Content Sync snapshot URL changed host.');
    }
    const body = (await this.requestQf(
      url.toString(),
      token,
      clientId,
    )) as unknown as QfSnapshot;
    if (
      typeof body.resource_group !== 'string' ||
      typeof body.resource_id !== 'number' ||
      typeof body.schema_version !== 'number' ||
      typeof body.sync_sequence !== 'number' ||
      !Array.isArray(body.records)
    ) {
      throw new Error('Quran.Foundation returned an invalid full snapshot.');
    }
    return body;
  }

  private isRejectedSyncToken(error: unknown) {
    return error instanceof Error && /\(400\)|\(422\)/.test(error.message);
  }
}

function validateCore(dataset: QuranDataset) {
  if (
    dataset.chapters.length !== EXPECTED_CHAPTERS ||
    dataset.verses.length !== EXPECTED_VERSES ||
    !uniqueBy(dataset.chapters, 'id') ||
    !uniqueBy(dataset.verses, 'id') ||
    !uniqueBy(dataset.verses, 'verse_key')
  ) {
    throw new Error('Incremental sync produced an invalid Quran core.');
  }
}

function validateDatasetIntegrity(dataset: QuranDataset): void {
  validateCore(dataset);
  const verseKeys = new Set(dataset.verses.map((row) => row.verse_key));
  const chapterIds = new Set(dataset.chapters.map((row) => row.id));
  if (
    dataset.verses.some(
      (row) =>
        !chapterIds.has(row.chapter_id) ||
        typeof row.text_uthmani !== 'string' ||
        !row.text_uthmani,
    ) ||
    dataset.translations.some(
      (row) =>
        ![45, 85].includes(Number(row.resource_id)) ||
        !verseKeys.has(row.verse_key) ||
        typeof row.text !== 'string' ||
        !row.text,
    ) ||
    dataset.transliterations.some(
      (row) =>
        Number(row.resource_id) !== 57 ||
        !verseKeys.has(row.verse_key) ||
        typeof row.text !== 'string' ||
        !row.text,
    ) ||
    dataset.ayahAudio.some(
      (row) =>
        Number(row.reciter_id) !== 6 ||
        !verseKeys.has(row.verse_key) ||
        typeof row.url !== 'string' ||
        !row.url,
    )
  ) {
    throw new Error('Incremental sync produced invalid resource rows.');
  }
  for (const [rows, key] of [
    [dataset.transliterations, 'id'],
    [dataset.transliterations, 'verse_key'],
    [dataset.ayahAudio, 'id'],
    [dataset.ayahAudio, 'verse_key'],
  ] as const) {
    if (!uniqueBy(rows, key)) {
      throw new Error('Incremental sync produced duplicate resource rows.');
    }
  }
  for (const resourceId of [45, 85]) {
    const rows = dataset.translations.filter(
      (record) => record.resource_id === resourceId,
    );
    if (!uniqueBy(rows, 'id') || !uniqueBy(rows, 'verse_key')) {
      throw new Error('Incremental sync produced duplicate translation rows.');
    }
  }
  if (!uniqueBy(dataset.translations, 'id')) {
    throw new Error('Incremental sync produced duplicate translation IDs.');
  }
}

function diffDatasets(previous: QuranDataset, current: QuranDataset) {
  const tableSpecs = [
    ['chapters', 'chapters', 'id'],
    ['verses', 'verses', 'id'],
    ['translations', 'translations', 'id'],
    ['transliterations', 'transliterations', 'id'],
    ['reciters', 'reciters', 'id'],
    ['ayah_audio', 'ayahAudio', 'id'],
    ['chapter_audio', 'chapterAudio', 'id'],
  ] as const;
  return tableSpecs.map(([table, property, key]) => {
    const before = previous[property] as Record<string, unknown>[];
    const after = current[property] as Record<string, unknown>[];
    const beforeById = new Map(before.map((row) => [String(row[key]), row]));
    const afterById = new Map(after.map((row) => [String(row[key]), row]));
    const upserts = after
      .filter((row) => {
        const old = beforeById.get(String(row[key]));
        return !old || JSON.stringify(old) !== JSON.stringify(row);
      })
      .map((row) => {
        if (table === 'verses' || !('verse_key' in row)) return row;
        const { verse_key: _serverOnlyVerseKey, ...mobileRow } = row;
        return mobileRow;
      });
    const deletes = before
      .filter((row) => !afterById.has(String(row[key])))
      .map((row) => row[key]);
    return { table, upserts, deletes };
  });
}
