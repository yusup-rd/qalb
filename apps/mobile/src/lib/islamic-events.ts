import {
  fetchIslamicEventsCalendar,
  type IslamicEventsApiDay,
} from "@/api/islamic-events-api";

type IslamicEventId =
  | "islamic_new_year"
  | "ashura"
  | "isra_miraj"
  | "nisf_shaban"
  | "ramadan_start"
  | "laylat_al_qadr"
  | "eid_al_fitr"
  | "arafah"
  | "eid_al_adha"
  | "mawlid"
  | (string & {});

export interface IslamicEvent {
  id: IslamicEventId;
  date: string;
  hijriDate: string;
  name: string | null;
}

/**
 * Maps normalized provider event names to app's stable event IDs.
 *
 * Only events that have a dedicated app translation need to be
 * included here. Unknown provider events remain visible using
 * their original provider name.
 */
const EVENT_ID_MAP: Record<string, IslamicEventId> = {
  "islamic new year": "islamic_new_year",
  "eid-ul-fitr": "eid_al_fitr",
  "eid-ul-adha": "eid_al_adha",
  "lailat-ul-qadr": "laylat_al_qadr",
  "lailat-ul-miraj": "isra_miraj",
  "lailat-ul-bara'at": "nisf_shaban",
  "1st day of ramadan": "ramadan_start",
  ashura: "ashura",
  arafa: "arafah",
  "mawlid (birth) al-nabi": "mawlid",
};

function normalizeEventName(name: string): string {
  return name.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function getIslamicEventId(eventName: string): IslamicEventId | null {
  const normalizedName = normalizeEventName(eventName);

  return EVENT_ID_MAP[normalizedName] ?? null;
}

function getFallbackEventId(eventName: string): IslamicEventId {
  return `provider:${normalizeEventName(eventName)}`;
}

function normalizeApiDay(day: IslamicEventsApiDay): IslamicEvent[] {
  const events: IslamicEvent[] = [];

  const { day: hijriDay, month: hijriMonth } = day.hijriDate;

  const hijriDate = formatHijriDate(day.hijriDate);

  if (hijriDay === 1 && hijriMonth === 1) {
    events.push({
      id: "islamic_new_year",
      date: day.date,
      hijriDate,
      name: null,
    });
  }

  if (hijriDay === 1 && hijriMonth === 9) {
    events.push({
      id: "ramadan_start",
      date: day.date,
      hijriDate,
      name: null,
    });
  }

  for (const eventName of day.events) {
    const id = getIslamicEventId(eventName) ?? getFallbackEventId(eventName);

    if (
      id === "ramadan_start" ||
      id === "islamic_new_year" ||
      events.some((event) => event.id === id)
    ) {
      continue;
    }

    events.push({
      id,
      date: day.date,
      hijriDate,
      name: eventName,
    });
  }

  return events;
}

function formatHijriDate(date: {
  day: number;
  month: number;
  year: number;
}): string {
  return `${String(date.day).padStart(2, "0")}-${String(date.month).padStart(
    2,
    "0",
  )}-${date.year}`;
}

/**
 * Converts an Islamic events API calendar into
 * App's normalized Islamic event model.
 */
function normalizeIslamicEvents(days: IslamicEventsApiDay[]): IslamicEvent[] {
  return days.flatMap(normalizeApiDay);
}

/**
 * Fetches and normalizes Islamic events for a Gregorian month.
 */
export async function fetchIslamicEvents(
  month: number,
  year: number,
): Promise<IslamicEvent[]> {
  const days = await fetchIslamicEventsCalendar(month, year);

  return normalizeIslamicEvents(days);
}

/**
 * Finds Islamic events occurring on the given
 * Gregorian date.
 */
export function getIslamicEventsForDate(
  date: Date,
  events: IslamicEvent[],
): IslamicEvent[] {
  const dateKey = formatGregorianDate(date);

  return events.filter((event) => event.date === dateKey);
}

function formatGregorianDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
