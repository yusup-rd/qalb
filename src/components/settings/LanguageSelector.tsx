import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import i18n from "@/i18n";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

interface LanguageSelectorProps {
  onPress: () => void;
}

const LanguageSelector = ({ onPress }: LanguageSelectorProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "settings.sections.appearance.language",
  });

  const languageKey = i18n.language === "ru" ? "russian" : "english";

  return (
    <SmoothPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("language")}
      className="overflow-hidden rounded-xl"
    >
      <View className="flex-row items-center justify-between px-3 py-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="bg-primary-soft size-9 shrink-0 items-center justify-center rounded-full">
            <Fa
              name="language"
              size={17}
              className="text-primary-soft-foreground"
            />
          </View>

          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="text-foreground font-sans-semibold text-sm">
              {t("title")}
            </Text>

            <Text
              className="text-muted-foreground font-sans text-xs"
              numberOfLines={1}
            >
              {t(languageKey)}
            </Text>
          </View>
        </View>

        <Fa name="chevron-right" size={14} className="text-muted-foreground" />
      </View>
    </SmoothPressable>
  );
};

export default LanguageSelector;
