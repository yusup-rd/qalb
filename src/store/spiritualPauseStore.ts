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

const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

const getValidSessionDates = () => {
  const today = new Date();
  const todayKey = getDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return new Set([todayKey, getDateKey(yesterday)]);
};

const removeExpiredSessions = (
  sessions: Record<string, SpiritualPauseProgress>,
) => {
  const validDates = getValidSessionDates();
  const cleanedSessions = Object.fromEntries(
    Object.entries(sessions).filter(([sessionId]) => {
      const dateKey = sessionId.slice(0, 10);
      return validDates.has(dateKey);
    }),
  );

  return Object.keys(cleanedSessions).length === Object.keys(sessions).length
    ? sessions
    : cleanedSessions;
};

export const useSpiritualPauseStore = create<SpiritualPauseStore>()(
  persist(
    (set) => ({
      sessions: {},
      increment: (session, phraseIndex) =>
        set((state) => {
          const sessions = removeExpiredSessions(state.sessions);
          const current = sessions[session.sessionId] ?? EMPTY_PROGRESS;
          const counts = [...current.counts];
          const currentCount = counts[phraseIndex] ?? 0;

          if (currentCount >= SPIRITUAL_PAUSE_PHRASE_TARGET) {
            return sessions === state.sessions ? state : { sessions };
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
              ...sessions,
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
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }
        const sessions = removeExpiredSessions(state.sessions);

        if (sessions !== state.sessions) {
          useSpiritualPauseStore.setState({
            sessions,
          });
        }
      },
    },
  ),
);
