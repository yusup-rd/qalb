import type { Mosque } from "@qalb/shared";
import { apiRequest } from "./client";
import { requestCached } from "./client-cache";

const MOSQUE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const fetchNearbyMosques = (
  latitude: number,
  longitude: number,
): Promise<Mosque[]> => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    radius: "200000",
    limit: "20",
  });
  const key = `mosques:${latitude.toFixed(2)}:${longitude.toFixed(2)}:200000:20`;
  return requestCached(
    key,
    MOSQUE_CACHE_TTL_MS,
    () => apiRequest<Mosque[]>(`/api/mosques/nearby?${params}`),
    { allowStaleOnError: true },
  );
};
