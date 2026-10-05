import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
  type CalculationParameters,
} from "adhan";

import type { AsrMethod, CalculationMethodId } from "@/types/prayer";

/**
 * Converts the app's prayer calculation settings into the
 * calculation parameters expected by Adhan.
 *
 * The calculation method determines the parameters used for
 * Fajr, Isha, and other prayer times, while the Asr method
 * determines the madhab-specific shadow-length calculation.
 */
function getCalculationParameters(
  method: CalculationMethodId,
  asrMethod: AsrMethod,
): CalculationParameters {
  const params = getCalculationMethod(method);

  params.madhab = asrMethod === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;

  return params;
}

function getCalculationMethod(
  method: CalculationMethodId,
): CalculationParameters {
  switch (method) {
    case "mwl":
      return CalculationMethod.MuslimWorldLeague();

    case "isna":
      return CalculationMethod.NorthAmerica();

    case "egyptian":
      return CalculationMethod.Egyptian();

    case "karachi":
      return CalculationMethod.Karachi();

    case "umm-al-qura":
      return CalculationMethod.UmmAlQura();

    case "dubai":
      return CalculationMethod.Dubai();

    case "moonsighting-committee":
      return CalculationMethod.MoonsightingCommittee();

    case "kuwait":
      return CalculationMethod.Kuwait();

    case "qatar":
      return CalculationMethod.Qatar();

    case "singapore":
      return CalculationMethod.Singapore();

    case "tehran":
      return CalculationMethod.Tehran();

    case "turkey":
      return CalculationMethod.Turkey();

    default:
      return CalculationMethod.MuslimWorldLeague();
  }
}

export function calculatePrayerTimes(
  latitude: number,
  longitude: number,
  date: Date,
  method: CalculationMethodId,
  asrMethod: AsrMethod,
) {
  const coordinates = new Coordinates(latitude, longitude);
  const params = getCalculationParameters(method, asrMethod);

  return new PrayerTimes(coordinates, date, params);
}
