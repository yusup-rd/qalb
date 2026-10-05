import type { IslamicEventsApiDay } from "@qalb/shared";
import { apiRequest } from "./client";
import { requestCached } from "./client-cache";

const ISLAMIC_EVENTS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type { IslamicEventsApiDay };

export const fetchIslamicEventsCalendar = (month: number, year: number) =>
  requestCached(
    `islamic-events:${year}:${String(month).padStart(2, "0")}`,
    ISLAMIC_EVENTS_CACHE_TTL_MS,
    () =>
      apiRequest<IslamicEventsApiDay[]>(
        `/api/islamic-events/calendar?month=${month}&year=${year}`,
      ),
    { allowStaleOnError: true },
  );
