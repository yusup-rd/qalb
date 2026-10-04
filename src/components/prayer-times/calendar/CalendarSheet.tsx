import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { useIslamicEvents } from "@/hooks/useIslamicEvents";
import { nextMonth, previousMonth } from "@/lib/date";
import { formatHijriDate, formatMonthYear } from "@/lib/format";
import { getIslamicEventsForDate } from "@/lib/islamic-events";
import { useTheme } from "@/providers/ThemeProvider";
import { BottomSheet, Host, RNHostView } from "@expo/ui";
import { background } from "@expo/ui/jetpack-compose/modifiers";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import CalendarMonthGrid from "./CalendarMonthGrid";

interface CalendarSheetProps {
  visible: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}

const CalendarSheet = ({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
}: CalendarSheetProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.calendar",
  });

  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  const previousVisible = useRef(visible);

  const { events: islamicEvents } = useIslamicEvents(visibleMonth);
  const { events: selectedMonthEvents } = useIslamicEvents(selectedDate);

  useEffect(() => {
    if (visible && !previousVisible.current) {
      setVisibleMonth(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
      );
    }

    previousVisible.current = visible;
  }, [visible, selectedDate]);

  const selectedEvents = getIslamicEventsForDate(
    selectedDate,
    selectedMonthEvents,
  );

  const handleSelectDate = (date: Date) => {
    onSelectDate(date);

    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const goToPreviousMonth = () => {
    setVisibleMonth(previousMonth(visibleMonth));
  };

  const goToNextMonth = () => {
    setVisibleMonth(nextMonth(visibleMonth));
  };

  const goToToday = () => {
    const today = new Date();

    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));

    onSelectDate(today);
  };

  return (
    <Host>
      <BottomSheet
        isPresented={visible}
        onDismiss={onClose}
        snapPoints={["half", "full"]}
        modifiers={[
          presentationBackground(colors.background),
          background(colors.background),
        ]}
        contentPadding={{
          left: 20,
          right: 20,
        }}
      >
        <RNHostView>
          <View className="gap-5 px-1 py-5">
            <View className="items-center">
              <Text className="text-foreground font-sans-bold text-xl">
                {formatMonthYear(visibleMonth)}
              </Text>

              <Text className="text-muted-foreground font-sans-medium text-xs">
                {t("description")}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <SmoothPressable
                onPress={goToPreviousMonth}
                accessibilityRole="button"
                accessibilityLabel={t("previousMonth")}
                className="bg-muted size-9 items-center justify-center rounded-full"
              >
                <Fa name="chevron-left" size={10} className="text-foreground" />
              </SmoothPressable>

              <SmoothPressable
                onPress={goToToday}
                accessibilityRole="button"
                accessibilityLabel={t("today")}
                className="bg-secondary-soft rounded-full px-4 py-2"
              >
                <Text className="text-secondary-soft-foreground font-sans-semibold text-xs">
                  {t("today")}
                </Text>
              </SmoothPressable>

              <SmoothPressable
                onPress={goToNextMonth}
                accessibilityRole="button"
                accessibilityLabel={t("nextMonth")}
                className="bg-muted size-9 items-center justify-center rounded-full"
              >
                <Fa
                  name="chevron-right"
                  size={10}
                  className="text-foreground"
                />
              </SmoothPressable>
            </View>

            <CalendarMonthGrid
              month={visibleMonth}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              islamicEvents={islamicEvents}
            />

            <View className="border-border border-t pt-4">
              <Text className="text-foreground font-sans-semibold text-sm">
                {formatHijriDate(selectedDate)}
              </Text>

              {selectedEvents.length > 0 ? (
                <View className="bg-secondary-soft mt-2 gap-1 rounded-lg px-3 py-2">
                  {selectedEvents.map((event) => (
                    <View
                      key={`${event.id}-${event.date}`}
                      className="flex-row items-center gap-2"
                    >
                      <View className="bg-secondary size-2 shrink-0 rounded-full" />

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
              ) : (
                <Text className="text-muted-foreground mt-1 font-sans text-xs">
                  {t("noObservance")}
                </Text>
              )}
            </View>
          </View>
        </RNHostView>
      </BottomSheet>
    </Host>
  );
};

export default CalendarSheet;
