import { SPIRITUAL_PAUSE_PHRASE_TARGET } from "@/constants/spiritual-pause";
import { getSpiritualPauseSession } from "@/lib/spiritual-pause";
import { useSpiritualPauseStore } from "@/store/spiritualPauseStore";
import type { SpiritualPauseSession } from "@/types/spiritual-pause";
import { usePrayerTimes } from "./usePrayerTimes";

function getFallbackSession(
  session: SpiritualPauseSession,
): SpiritualPauseSession | null {
  if (session.type !== "postPrayer") {
    return null;
  }

  const { date } = session;

  switch (session.prayer) {
    case "Fajr":
      return {
        type: "morning",
        prayer: null,
        date,
        sessionId: `${date}:morning`,
      };
    case "Dhuhr":
      return null;
    case "Asr":
    case "Maghrib":
      return {
        type: "evening",
        prayer: null,
        date,
        sessionId: `${date}:evening`,
      };
    case "Isha":
      return {
        type: "night",
        prayer: null,
        date,
        sessionId: `${date}:night`,
      };
    default:
      return null;
  }
}

export function useSpiritualPause() {
  const { prayers, sunrise, previousPrayer, now } = usePrayerTimes();

  const activeSession = getSpiritualPauseSession({
    prayers,
    sunrise,
    previousPrayer,
    now,
  });

  const sessions = useSpiritualPauseStore((state) => state.sessions);
  const incrementProgress = useSpiritualPauseStore((state) => state.increment);
  const resetSession = useSpiritualPauseStore((state) => state.reset);

  if (!activeSession) {
    return {
      session: null,
      counts: [],
      currentPhraseIndex: null,
      completed: false,
      increment: () => {},
      reset: () => {},
    };
  }

  const activeProgress = sessions[activeSession.sessionId] ?? {
    counts: [],
    completed: false,
  };

  let session = activeSession;
  let progress = activeProgress;

  if (activeSession.type === "postPrayer" && activeProgress.completed) {
    const fallbackSession = getFallbackSession(activeSession);

    if (!fallbackSession) {
      return {
        session: null,
        counts: [],
        currentPhraseIndex: null,
        completed: false,
        increment: () => {},
        reset: () => {},
      };
    }

    session = fallbackSession;
    progress = sessions[fallbackSession.sessionId] ?? {
      counts: [],
      completed: false,
    };
  }

  const phraseCount = session.type === "postPrayer" ? 3 : 1;

  const counts = Array.from(
    { length: phraseCount },
    (_, index) => progress.counts[index] ?? 0,
  );

  const completed = progress.completed;

  const currentPhraseIndex = completed
    ? null
    : counts.findIndex((count) => count < SPIRITUAL_PAUSE_PHRASE_TARGET);

  const increment = () => {
    if (completed || currentPhraseIndex === null || currentPhraseIndex < 0) {
      return;
    }

    incrementProgress(session, currentPhraseIndex);
  };

  const reset = () => {
    resetSession(session.sessionId);
  };

  return {
    session,
    counts,
    currentPhraseIndex,
    completed,
    increment,
    reset,
  };
}
