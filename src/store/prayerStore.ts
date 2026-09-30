import type {
  AsrMethod,
  CalculationMethodId,
  PrayerName,
  PrayerNotificationName,
  PrayerTimeAdjustment,
} from "@/types/prayer";
import { create } from "zustand";

interface PrayerNotificationSettings {
  enabled: boolean;
  minutesBefore: number;
}

interface PrayerStore {
  calculationMethod: CalculationMethodId;
  asrMethod: AsrMethod;

  prayerNotifications: Record<
    PrayerNotificationName,
    PrayerNotificationSettings
  >;

  prayerTimeAdjustments: Record<PrayerName, PrayerTimeAdjustment>;

  setCalculationMethod: (method: CalculationMethodId) => void;
  setAsrMethod: (method: AsrMethod) => void;
  setCalculationSettings: (
    method: CalculationMethodId,
    asrMethod: AsrMethod,
  ) => void;

  setPrayerNotification: (
    prayer: PrayerNotificationName,
    settings: PrayerNotificationSettings,
  ) => void;

  setPrayerTimeAdjustment: (
    prayer: PrayerName,
    adjustment: PrayerTimeAdjustment,
  ) => void;
}

export const usePrayerStore = create<PrayerStore>((set) => ({
  calculationMethod: "mwl",
  asrMethod: "standard",

  prayerNotifications: {
    Fajr: {
      enabled: false,
      minutesBefore: 10,
    },
    Sunrise: {
      enabled: false,
      minutesBefore: 10,
    },
    Dhuhr: {
      enabled: false,
      minutesBefore: 10,
    },
    Asr: {
      enabled: false,
      minutesBefore: 10,
    },
    Maghrib: {
      enabled: false,
      minutesBefore: 10,
    },
    Isha: {
      enabled: false,
      minutesBefore: 10,
    },
  },

  prayerTimeAdjustments: {
    Fajr: {
      mode: "none",
      offsetMinutes: 0,
      fixedTime: null,
    },
    Dhuhr: {
      mode: "none",
      offsetMinutes: 0,
      fixedTime: null,
    },
    Asr: {
      mode: "none",
      offsetMinutes: 0,
      fixedTime: null,
    },
    Maghrib: {
      mode: "none",
      offsetMinutes: 0,
      fixedTime: null,
    },
    Isha: {
      mode: "none",
      offsetMinutes: 0,
      fixedTime: null,
    },
  },

  setCalculationMethod: (method) =>
    set({
      calculationMethod: method,
    }),

  setAsrMethod: (method) =>
    set({
      asrMethod: method,
    }),

  setCalculationSettings: (method, asrMethod) =>
    set({
      calculationMethod: method,
      asrMethod,
    }),

  setPrayerNotification: (prayer, settings) =>
    set((state) => ({
      prayerNotifications: {
        ...state.prayerNotifications,
        [prayer]: settings,
      },
    })),

  setPrayerTimeAdjustment: (prayer, adjustment) =>
    set((state) => ({
      prayerTimeAdjustments: {
        ...state.prayerTimeAdjustments,
        [prayer]: adjustment,
      },
    })),
}));
