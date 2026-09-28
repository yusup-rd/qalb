import { useTheme } from "@/providers/ThemeProvider";
import { BottomSheet, Host, RNHostView } from "@expo/ui";
import { background } from "@expo/ui/jetpack-compose/modifiers";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

interface MosqueRadiusSheetProps {
  visible: boolean;
  radiusKm: number;
  onClose: () => void;
  onRadiusChange: (radiusKm: number) => void;
}

const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 100;

const MosqueRadiusSheet = ({
  visible,
  radiusKm,
  onClose,
  onRadiusChange,
}: MosqueRadiusSheetProps) => {
  const { colors } = useTheme();

  const { t } = useTranslation(undefined, {
    keyPrefix: "mosques.radius",
  });

  return (
    <Host>
      <BottomSheet
        isPresented={visible}
        onDismiss={onClose}
        snapPoints={["half"]}
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
          <View className="gap-6 px-1 py-6">
            <View className="gap-1">
              <Text className="font-sans-bold text-foreground text-xl">
                {t("title")}
              </Text>

              <Text className="font-sans-medium text-muted-foreground text-sm">
                {t("description")}
              </Text>
            </View>

            <View className="bg-card gap-5 rounded-xl px-4 py-5">
              <View className="items-center gap-1">
                <Text className="font-sans-bold text-foreground text-3xl">
                  {radiusKm} km
                </Text>

                <Text className="font-sans-medium text-muted-foreground text-sm">
                  {t("maximumDistance")}
                </Text>
              </View>

              <Slider
                value={radiusKm}
                minimumValue={MIN_RADIUS_KM}
                maximumValue={MAX_RADIUS_KM}
                step={1}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.muted}
                thumbTintColor={colors.primary}
                onValueChange={(value) => {
                  onRadiusChange(Math.round(value));
                }}
              />
            </View>

            <View className="flex-row justify-between px-1">
              <Text className="font-sans-medium text-muted-foreground text-xs">
                {t("minimum", { radius: MIN_RADIUS_KM })}
              </Text>

              <Text className="font-sans-medium text-muted-foreground text-xs">
                {t("maximum", { radius: MAX_RADIUS_KM })}
              </Text>
            </View>
          </View>
        </RNHostView>
      </BottomSheet>
    </Host>
  );
};

export default MosqueRadiusSheet;
