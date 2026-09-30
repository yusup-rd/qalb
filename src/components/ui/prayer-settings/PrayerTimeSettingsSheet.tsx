import { useTheme } from "@/providers/ThemeProvider";
import type { Prayer, PrayerTimeAdjustment, SolarEvent } from "@/types/prayer";
import { BottomSheet, Host, RNHostView } from "@expo/ui";
import { background } from "@expo/ui/jetpack-compose/modifiers";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import PrayerNotificationSection from "./PrayerNotificationSection";
import PrayerTimeAdjustmentSection from "./PrayerTimeAdjustmentSection";

interface PrayerTimeSettingsSheetProps {
  visible: boolean;
  prayer: Prayer | SolarEvent | null;
  enabled: boolean;
  minutesBefore: number;
  adjustment: PrayerTimeAdjustment | null;
  onEnabledChange: (enabled: boolean) => void;
  onMinutesBeforeChange: (minutes: number) => void;
  onAdjustmentChange: (adjustment: PrayerTimeAdjustment) => void;
  onClose: () => void;
}

const PrayerTimeSettingsSheet = ({
  visible,
  prayer,
  enabled,
  minutesBefore,
  adjustment,
  onEnabledChange,
  onMinutesBeforeChange,
  onAdjustmentChange,
  onClose,
}: PrayerTimeSettingsSheetProps) => {
  const { colors } = useTheme();

  const { t: tPrayer } = useTranslation(undefined, {
    keyPrefix: "prayers",
  });
  const { t: tAdjustment } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.schedule.adjustment",
  });

  if (!prayer) {
    return null;
  }

  const isSolarEvent = prayer.name === "Sunrise";
  const prayerKey = prayer.name.toLowerCase();
  const descriptionKey = !isSolarEvent
    ? prayer.description.toLowerCase()
    : null;

  const handleResetToAdhan = () => {
    if (isSolarEvent) {
      return;
    }

    const prayerLabel = tPrayer(prayerKey);

    Alert.alert(
      tAdjustment("resetToAdhan.title"),
      tAdjustment("resetToAdhan.description", {
        prayer: prayerLabel,
      }),
      [
        {
          text: tAdjustment("resetToAdhan.cancel"),
          style: "cancel",
        },
        {
          text: tAdjustment("resetToAdhan.confirm"),
          style: "destructive",
          onPress: () => {
            onAdjustmentChange({
              mode: "none",
              offsetMinutes: 0,
              fixedTime: null,
            });
          },
        },
      ],
    );
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
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 px-1 py-5"
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center gap-1">
              <View className="bg-primary-soft mb-1 size-12 items-center justify-center rounded-full">
                {isSolarEvent ? (
                  <Feather name="sunrise" size={22} className="text-primary" />
                ) : (
                  <Ionicons
                    name={prayer.icon}
                    size={22}
                    className="text-primary"
                  />
                )}
              </View>

              <Text className="font-sans-bold text-foreground text-xl">
                {tPrayer(prayerKey)}
              </Text>

              <Text className="font-sans-semibold text-primary text-base">
                {prayer.formattedTime}
              </Text>

              {!isSolarEvent && descriptionKey && (
                <Text className="text-muted-foreground font-sans text-xs">
                  {tPrayer(descriptionKey)}
                </Text>
              )}
            </View>

            <PrayerNotificationSection
              enabled={enabled}
              minutesBefore={minutesBefore}
              isSolarEvent={isSolarEvent}
              onEnabledChange={onEnabledChange}
              onMinutesBeforeChange={onMinutesBeforeChange}
            />

            {!isSolarEvent && adjustment && (
              <>
                <PrayerTimeAdjustmentSection
                  adjustment={adjustment}
                  prayerTime={prayer.time}
                  onChange={onAdjustmentChange}
                />

                <Pressable
                  onPress={handleResetToAdhan}
                  className="flex-row items-center justify-center gap-2 py-2 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel={tAdjustment("resetToAdhan.confirm")}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={17}
                    className="text-primary"
                  />

                  <Text className="font-sans-semibold text-primary text-sm">
                    {tAdjustment("resetToAdhan.button")}
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </RNHostView>
      </BottomSheet>
    </Host>
  );
};

export default PrayerTimeSettingsSheet;
