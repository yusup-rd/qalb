import "@/global.css";
import { initializeLanguage } from "@/i18n";
import LocationInitializer from "@/initializers/LocationInitializer";
import NotificationInitializer from "@/initializers/NotificationInitializer";
import { setupNotificationHandler } from "@/lib/notifications";
import { QuranAudioProvider } from "@/providers/QuranAudioProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { useEffect, useState } from "react";

const RootLayout = () => {
  const [languageLoaded, setLanguageLoaded] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    "sans-regular": require("@/assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-extralight": require("@/assets/fonts/PlusJakartaSans-ExtraLight.ttf"),
    "sans-light": require("@/assets/fonts/PlusJakartaSans-Light.ttf"),
    "sans-medium": require("@/assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("@/assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-bold": require("@/assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-extrabold": require("@/assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-italic": require("@/assets/fonts/PlusJakartaSans-Italic.ttf"),
    "sans-extralight-italic": require("@/assets/fonts/PlusJakartaSans-ExtraLightItalic.ttf"),
    "sans-light-italic": require("@/assets/fonts/PlusJakartaSans-LightItalic.ttf"),
    "sans-medium-italic": require("@/assets/fonts/PlusJakartaSans-MediumItalic.ttf"),
    "sans-semibold-italic": require("@/assets/fonts/PlusJakartaSans-SemiBoldItalic.ttf"),
    "sans-bold-italic": require("@/assets/fonts/PlusJakartaSans-BoldItalic.ttf"),
    "sans-extrabold-italic": require("@/assets/fonts/PlusJakartaSans-ExtraBoldItalic.ttf"),
  });

  useEffect(() => {
    let cancelled = false;
    initializeLanguage().finally(() => {
      if (!cancelled) {
        setLanguageLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded || !languageLoaded) {
    return null;
  }

  return (
    <SQLiteProvider
      databaseName="quran-v2.db"
      assetSource={{ assetId: require("@/assets/database/quran.db") }}
    >
      <ThemeProvider>
        <QuranAudioProvider>
          <LocationInitializer />
          <NotificationInitializer />

          <Stack>
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="prayer-times"
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="zakat"
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="tasbih"
              options={{
                presentation: "modal",
              }}
            />

            <Stack.Screen
              name="quran/[chapterId]"
              options={{
                headerShown: false,
              }}
            />
          </Stack>
        </QuranAudioProvider>
      </ThemeProvider>
    </SQLiteProvider>
  );
};

export default RootLayout;
