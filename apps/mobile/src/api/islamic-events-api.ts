const ISLAMIC_EVENTS_API_URL = "https://api.aladhan.com/v1/gToHCalendar";

export interface IslamicEventsApiDay {
  date: string;
  hijriDate: {
    day: number;
    month: number;
    year: number;
  };
  events: string[];
}

interface AladhanGregorian {
  date: string;
  day: string;
  month: {
    number: number;
    en: string;
  };
  year: string;
}

interface AladhanHijri {
  date: string;
  day: string;
  month: {
    number: number;
    en: string;
    days: number;
  };
  year: string;
  holidays: string[];
  adjustedHolidays: string[];
  method: string;
}

interface AladhanCalendarDay {
  gregorian: AladhanGregorian;
  hijri: AladhanHijri;
}

interface AladhanCalendarResponse {
  code: number;
  status: string;
  data: AladhanCalendarDay[];
}

function normalizeGregorianDate(date: string): string {
  const [day, month, year] = date.split("-");

  return `${year}-${month}-${day}`;
}

function normalizeDay(day: AladhanCalendarDay): IslamicEventsApiDay {
  const [hijriDay, hijriMonth, hijriYear] = day.hijri.date
    .split("-")
    .map(Number);

  return {
    date: normalizeGregorianDate(day.gregorian.date),
    hijriDate: {
      day: hijriDay,
      month: hijriMonth,
      year: hijriYear,
    },
    events: [
      ...(Array.isArray(day.hijri?.holidays) ? day.hijri.holidays : []),
      ...(Array.isArray(day.hijri?.adjustedHolidays)
        ? day.hijri.adjustedHolidays
        : []),
    ],
  };
}
export async function fetchIslamicEventsCalendar(
  month: number,
  year: number,
): Promise<IslamicEventsApiDay[]> {
  const url = `${ISLAMIC_EVENTS_API_URL}/${month}/${year}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Islamic events API request failed: ${response.status}`);
  }

  const data: AladhanCalendarResponse = await response.json();

  if (
    data?.code !== 200 ||
    data?.status !== "OK" ||
    !Array.isArray(data?.data)
  ) {
    throw new Error("Islamic events API request failed");
  }

  return data.data.map(normalizeDay);
}
