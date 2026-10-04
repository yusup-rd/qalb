import "@/global.css";
import { initializeLanguage } from "@/i18n";
import LocationInitializer from "@/initializers/LocationInitializer";
import NotificationInitializer from "@/initializers/NotificationInitializer";
import { setupNotificationHandler } from "@/lib/notifications";
import { QuranAudioProvider } from "@/providers/QuranAudioProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 250,
  fade: true,
});

const RootLayout = () => {
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const [rootLaidOut, setRootLaidOut] = useState(false);
  const splashHidden = useRef(false);

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

  const handleRootLayout = useCallback(() => {
    setRootLaidOut(true);
  }, []);

  useEffect(() => {
    if (!fontsLoaded || !languageLoaded || !rootLaidOut || splashHidden.current) {
      return;
    }

    splashHidden.current = true;
    void SplashScreen.hideAsync().catch((error: unknown) => {
      splashHidden.current = false;
      console.warn("Failed to hide splash screen", error);
    });
  }, [fontsLoaded, languageLoaded, rootLaidOut]);

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
          <View className="flex-1" onLayout={handleRootLayout}>
            <LocationInitializer />
            <NotificationInitializer />

            <Stack>
              <Stack.Screen
                name="(tabs)"
                options={{
                  animation: "fade",
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
                  animation: "fade",
                  gestureEnabled: false,
                  headerShown: false,
                }}
              />
            </Stack>
          </View>
        </QuranAudioProvider>
      </ThemeProvider>
    </SQLiteProvider>
  );
};

export default RootLayout;
