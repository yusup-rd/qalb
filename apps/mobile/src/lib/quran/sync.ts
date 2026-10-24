import { apiRequest } from "@/api/client";
import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

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
): Promise<void> {
  await db.execAsync(schema);
  if (!(await hasLocalQuran(db))) {
    await refreshQuranDatabase(db);
  }
}

export async function refreshQuranDatabase(
  db: SQLiteDatabase,
): Promise<boolean> {
  const status = await apiRequest<QuranServerStatus>("/api/quran/status");
  if (!status.available || !status.revision) {
    throw new Error(
      "Quran content is still being prepared. Please try again shortly.",
    );
  }

  const current = await db.getFirstAsync<{ revision: string }>(
    "SELECT revision FROM quran_sync_state WHERE id = 1",
  );
  if (current?.revision === status.revision) return false;

  const snapshot = await apiRequest<QuranSnapshot>(
    "/api/quran/snapshot",
    undefined,
    {
      timeoutMs: 45_000,
      maxAttempts: 3,
    },
  );
  validateSnapshot(snapshot);
  await applySnapshotTransactionally(db, snapshot);
  return true;
}

function validateSnapshot(snapshot: QuranSnapshot): void {
  if (
    !snapshot ||
    typeof snapshot.revision !== "string" ||
    !snapshot.revision ||
    !Array.isArray(snapshot.chapters) ||
    snapshot.chapters.length !== 114 ||
    !Array.isArray(snapshot.verses) ||
    snapshot.verses.length !== 6236 ||
    !Array.isArray(snapshot.translations) ||
    !Array.isArray(snapshot.transliterations) ||
    !Array.isArray(snapshot.reciters) ||
    !Array.isArray(snapshot.ayahAudio) ||
    !Array.isArray(snapshot.chapterAudio)
  ) {
    throw new Error("The Quran server returned an incomplete dataset.");
  }
  const verseIds = new Set(snapshot.verses.map((verse) => verse.id));
  const chapterIds = new Set(snapshot.chapters.map((chapter) => chapter.id));
  if (
    verseIds.size !== 6236 ||
    chapterIds.size !== 114 ||
    snapshot.verses.some(
      (verse) =>
        !verseIds.has(verse.id) ||
        !chapterIds.has(verse.chapter_id) ||
        !verse.text_uthmani ||
        !verse.verse_key,
    ) ||
    [
      ...snapshot.translations,
      ...snapshot.transliterations,
      ...snapshot.ayahAudio,
    ].some((row) => !verseIds.has(row.verse_id)) ||
    snapshot.ayahAudio.some(
      (audio) =>
        !snapshot.reciters.some((reciter) => reciter.id === audio.reciter_id),
    )
  ) {
    throw new Error("The Quran server returned invalid content relationships.");
  }
}

async function applySnapshotTransactionally(
  db: SQLiteDatabase,
  snapshot: QuranSnapshot,
): Promise<void> {
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
        for (const values of rows) await statement.executeAsync(values);
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
    await transaction.runAsync(
      `INSERT INTO quran_sync_state (id, revision, synced_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, synced_at = excluded.synced_at`,
      snapshot.revision,
      snapshot.syncedAt,
    );
    const counts = await transaction.getFirstAsync<{
      chapters: number;
      verses: number;
    }>(`SELECT (SELECT COUNT(*) FROM chapters) AS chapters,
              (SELECT COUNT(*) FROM verses) AS verses`);
    if (counts?.chapters !== 114 || counts.verses !== 6236) {
      throw new Error("The Quran dataset failed local database validation.");
    }
  });
}

export async function hasLocalQuran(db: SQLiteDatabase): Promise<boolean> {
  try {
    const counts = await db.getFirstAsync<{ chapters: number; verses: number }>(
      `SELECT (SELECT COUNT(*) FROM chapters) AS chapters,
              (SELECT COUNT(*) FROM verses) AS verses`,
    );
    return counts?.chapters === 114 && counts.verses === 6236;
  } catch {
    return false;
  }
}
