import { reverseGeocodeWithAPI } from "@/api/reverse-geocoding-api";
import type { LocationAddress } from "@/types/location";
import * as Location from "expo-location";

const FALLBACK_CACHE_TTL = 5 * 60 * 1000;

interface GeocodeCacheEntry {
  address: LocationAddress;
  source: "api" | "expo";
  cachedAt: number;
}

const geocodeCache = new Map<string, GeocodeCacheEntry>();

function getCacheKey(latitude: number, longitude: number, language: string) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)},${language}`;
}

async function reverseGeocodeWithExpo(
  latitude: number,
  longitude: number,
): Promise<LocationAddress> {
  const results = await Location.reverseGeocodeAsync({
    latitude,
    longitude,
  });

  const address = results[0];

  if (!address) {
    return {
      city: null,
      country: null,
    };
  }

  return {
    city:
      address.city ??
      address.district ??
      address.subregion ??
      address.region ??
      null,
    country: address.country ?? null,
  };
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  language: string,
): Promise<LocationAddress> {
  const cacheKey = getCacheKey(latitude, longitude, language);
  const cached = geocodeCache.get(cacheKey);

  if (cached) {
    const fallbackExpired =
      cached.source === "expo" &&
      Date.now() - cached.cachedAt >= FALLBACK_CACHE_TTL;

    if (!fallbackExpired) {
      return cached.address;
    }

    geocodeCache.delete(cacheKey);
  }

  let result: LocationAddress;
  let source: GeocodeCacheEntry["source"];

  try {
    result = await reverseGeocodeWithAPI(latitude, longitude, language);
    source = "api";
  } catch (error) {
    console.warn(
      "API reverse geocode failed, falling back to expo-location:",
      error,
    );
    result = await reverseGeocodeWithExpo(latitude, longitude);
    source = "expo";
  }

  geocodeCache.set(cacheKey, {
    address: result,
    source,
    cachedAt: Date.now(),
  });

  return result;
}
