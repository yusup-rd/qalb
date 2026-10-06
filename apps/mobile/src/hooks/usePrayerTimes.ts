import { prayerMetadata } from "@/constants/prayers";
import { formatDuration, formatDurationClock, formatTime } from "@/lib/format";
import { calculatePrayerTimes } from "@/lib/prayer-calculations";
import { applyPrayerTimeAdjustment } from "@/lib/prayer-time-adjustments";
import { useLocationStore } from "@/store/locationStore";
import { usePrayerStore } from "@/store/prayerStore";
import type {
  Prayer,
  PrayerName,
  PrayerStatus,
  PrayerTimeAdjustment,
  SolarEvent,
} from "@/types/prayer";
import { useIsFocused } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const TEST_CURRENT_TIME = false;
const TEST_HOUR = 13;
const TEST_MINUTE = 0;

const prayerNames: PrayerName[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function getNow() {
  if (TEST_CURRENT_TIME) {
    const date = new Date();
    date.setHours(TEST_HOUR, TEST_MINUTE, 0, 0);
    return date;
  }

  return new Date();
}

function getPrayerTime(
  name: PrayerName,
  times: ReturnType<typeof calculatePrayerTimes>,
) {
  switch (name) {
    case "Fajr":
      return times.fajr;
    case "Dhuhr":
      return times.dhuhr;
    case "Asr":
      return times.asr;
    case "Maghrib":
      return times.maghrib;
    case "Isha":
      return times.isha;
  }
}

function getPrayerData(
  date: Date,
  latitude: number,
  longitude: number,
  calculationMethod: Parameters<typeof calculatePrayerTimes>[3],
  asrMethod: Parameters<typeof calculatePrayerTimes>[4],
  prayerTimeAdjustments: Record<PrayerName, PrayerTimeAdjustment>,
) {
  const times = calculatePrayerTimes(
    latitude,
    longitude,
    date,
    calculationMethod,
    asrMethod,
  );

  const prayers: Omit<Prayer, "formattedTime">[] = prayerNames.map((name) => {
    const calculatedTime = getPrayerTime(name, times);
    const adjustment = prayerTimeAdjustments[name];
    const time = applyPrayerTimeAdjustment(calculatedTime, adjustment);
    const metadata = prayerMetadata[name];

    return {
      name,
      time,
      description: metadata.description,
      icon: metadata.icon,
      status: "upcoming",
    };
  });

  const sunriseEvent: Omit<SolarEvent, "formattedTime"> = {
    name: "Sunrise",
    time: times.sunrise,
  };

  return {
    prayers,
    sunrise: times.sunrise,
    sunriseEvent,
    sunset: times.sunset,
  };
}

type PrayerTimeSnapshotPrayer = Omit<
  Prayer,
  "formattedTime" | "remainingFormatted"
> & { remainingMilliseconds?: number };

type PrayerTimeSnapshot = {
  prayers: PrayerTimeSnapshotPrayer[];
  selectedPrayers: PrayerTimeSnapshotPrayer[];
  sunrise: Date | null;
  sunriseEvent: Omit<SolarEvent, "formattedTime"> | null;
  isSunriseCompleted: boolean;
  selectedSunrise: Date | null;
  selectedSunriseEvent: Omit<SolarEvent, "formattedTime"> | null;
  selectedSunset: Date | null;
  selectedNightSunset: Date | null;
  selectedNextFajr: Date | null;
  previousPrayer: PrayerTimeSnapshotPrayer | null;
  nextPrayer: PrayerTimeSnapshotPrayer | null;
  countdown: string;
  elapsedPercent: number;
  sunset: Date | null;
  now: Date;
  solarEvent: {
    label: "Sunrise" | "Sunset";
    remainingMilliseconds: number;
  } | null;
};

type CalculatedPrayerDay = ReturnType<typeof getPrayerData>;

function sortPrayersByTime<T extends { time: Date }>(prayers: T[]) {
  return [...prayers].sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * Returns prayer and temporal state without subscribing to locale changes.
 * Consumers that only need prayer dates/statuses can avoid formatting work.
 */
function usePrayerTimesState(selectedDate?: Date) {
  const isFocused = useIsFocused();
  const calculationMethod = usePrayerStore((state) => state.calculationMethod);
  const asrMethod = usePrayerStore((state) => state.asrMethod);
  const prayerTimeAdjustments = usePrayerStore(
    (state) => state.prayerTimeAdjustments,
  );
  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);
  const [now, setNow] = useState(getNow);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const initialUpdate = setTimeout(() => {
      setNow(getNow());
    }, 0);
    const interval = setInterval(() => {
      setNow(getNow());
    }, 1000);

    return () => {
      clearTimeout(initialUpdate);
      clearInterval(interval);
    };
  }, [isFocused]);

  const todayKey = [now.getFullYear(), now.getMonth(), now.getDate()].join("-");

  const selectedKey = selectedDate
    ? [
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      ].join("-")
    : todayKey;

  const calculatedData = useMemo(() => {
    if (latitude == null || longitude == null) {
      return null;
    }

    const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);

    const [selectedYear, selectedMonth, selectedDay] = selectedKey
      .split("-")
      .map(Number);

    const currentDate = new Date(todayYear, todayMonth, todayDay);

    const selectedDateValue = new Date(
      selectedYear,
      selectedMonth,
      selectedDay,
    );

    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const selectedNextDay = new Date(selectedDateValue);
    selectedNextDay.setDate(selectedNextDay.getDate() + 1);

    return {
      yesterday: getPrayerData(
        yesterday,
        latitude,
        longitude,
        calculationMethod,
        asrMethod,
        prayerTimeAdjustments,
      ),
      today: getPrayerData(
        currentDate,
        latitude,
        longitude,
        calculationMethod,
        asrMethod,
        prayerTimeAdjustments,
      ),
      tomorrow: getPrayerData(
        tomorrow,
        latitude,
        longitude,
        calculationMethod,
        asrMethod,
        prayerTimeAdjustments,
      ),
      selected: getPrayerData(
        selectedDateValue,
        latitude,
        longitude,
        calculationMethod,
        asrMethod,
        prayerTimeAdjustments,
      ),
      selectedNextDay: getPrayerData(
        selectedNextDay,
        latitude,
        longitude,
        calculationMethod,
        asrMethod,
        prayerTimeAdjustments,
      ),
    };
  }, [
    todayKey,
    selectedKey,
    latitude,
    longitude,
    calculationMethod,
    asrMethod,
    prayerTimeAdjustments,
  ]);

  const data = useMemo<PrayerTimeSnapshot>(() => {
    if (!calculatedData) {
      return {
        prayers: [],
        selectedPrayers: [],
        sunrise: null,
        sunriseEvent: null,
        isSunriseCompleted: false,
        selectedSunrise: null,
        selectedSunriseEvent: null,
        selectedSunset: null,
        selectedNightSunset: null,
        selectedNextFajr: null,
        previousPrayer: null,
        nextPrayer: null,
        countdown: "00:00:00",
        elapsedPercent: 0,
        sunset: null,
        now,
        solarEvent: null,
      };
    }

    const { yesterday, today, tomorrow, selected, selectedNextDay } =
      calculatedData;

    const nowTime = now.getTime();

    const orderedYesterdayPrayers = sortPrayersByTime(yesterday.prayers);
    const orderedTodayPrayers = sortPrayersByTime(today.prayers);
    const orderedTomorrowPrayers = sortPrayersByTime(tomorrow.prayers);

    const nextTodayPrayer = orderedTodayPrayers.find(
      (prayer) => prayer.time.getTime() > nowTime,
    );

    const adjacentPrayers = sortPrayersByTime([
      ...orderedYesterdayPrayers,
      ...orderedTodayPrayers,
      ...orderedTomorrowPrayers,
    ]);

    const nextPrayer =
      adjacentPrayers.find((prayer) => prayer.time.getTime() > nowTime) ??
      orderedTomorrowPrayers[0]!;

    const previousPrayer = [...adjacentPrayers]
      .reverse()
      .find((prayer) => prayer.time.getTime() <= nowTime)!;

    const prayers = today.prayers.map((prayer) => {
      let status: PrayerStatus = "upcoming";

      if (prayer.time.getTime() <= nowTime) {
        status = "completed";
      }

      const isNextPrayerToday = nextTodayPrayer?.name === prayer.name;

      if (isNextPrayerToday) {
        status = "soon";
      }

      return {
        ...prayer,
        status,
        remainingMilliseconds: isNextPrayerToday
          ? prayer.time.getTime() - nowTime
          : undefined,
      };
    });

    const intervalStart = previousPrayer.time.getTime();
    const intervalEnd = nextPrayer.time.getTime();
    const intervalDuration = intervalEnd - intervalStart;
    const elapsed = nowTime - intervalStart;

    const elapsedPercent =
      intervalDuration > 0
        ? Math.min(100, Math.max(0, (elapsed / intervalDuration) * 100))
        : 0;

    const isBeforeSunrise = nowTime < today.sunrise.getTime();
    const isBeforeSunset = nowTime < today.sunset.getTime();

    let solarEvent: {
      label: "Sunrise" | "Sunset";
      time: Date;
    };

    if (isBeforeSunrise) {
      solarEvent = {
        label: "Sunrise",
        time: today.sunrise,
      };
    } else if (isBeforeSunset) {
      solarEvent = {
        label: "Sunset",
        time: today.sunset,
      };
    } else {
      solarEvent = {
        label: "Sunrise",
        time: tomorrow.sunrise,
      };
    }

    /*
     * A night spans two calendar dates.
     *
     * Before today's sunset:
     *   yesterday's sunset → today's Fajr
     *
     * After today's sunset:
     *   today's sunset → tomorrow's Fajr
     *
     * For another selected date:
     *   selected date's sunset → following day's Fajr
     */
    const isSelectedDateToday = selectedKey === todayKey;

    const isBeforeSelectedSunset =
      isSelectedDateToday && nowTime < selected.sunset.getTime();

    const selectedFajr =
      selected.prayers.find((prayer) => prayer.name === "Fajr")?.time ?? null;

    const selectedNextFajr =
      selectedNextDay.prayers.find((prayer) => prayer.name === "Fajr")?.time ??
      null;

    const nightSunset = isBeforeSelectedSunset
      ? yesterday.sunset
      : selected.sunset;

    const nightFajr = isBeforeSelectedSunset ? selectedFajr : selectedNextFajr;

    return {
      prayers,
      selectedPrayers: selected.prayers,
      sunrise: today.sunrise,
      sunriseEvent: today.sunriseEvent,
      isSunriseCompleted: today.sunrise.getTime() <= nowTime,
      selectedSunrise: selected.sunrise,
      selectedSunriseEvent: selected.sunriseEvent,
      selectedSunset: selected.sunset,
      selectedNightSunset: nightSunset,
      selectedNextFajr: nightFajr,
      previousPrayer,
      nextPrayer,
      countdown: formatDurationClock(nextPrayer.time.getTime() - nowTime),
      elapsedPercent,
      sunset: today.sunset,
      now,
      solarEvent: {
        label: solarEvent.label,
        remainingMilliseconds: solarEvent.time.getTime() - nowTime,
      },
    };
  }, [calculatedData, now, selectedKey, todayKey]);

  return useMemo(() => ({ data, calculatedData }), [calculatedData, data]);
}

export function usePrayerTimesData(selectedDate?: Date): PrayerTimeSnapshot {
  return usePrayerTimesState(selectedDate).data;
}

export function usePrayerTimes(selectedDate?: Date) {
  const { data, calculatedData } = usePrayerTimesState(selectedDate);
  const { i18n: i18nInstance } = useTranslation();
  const language = i18nInstance.language;

  const localizedData = useMemo(() => {
    if (!calculatedData) {
      return null;
    }

    const localizeDay = (day: CalculatedPrayerDay) => ({
      ...day,
      prayers: day.prayers.map((prayer) => ({
        ...prayer,
        formattedTime: formatTime(prayer.time, language),
      })),
      sunriseEvent: {
        ...day.sunriseEvent,
        formattedTime: formatTime(day.sunrise, language),
      },
    });

    const days = {
      yesterday: localizeDay(calculatedData.yesterday),
      today: localizeDay(calculatedData.today),
      tomorrow: localizeDay(calculatedData.tomorrow),
      selected: localizeDay(calculatedData.selected),
      selectedNextDay: localizeDay(calculatedData.selectedNextDay),
    };
    const formattedTimes = new Map<number, string>();

    Object.values(days).forEach((day) => {
      day.prayers.forEach((prayer) => {
        formattedTimes.set(prayer.time.getTime(), prayer.formattedTime);
      });
      formattedTimes.set(
        day.sunriseEvent.time.getTime(),
        day.sunriseEvent.formattedTime,
      );
    });

    return { days, formattedTimes };
  }, [calculatedData, language]);

  return useMemo(() => {
    const localizePrayer = (prayer: PrayerTimeSnapshotPrayer | null) => {
      if (!prayer) {
        return null;
      }

      const { remainingMilliseconds, ...prayerData } = prayer;

      return {
        ...prayerData,
        formattedTime:
          localizedData?.formattedTimes.get(prayer.time.getTime()) ??
          formatTime(prayer.time, language),
        ...(remainingMilliseconds === undefined
          ? {}
          : { remainingFormatted: formatDuration(remainingMilliseconds) }),
      };
    };

    const localizeSolarEvent = (
      event: Omit<SolarEvent, "formattedTime"> | null,
    ): SolarEvent | null =>
      event
        ? {
            ...event,
            formattedTime:
              localizedData?.formattedTimes.get(event.time.getTime()) ??
              formatTime(event.time, language),
          }
        : null;

    return {
      ...data,
      prayers: data.prayers.map((prayer) => localizePrayer(prayer)!),
      selectedPrayers: data.selectedPrayers.map((prayer) =>
        localizePrayer(prayer)!,
      ),
      sunriseEvent: localizeSolarEvent(data.sunriseEvent),
      selectedSunriseEvent: localizeSolarEvent(data.selectedSunriseEvent),
      previousPrayer: localizePrayer(data.previousPrayer),
      nextPrayer: localizePrayer(data.nextPrayer),
      solarEvent: data.solarEvent
        ? {
            label: data.solarEvent.label,
            remainingFormatted: formatDuration(
              data.solarEvent.remainingMilliseconds,
            ),
          }
        : null,
    };
  }, [data, language, localizedData]);
}
