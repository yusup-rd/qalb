export type QuranChapter = {
  id: number;
  chapterNumber: number;
  nameSimple: string;
  nameArabic: string;
  nameComplex: string | null;
  translatedName: string | null;
  revelationPlace: string | null;
  revelationOrder: number | null;
  versesCount: number;
};

export type QuranVerse = {
  id: number;
  chapterId: number;
  verseNumber: number;
  verseIndex: number | null;
  verseKey: string;
  textUthmani: string;
};

type QuranTranslation = {
  verseId: number;
  language: "en" | "ru";
  resourceId: number;
  text: string;
  footNotes: string | null;
};

type QuranTransliteration = {
  verseId: number;
  resourceId: number;
  text: string;
};

export type QuranReciter = {
  id: number;
  name: string;
};

export type AyahAudio = {
  verseId: number;
  reciterId: number;
  url: string;
  duration: number | null;
  format: string | null;
  mimeType: string | null;
  segmentsJson: string | null;
  updatedAt: string | null;
};

export type ChapterAudio = {
  chapterId: number;
  reciterId: number;
  url: string;
  duration: number | null;
  format: string | null;
  mimeType: string | null;
  segmentsJson: string | null;
  updatedAt: string | null;
};

export type QuranVerseWithContent = QuranVerse & {
  english: QuranTranslation | null;
  russian: QuranTranslation | null;
  transliteration: QuranTransliteration | null;
  audio: AyahAudio | null;
};
