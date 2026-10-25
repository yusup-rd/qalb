export type QuranSnapshot = {
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

const EXPECTED_CHAPTERS = 114;
const EXPECTED_VERSES = 6236;

const hasUniqueValues = <T>(values: T[]) =>
  new Set(values).size === values.length;
export const isSecureAudioUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

export function validateQuranSnapshot(
  snapshot: QuranSnapshot | null | undefined,
): asserts snapshot is QuranSnapshot {
  if (
    !snapshot ||
    typeof snapshot.revision !== "string" ||
    !snapshot.revision.trim() ||
    typeof snapshot.syncedAt !== "string" ||
    !Number.isFinite(Date.parse(snapshot.syncedAt)) ||
    !Array.isArray(snapshot.chapters) ||
    snapshot.chapters.length !== EXPECTED_CHAPTERS ||
    !Array.isArray(snapshot.verses) ||
    snapshot.verses.length !== EXPECTED_VERSES ||
    !Array.isArray(snapshot.translations) ||
    !Array.isArray(snapshot.transliterations) ||
    !Array.isArray(snapshot.reciters) ||
    !Array.isArray(snapshot.ayahAudio) ||
    !Array.isArray(snapshot.chapterAudio)
  ) {
    throw new Error("The Quran server returned an incomplete dataset.");
  }

  const chapterIds = new Set(snapshot.chapters.map((row) => row.id));
  const verseIds = new Set(snapshot.verses.map((row) => row.id));
  const reciterIds = new Set(snapshot.reciters.map((row) => row.id));
  const verseCountsByChapter = new Map<number, number>();
  for (const verse of snapshot.verses) {
    verseCountsByChapter.set(
      verse.chapter_id,
      (verseCountsByChapter.get(verse.chapter_id) ?? 0) + 1,
    );
  }
  const resourceIsComplete = (
    rows: { id: number; verse_id: number; text: string; resource_id: number }[],
    resourceId: number,
  ) => {
    const resourceRows = rows.filter((row) => row.resource_id === resourceId);
    return (
      resourceRows.length === EXPECTED_VERSES &&
      hasUniqueValues(resourceRows.map((row) => row.id)) &&
      hasUniqueValues(resourceRows.map((row) => row.verse_id)) &&
      resourceRows.every(
        (row) => verseIds.has(row.verse_id) && row.text.trim().length > 0,
      )
    );
  };

  if (
    chapterIds.size !== EXPECTED_CHAPTERS ||
    !hasUniqueValues(snapshot.chapters.map((row) => row.chapter_number)) ||
    verseIds.size !== EXPECTED_VERSES ||
    !hasUniqueValues(snapshot.verses.map((row) => row.verse_key)) ||
    snapshot.chapters.some(
      (row) =>
        !row.name_simple ||
        !row.name_arabic ||
        row.verses_count < 1 ||
        verseCountsByChapter.get(row.id) !== row.verses_count,
    ) ||
    snapshot.verses.some(
      (row) =>
        !chapterIds.has(row.chapter_id) ||
        !row.verse_key ||
        row.verse_key !== `${row.chapter_id}:${row.verse_number}` ||
        !row.text_uthmani?.trim(),
    ) ||
    !resourceIsComplete(snapshot.translations, 85) ||
    !resourceIsComplete(snapshot.translations, 45) ||
    snapshot.translations.length !== EXPECTED_VERSES * 2 ||
    !hasUniqueValues(snapshot.translations.map((row) => row.id)) ||
    snapshot.translations.some(
      (row) =>
        (row.resource_id === 85 && row.language !== "en") ||
        (row.resource_id === 45 && row.language !== "ru"),
    ) ||
    !resourceIsComplete(snapshot.transliterations, 57) ||
    snapshot.transliterations.length !== EXPECTED_VERSES ||
    !reciterIds.has(6) ||
    snapshot.ayahAudio.length !== EXPECTED_VERSES ||
    !hasUniqueValues(snapshot.ayahAudio.map((row) => row.id)) ||
    !hasUniqueValues(snapshot.ayahAudio.map((row) => row.verse_id)) ||
    snapshot.ayahAudio.some(
      (row) =>
        !verseIds.has(row.verse_id) ||
        !reciterIds.has(row.reciter_id) ||
        !isSecureAudioUrl(row.url),
    ) ||
    snapshot.chapterAudio.some(
      (row) =>
        !chapterIds.has(row.chapter_id) ||
        !reciterIds.has(row.reciter_id) ||
        !isSecureAudioUrl(row.url),
    )
  ) {
    throw new Error("The Quran server returned invalid content relationships.");
  }
}
