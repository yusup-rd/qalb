import { apiRequest } from "@/api/client";
import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";
import { validateQuranSnapshot } from "./snapshot-validation";
import { getQuranBootstrapErrorKind } from "./bootstrap-error";
import {
  createQuranBootstrapReporter,
  type QuranBootstrapObserver,
  type QuranBootstrapReporter,
} from "./bootstrap-progress";

type QuranServerStatus = {
  available: true;
  revision: string;
  lastSuccessfulSyncAt: string;
};

type QuranSnapshot = {
  revision: string;
  syncedAt: string;
  chapters: Chapter[];
  verses: Verse[];
  translations: Translation[];
  transliterations: Transliteration[];
  reciters: Reciter[];
  ayahAudio: Audio[];
  chapterAudio: ChapterAudio[];
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

type Chapter = {
  id: number;
  chapter_number: number;
  name_simple: string;
  name_arabic: string;
  name_complex: string | null;
  translated_name: string | null;
  revelation_place: string | null;
  revelation_order: number | null;
  verses_count: number;
};
type Verse = {
  id: number;
  chapter_id: number;
  verse_number: number;
  verse_index: number | null;
  verse_key: string;
  text_uthmani: string;
};
type Translation = {
  id: number;
  verse_id: number;
  language: "en" | "ru";
  resource_id: number;
  text: string;
  foot_notes: string | null;
};
type Transliteration = {
  id: number;
  verse_id: number;
  resource_id: number;
  text: string;
};
type Reciter = { id: number; name: string };
type Audio = {
  id: number;
  verse_id: number;
  reciter_id: number;
  url: string;
  duration: number | null;
  format: string | null;
  mime_type: string | null;
  segments_json: string | null;
  updated_at: string | null;
};
type ChapterAudio = {
  id: number;
  chapter_id: number;
  reciter_id: number;
  url: string;
  duration: number | null;
  format: string | null;
  mime_type: string | null;
  segments_json: string | null;
  updated_at: string | null;
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
CREATE INDEX IF NOT EXISTS verses_chapter_id ON verses(chapter_id);
CREATE INDEX IF NOT EXISTS verses_key ON verses(verse_key);
CREATE INDEX IF NOT EXISTS translations_verse_id ON translations(verse_id);
CREATE INDEX IF NOT EXISTS translations_language ON translations(language);
CREATE INDEX IF NOT EXISTS ayah_audio_verse_id ON ayah_audio(verse_id);
CREATE INDEX IF NOT EXISTS ayah_audio_reciter_id ON ayah_audio(reciter_id);
CREATE INDEX IF NOT EXISTS chapter_audio_chapter_id ON chapter_audio(chapter_id);
CREATE INDEX IF NOT EXISTS chapter_audio_reciter_id ON chapter_audio(reciter_id);
`;

export async function initializeQuranDatabase(
  db: SQLiteDatabase,
  onProgress?: QuranBootstrapObserver,
): Promise<void> {
  const reporter = createQuranBootstrapReporter(onProgress);
  try {
    await db.execAsync(schema);
    const localReady = await hasLocalQuran(db);
    reporter.log("local_checked", { localReady });
    if (!localReady) {
      await refreshQuranDatabase(db, reporter);
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
): Promise<boolean> {
  reporter?.stage("connecting");
  const status = await apiRequest<QuranServerStatus>(
    "/api/quran/status",
    undefined,
    { onEvent: reporter?.request },
  );
  if (!status.available || !status.revision) {
    throw new Error(
      "Quran content is still being prepared. Please try again shortly.",
    );
  }

  const current = await db.getFirstAsync<{ revision: string }>(
    "SELECT revision FROM quran_sync_state WHERE id = 1",
  );
  const localReady = await hasLocalQuran(db);
  if (localReady && current?.revision === status.revision) return false;

  reporter?.stage("downloading");
  const changes = await apiRequest<QuranChanges | QuranSnapshot>(
    `/api/quran/changes${localReady && current?.revision ? `?revision=${encodeURIComponent(current.revision)}` : ""}`,
    undefined,
    {
      timeoutMs: 45_000,
      maxAttempts: 3,
      onEvent: reporter?.request,
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
    return true;
  }
  const snapshot = changes as QuranSnapshot;
  validateQuranSnapshot(snapshot);
  reporter?.stage("saving");
  await applySnapshotTransactionally(db, snapshot, reporter);
  return true;
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
    const counts = await transaction.getFirstAsync<{
      chapters: number;
      verses: number;
      english: number;
      russian: number;
      transliterations: number;
      audio: number;
    }>(`SELECT (SELECT COUNT(*) FROM chapters) AS chapters,
              (SELECT COUNT(*) FROM verses) AS verses,
              (SELECT COUNT(*) FROM translations WHERE resource_id = 85 AND language = 'en') AS english,
              (SELECT COUNT(*) FROM translations WHERE resource_id = 45 AND language = 'ru') AS russian,
              (SELECT COUNT(*) FROM transliterations WHERE resource_id = 57) AS transliterations,
              (SELECT COUNT(*) FROM ayah_audio WHERE reciter_id = 6) AS audio`);
    if (
      counts?.chapters !== 114 ||
      counts.verses !== 6236 ||
      counts.english !== 6236 ||
      counts.russian !== 6236 ||
      counts.transliterations !== 6236 ||
      counts.audio !== 6236
    ) {
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
  reporter?.log("transaction_started", { totalRows });
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
    await transaction.runAsync(
      `INSERT INTO quran_sync_state (id, revision, synced_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, synced_at = excluded.synced_at`,
      snapshot.revision,
      snapshot.syncedAt,
    );
    const counts = await transaction.getFirstAsync<{
      chapters: number;
      verses: number;
      english: number;
      russian: number;
      transliterations: number;
      audio: number;
    }>(`SELECT (SELECT COUNT(*) FROM chapters) AS chapters,
              (SELECT COUNT(*) FROM verses) AS verses,
              (SELECT COUNT(*) FROM translations WHERE resource_id = 85 AND language = 'en') AS english,
              (SELECT COUNT(*) FROM translations WHERE resource_id = 45 AND language = 'ru') AS russian,
              (SELECT COUNT(*) FROM transliterations WHERE resource_id = 57) AS transliterations,
              (SELECT COUNT(*) FROM ayah_audio WHERE reciter_id = 6) AS audio`);
    if (
      counts?.chapters !== 114 ||
      counts.verses !== 6236 ||
      counts.english !== 6236 ||
      counts.russian !== 6236 ||
      counts.transliterations !== 6236 ||
      counts.audio !== 6236
    ) {
      throw new Error("The Quran dataset failed local database validation.");
    }
  });
  reporter?.log("transaction_committed", { completedRows, totalRows });
}

export async function hasLocalQuran(db: SQLiteDatabase): Promise<boolean> {
  try {
    const counts = await db.getFirstAsync<{
      chapters: number;
      verses: number;
      english: number;
      russian: number;
      transliterations: number;
      audio: number;
    }>(
      `SELECT (SELECT COUNT(*) FROM chapters) AS chapters,
              (SELECT COUNT(*) FROM verses) AS verses,
              (SELECT COUNT(*) FROM translations WHERE resource_id = 85 AND language = 'en') AS english,
              (SELECT COUNT(*) FROM translations WHERE resource_id = 45 AND language = 'ru') AS russian,
              (SELECT COUNT(*) FROM transliterations WHERE resource_id = 57) AS transliterations,
              (SELECT COUNT(*) FROM ayah_audio WHERE reciter_id = 6) AS audio`,
    );
    return (
      counts?.chapters === 114 &&
      counts.verses === 6236 &&
      counts.english === 6236 &&
      counts.russian === 6236 &&
      counts.transliterations === 6236 &&
      counts.audio === 6236
    );
  } catch {
    return false;
  }
}
