import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import AutoScrollText from "@/components/ui/animated/AutoScrollText";
import { useIslamicEvents } from "@/hooks/useIslamicEvents";
import { addDays, isSameDay, startOfWeek } from "@/lib/date";
import { formatDate, formatHijriDate, formatWeekday } from "@/lib/format";
import { getIslamicEventsForDate } from "@/lib/islamic-events";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { clsx } from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import CalendarSheet from "./CalendarSheet";

interface CalendarPickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const CalendarPicker = ({
  selectedDate,
  onSelectDate,
}: CalendarPickerProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.calendar",
  });

  const [sheetVisible, setSheetVisible] = useState(false);

  const { events: islamicEvents } = useIslamicEvents(selectedDate);

  const weekStart = startOfWeek(selectedDate);

  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  const selectedEvents = getIslamicEventsForDate(selectedDate, islamicEvents);

  const selectDate = (date: Date) => {
    onSelectDate(date);
  };

  const goToPreviousDay = () => {
    selectDate(addDays(selectedDate, -1));
  };

  const goToNextDay = () => {
    selectDate(addDays(selectedDate, 1));
  };

  const hijriDateRange = `${formatHijriDate(selectedDate)} \u2014 ${formatHijriDate(
    addDays(selectedDate, 1),
  )}`;

  return (
    <>
      <View className="bg-card gap-2 rounded-xl p-4 shadow-md">
        <View className="flex-row items-center gap-2">
          <SmoothPressable
            onPress={goToPreviousDay}
            accessibilityRole="button"
            accessibilityLabel={t("previousDay")}
            className="bg-muted size-8 shrink-0 items-center justify-center rounded-full"
          >
            <Fa name="chevron-left" size={10} className="text-foreground" />
          </SmoothPressable>

          <View className="min-w-0 flex-1">
            <Text className="text-foreground font-sans-semibold text-lg">
              {formatDate(selectedDate)}
            </Text>

            <AutoScrollText
              className="text-secondary font-sans-medium text-xs"
              accessibilityLabel={hijriDateRange}
            >
              {hijriDateRange}
            </AutoScrollText>
          </View>

          <SmoothPressable
            onPress={() => setSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t("openCalendar")}
            className="bg-muted size-8 shrink-0 items-center justify-center rounded-full"
          >
            <Fa name="calendar-days" size={13} className="text-foreground" />
          </SmoothPressable>

          <SmoothPressable
            onPress={goToNextDay}
            accessibilityRole="button"
            accessibilityLabel={t("nextDay")}
            className="bg-muted size-8 shrink-0 items-center justify-center rounded-full"
          >
            <Fa name="chevron-right" size={10} className="text-foreground" />
          </SmoothPressable>
        </View>

        <View className="flex-row gap-1">
          {weekDays.map((date) => {
            const selected = isSameDay(date, selectedDate);
            const events = getIslamicEventsForDate(date, islamicEvents);

            return (
              <SmoothPressable
                key={date.toISOString()}
                onPress={() => selectDate(date)}
                className={clsx(
                  "will-change-variable flex-1 items-center rounded-lg p-2",
                  selected ? "bg-primary shadow-xs" : "bg-card",
                )}
              >
                <Text
                  className={
                    selected
                      ? "text-primary-foreground/70 font-sans-semibold text-xs"
                      : "text-muted-foreground font-sans-semibold text-xs"
                  }
                >
                  {formatWeekday(date)}
                </Text>

                <Text
                  className={
                    selected
                      ? "text-primary-foreground font-sans-bold text-xs"
                      : "text-foreground font-sans-bold text-xs"
                  }
                >
                  {date.getDate()}
                </Text>

                {events.length > 0 && (
                  <View className="bg-secondary mt-1 size-1 rounded-full" />
                )}
              </SmoothPressable>
            );
          })}
        </View>

        {selectedEvents.length > 0 && (
          <View className="bg-secondary-soft gap-1 rounded-lg px-3 py-2">
            {selectedEvents.map((event) => (
              <View
                key={`${event.id}-${event.date}`}
                className="flex-row items-center gap-2"
              >
                <View className="bg-secondary size-1.5 shrink-0 rounded-full" />

                <Text className="text-secondary-soft-foreground font-sans-semibold text-xs">
                  {event.name
                    ? t(`events.${event.id}`, {
                        defaultValue: event.name,
                      })
                    : t(`events.${event.id}`)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="absolute inset-0" pointerEvents="box-none">
        <CalendarSheet
          visible={sheetVisible}
          selectedDate={selectedDate}
          onClose={() => setSheetVisible(false)}
          onSelectDate={(date) => {
            selectDate(date);
            setSheetVisible(false);
          }}
        />
      </View>
    </>
  );
};

export default CalendarPicker;
