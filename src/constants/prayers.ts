import type { PrayerName } from "@/types/prayer";

export const prayerMetadata: Record<
  PrayerName,
  {
    description: string;
    icon: import("@/types/prayer").PrayerIcon;
  }
> = {
  Fajr: {
    description: "Dawn",
    icon: "partly-sunny-outline",
  },
  Dhuhr: {
    description: "Noon",
    icon: "sunny-outline",
  },
  Asr: {
    description: "Afternoon",
    icon: "cloudy-outline",
  },
  Maghrib: {
    description: "Sunset",
    icon: "moon-outline",
  },
  Isha: {
    description: "Night",
    icon: "cloudy-night-outline",
  },
};
