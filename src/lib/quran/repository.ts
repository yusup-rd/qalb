import type {
  ChapterAudio,
  QuranChapter,
  QuranReciter,
  QuranVerse,
  QuranVerseWithContent,
} from "@/types/quran";
import type { SQLiteDatabase } from "expo-sqlite";

type ChapterRow = QuranChapter & {
  chapter_number: number;
  name_simple: string;
  name_arabic: string;
  name_complex: string | null;
  translated_name: string | null;
  revelation_place: string | null;
  revelation_order: number | null;
  verses_count: number;
};

const mapChapter = (row: ChapterRow): QuranChapter => ({
  id: row.id,
  chapterNumber: row.chapter_number,
  nameSimple: row.name_simple,
  nameArabic: row.name_arabic,
  nameComplex: row.name_complex,
  translatedName: row.translated_name,
  revelationPlace: row.revelation_place,
  revelationOrder: row.revelation_order,
  versesCount: row.verses_count,
});

export const getChapters = (db: SQLiteDatabase) =>
  db
    .getAllAsync<ChapterRow>(
      "SELECT * FROM chapters ORDER BY chapter_number ASC",
    )
    .then((rows) => rows.map(mapChapter));

export const searchChapters = async (db: SQLiteDatabase, query: string) => {
  const chapterNumberMatch = query.trim().match(/^(\d+)\s*:/);
  const normalizedQuery = query.toLocaleLowerCase().replace(/[-_\s]+/g, "");
  const chapters = await getChapters(db);
  if (chapterNumberMatch) {
    return chapters.filter(
      (chapter) => chapter.chapterNumber === Number(chapterNumberMatch[1]),
    );
  }
  return chapters.filter((chapter) =>
    chapter.nameSimple
      .toLocaleLowerCase()
      .replace(/[-_\s]+/g, "")
      .includes(normalizedQuery),
  );
};

export const getChapterById = async (db: SQLiteDatabase, chapterId: number) => {
  const row = await db.getFirstAsync<ChapterRow>(
    "SELECT * FROM chapters WHERE id = ?",
    chapterId,
  );
  return row ? mapChapter(row) : null;
};

type VerseRow = QuranVerse & {
  chapter_id: number;
  verse_number: number;
  verse_index: number | null;
  verse_key: string;
  text_uthmani: string;
};

const mapVerse = (row: VerseRow): QuranVerse => ({
  id: row.id,
  chapterId: row.chapter_id,
  verseNumber: row.verse_number,
  verseIndex: row.verse_index,
  verseKey: row.verse_key,
  textUthmani: row.text_uthmani,
});

export const getAyahOfDay = async (
  db: SQLiteDatabase,
  dayNumber: number,
): Promise<QuranVerseWithContent | null> => {
  const countRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM verses",
  );
  const count = countRow?.count ?? 0;
  if (count === 0) return null;

  const offset = Math.abs((dayNumber * 2654435761) % count);
  const verse = await db.getFirstAsync<VerseRow>(
    "SELECT * FROM verses ORDER BY id LIMIT 1 OFFSET ?",
    offset,
  );
  if (!verse) return null;

  const [translations, transliteration, audio] = await Promise.all([
    db.getAllAsync<{
      verseId: number;
      language: "en" | "ru";
      resourceId: number;
      text: string;
      footNotes: string | null;
    }>(
      `SELECT verse_id AS verseId, language, resource_id AS resourceId,
        text, foot_notes AS footNotes
       FROM translations WHERE verse_id = ?`,
      verse.id,
    ),
    db.getFirstAsync<{
      verseId: number;
      resourceId: number;
      text: string;
    }>(
      `SELECT verse_id AS verseId, resource_id AS resourceId, text
       FROM transliterations WHERE verse_id = ?`,
      verse.id,
    ),
    db.getFirstAsync<{
      verseId: number;
      reciterId: number;
      url: string;
      duration: number | null;
      format: string | null;
      mimeType: string | null;
      segmentsJson: string | null;
      updatedAt: string | null;
    }>(
      `SELECT verse_id AS verseId, reciter_id AS reciterId, url,
        duration, format, mime_type AS mimeType,
        segments_json AS segmentsJson, updated_at AS updatedAt
       FROM ayah_audio WHERE verse_id = ? LIMIT 1`,
      verse.id,
    ),
  ]);

  const mappedVerse = mapVerse(verse);
  return {
    ...mappedVerse,
    english:
      translations.find((item) => item.language === "en") ?? null,
    russian:
      translations.find((item) => item.language === "ru") ?? null,
    transliteration,
    audio,
  };
};

export const getVersesByChapterId = async (
  db: SQLiteDatabase,
  chapterId: number,
): Promise<QuranVerseWithContent[]> => {
  const rows = await db.getAllAsync<VerseRow>(
    "SELECT * FROM verses WHERE chapter_id = ? ORDER BY verse_number ASC",
    chapterId,
  );

  const translations = await db.getAllAsync<{
    verseId: number;
    language: "en" | "ru";
    resourceId: number;
    text: string;
    footNotes: string | null;
  }>(
    `SELECT t.verse_id AS verseId, t.language, t.resource_id AS resourceId,
      t.text, t.foot_notes AS footNotes
     FROM translations t
     JOIN verses v ON v.id = t.verse_id
     WHERE v.chapter_id = ?`,
    chapterId,
  );
  const transliterations = await db.getAllAsync<{
    verseId: number;
    resourceId: number;
    text: string;
  }>(
    `SELECT tr.verse_id AS verseId, tr.resource_id AS resourceId, tr.text
     FROM transliterations tr
     JOIN verses v ON v.id = tr.verse_id
     WHERE v.chapter_id = ?`,
    chapterId,
  );
  const audio = await db.getAllAsync<{
    verseId: number;
    reciterId: number;
    url: string;
    duration: number | null;
    format: string | null;
    mimeType: string | null;
    segmentsJson: string | null;
    updatedAt: string | null;
  }>(
    `SELECT a.verse_id AS verseId, a.reciter_id AS reciterId, a.url,
      a.duration, a.format, a.mime_type AS mimeType,
      a.segments_json AS segmentsJson, a.updated_at AS updatedAt
     FROM ayah_audio a
     JOIN verses v ON v.id = a.verse_id
     WHERE v.chapter_id = ?`,
    chapterId,
  );

  return rows.map((row) => {
    const verse = mapVerse(row);
    return {
      ...verse,
      english:
        translations.find(
          (item) => item.verseId === verse.id && item.language === "en",
        ) ?? null,
      russian:
        translations.find(
          (item) => item.verseId === verse.id && item.language === "ru",
        ) ?? null,
      transliteration:
        transliterations.find((item) => item.verseId === verse.id) ?? null,
      audio: audio.find((item) => item.verseId === verse.id) ?? null,
    };
  });
};

export const getChapterAudio = (db: SQLiteDatabase, chapterId: number) =>
  db.getFirstAsync<ChapterAudio>(
    "SELECT chapter_id AS chapterId, reciter_id AS reciterId, url, duration, format, mime_type AS mimeType, segments_json AS segmentsJson, updated_at AS updatedAt FROM chapter_audio WHERE chapter_id = ? ORDER BY reciter_id LIMIT 1",
    chapterId,
  );

export const getReciters = (db: SQLiteDatabase) =>
  db.getAllAsync<QuranReciter>("SELECT id, name FROM reciters ORDER BY id");

export const searchQuran = (db: SQLiteDatabase, query: string) => {
  const trimmedQuery = query.trim();
  const chapterPrefix = trimmedQuery.match(/^(\d+)\s*:/);
  if (chapterPrefix) {
    const exactVerseKey = trimmedQuery.match(/^(\d+)\s*:\s*(\d+)$/);
    const verseKeyPattern = exactVerseKey
      ? `${exactVerseKey[1]}:${exactVerseKey[2]}`
      : `${chapterPrefix[1]}:%`;

    return db
      .getAllAsync<QuranVerse>(
        `SELECT id, chapter_id AS chapterId, verse_number AS verseNumber,
        verse_index AS verseIndex, verse_key AS verseKey, text_uthmani AS textUthmani
       FROM verses WHERE verse_key ${exactVerseKey ? "=" : "LIKE"} ?
       ORDER BY id LIMIT 50`,
        verseKeyPattern,
      )
      .then((matches) => hydrateSearchMatches(db, matches));
  }

  const pattern = `%${trimmedQuery}%`;
  return db
    .getAllAsync<QuranVerse>(
      `SELECT v.id, v.chapter_id AS chapterId, v.verse_number AS verseNumber,
      v.verse_index AS verseIndex, v.verse_key AS verseKey, v.text_uthmani AS textUthmani
      FROM verses v
      LEFT JOIN translations t ON t.verse_id = v.id
      LEFT JOIN transliterations tr ON tr.verse_id = v.id
      WHERE v.text_uthmani LIKE ? OR t.text LIKE ? OR tr.text LIKE ?
        OR v.verse_key LIKE ?
      GROUP BY v.id ORDER BY v.id LIMIT 50`,
      pattern,
      pattern,
      pattern,
      pattern,
    )
    .then((matches) => hydrateSearchMatches(db, matches));
};

const hydrateSearchMatches = async (
  db: SQLiteDatabase,
  matches: QuranVerse[],
) => {
  const versesByChapter = new Map<number, QuranVerseWithContent[]>();
  const hydrated: QuranVerseWithContent[] = [];

  for (const match of matches) {
    let chapterVerses = versesByChapter.get(match.chapterId);
    if (!chapterVerses) {
      chapterVerses = await getVersesByChapterId(db, match.chapterId);
      versesByChapter.set(match.chapterId, chapterVerses);
    }

    const verse = chapterVerses.find((item) => item.id === match.id);
    if (verse) hydrated.push(verse);
  }

  return hydrated;
};
