import { beforeEach, expect, it, jest as mockJestApi } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { SQLiteDatabase } from "expo-sqlite";
import { getChapters, getVersesByChapterId } from "@/lib/quran/repository";
import {
  clearQuranChapterCache,
  getCachedQuranChapter,
  loadQuranChapter,
} from "@/lib/quran/chapter-cache";
import type { QuranChapter, QuranVerseWithContent } from "@/types/quran";
import { useQuranChapter } from "./useQuran";

const mockDb = {} as SQLiteDatabase;
// @ts-ignore Jest hoists this global call before the imports.
jest.mock("expo-sqlite", () => ({ useSQLiteContext: () => mockDb }));
// @ts-ignore Jest hoists this global call before the imports.
jest.mock("@/lib/quran/repository", () => ({
  getChapters: mockJestApi.fn(),
  getVersesByChapterId: mockJestApi.fn(),
}));

const chapters: QuranChapter[] = Array.from({ length: 7 }, (_, index) => ({
  id: index + 1,
  chapterNumber: index + 1,
  nameSimple: `Surah ${index + 1}`,
  nameArabic: "",
  nameComplex: null,
  translatedName: null,
  revelationPlace: null,
  revelationOrder: null,
  versesCount: 1,
}));
const verses: QuranVerseWithContent[] = [
  {
    id: 1,
    chapterId: 1,
    verseNumber: 1,
    verseIndex: 1,
    verseKey: "1:1",
    textUthmani: "verse",
    english: null,
    russian: null,
    transliteration: null,
    audio: null,
  },
];
const chapterQuery = mockJestApi.mocked(getChapters);
const verseQuery = mockJestApi.mocked(getVersesByChapterId);

beforeEach(() => {
  clearQuranChapterCache(mockDb);
  mockJestApi.resetAllMocks();
  chapterQuery.mockResolvedValue(chapters);
  verseQuery.mockResolvedValue(verses);
});

it("renders prefetched content on the first render without a loading frame", async () => {
  await loadQuranChapter(mockDb, 1);
  const frames: boolean[] = [];
  const { result } = renderHook(() => {
    const state = useQuranChapter(1);
    frames.push(state.loading);
    return state;
  });
  expect(result.current.chapter?.id).toBe(1);
  expect(result.current.verses).toBe(verses);
  await act(async () => {});
  expect(frames.every((loading) => !loading)).toBe(true);
  expect(verseQuery).toHaveBeenCalledTimes(1);
});

it("keeps the loading fallback on a miss and ignores an older route's result", async () => {
  let resolveFirst!: (value: QuranVerseWithContent[]) => void;
  verseQuery.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
  );
  const { result, rerender } = renderHook<
    ReturnType<typeof useQuranChapter>,
    { id: number }
  >(({ id }) => useQuranChapter(id), {
    initialProps: { id: 1 },
  });
  expect(result.current.loading).toBe(true);
  rerender({ id: 2 });
  await waitFor(() => expect(result.current.chapter?.id).toBe(2));
  await act(async () => {
    resolveFirst(verses);
  });
  expect(result.current.chapter?.id).toBe(2);
});

it("deduplicates pending reads and retries failures", async () => {
  verseQuery.mockRejectedValueOnce(new Error("read failed"));
  const pending = loadQuranChapter(mockDb, 1);
  expect(loadQuranChapter(mockDb, 1)).toBe(pending);
  await expect(pending).rejects.toThrow("read failed");
  expect(getCachedQuranChapter(mockDb, 1)).toBeUndefined();
  await loadQuranChapter(mockDb, 1);
  expect(verseQuery).toHaveBeenCalledTimes(2);
});

it("bounds the cache and isolates database connections", async () => {
  for (const chapter of chapters) await loadQuranChapter(mockDb, chapter.id);
  expect(getCachedQuranChapter(mockDb, 1)).toBeUndefined();
  expect(getCachedQuranChapter(mockDb, 7)?.chapter.id).toBe(7);
  expect(getCachedQuranChapter({} as SQLiteDatabase, 7)).toBeUndefined();
  clearQuranChapterCache(mockDb);
  expect(getCachedQuranChapter(mockDb, 7)).toBeUndefined();
});

it("reloads an in-flight read invalidated by a Quran sync", async () => {
  let resolveOld!: (value: QuranVerseWithContent[]) => void;
  verseQuery.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const pending = loadQuranChapter(mockDb, 1);
  clearQuranChapterCache(mockDb);
  const updated = [{ ...verses[0], textUthmani: "updated" }];
  verseQuery.mockResolvedValue(updated);
  resolveOld(verses);
  expect((await pending).verses).toBe(updated);
  expect(getCachedQuranChapter(mockDb, 1)?.verses).toBe(updated);
});
