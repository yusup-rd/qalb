import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { asrMethods, calculationMethods } from "@/constants/prayer-calculation";
import { useTheme } from "@/providers/ThemeProvider";
import type { AsrMethod, CalculationMethodId } from "@/types/prayer";
import { BottomSheet, Host, RNHostView } from "@expo/ui";
import { background } from "@expo/ui/jetpack-compose/modifiers";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import PrayerCalculationOption from "./PrayerCalculationOption";

interface PrayerCalculationSheetProps {
  visible: boolean;
  calculationMethod: CalculationMethodId;
  asrMethod: AsrMethod;
  onCalculationMethodChange: (method: CalculationMethodId) => void;
  onAsrMethodChange: (method: AsrMethod) => void;
  onClose: () => void;
  onSave: (
    calculationMethod: CalculationMethodId,
    asrMethod: AsrMethod,
  ) => void;
}

const PrayerCalculationSheet = ({
  visible,
  calculationMethod,
  asrMethod,
  onCalculationMethodChange,
  onAsrMethodChange,
  onClose,
  onSave,
}: PrayerCalculationSheetProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation(undefined, {
    keyPrefix: "prayerTimes.prayerCalculation",
  });
  const { t: tMethod } = useTranslation(undefined, {
    keyPrefix: "prayerCalculationMethods",
  });
  const { t: tAsr } = useTranslation(undefined, {
    keyPrefix: "asrMethods",
  });

  const handleSave = () => {
    onSave(calculationMethod, asrMethod);
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
            <View className="gap-1">
              <Text className="text-foreground font-sans-bold text-xl">
                {t("title")}
              </Text>

              <Text className="text-muted-foreground font-sans-medium text-sm">
                {t("description")}
              </Text>
            </View>

            <View className="gap-5">
              <View className="gap-2">
                <Text className="text-foreground font-sans-semibold text-sm">
                  {t("calculationMethod")}
                </Text>

                <View className="gap-2">
                  {calculationMethods.map((method) => (
                    <PrayerCalculationOption
                      key={method.id}
                      title={tMethod(`short.${method.key}`)}
                      description={tMethod(`full.${method.key}`)}
                      selected={calculationMethod === method.id}
                      onPress={() => onCalculationMethodChange(method.id)}
                    />
                  ))}
                </View>
              </View>

              <View className="gap-2">
                <Text className="text-foreground font-sans-semibold text-sm">
                  {t("asrMethod")}
                </Text>

                <View className="gap-2">
                  {asrMethods.map((method) => (
                    <PrayerCalculationOption
                      key={method.id}
                      title={tAsr(`short.${method.key}`)}
                      description={tAsr(`full.${method.key}`)}
                      selected={asrMethod === method.id}
                      onPress={() => onAsrMethodChange(method.id)}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View className="flex-row gap-3">
              <SmoothPressable
                onPress={onClose}
                className="bg-muted flex-1 items-center rounded-xl py-3.5"
              >
                <Text className="text-foreground font-sans-semibold text-sm">
                  {t("actions.cancel")}
                </Text>
              </SmoothPressable>

              <SmoothPressable
                onPress={handleSave}
                className="bg-primary flex-1 items-center rounded-xl py-3.5"
              >
                <Text className="text-primary-foreground font-sans-semibold text-sm">
                  {t("actions.apply")}
                </Text>
              </SmoothPressable>
            </View>
          </ScrollView>
        </RNHostView>
      </BottomSheet>
    </Host>
  );
};

export default PrayerCalculationSheet;
