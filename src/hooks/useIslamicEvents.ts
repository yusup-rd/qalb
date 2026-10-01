import { fetchIslamicEvents, type IslamicEvent } from "@/lib/islamic-events";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const CACHE_KEY = "@app/islamic-events";
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

interface CachedMonth {
  fetchedAt: number;
  events: IslamicEvent[];
}

type IslamicEventsCache = Record<string, CachedMonth>;

// In-memory cache prevents repeated AsyncStorage reads and allows
// multiple hook instances to reuse already-loaded months.
const memoryCache: IslamicEventsCache = {};

// If multiple components request the same month at the same time,
// they share one network request.
const inFlightRequests = new Map<string, Promise<CachedMonth>>();

interface LoadMonthResult {
  key: string;
  events: IslamicEvent[];
  cachedMonth?: CachedMonth;
}

function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getAdjacentMonths(date: Date): { year: number; month: number }[] {
  const previous = new Date(date.getFullYear(), date.getMonth() - 1, 1);

  const current = new Date(date.getFullYear(), date.getMonth(), 1);

  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return [
    {
      year: previous.getFullYear(),
      month: previous.getMonth() + 1,
    },
    {
      year: current.getFullYear(),
      month: current.getMonth() + 1,
    },
    {
      year: next.getFullYear(),
      month: next.getMonth() + 1,
    },
  ];
}

async function readCache(): Promise<IslamicEventsCache> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as IslamicEventsCache;
  } catch {
    return {};
  }
}

async function writeCache(cache: IslamicEventsCache): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function isFresh(cached: CachedMonth | undefined): boolean {
  return cached !== undefined && Date.now() - cached.fetchedAt < CACHE_TTL;
}

async function fetchMonth(year: number, month: number): Promise<CachedMonth> {
  const key = getMonthKey(year, month);

  const existingRequest = inFlightRequests.get(key);

  if (existingRequest) {
    return existingRequest;
  }

  const request = fetchIslamicEvents(month, year)
    .then((events) => {
      const cachedMonth: CachedMonth = {
        fetchedAt: Date.now(),
        events,
      };

      memoryCache[key] = cachedMonth;

      return cachedMonth;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);

  return request;
}

async function loadMonth(
  year: number,
  month: number,
  cache: IslamicEventsCache,
): Promise<LoadMonthResult> {
  const key = getMonthKey(year, month);

  const memoryCached = memoryCache[key];

  if (isFresh(memoryCached)) {
    return {
      key,
      events: memoryCached.events,
      cachedMonth: memoryCached,
    };
  }

  const persistentCached = cache[key];

  if (isFresh(persistentCached)) {
    memoryCache[key] = persistentCached;

    return {
      key,
      events: persistentCached.events,
      cachedMonth: persistentCached,
    };
  }

  try {
    const cachedMonth = await fetchMonth(year, month);

    return {
      key,
      events: cachedMonth.events,
      cachedMonth,
    };
  } catch (error) {
    const fallback = memoryCache[key] ?? persistentCached;

    if (fallback) {
      console.warn(
        `Failed to refresh Islamic events for ${key}, using cached data:`,
        error,
      );

      memoryCache[key] = fallback;

      return {
        key,
        events: fallback.events,
        cachedMonth: fallback,
      };
    }

    throw error;
  }
}

export function useIslamicEvents(selectedDate: Date) {
  const [events, setEvents] = useState<IslamicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setIsLoading(true);
      setError(null);

      try {
        const cache = await readCache();

        // Populate the in-memory cache from persistent storage once
        // before loading the requested months.
        for (const [key, cachedMonth] of Object.entries(cache)) {
          if (isFresh(cachedMonth) && !memoryCache[key]) {
            memoryCache[key] = cachedMonth;
          }
        }

        const months = getAdjacentMonths(new Date(year, month - 1, 1));

        const settled = await Promise.allSettled(
          months.map((currentMonth) =>
            loadMonth(currentMonth.year, currentMonth.month, cache),
          ),
        );

        const results = settled.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );

        if (results.length === 0) {
          const firstFailure = settled.find(
            (result): result is PromiseRejectedResult =>
              result.status === "rejected",
          );
          throw (
            firstFailure?.reason ?? new Error("Failed to load Islamic events")
          );
        }

        const monthEvents = results.flatMap((result) => result.events);

        const updatedCache: IslamicEventsCache = {
          ...cache,
          ...memoryCache,
        };

        let cacheChanged = false;

        for (const result of results) {
          const previous = cache[result.key];
          const current = result.cachedMonth;

          if (
            current &&
            (!previous || previous.fetchedAt !== current.fetchedAt)
          ) {
            updatedCache[result.key] = current;
            cacheChanged = true;
          }
        }

        if (cacheChanged) {
          await writeCache(updatedCache);
        }

        if (cancelled) {
          return;
        }

        setEvents(monthEvents);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to load Islamic events:", error);

        setError(
          error instanceof Error
            ? error
            : new Error("Failed to load Islamic events"),
        );

        setEvents([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return {
    events,
    isLoading,
    error,
  };
}
