import {
  getLastOpenedSurah,
  type LastOpenedSurah,
} from "@/lib/quran-reading";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export const useLastOpenedSurah = () => {
  const [surah, setSurah] = useState<LastOpenedSurah | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      getLastOpenedSurah().then((value) => {
        if (!cancelled) setSurah(value);
      });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  return surah;
};
