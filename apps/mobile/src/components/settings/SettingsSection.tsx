import LanguageSelector from "@/components/settings/LanguageSelector";
import LanguageSheet from "@/components/settings/LanguageSheet";
import ThemeSelector from "@/components/settings/ThemeSelector";
import i18n from "@/i18n";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

const SettingsSection = () => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "settings.sections.appearance",
  });

  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  return (
    <>
      <View className="gap-2">
        {/* Section Title */}
        <View className="flex-row items-center gap-2">
          <Fa name="palette" size={14} className="text-secondary" />

          <Text className="font-sans-semibold text-secondary text-sm">
            {t("title")}
          </Text>
        </View>

        {/* Section Card */}
        <View className="bg-card overflow-hidden rounded-2xl p-3 shadow-md">
          <ThemeSelector />

          <View className="border-border my-3 border-t" />

          <LanguageSelector onPress={() => setLanguageSheetVisible(true)} />
        </View>
      </View>

      <LanguageSheet
        visible={languageSheetVisible}
        selectedLanguage={selectedLanguage}
        onClose={() => setLanguageSheetVisible(false)}
        onLanguageChange={setSelectedLanguage}
      />
    </>
  );
};

export default SettingsSection;
