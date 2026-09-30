export type PrayerName = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export type SolarEventName = "Sunrise";

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

export interface SolarEvent {
  name: SolarEventName;
  time: Date;
  formattedTime: string;
}

export type PrayerNotificationName = PrayerName | SolarEventName;

export type PrayerTimeAdjustmentMode = "none" | "offset" | "fixed";

export interface PrayerTimeAdjustment {
  mode: PrayerTimeAdjustmentMode;
  offsetMinutes: number;
  fixedTime: string | null;
}

export type CalculationMethodId =
  "mwl" | "isna" | "egyptian" | "karachi" | "umm-al-qura";

export type AsrMethod = "standard" | "hanafi";
