import type { LocationAddress } from "@/types/location";

const REVERSE_GEOCODING_ENDPOINT =
  "https://nominatim.openstreetmap.org/reverse";

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
}

// TODO: Move reverse-geocoding requests behind the NestJS API.
//
// Direct Nominatim requests from the mobile app are not globally rate-limited
// across app installations. The backend should provide shared caching and
// global rate limiting before forwarding requests to Nominatim.
export async function reverseGeocodeWithAPI(
  latitude: number,
  longitude: number,
  language: string,
): Promise<LocationAddress> {
  const url = new URL(REVERSE_GEOCODING_ENDPOINT);

  url.searchParams.set("lat", latitude.toString());
  url.searchParams.set("lon", longitude.toString());
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "10");
  url.searchParams.set("accept-language", language);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        // Required by Nominatim's usage policy to identify the app.
        "User-Agent": "Qalb/1.0 (prayer times app)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Nominatim request failed: ${response.status}`);
    }

    const data: NominatimResponse = await response.json();
    const address = data.address;

    if (!address) {
      return {
        city: null,
        country: null,
      };
    }

    return {
      city:
        address.city ??
        address.town ??
        address.village ??
        address.county ??
        address.state ??
        null,
      country: address.country ?? null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
