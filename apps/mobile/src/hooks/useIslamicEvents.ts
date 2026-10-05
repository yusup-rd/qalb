import { fetchIslamicEvents, type IslamicEvent } from "@/lib/islamic-events";
import { useEffect, useState } from "react";

function getAdjacentMonths(date: Date): { year: number; month: number }[] {
  return [
    new Date(date.getFullYear(), date.getMonth() - 1, 1),
    new Date(date.getFullYear(), date.getMonth(), 1),
    new Date(date.getFullYear(), date.getMonth() + 1, 1),
  ].map((month) => ({
    year: month.getFullYear(),
    month: month.getMonth() + 1,
  }));
}

export function useIslamicEvents(selectedDate: Date) {
  const [events, setEvents] = useState<IslamicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await Promise.allSettled(
          getAdjacentMonths(new Date(year, month - 1, 1)).map((currentMonth) =>
            fetchIslamicEvents(currentMonth.month, currentMonth.year),
          ),
        );
        const fulfilled = results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );

        if (fulfilled.length === 0) {
          const failure = results.find(
            (result): result is PromiseRejectedResult =>
              result.status === "rejected",
          );
          throw failure?.reason ?? new Error("Failed to load Islamic events");
        }

        if (!cancelled) setEvents(fulfilled.flat());
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught
              : new Error("Failed to load Islamic events"),
          );
          setEvents([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return { events, isLoading, error };
}
