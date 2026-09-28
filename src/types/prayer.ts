export type PrayerName = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export type PrayerStatus = "completed" | "soon" | "upcoming";

export type PrayerIcon =
  | "partly-sunny-outline"
  | "sunny-outline"
  | "cloudy-outline"
  | "moon-outline"
  | "cloudy-night-outline";

export interface Prayer {
  name: PrayerName;
  time: Date;
  formattedTime: string;
  description: string;
  icon: PrayerIcon;
  status: PrayerStatus;
  remainingFormatted?: string;
}

export type CalculationMethodId =
  "mwl" | "isna" | "egyptian" | "karachi" | "umm-al-qura";

export type AsrMethod = "standard" | "hanafi";
