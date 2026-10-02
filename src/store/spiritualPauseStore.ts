import { SPIRITUAL_PAUSE_PHRASE_TARGET } from "@/constants/spiritual-pause";
import type {
  SpiritualPauseProgress,
  SpiritualPauseSession,
} from "@/types/spiritual-pause";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const SPIRITUAL_PAUSE_STORAGE_KEY = "@app/spiritual-pause";

const EMPTY_PROGRESS: SpiritualPauseProgress = {
  counts: [],
  completed: false,
};

interface SpiritualPauseStore {
  sessions: Record<string, SpiritualPauseProgress>;
  increment: (session: SpiritualPauseSession, phraseIndex: number) => void;
  reset: (sessionId: string) => void;
  resetAll: () => void;
}

export const useSpiritualPauseStore = create<SpiritualPauseStore>()(
  persist(
    (set) => ({
      sessions: {},
      increment: (session, phraseIndex) =>
        set((state) => {
          const current = state.sessions[session.sessionId] ?? EMPTY_PROGRESS;
          const counts = [...current.counts];
          const currentCount = counts[phraseIndex] ?? 0;

          if (currentCount >= SPIRITUAL_PAUSE_PHRASE_TARGET) {
            return state;
          }

          const nextCount = Math.min(
            currentCount + 1,
            SPIRITUAL_PAUSE_PHRASE_TARGET,
          );

          counts[phraseIndex] = nextCount;

          const phraseCount = session.type === "postPrayer" ? 3 : 1;
          const completed =
            counts.length >= phraseCount &&
            counts
              .slice(0, phraseCount)
              .every((count) => count >= SPIRITUAL_PAUSE_PHRASE_TARGET);

          return {
            sessions: {
              ...state.sessions,
              [session.sessionId]: {
                counts,
                completed,
              },
            },
          };
        }),
      reset: (sessionId) =>
        set((state) => {
          const sessions = { ...state.sessions };
          delete sessions[sessionId];

          return {
            sessions,
          };
        }),
      resetAll: () => {
        if (__DEV__) {
          set({
            sessions: {},
          });
        }
      },
    }),
    {
      name: SPIRITUAL_PAUSE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
