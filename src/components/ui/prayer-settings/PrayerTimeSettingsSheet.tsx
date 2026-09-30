import { useTheme } from "@/providers/ThemeProvider";
import type { Prayer, PrayerTimeAdjustment, SolarEvent } from "@/types/prayer";
import { BottomSheet, Host, RNHostView } from "@expo/ui";
import { background } from "@expo/ui/jetpack-compose/modifiers";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
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

  if (!prayer) {
    return null;
  }

  const isSolarEvent = prayer.name === "Sunrise";
  const prayerKey = prayer.name.toLowerCase();
  const descriptionKey = !isSolarEvent
    ? prayer.description.toLowerCase()
    : null;

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
              <PrayerTimeAdjustmentSection
                adjustment={adjustment}
                onChange={onAdjustmentChange}
              />
            )}
          </ScrollView>
        </RNHostView>
      </BottomSheet>
    </Host>
  );
};

export default PrayerTimeSettingsSheet;
