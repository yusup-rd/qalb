import type { QuranChapter, QuranVerseWithContent } from "@/types/quran";
import type { SQLiteDatabase } from "expo-sqlite";
import { getChapters, getVersesByChapterId } from "./repository";

export type QuranChapterData = {
  chapter: QuranChapter;
  chapters: QuranChapter[];
  verses: QuranVerseWithContent[];
};

type Entry = { data?: QuranChapterData; promise: Promise<QuranChapterData> };
// A background sync uses its own connection to the same Quran file.
// Sharing by file ensures its invalidation also reaches foreground readers.
const caches = new Map<string | SQLiteDatabase, Map<number, Entry>>();
const databaseKey = (db: SQLiteDatabase) => db.databasePath || db;
const MAX_CACHED_CHAPTERS = 5;

export function clearQuranChapterCache(db: SQLiteDatabase) {
  caches.delete(databaseKey(db));
}

export function getCachedQuranChapter(db: SQLiteDatabase, chapterId: number) {
  return caches.get(databaseKey(db))?.get(chapterId)?.data;
}

export function loadQuranChapter(
  db: SQLiteDatabase,
  chapterId: number,
): Promise<QuranChapterData> {
  let cache = caches.get(databaseKey(db));
  if (!cache) {
    cache = new Map();
    caches.set(databaseKey(db), cache);
  }
  const existing = cache.get(chapterId);
  if (existing) {
    cache.delete(chapterId);
    cache.set(chapterId, existing);
    return existing.promise;
  }

  const entry: Entry = {
    promise: Promise.all([getChapters(db), getVersesByChapterId(db, chapterId)])
      .then(([chapters, verses]) => {
        // A completed Quran sync invalidates even reads already in flight.
        if (caches.get(databaseKey(db)) !== cache)
          return loadQuranChapter(db, chapterId);
        const chapter = chapters.find((item) => item.id === chapterId);
        if (!chapter) throw new Error("Surah not found");
        const data = { chapter, chapters, verses };
        entry.data = data;
        return data;
      })
      .catch((error) => {
        if (cache.get(chapterId) === entry) cache.delete(chapterId);
        throw error;
      }),
  };
  cache.set(chapterId, entry);
  while (cache.size > MAX_CACHED_CHAPTERS) {
    cache.delete(cache.keys().next().value!);
  }
  return entry.promise;
}
