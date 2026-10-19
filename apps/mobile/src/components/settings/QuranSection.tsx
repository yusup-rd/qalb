import SettingsSection from "@/components/settings/SettingsSection";
import { useTheme } from "@/providers/ThemeProvider";
import { useQuranPreferencesStore } from "@/store/quranPreferencesStore";
import { useTranslation } from "react-i18next";
import { Switch, Text, View } from "react-native";

export default function QuranSection() {
  const { t } = useTranslation(undefined, { keyPrefix: "settings.more.quran" });
  const { colors } = useTheme();
  const showTranslation = useQuranPreferencesStore(
    (state) => state.showTranslation,
  );
  const showTransliteration = useQuranPreferencesStore(
    (state) => state.showTransliteration,
  );
  const setShowTranslation = useQuranPreferencesStore(
    (state) => state.setShowTranslation,
  );
  const setShowTransliteration = useQuranPreferencesStore(
    (state) => state.setShowTransliteration,
  );

  return (
    <SettingsSection title={t("title")} icon="book-quran">
      <PreferenceRow
        title={t("translation")}
        value={showTranslation}
        onChange={setShowTranslation}
        colors={colors}
      />
      <View className="border-border border-t" />
      <PreferenceRow
        title={t("transliteration")}
        value={showTransliteration}
        onChange={setShowTransliteration}
        colors={colors}
      />
    </SettingsSection>
  );
}

function PreferenceRow({
  title,
  value,
  onChange,
  colors,
}: {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 p-3">
      <Text className="text-foreground font-sans-semibold flex-1 text-sm">
        {title}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: value }}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor={colors.card}
      />
    </View>
  );
}
