import LanguageSelector from "@/components/settings/LanguageSelector";
import LanguageSheet from "@/components/settings/LanguageSheet";
import SettingsSection from "@/components/settings/SettingsSection";
import ThemeSelector from "@/components/settings/ThemeSelector";
import i18n from "@/i18n";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

export default function AppearanceSection() {
  const { t } = useTranslation(undefined, {
    keyPrefix: "settings.sections.appearance",
  });
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  return (
    <View>
      <SettingsSection title={t("title")} icon="palette">
        <View className="p-3">
          <ThemeSelector />
        </View>
        <View className="border-border border-t" />
        <LanguageSelector onPress={() => setLanguageSheetVisible(true)} />
      </SettingsSection>
      <LanguageSheet
        visible={languageSheetVisible}
        selectedLanguage={selectedLanguage}
        onClose={() => setLanguageSheetVisible(false)}
        onLanguageChange={setSelectedLanguage}
      />
    </View>
  );
}
