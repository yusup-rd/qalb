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

function sortPrayersByTime(prayers: Prayer[]) {
  return [...prayers].sort((a, b) => a.time.getTime() - b.time.getTime());
}

export function usePrayerTimes(selectedDate?: Date) {
  const isFocused = useIsFocused();
  const { i18n: i18nInstance } = useTranslation();
  const language = i18nInstance.language;
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

  // A locale change must update every formatted label, but the underlying
  // astronomical calculations and Date instances are language independent.
  // Keep that work cached and only rebuild the small display records here.
  const localizedData = useMemo(() => {
    if (!calculatedData) {
      return null;
    }

    const localizeDay = (day: (typeof calculatedData)["today"]) => ({
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

    return {
      yesterday: localizeDay(calculatedData.yesterday),
      today: localizeDay(calculatedData.today),
      tomorrow: localizeDay(calculatedData.tomorrow),
      selected: localizeDay(calculatedData.selected),
      selectedNextDay: localizeDay(calculatedData.selectedNextDay),
    };
  }, [calculatedData, language]);

  return useMemo(() => {
    if (!localizedData) {
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
      localizedData;

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
        remainingFormatted: isNextPrayerToday
          ? formatDuration(prayer.time.getTime() - nowTime)
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
        remainingFormatted: formatDuration(solarEvent.time.getTime() - nowTime),
      },
    };
  }, [localizedData, now, selectedKey, todayKey]);
}
