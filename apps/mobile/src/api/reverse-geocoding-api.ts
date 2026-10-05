import type { LocationAddress } from "@qalb/shared";
import { apiRequest } from "./client";
import { requestCached } from "./client-cache";

const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const reverseGeocodeWithAPI = (
  latitude: number,
  longitude: number,
  language: string,
): Promise<LocationAddress> => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    language,
  });
  const key = `geocode:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${language.toLowerCase()}`;
  return requestCached(
    key,
    GEOCODE_CACHE_TTL_MS,
    () => apiRequest<LocationAddress>(`/api/reverse-geocoding?${params}`),
    { allowStaleOnError: true },
  );
};
