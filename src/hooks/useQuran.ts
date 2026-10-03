import {
  getChapterById,
  getChapters,
  getVersesByChapterId,
  searchChapters,
  searchQuran,
} from "@/lib/quran/repository";
import type { QuranChapter, QuranVerseWithContent } from "@/types/quran";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

export const useQuranChapters = () => {
  const db = useSQLiteContext();
  const [chapters, setChapters] = useState<QuranChapter[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    getChapters(db)
      .then((loadedChapters) => {
        if (cancelled) return;
        setChapters(loadedChapters);
      })
      .catch((nextError) => {
        if (cancelled) return;
        setError(nextError);
      });

    return () => {
      cancelled = true;
    };
  }, [db]);

  return { chapters, error, loading: !chapters.length && !error };
};

export const useQuranChapter = (chapterId: number) => {
  const db = useSQLiteContext();
  const [chapter, setChapter] = useState<QuranChapter | null>(null);
  const [verses, setVerses] = useState<QuranVerseWithContent[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getChapterById(db, chapterId),
      getVersesByChapterId(db, chapterId),
    ])
      .then(([loadedChapter, loadedVerses]) => {
        if (cancelled) return;
        setChapter(loadedChapter);
        setVerses(loadedVerses);
      })
      .catch((nextError) => {
        if (cancelled) return;
        setError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId, db]);

  return { chapter, verses, error, loading };
};

export const useQuranSearch = (query: string) => {
  const db = useSQLiteContext();
  const [results, setResults] = useState<QuranVerseWithContent[]>([]);
  const [chapters, setChapters] = useState<QuranChapter[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState("");

  useEffect(() => {
    const trimmedQuery = query.trim();
    let cancelled = false;
    const timeoutId = setTimeout(
      () => {
        if (cancelled) {
          return;
        }

        if (!trimmedQuery) {
          setChapters([]);
          setResults([]);
          setResolvedQuery("");
          return;
        }

        Promise.all([
          searchChapters(db, trimmedQuery),
          searchQuran(db, trimmedQuery),
        ])
          .then(([matchedChapters, matchedVerses]) => {
            if (cancelled) return;
            setChapters(matchedChapters);
            setResults(matchedVerses);
            setResolvedQuery(trimmedQuery);
          })
          .catch(() => {
            if (cancelled) return;
            setChapters([]);
            setResults([]);
            setResolvedQuery(trimmedQuery);
          });
      },
      trimmedQuery ? 300 : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [db, query]);

  return {
    chapters,
    verses: results,
    loading: query.trim() !== resolvedQuery,
  };
};
