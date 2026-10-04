import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { addDays, getMonthDays, isSameDay, startOfWeek } from "@/lib/date";
import { formatWeekday } from "@/lib/format";
import {
  getIslamicEventsForDate,
  type IslamicEvent,
} from "@/lib/islamic-events";
import { clsx } from "clsx";
import { Text, View } from "react-native";

interface CalendarMonthGridProps {
  month: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  islamicEvents: IslamicEvent[];
}

const CalendarMonthGrid = ({
  month,
  selectedDate,
  onSelectDate,
  islamicEvents,
}: CalendarMonthGridProps) => {
  const days = getMonthDays(month);
  const weekStart = startOfWeek(month);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  return (
    <View className="gap-2">
      <View className="flex-row">
        {weekDays.map((date) => (
          <View key={date.toISOString()} className="w-[14.285%] items-center">
            <Text className="text-muted-foreground font-sans-semibold text-xs">
              {formatWeekday(date)}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {days.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} className="w-[14.285%] p-1" />;
          }

          const selected = isSameDay(date, selectedDate);
          const events = getIslamicEventsForDate(date, islamicEvents);

          return (
            <SmoothPressable
              key={date.toISOString()}
              onPress={() => onSelectDate(date)}
              className="w-[14.285%] p-1"
            >
              <View
                className={clsx(
                  "will-change-variable aspect-square items-center justify-center rounded-lg",
                  selected ? "bg-primary shadow-xs" : "bg-card",
                )}
              >
                <Text
                  className={
                    selected
                      ? "text-primary-foreground font-sans-semibold text-sm"
                      : "text-foreground font-sans-semibold text-sm"
                  }
                >
                  {date.getDate()}
                </Text>

                {events.length > 0 && (
                  <View className="bg-secondary absolute bottom-1 size-1.5 rounded-full" />
                )}
              </View>
            </SmoothPressable>
          );
        })}
      </View>
    </View>
  );
};

export default CalendarMonthGrid;
