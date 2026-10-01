import type { Prayer } from "@/types/prayer";

export type SpiritualPauseType = "morning" | "postPrayer" | "evening" | "night";

const TEST_SPIRITUAL_PAUSE_TYPE: SpiritualPauseType | null = null; // Set to null to disable testing

interface GetSpiritualPauseTypeParams {
  prayers: Prayer[];
  sunrise: Date | null;
  now: Date;
}

export function getSpiritualPauseType({
  prayers,
  sunrise,
  now,
}: GetSpiritualPauseTypeParams): SpiritualPauseType {
  if (TEST_SPIRITUAL_PAUSE_TYPE) {
    return TEST_SPIRITUAL_PAUSE_TYPE;
  }

  if (!sunrise) {
    return "postPrayer";
  }

  const fajr = prayers.find((prayer) => prayer.name === "Fajr")?.time;
  const asr = prayers.find((prayer) => prayer.name === "Asr")?.time;
  const isha = prayers.find((prayer) => prayer.name === "Isha")?.time;

  if (!fajr || !asr || !isha) {
    return "postPrayer";
  }

  const nowTime = now.getTime();
  const fajrTime = fajr.getTime();
  const sunriseTime = sunrise.getTime();
  const asrTime = asr.getTime();
  const ishaTime = isha.getTime();

  if (nowTime >= fajrTime && nowTime < sunriseTime) {
    return "morning";
  }

  if (nowTime >= sunriseTime && nowTime < asrTime) {
    return "postPrayer";
  }

  if (nowTime >= asrTime && nowTime < ishaTime) {
    return "evening";
  }

  return "night";
}
