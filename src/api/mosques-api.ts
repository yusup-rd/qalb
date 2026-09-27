import type { Mosque } from "@/types/mosque";

const MOSQUES_ENDPOINT = "https://takbeertime.com/api/mosques/nearby";

export const MOSQUE_QUERY_RADIUS_METERS = 200_000;
export const MOSQUE_QUERY_LIMIT = 20;

interface TakbeerTimeMosque {
  id: string;
  name: string;
  nameArabic: string | null;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  addressLine1: string | null;
  verified: boolean;
  status: string;
  distanceMeters: number;
}

interface TakbeerTimeMosquesResponse {
  data: TakbeerTimeMosque[];
  count: number;
  radius: number;
  center: {
    lat: number;
    lng: number;
  };
}

export const fetchNearbyMosques = async (
  latitude: number,
  longitude: number,
): Promise<Mosque[]> => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    radius: String(MOSQUE_QUERY_RADIUS_METERS),
    limit: String(MOSQUE_QUERY_LIMIT),
  });

  const response = await fetch(`${MOSQUES_ENDPOINT}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Mosque API request failed with status ${response.status}`);
  }

  const result = (await response.json()) as TakbeerTimeMosquesResponse;

  return result.data
    .filter((mosque) => mosque.status === "active")
    .map((mosque) => ({
      id: mosque.id,
      name: mosque.name,
      street: mosque.addressLine1 ?? undefined,
      latitude: mosque.latitude,
      longitude: mosque.longitude,
    }));
};
