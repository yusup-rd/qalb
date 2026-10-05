import { reverseGeocodeWithAPI } from "@/api/reverse-geocoding-api";
import type { LocationAddress } from "@/types/location";
import * as Location from "expo-location";

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
  try {
    return await reverseGeocodeWithAPI(latitude, longitude, language);
  } catch (error) {
    console.warn(
      "API reverse geocode failed, falling back to expo-location:",
      error,
    );
    return reverseGeocodeWithExpo(latitude, longitude);
  }
}
