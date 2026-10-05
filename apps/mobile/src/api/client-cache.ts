import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@qalb/api-cache-v1";
const MAX_ENTRIES = 100;

interface CacheEntry<T> {
  value: T;
  cachedAt: number;
}

type StoredCache = Record<string, CacheEntry<unknown>>;

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
let storageLoad: Promise<StoredCache> | null = null;
let storageWrite: Promise<void> = Promise.resolve();

async function readStorage(): Promise<StoredCache> {
  if (!storageLoad) {
    storageLoad = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return {};
        try {
          const parsed = JSON.parse(raw) as StoredCache;
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
          return {};
        }
      })
      .catch(() => ({}));
  }
  return storageLoad;
}

async function writeStorage(cache: StoredCache): Promise<void> {
  storageWrite = storageWrite.then(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // Cache persistence is best-effort and must not affect API behavior.
    }
  });
  await storageWrite;
}

function prune(cache: StoredCache): StoredCache {
  const entries = Object.entries(cache)
    .filter(
      ([, entry]) =>
        entry &&
        typeof entry.cachedAt === "number" &&
        entry.value !== undefined,
    )
    .sort(([, a], [, b]) => b.cachedAt - a.cachedAt)
    .slice(0, MAX_ENTRIES);
  return Object.fromEntries(entries);
}

function isFresh<T>(
  entry: CacheEntry<T> | undefined,
  ttlMs: number,
): boolean {
  return (
    entry !== undefined &&
    Date.now() - entry.cachedAt >= 0 &&
    Date.now() - entry.cachedAt < ttlMs
  );
}

async function readEntry<T>(key: string): Promise<CacheEntry<T> | undefined> {
  const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (
    memoryEntry &&
    typeof memoryEntry.cachedAt === "number" &&
    memoryEntry.value !== undefined
  ) {
    return memoryEntry;
  }

  const stored = await readStorage();
  const entry = stored[key] as CacheEntry<T> | undefined;
  if (
    entry &&
    typeof entry.cachedAt === "number" &&
    entry.value !== undefined
  ) {
    memoryCache.set(key, entry as CacheEntry<unknown>);
    return entry;
  }
  return undefined;
}

export interface CachedRequestOptions {
  allowStaleOnError?: boolean;
  onStaleFallback?: () => void;
}

export async function requestCached<T>(
  key: string,
  ttlMs: number,
  request: () => Promise<T>,
  options: CachedRequestOptions = {},
): Promise<T> {
  const cached = await readEntry<T>(key);
  if (cached && isFresh(cached, ttlMs)) return cached.value;
  const stale = cached;

  const inFlight = inFlightRequests.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  const pending = request()
    .then(async (value) => {
      if (value === null || value === undefined) {
        throw new Error("Cannot cache an empty API response.");
      }
      const entry: CacheEntry<T> = { value, cachedAt: Date.now() };
      memoryCache.set(key, entry as CacheEntry<unknown>);
      const stored = await readStorage();
      await writeStorage(
        prune({
          ...stored,
          [key]: entry,
        }),
      );
      return value;
    })
    .catch(async (error) => {
      if (options.allowStaleOnError && stale) {
        options.onStaleFallback?.();
        return stale.value;
      }
      throw error;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, pending);
  return pending;
}

export async function invalidateCached(key: string): Promise<void> {
  memoryCache.delete(key);
  const stored = await readStorage();
  if (!(key in stored)) return;
  delete stored[key];
  await writeStorage(stored);
}

export function clearMemoryCache(): void {
  memoryCache.clear();
}
