import type {
  AsrMethod,
  CalculationMethodId,
  PrayerName,
} from "@/types/prayer";
import { create } from "zustand";

interface PrayerNotificationSettings {
  enabled: boolean;
  minutesBefore: number;
}

interface PrayerStore {
  calculationMethod: CalculationMethodId;
  asrMethod: AsrMethod;

  prayerNotifications: Record<PrayerName, PrayerNotificationSettings>;

  setCalculationMethod: (method: CalculationMethodId) => void;

  setAsrMethod: (method: AsrMethod) => void;

  setCalculationSettings: (
    method: CalculationMethodId,
    asrMethod: AsrMethod,
  ) => void;

  setPrayerNotification: (
    prayer: PrayerName,
    settings: PrayerNotificationSettings,
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
}));
