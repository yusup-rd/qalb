import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import i18n from "i18next";
import "intl-pluralrules";
import { initReactI18next } from "react-i18next";
import { Platform } from "react-native";
import en from "./locales/en.json";
import ru from "./locales/ru.json";

const I18N_STORAGE_KEY = "@app/language";
let languageStorageWrite: Promise<void> = Promise.resolve();

const resources = {
  en: {
    translation: en,
  },
  ru: {
    translation: ru,
  },
};

const supportedLanguages = Object.keys(resources);
const deviceLanguage = getLocales()[0]?.languageCode ?? "en";
const initialLanguage = supportedLanguages.includes(deviceLanguage)
  ? deviceLanguage
  : "en";

i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export const initializeLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(I18N_STORAGE_KEY);

    if (
      savedLanguage &&
      supportedLanguages.includes(savedLanguage) &&
      savedLanguage !== i18n.language
    ) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch {}
};

export const changeLanguage = async (language: string) => {
  if (!supportedLanguages.includes(language)) {
    return;
  }

  await i18n.changeLanguage(language);

  // Neither native channel setup nor persistence needs to hold the sheet open.
  if (Platform.OS === "android") {
    void import("@/lib/notifications")
      .then(({ setupNotificationChannel }) => setupNotificationChannel())
      .catch(() => undefined);
  }

  // Serialize quick successive selections so the last choice is persisted.
  languageStorageWrite = languageStorageWrite.then(() =>
    AsyncStorage.setItem(I18N_STORAGE_KEY, language).catch(() => undefined),
  );
};

export default i18n;
