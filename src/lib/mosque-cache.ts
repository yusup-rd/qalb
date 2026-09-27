import type { Mosque } from "@/types/mosque";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "@app/mosques/cache-v3";
export const MOSQUE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface MosqueCache {
  version: 1;
  latitude: number;
  longitude: number;
  fetchedAt: number;
  mosques: Mosque[];
}

export const getMosqueCache = async (): Promise<MosqueCache | null> => {
  try {
    const value = await AsyncStorage.getItem(CACHE_KEY);

    if (!value) {
      return null;
    }

    const cache = JSON.parse(value) as MosqueCache;

    if (
      cache.version !== 1 ||
      typeof cache.latitude !== "number" ||
      typeof cache.longitude !== "number" ||
      typeof cache.fetchedAt !== "number" ||
      !Array.isArray(cache.mosques)
    ) {
      return null;
    }

    return cache;
  } catch {
    return null;
  }
};

export const setMosqueCache = async (
  latitude: number,
  longitude: number,
  mosques: Mosque[],
): Promise<void> => {
  const cache: MosqueCache = {
    version: 1,
    latitude,
    longitude,
    fetchedAt: Date.now(),
    mosques,
  };

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache failure should never break mosque discovery.
  }
};

export const isMosqueCacheFresh = (cache: MosqueCache) => {
  return Date.now() - cache.fetchedAt < MOSQUE_CACHE_TTL_MS;
};
