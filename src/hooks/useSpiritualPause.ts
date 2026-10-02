import {
  SPIRITUAL_PAUSE_COMPLETION_HOLD_MS,
  SPIRITUAL_PAUSE_PHRASE_TARGET,
} from "@/constants/spiritual-pause";
import { getSpiritualPauseSession } from "@/lib/spiritual-pause";
import { useSpiritualPauseStore } from "@/store/spiritualPauseStore";
import type { SpiritualPauseSession } from "@/types/spiritual-pause";
import { useEffect, useRef, useState } from "react";
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

const EMPTY_RESULT = {
  session: null,
  counts: [] as number[],
  currentPhraseIndex: null,
  completed: false,
  increment: () => {},
  reset: () => {},
};

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

  // Keeps a just-completed post-prayer card visible briefly before swiping.
  const [heldSessionId, setHeldSessionId] = useState<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
      }
    };
  }, []);

  if (!activeSession) {
    return EMPTY_RESULT;
  }

  const activeProgress = sessions[activeSession.sessionId] ?? {
    counts: [],
    completed: false,
  };

  let session = activeSession;
  let progress = activeProgress;

  if (
    activeSession.type === "postPrayer" &&
    activeProgress.completed &&
    heldSessionId !== activeSession.sessionId
  ) {
    const fallbackSession = getFallbackSession(activeSession);

    // No fallback (e.g. Dhuhr): stay on the completed post-prayer card
    // until its window ends. Otherwise swipe to the fallback.
    if (fallbackSession) {
      session = fallbackSession;
      progress = sessions[fallbackSession.sessionId] ?? {
        counts: [],
        completed: false,
      };
    }
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

    const willComplete = counts.every((count, index) =>
      index === currentPhraseIndex
        ? count + 1 >= SPIRITUAL_PAUSE_PHRASE_TARGET
        : count >= SPIRITUAL_PAUSE_PHRASE_TARGET,
    );

    if (
      willComplete &&
      session.type === "postPrayer" &&
      getFallbackSession(session)
    ) {
      const { sessionId } = session;

      setHeldSessionId(sessionId);

      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
      }

      holdTimer.current = setTimeout(() => {
        setHeldSessionId((current) => (current === sessionId ? null : current));
        holdTimer.current = null;
      }, SPIRITUAL_PAUSE_COMPLETION_HOLD_MS);
    }
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
