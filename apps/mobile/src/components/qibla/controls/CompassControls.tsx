import { useTheme } from "@/providers/ThemeProvider";
import { MaterialCommunityIcons as Mi } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Switch, Text, View } from "react-native";

interface CompassControlsProps {
  hapticsEnabled: boolean;
  hapticsLoaded: boolean;
  onHapticsChange: (enabled: boolean) => void;
}

const CompassControls = ({
  hapticsEnabled,
  hapticsLoaded,
  onHapticsChange,
}: CompassControlsProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation(undefined, {
    keyPrefix: "qibla.controls",
  });

  return (
    <View className="bg-card w-full flex-row items-center justify-between gap-2 rounded-xl p-4 shadow-md">
      <View className="bg-primary-soft size-7 items-center justify-center rounded-full">
        <Mi name="vibrate" size={14} className="text-primary-soft-foreground" />
      </View>

      <Text
        className="font-sans-semibold text-foreground flex-1 text-sm"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {t("hapticFeedback")}
      </Text>

      <View>
        <Switch
          value={hapticsEnabled}
          onValueChange={onHapticsChange}
          disabled={!hapticsLoaded}
          trackColor={{
            false: colors.border,
            true: colors.primary,
          }}
          thumbColor={colors.muted}
        />
      </View>
    </View>
  );
};

export default CompassControls;
