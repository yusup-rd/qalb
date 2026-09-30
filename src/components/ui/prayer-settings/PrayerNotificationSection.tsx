import InfoSection from "@/components/ui/InfoSection";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Pressable, Switch, Text, View } from "react-native";

interface PrayerNotificationSectionProps {
  enabled: boolean;
  minutesBefore: number;
  isSolarEvent: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onMinutesBeforeChange: (minutes: number) => void;
}

const reminderOptions = [
  { minutes: 0, key: "atTime" },
  { minutes: 5, key: "fiveMinutesBefore" },
  { minutes: 10, key: "tenMinutesBefore" },
  { minutes: 15, key: "fifteenMinutesBefore" },
] as const;

const PrayerNotificationSection = ({
  enabled,
  minutesBefore,
  isSolarEvent,
  onEnabledChange,
  onMinutesBeforeChange,
}: PrayerNotificationSectionProps) => {
  const { colors } = useTheme();

  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.schedule.notification",
  });

  const notificationDescription = isSolarEvent
    ? t("description.solarEvent")
    : t("description.prayer");

  const notificationInfo = isSolarEvent
    ? t("info.solarEvent")
    : t("info.prayer");

  return (
    <>
      <View className="bg-card overflow-hidden rounded-xl shadow-md">
        <View className="flex-row items-center justify-between px-4 py-4">
          <View className="flex-row items-center gap-3">
            <View className="bg-muted size-9 items-center justify-center rounded-full">
              <Ionicons
                name="notifications-outline"
                size={18}
                className="text-primary"
              />
            </View>

            <View className="gap-0.5">
              <Text className="font-sans-semibold text-foreground text-sm">
                {t("title")}
              </Text>

              <Text className="text-muted-foreground font-sans text-xs">
                {notificationDescription}
              </Text>
            </View>
          </View>

          <Switch
            value={enabled}
            onValueChange={onEnabledChange}
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
            thumbColor={colors.background}
          />
        </View>
      </View>

      <View className={clsx("gap-3", enabled ? "opacity-100" : "opacity-50")}>
        <Text className="font-sans-semibold text-foreground text-base">
          {t("remind")}
        </Text>

        <View className="bg-card overflow-hidden rounded-xl shadow-md">
          {reminderOptions.map(({ minutes, key }, index) => {
            const selected = minutesBefore === minutes;

            const label =
              minutes === 0 && isSolarEvent
                ? t("remindTimes.solarEventAtTime")
                : t(`remindTimes.${key}`);

            return (
              <Pressable
                key={minutes}
                disabled={!enabled}
                onPress={() => onMinutesBeforeChange(minutes)}
                className={clsx(
                  "flex-row items-center justify-between px-4 py-3.5",
                  index < reminderOptions.length - 1 &&
                    "border-border border-b",
                )}
              >
                <Text
                  className={clsx(
                    "text-foreground text-sm",
                    selected ? "font-sans-semibold" : "font-sans",
                  )}
                >
                  {label}
                </Text>

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
      </View>

      <InfoSection message={notificationInfo} />
    </>
  );
};

export default PrayerNotificationSection;
