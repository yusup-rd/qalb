import AppNavigator from "@/components/ui/AppNavigator";
import AppStatusBar from "@/components/ui/AppStatusBar";
import QuranBootstrapScreen from "@/components/quran/QuranBootstrapScreen";
import "@/global.css";
import { initializeLanguage } from "@/i18n";
import LocationInitializer from "@/initializers/LocationInitializer";
import NotificationInitializer from "@/initializers/NotificationInitializer";
import QuranSyncInitializer from "@/initializers/QuranSyncInitializer";
import { setupNotificationHandler } from "@/lib/notifications";
import { QuranAudioProvider } from "@/providers/QuranAudioProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { initializeQuranDatabase } from "@/lib/quran/sync";
import {
  getQuranBootstrapErrorKind,
  type QuranBootstrapErrorKind,
} from "@/lib/quran/bootstrap-error";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import NetInfo from "@react-native-community/netinfo";
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
  const [quranDatabaseReady, setQuranDatabaseReady] = useState(false);
  const [quranDatabaseError, setQuranDatabaseError] =
    useState<QuranBootstrapErrorKind | null>(null);
  const splashHidden = useRef(false);
  const databaseInitializationInFlight = useRef(false);
  const databaseRef = useRef<SQLiteDatabase | null>(null);

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

  const initializeDatabase = useCallback(async (db: SQLiteDatabase) => {
    if (databaseInitializationInFlight.current) return;
    databaseInitializationInFlight.current = true;
    databaseRef.current = db;
    try {
      await initializeQuranDatabase(db);
      setQuranDatabaseError(null);
      setQuranDatabaseReady(true);
    } catch (error) {
      setQuranDatabaseError(getQuranBootstrapErrorKind(error));
      setQuranDatabaseReady(false);
      if (__DEV__) {
        console.warn(
          "Quran database initialization failed.",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    } finally {
      databaseInitializationInFlight.current = false;
    }
  }, []);

  const retryDatabaseInitialization = useCallback(() => {
    const db = databaseRef.current;
    if (!db) return;
    setQuranDatabaseError(null);
    setQuranDatabaseReady(false);
    void initializeDatabase(db);
  }, [initializeDatabase]);

  useEffect(() => {
    if (!quranDatabaseError) return;
    let wasReachable: boolean | null = null;
    const subscription = NetInfo.addEventListener((state) => {
      const isReachable =
        state.isConnected === true && state.isInternetReachable !== false;
      if (wasReachable === false && isReachable) {
        retryDatabaseInitialization();
      }
      wasReachable = isReachable;
    });
    return subscription;
  }, [quranDatabaseError, retryDatabaseInitialization]);

  useEffect(() => {
    if (
      !fontsLoaded ||
      !languageLoaded ||
      !rootLaidOut ||
      (!quranDatabaseReady && !quranDatabaseError) ||
      splashHidden.current
    ) {
      return;
    }

    splashHidden.current = true;
    void SplashScreen.hideAsync().catch((error: unknown) => {
      splashHidden.current = false;
      console.warn("Failed to hide splash screen", error);
    });
  }, [
    fontsLoaded,
    languageLoaded,
    quranDatabaseReady,
    quranDatabaseError,
    rootLaidOut,
  ]);

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded || !languageLoaded) {
    return null;
  }

  return (
    <SQLiteProvider
      databaseName="quran-v2.db"
      onInit={initializeDatabase}
    >
      <ThemeProvider>
        <View className="flex-1" onLayout={handleRootLayout}>
          {quranDatabaseReady ? (
            <QuranAudioProvider>
              <AppStatusBar />
              <QuranSyncInitializer />
              <LocationInitializer />
              <NotificationInitializer />
              <AppNavigator />
            </QuranAudioProvider>
          ) : (
            <QuranBootstrapScreen
              error={quranDatabaseError}
              onRetry={retryDatabaseInitialization}
            />
          )}
        </View>
      </ThemeProvider>
    </SQLiteProvider>
  );
};

export default RootLayout;
