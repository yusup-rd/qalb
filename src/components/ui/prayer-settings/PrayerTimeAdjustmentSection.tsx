import { formatMinuteOffset, formatTime, parseTimeString } from "@/lib/format";
import { useTheme } from "@/providers/ThemeProvider";
import type { PrayerTimeAdjustment } from "@/types/prayer";
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

interface PrayerTimeAdjustmentSectionProps {
  adjustment: PrayerTimeAdjustment;
  prayerTime: Date;
  onChange: (adjustment: PrayerTimeAdjustment) => void;
}

const adjustmentOptions = [
  { mode: "none", key: "none" },
  { mode: "offset", key: "offset" },
  { mode: "fixed", key: "fixed" },
] as const;

const MIN_OFFSET_MINUTES = -60;
const MAX_OFFSET_MINUTES = 60;

const PrayerTimeAdjustmentSection = ({
  adjustment,
  prayerTime,
  onChange,
}: PrayerTimeAdjustmentSectionProps) => {
  const { colors } = useTheme();

  const { t: tAdjustment } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.schedule.adjustment",
  });

  const fixedTimeDate = parseTimeString(adjustment.fixedTime);

  const formatPrayerTime = (time: Date) =>
    [
      time.getHours().toString().padStart(2, "0"),
      time.getMinutes().toString().padStart(2, "0"),
    ].join(":");

  const updateAdjustment = (changes: Partial<PrayerTimeAdjustment>) => {
    const nextAdjustment = {
      ...adjustment,
      ...changes,
    };

    if (changes.mode === "none") {
      nextAdjustment.offsetMinutes = 0;
      nextAdjustment.fixedTime = null;
    }

    if (
      changes.mode === "fixed" &&
      adjustment.mode !== "fixed" &&
      !adjustment.fixedTime
    ) {
      nextAdjustment.fixedTime = formatPrayerTime(prayerTime);
    }

    onChange(nextAdjustment);
  };

  const handleOffsetChange = (value: number) => {
    updateAdjustment({
      offsetMinutes: Math.round(value),
    });
  };

  const handleFixedTimeChange = (event: DateTimePickerChangeEvent) => {
    const selectedDate = new Date(event.nativeEvent.timestamp);

    updateAdjustment({
      fixedTime: [
        selectedDate.getHours().toString().padStart(2, "0"),
        selectedDate.getMinutes().toString().padStart(2, "0"),
      ].join(":"),
    });
  };

  const negativeProgress =
    adjustment.offsetMinutes < 0
      ? Math.abs(adjustment.offsetMinutes) / Math.abs(MIN_OFFSET_MINUTES)
      : 0;

  const positiveProgress =
    adjustment.offsetMinutes > 0
      ? adjustment.offsetMinutes / MAX_OFFSET_MINUTES
      : 0;

  return (
    <View className="gap-3">
      <Text className="font-sans-semibold text-foreground text-base">
        {tAdjustment("title")}
      </Text>

      <View className="bg-card overflow-hidden rounded-xl shadow-md">
        {adjustmentOptions.map(({ mode, key }, index) => {
          const selected = adjustment.mode === mode;

          return (
            <Pressable
              key={mode}
              onPress={() => updateAdjustment({ mode })}
              className={clsx(
                "flex-row items-center justify-between px-4 py-3.5",
                index < adjustmentOptions.length - 1 &&
                  "border-border border-b",
              )}
            >
              <View className="flex-1 gap-0.5">
                <Text
                  className={clsx(
                    "text-foreground text-sm",
                    selected ? "font-sans-semibold" : "font-sans",
                  )}
                >
                  {mode === "none"
                    ? tAdjustment("none")
                    : tAdjustment(`${key}.title`)}
                </Text>

                {selected && mode !== "none" && (
                  <Text className="text-muted-foreground font-sans text-xs">
                    {tAdjustment(`${mode}.description`)}
                  </Text>
                )}
              </View>

              <View
                className={clsx(
                  "size-5 items-center justify-center rounded-full border",
                  selected
                    ? "border-primary bg-primary"
                    : "border-border bg-card",
                )}
              >
                {selected && (
                  <View className="bg-primary-foreground size-2 rounded-full" />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {adjustment.mode === "offset" && (
        <View className="bg-card gap-5 rounded-xl px-4 py-5 shadow-md">
          <View className="items-center gap-1">
            <Text className="font-sans-bold text-foreground text-3xl">
              {formatMinuteOffset(adjustment.offsetMinutes)}
            </Text>

            <Text className="font-sans-medium text-muted-foreground text-sm">
              {tAdjustment("offset.description")}
            </Text>
          </View>

          <View className="relative h-6 justify-center">
            <View className="bg-muted absolute right-0 left-0 h-1 rounded-full" />

            {negativeProgress > 0 && (
              <View
                className="bg-primary absolute h-1 rounded-full"
                style={{
                  left: `${(1 - negativeProgress) * 50}%`,
                  width: `${negativeProgress * 50}%`,
                }}
              />
            )}

            {positiveProgress > 0 && (
              <View
                className="bg-primary absolute left-1/2 h-1 rounded-full"
                style={{
                  width: `${positiveProgress * 50}%`,
                }}
              />
            )}

            <View className="bg-border absolute left-1/2 h-3 w-px -translate-x-1/2" />

            <Slider
              value={adjustment.offsetMinutes}
              minimumValue={MIN_OFFSET_MINUTES}
              maximumValue={MAX_OFFSET_MINUTES}
              step={1}
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="transparent"
              thumbTintColor={colors.primary}
              onValueChange={handleOffsetChange}
              className="absolute inset-0"
            />
          </View>

          <View className="flex-row justify-between px-1">
            <Text className="font-sans-medium text-muted-foreground text-xs">
              {formatMinuteOffset(MIN_OFFSET_MINUTES)}
            </Text>

            <Text className="font-sans-medium text-muted-foreground text-xs">
              {formatMinuteOffset(MAX_OFFSET_MINUTES)}
            </Text>
          </View>
        </View>
      )}

      {adjustment.mode === "fixed" && (
        <View className="bg-card gap-4 rounded-xl px-4 py-5 shadow-md">
          <View className="items-center gap-1">
            <Text className="font-sans-bold text-foreground text-3xl">
              {formatTime(fixedTimeDate)}
            </Text>

            <Text className="font-sans-medium text-muted-foreground text-sm">
              {tAdjustment("fixed.description")}
            </Text>
          </View>

          <DateTimePicker
            value={fixedTimeDate}
            mode="time"
            display="spinner"
            onValueChange={handleFixedTimeChange}
          />
        </View>
      )}
    </View>
  );
};

export default PrayerTimeAdjustmentSection;
