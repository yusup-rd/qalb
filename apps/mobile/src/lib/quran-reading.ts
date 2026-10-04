import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QuranChapter } from "@/types/quran";

const LAST_OPENED_SURAH_KEY = "@quran/last-opened-surah";

export type LastOpenedSurah = Pick<
  QuranChapter,
  "id" | "chapterNumber" | "nameSimple"
>;

export const saveLastOpenedSurah = (chapter: QuranChapter) => {
  const value: LastOpenedSurah = {
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    nameSimple: chapter.nameSimple,
  };

  void AsyncStorage.setItem(LAST_OPENED_SURAH_KEY, JSON.stringify(value)).catch(
    (error: unknown) => {
      console.warn("Failed to save last opened Surah", error);
    },
  );
};

export const getLastOpenedSurah = async (): Promise<LastOpenedSurah | null> => {
  let value: string | null;
  try {
    value = await AsyncStorage.getItem(LAST_OPENED_SURAH_KEY);
  } catch (error) {
    console.warn("Failed to read last opened Surah", error);
    return null;
  }
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).id !== "number" ||
      typeof (parsed as Record<string, unknown>).chapterNumber !== "number" ||
      typeof (parsed as Record<string, unknown>).nameSimple !== "string"
    ) {
      return null;
    }
    return parsed as LastOpenedSurah;
  } catch {
    console.warn("Failed to parse last opened Surah");
    return null;
  }
};
