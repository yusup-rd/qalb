import type {
  AsrMethod,
  CalculationMethodId,
  PrayerName,
  PrayerNotificationName,
  PrayerTimeAdjustment,
} from "@/types/prayer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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

const DEFAULT_PRAYER_NOTIFICATIONS: Record<
  PrayerNotificationName,
  PrayerNotificationSettings
> = {
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
};

const DEFAULT_PRAYER_TIME_ADJUSTMENTS: Record<
  PrayerName,
  PrayerTimeAdjustment
> = {
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
};

export const usePrayerStore = create<PrayerStore>()(
  persist(
    (set) => ({
      calculationMethod: "mwl",
      asrMethod: "standard",
      prayerNotifications: DEFAULT_PRAYER_NOTIFICATIONS,
      prayerTimeAdjustments: DEFAULT_PRAYER_TIME_ADJUSTMENTS,

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
    }),
    {
      name: "@app/prayer",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,

      migrate: (persistedState, version) => {
        if (version === 1) {
          return persistedState;
        }

        return persistedState;
      },

      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PrayerStore>;

        return {
          ...currentState,
          ...persisted,

          prayerNotifications: Object.fromEntries(
            Object.entries(DEFAULT_PRAYER_NOTIFICATIONS).map(
              ([prayer, defaults]) => [
                prayer,
                {
                  ...defaults,
                  ...persisted.prayerNotifications?.[
                    prayer as PrayerNotificationName
                  ],
                },
              ],
            ),
          ) as Record<PrayerNotificationName, PrayerNotificationSettings>,

          prayerTimeAdjustments: Object.fromEntries(
            Object.entries(DEFAULT_PRAYER_TIME_ADJUSTMENTS).map(
              ([prayer, defaults]) => [
                prayer,
                {
                  ...defaults,
                  ...persisted.prayerTimeAdjustments?.[prayer as PrayerName],
                },
              ],
            ),
          ) as Record<PrayerName, PrayerTimeAdjustment>,
        };
      },
    },
  ),
);
