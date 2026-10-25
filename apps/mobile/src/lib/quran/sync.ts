import { apiRequest } from "@/api/client";
import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";
import { getQuranBootstrapErrorKind } from "./bootstrap-error";
import {
  createQuranBootstrapReporter,
  type QuranBootstrapObserver,
  type QuranBootstrapReporter,
} from "./bootstrap-progress";
import {
  isSecureAudioUrl,
  validateQuranSnapshot,
  type QuranSnapshot,
} from "./snapshot-validation";

type QuranServerStatus = {
  available: true;
  revision: string;
  lastSuccessfulSyncAt: string;
};

type QuranChanges = {
  kind: "incremental";
  fromRevision: string;
  revision: string;
  syncedAt: string;
  changes: {
    table: string;
    upserts: Record<string, SQLiteBindValue>[];
    deletes: SQLiteBindValue[];
  }[];
};

const schema = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY, chapter_number INTEGER NOT NULL UNIQUE,
  name_simple TEXT NOT NULL, name_arabic TEXT NOT NULL, name_complex TEXT,
  translated_name TEXT, revelation_place TEXT, revelation_order INTEGER,
  verses_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS verses (
  id INTEGER PRIMARY KEY, chapter_id INTEGER NOT NULL REFERENCES chapters(id),
  verse_number INTEGER NOT NULL, verse_index INTEGER, verse_key TEXT NOT NULL UNIQUE,
  text_uthmani TEXT NOT NULL, UNIQUE(chapter_id, verse_number)
);
CREATE TABLE IF NOT EXISTS translations (
  id INTEGER PRIMARY KEY, verse_id INTEGER NOT NULL REFERENCES verses(id),
  language TEXT NOT NULL, resource_id INTEGER NOT NULL, text TEXT NOT NULL,
  foot_notes TEXT, UNIQUE(verse_id, language, resource_id)
);
CREATE TABLE IF NOT EXISTS transliterations (
  id INTEGER PRIMARY KEY, verse_id INTEGER NOT NULL UNIQUE REFERENCES verses(id),
  text TEXT NOT NULL, resource_id INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reciters (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ayah_audio (
  id INTEGER PRIMARY KEY, verse_id INTEGER NOT NULL REFERENCES verses(id),
  reciter_id INTEGER NOT NULL REFERENCES reciters(id), url TEXT NOT NULL,
  duration REAL, format TEXT, mime_type TEXT, segments_json TEXT, updated_at TEXT,
  UNIQUE(verse_id, reciter_id)
);
CREATE TABLE IF NOT EXISTS chapter_audio (
  id INTEGER PRIMARY KEY, chapter_id INTEGER NOT NULL REFERENCES chapters(id),
  reciter_id INTEGER NOT NULL REFERENCES reciters(id), url TEXT NOT NULL,
  duration REAL, format TEXT, mime_type TEXT, segments_json TEXT, updated_at TEXT,
  UNIQUE(chapter_id, reciter_id)
);
CREATE TABLE IF NOT EXISTS quran_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1), revision TEXT NOT NULL,
  synced_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quran_update_check_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_successful_check_at TEXT,
  last_attempt_at TEXT
);
CREATE INDEX IF NOT EXISTS verses_chapter_id ON verses(chapter_id);
CREATE INDEX IF NOT EXISTS verses_key ON verses(verse_key);
CREATE INDEX IF NOT EXISTS translations_verse_id ON translations(verse_id);
CREATE INDEX IF NOT EXISTS translations_language ON translations(language);
CREATE INDEX IF NOT EXISTS ayah_audio_verse_id ON ayah_audio(verse_id);
CREATE INDEX IF NOT EXISTS ayah_audio_reciter_id ON ayah_audio(reciter_id);
CREATE INDEX IF NOT EXISTS chapter_audio_chapter_id ON chapter_audio(chapter_id);
CREATE INDEX IF NOT EXISTS chapter_audio_reciter_id ON chapter_audio(reciter_id);
`;

const QURAN_UPDATE_CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const refreshesInFlight = new WeakMap<SQLiteDatabase, Promise<boolean>>();

export function isQuranUpdateCheckDue(
  lastSuccessfulCheckAt: string | null | undefined,
  lastAttemptAt: string | null | undefined,
  now = Date.now(),
): boolean {
  const timestamps = [lastSuccessfulCheckAt, lastAttemptAt]
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter(Number.isFinite);
  if (timestamps.length === 0) return true;
  return now - Math.max(...timestamps) >= QURAN_UPDATE_CHECK_INTERVAL_MS;
}

export async function initializeQuranDatabase(
  db: SQLiteDatabase,
  onProgress?: QuranBootstrapObserver,
): Promise<void> {
  const reporter = createQuranBootstrapReporter(onProgress);
  try {
    await db.execAsync(schema);
    const localReady = await hasLocalQuran(db);
    if (!localReady) {
      await refreshQuranDatabase(db, reporter, true);
    }
    reporter.complete();
  } catch (error) {
    reporter.fail(getQuranBootstrapErrorKind(error));
    throw error;
  }
}

export async function refreshQuranDatabase(
  db: SQLiteDatabase,
  reporter?: QuranBootstrapReporter,
  force = false,
): Promise<boolean> {
  const inFlight = refreshesInFlight.get(db);
  if (inFlight) return inFlight;
  const refresh = refreshQuranDatabaseOnce(db, reporter, force).finally(() => {
    refreshesInFlight.delete(db);
  });
  refreshesInFlight.set(db, refresh);
  return refresh;
}

async function refreshQuranDatabaseOnce(
  db: SQLiteDatabase,
  reporter?: QuranBootstrapReporter,
  force = false,
): Promise<boolean> {
  await db.execAsync(schema);
  const localReady = await hasLocalQuran(db);
  const checkState = await db.getFirstAsync<{
    last_successful_check_at: string | null;
    last_attempt_at: string | null;
  }>(
    "SELECT last_successful_check_at, last_attempt_at FROM quran_update_check_state WHERE id = 1",
  );
  if (
    localReady &&
    !force &&
    !isQuranUpdateCheckDue(
      checkState?.last_successful_check_at,
      checkState?.last_attempt_at,
    )
  ) {
    return false;
  }

  const attemptedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO quran_update_check_state (id, last_attempt_at) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET last_attempt_at = excluded.last_attempt_at`,
    attemptedAt,
  );
  reporter?.stage("connecting");
  const status = await apiRequest<QuranServerStatus>(
    "/api/quran/status",
    undefined,
  );
  if (!status.available || !status.revision) {
    throw new Error(
      "Quran content is still being prepared. Please try again shortly.",
    );
  }

  const current = await db.getFirstAsync<{ revision: string }>(
    "SELECT revision FROM quran_sync_state WHERE id = 1",
  );
  if (localReady && current?.revision === status.revision) {
    await recordSuccessfulQuranCheck(db);
    return false;
  }

  reporter?.stage("downloading");
  const changes = await apiRequest<QuranChanges | QuranSnapshot>(
    `/api/quran/changes${localReady && current?.revision ? `?revision=${encodeURIComponent(current.revision)}` : ""}`,
    undefined,
    {
      timeoutMs: 45_000,
      maxAttempts: 3,
    },
  );
  reporter?.stage("validating");
  if ("kind" in changes && changes.kind === "incremental") {
    if (
      !current?.revision ||
      changes.fromRevision !== current.revision ||
      changes.revision !== status.revision ||
      !Array.isArray(changes.changes)
    ) {
      throw new Error("The Quran server returned an invalid change batch.");
    }
    reporter?.stage("saving");
    await applyChangesTransactionally(db, changes);
    await recordSuccessfulQuranCheck(db);
    return true;
  }
  const snapshot = changes as QuranSnapshot;
  validateQuranSnapshot(snapshot);
  reporter?.stage("saving");
  await applySnapshotTransactionally(db, snapshot, reporter);
  await recordSuccessfulQuranCheck(db);
  return true;
}

async function recordSuccessfulQuranCheck(db: SQLiteDatabase): Promise<void> {
  const checkedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO quran_update_check_state (id, last_successful_check_at, last_attempt_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_successful_check_at = excluded.last_successful_check_at,
       last_attempt_at = excluded.last_attempt_at`,
    checkedAt,
    checkedAt,
  );
}

const tableColumns: Record<string, { table: string; key: string }> = {
  chapters: { table: "chapters", key: "id" },
  verses: { table: "verses", key: "id" },
  translations: { table: "translations", key: "id" },
  transliterations: { table: "transliterations", key: "id" },
  reciters: { table: "reciters", key: "id" },
  ayah_audio: { table: "ayah_audio", key: "id" },
  chapter_audio: { table: "chapter_audio", key: "id" },
};
const allowedColumns: Record<string, Set<string>> = {
  chapters: new Set([
    "id",
    "chapter_number",
    "name_simple",
    "name_arabic",
    "name_complex",
    "translated_name",
    "revelation_place",
    "revelation_order",
    "verses_count",
  ]),
  verses: new Set([
    "id",
    "chapter_id",
    "verse_number",
    "verse_index",
    "verse_key",
    "text_uthmani",
  ]),
  translations: new Set([
    "id",
    "verse_id",
    "language",
    "resource_id",
    "text",
    "foot_notes",
  ]),
  transliterations: new Set(["id", "verse_id", "text", "resource_id"]),
  reciters: new Set(["id", "name"]),
  ayah_audio: new Set([
    "id",
    "verse_id",
    "reciter_id",
    "url",
    "duration",
    "format",
    "mime_type",
    "segments_json",
    "updated_at",
  ]),
  chapter_audio: new Set([
    "id",
    "chapter_id",
    "reciter_id",
    "url",
    "duration",
    "format",
    "mime_type",
    "segments_json",
    "updated_at",
  ]),
};

async function applyChangesTransactionally(
  db: SQLiteDatabase,
  batch: QuranChanges,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (transaction) => {
    for (const change of [...batch.changes].reverse()) {
      const spec = tableColumns[change.table];
      if (
        !spec ||
        !Array.isArray(change.upserts) ||
        !Array.isArray(change.deletes)
      ) {
        throw new Error("The Quran server returned an invalid table change.");
      }
      for (const id of change.deletes) {
        await transaction.runAsync(
          `DELETE FROM ${spec.table} WHERE ${spec.key} = ?`,
          id,
        );
      }
    }
    for (const change of batch.changes) {
      const spec = tableColumns[change.table];
      if (!spec)
        throw new Error("The Quran server returned an invalid table change.");
      for (const row of change.upserts) {
        if (
          (change.table === "ayah_audio" || change.table === "chapter_audio") &&
          !isSecureAudioUrl(row.url)
        ) {
          throw new Error("The Quran server returned an insecure audio URL.");
        }
        const columns = Object.keys(row);
        if (
          !columns.includes(spec.key) ||
          columns.length === 0 ||
          columns.some((column) => !allowedColumns[change.table].has(column))
        ) {
          throw new Error("The Quran server returned an invalid row change.");
        }
        const placeholders = columns.map(() => "?").join(", ");
        const updates = columns
          .filter((column) => column !== spec.key)
          .map((column) => `${column} = excluded.${column}`)
          .join(", ");
        await transaction.runAsync(
          `INSERT INTO ${spec.table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT(${spec.key}) DO ${updates ? `UPDATE SET ${updates}` : "NOTHING"}`,
          ...columns.map((column) => row[column]),
        );
      }
    }
    await transaction.runAsync(
      `INSERT INTO quran_sync_state (id, revision, synced_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, synced_at = excluded.synced_at`,
      batch.revision,
      batch.syncedAt,
    );
    // Exclusive transactions use another native connection. Foreign-key
    // enforcement on the provider connection alone cannot protect these writes.
    if (await transaction.getFirstAsync("PRAGMA foreign_key_check")) {
      throw new Error("The Quran dataset contains invalid relationships.");
    }
    const counts = await getQuranReadinessCounts(transaction);
    if (!isQuranDatasetReady(counts)) {
      throw new Error("The Quran dataset failed local database validation.");
    }
  });
}

async function applySnapshotTransactionally(
  db: SQLiteDatabase,
  snapshot: QuranSnapshot,
  reporter?: QuranBootstrapReporter,
): Promise<void> {
  const totalRows =
    snapshot.chapters.length +
    snapshot.verses.length +
    snapshot.translations.length +
    snapshot.transliterations.length +
    snapshot.reciters.length +
    snapshot.ayahAudio.length +
    snapshot.chapterAudio.length;
  let completedRows = 0;
  reporter?.rows(0, totalRows);
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync(`
      DELETE FROM ayah_audio;
      DELETE FROM chapter_audio;
      DELETE FROM translations;
      DELETE FROM transliterations;
      DELETE FROM verses;
      DELETE FROM chapters;
      DELETE FROM reciters;
    `);

    const insertRows = async (
      sql: string,
      rows: SQLiteBindValue[][],
    ): Promise<void> => {
      const statement = await transaction.prepareAsync(sql);
      try {
        for (const values of rows) {
          await statement.executeAsync(values);
          completedRows += 1;
          // Bound React updates while counting only successful native writes.
          if (completedRows % 250 === 0 || completedRows === totalRows) {
            reporter?.rows(completedRows, totalRows);
          }
        }
      } finally {
        await statement.finalizeAsync();
      }
    };

    await insertRows(
      "INSERT INTO chapters VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      snapshot.chapters.map((row) => [
        row.id,
        row.chapter_number,
        row.name_simple,
        row.name_arabic,
        row.name_complex,
        row.translated_name,
        row.revelation_place,
        row.revelation_order,
        row.verses_count,
      ]),
    );
    await insertRows(
      "INSERT INTO verses VALUES (?, ?, ?, ?, ?, ?)",
      snapshot.verses.map((row) => [
        row.id,
        row.chapter_id,
        row.verse_number,
        row.verse_index,
        row.verse_key,
        row.text_uthmani,
      ]),
    );
    await insertRows(
      "INSERT INTO translations (id, verse_id, language, resource_id, text, foot_notes) VALUES (?, ?, ?, ?, ?, ?)",
      snapshot.translations.map((row) => [
        row.id,
        row.verse_id,
        row.language,
        row.resource_id,
        row.text,
        row.foot_notes,
      ]),
    );
    await insertRows(
      "INSERT INTO transliterations (id, verse_id, text, resource_id) VALUES (?, ?, ?, ?)",
      snapshot.transliterations.map((row) => [
        row.id,
        row.verse_id,
        row.text,
        row.resource_id,
      ]),
    );
    await insertRows(
      "INSERT INTO reciters VALUES (?, ?)",
      snapshot.reciters.map((row) => [row.id, row.name]),
    );
    await insertRows(
      "INSERT INTO ayah_audio (id, verse_id, reciter_id, url, duration, format, mime_type, segments_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      snapshot.ayahAudio.map((row) => [
        row.id,
        row.verse_id,
        row.reciter_id,
        row.url,
        row.duration,
        row.format,
        row.mime_type,
        row.segments_json,
        row.updated_at,
      ]),
    );
    await insertRows(
      "INSERT INTO chapter_audio (id, chapter_id, reciter_id, url, duration, format, mime_type, segments_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      snapshot.chapterAudio.map((row) => [
        row.id,
        row.chapter_id,
        row.reciter_id,
        row.url,
        row.duration,
        row.format,
        row.mime_type,
        row.segments_json,
        row.updated_at,
      ]),
    );
    reporter?.stage("finishing");
    if (await transaction.getFirstAsync("PRAGMA foreign_key_check")) {
      throw new Error("The Quran dataset contains invalid relationships.");
    }
    await transaction.runAsync(
      `INSERT INTO quran_sync_state (id, revision, synced_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, synced_at = excluded.synced_at`,
      snapshot.revision,
      snapshot.syncedAt,
    );
    const counts = await getQuranReadinessCounts(transaction);
    if (!isQuranDatasetReady(counts)) {
      throw new Error("The Quran dataset failed local database validation.");
    }
  });
}

const QURAN_READINESS_COUNTS_SQL = `SELECT (SELECT COUNT(*) FROM chapters) AS chapters,
  (SELECT COUNT(*) FROM verses) AS verses,
  (SELECT COUNT(*) FROM translations WHERE resource_id = 85 AND language = 'en') AS english,
  (SELECT COUNT(*) FROM translations WHERE resource_id = 45 AND language = 'ru') AS russian,
  (SELECT COUNT(*) FROM transliterations WHERE resource_id = 57) AS transliterations,
  (SELECT COUNT(*) FROM ayah_audio WHERE reciter_id = 6) AS audio`;

type QuranReadinessCounts = {
  chapters: number;
  verses: number;
  english: number;
  russian: number;
  transliterations: number;
  audio: number;
};
const isQuranDatasetReady = (counts: QuranReadinessCounts | null) =>
  counts?.chapters === 114 &&
  counts.verses === 6236 &&
  counts.english === 6236 &&
  counts.russian === 6236 &&
  counts.transliterations === 6236 &&
  counts.audio === 6236;
const getQuranReadinessCounts = (db: SQLiteDatabase) =>
  db.getFirstAsync<QuranReadinessCounts>(QURAN_READINESS_COUNTS_SQL);

export async function hasLocalQuran(db: SQLiteDatabase): Promise<boolean> {
  try {
    const counts = await getQuranReadinessCounts(db);
    return isQuranDatasetReady(counts);
  } catch {
    return false;
  }
}
