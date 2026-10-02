import { getLocalDateKey } from "@/lib/date";
import type { Prayer, PrayerName } from "@/types/prayer";
import type {
  SpiritualPauseSession,
  SpiritualPauseType,
} from "@/types/spiritual-pause";

const POST_PRAYER_PRIORITY_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const TEST_SPIRITUAL_PAUSE_TYPE: SpiritualPauseType | null = null; // Set to null to disable testing.
const TEST_POST_PRAYER: PrayerName = "Fajr"; // Only used if TEST_SPIRITUAL_PAUSE_TYPE is "postPrayer".

type RoutineSpiritualPauseType = Exclude<SpiritualPauseType, "postPrayer">;

interface GetSpiritualPauseSessionParams {
  prayers: Prayer[];
  sunrise: Date | null;
  previousPrayer: Prayer | null;
  now: Date;
}

function createSessionId(
  date: string,
  type: SpiritualPauseType,
  prayer?: PrayerName,
) {
  return prayer ? `${date}:${type}:${prayer}` : `${date}:${type}`;
}

function createSession(
  type: RoutineSpiritualPauseType,
  date: Date,
): SpiritualPauseSession {
  const dateKey = getLocalDateKey(date);

  return {
    type,
    prayer: null,
    date: dateKey,
    sessionId: createSessionId(dateKey, type),
  };
}

function createPostPrayerSession(
  prayer: PrayerName,
  date: Date,
): SpiritualPauseSession {
  const dateKey = getLocalDateKey(date);

  return {
    type: "postPrayer",
    prayer,
    date: dateKey,
    sessionId: createSessionId(dateKey, "postPrayer", prayer),
  };
}

function getPrayer(prayers: Prayer[], name: PrayerName) {
  return prayers.find((prayer) => prayer.name === name) ?? null;
}

export function getSpiritualPauseSession({
  prayers,
  sunrise,
  previousPrayer,
  now,
}: GetSpiritualPauseSessionParams): SpiritualPauseSession | null {
  if (TEST_SPIRITUAL_PAUSE_TYPE === "postPrayer") {
    return createPostPrayerSession(TEST_POST_PRAYER, now);
  }

  if (TEST_SPIRITUAL_PAUSE_TYPE) {
    return createSession(TEST_SPIRITUAL_PAUSE_TYPE, now);
  }

  if (!sunrise) {
    return null;
  }

  const fajr = getPrayer(prayers, "Fajr");
  const dhuhr = getPrayer(prayers, "Dhuhr");
  const asr = getPrayer(prayers, "Asr");
  const maghrib = getPrayer(prayers, "Maghrib");
  const isha = getPrayer(prayers, "Isha");

  if (!fajr || !dhuhr || !asr || !maghrib || !isha) {
    return null;
  }

  const nowTime = now.getTime();
  const sunriseTime = sunrise.getTime();

  /*
   * Post-prayer priority:
   *
   * The most recent prayer takes priority for the first hour
   * after it occurs.
   *
   * previousPrayer comes from usePrayerTimes(), so this also
   * works when the previous prayer was yesterday's Isha.
   */
  if (previousPrayer) {
    const elapsedSincePrayer = nowTime - previousPrayer.time.getTime();

    if (
      elapsedSincePrayer >= 0 &&
      elapsedSincePrayer < POST_PRAYER_PRIORITY_WINDOW_MS
    ) {
      return createPostPrayerSession(previousPrayer.name, previousPrayer.time);
    }
  }

  /*
   * Morning:
   * Fajr → Sunrise
   */
  if (nowTime >= fajr.time.getTime() && nowTime < sunriseTime) {
    return createSession("morning", fajr.time);
  }

  /*
   * Sunrise → Dhuhr
   */
  if (nowTime >= sunriseTime && nowTime < dhuhr.time.getTime()) {
    return null;
  }

  /*
   * Dhuhr → Asr
   */
  if (nowTime >= dhuhr.time.getTime() && nowTime < asr.time.getTime()) {
    return null;
  }

  /*
   * Evening:
   * Asr → Maghrib
   */
  if (nowTime >= asr.time.getTime() && nowTime < maghrib.time.getTime()) {
    return createSession("evening", asr.time);
  }

  /*
   * Maghrib → Isha
   */
  if (nowTime >= maghrib.time.getTime() && nowTime < isha.time.getTime()) {
    return createSession("evening", maghrib.time);
  }

  /*
   * Night:
   * Isha → next Fajr
   */
  if (nowTime >= isha.time.getTime()) {
    return createSession("night", isha.time);
  }

  /*
   * After midnight → today's Fajr
   */
  if (
    previousPrayer?.name === "Isha" &&
    previousPrayer.time.getTime() < fajr.time.getTime()
  ) {
    return createSession("night", previousPrayer.time);
  }

  return null;
}
