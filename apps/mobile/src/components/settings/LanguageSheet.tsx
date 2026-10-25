import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { changeLanguage } from "@/i18n";
import { clsx } from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import SheetWrapper from "../ui/SheetWrapper";

interface LanguageSheetProps {
  visible: boolean;
  selectedLanguage: string;
  onClose: () => void;
  onLanguageChange: (language: string) => void;
}

const languages = [
  {
    code: "en",
    flag: "🇬🇧",
    names: {
      en: "English",
      ru: "Английский",
    },
  },
  {
    code: "ru",
    flag: "🇷🇺",
    names: {
      en: "Russian",
      ru: "Русский",
    },
  },
] as const;

const LanguageSheet = ({
  visible,
  selectedLanguage,
  onClose,
  onLanguageChange,
}: LanguageSheetProps) => {
  const { t, i18n } = useTranslation(undefined, {
    keyPrefix: "settings.sections.appearance.language",
  });

  const [isChanging, setIsChanging] = useState(false);

  const handleSelect = async (language: string) => {
    if (isChanging) return;

    if (language === selectedLanguage) {
      onClose();
      return;
    }

    try {
      setIsChanging(true);
      onClose();
      // Start the native dismissal before the locale update notifies screens.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      await changeLanguage(language);
      onLanguageChange(language);
    } catch (error) {
      console.error("Failed to change language:", error);
    } finally {
      setIsChanging(false);
    }
  };

  const currentLanguage = i18n.language === "ru" ? "ru" : "en";

  return (
    <SheetWrapper visible={visible} onClose={onClose} snapPoints={["half"]}>
      <View className="gap-5 px-1 py-6">
        <View className="gap-1">
          <Text className="text-foreground font-sans-bold text-xl">
            {t("title")}
          </Text>

          <Text className="text-muted-foreground font-sans-medium text-sm">
            {t("description")}
          </Text>
        </View>

        <View className="bg-card overflow-hidden rounded-xl">
          {languages.map((language, index) => {
            const selected = selectedLanguage === language.code;

            return (
              <SmoothPressable
                key={language.code}
                onPress={() => handleSelect(language.code)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                className={clsx(
                  "flex-row items-center justify-between px-4 py-4",
                  index < languages.length - 1 && "border-border border-b",
                )}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-lg">{language.flag}</Text>

                  <Text
                    className={clsx(
                      "text-sm",
                      selected
                        ? "font-sans-semibold text-foreground"
                        : "text-foreground font-sans",
                    )}
                  >
                    {language.names[currentLanguage]}
                  </Text>
                </View>

                <View
                  className={clsx(
                    "h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    selected
                      ? "border-primary bg-primary"
                      : "border-border bg-card",
                  )}
                >
                  {selected && (
                    <View className="bg-primary-foreground size-2 rounded-full" />
                  )}
                </View>
              </SmoothPressable>
            );
          })}
        </View>
      </View>
    </SheetWrapper>
  );
};

export default LanguageSheet;
