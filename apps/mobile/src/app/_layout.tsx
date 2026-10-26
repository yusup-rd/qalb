import AppNavigator from "@/components/ui/AppNavigator";
import AppStatusBar from "@/components/ui/AppStatusBar";
import { QuranReadinessContext } from "@/components/quran/QuranReadinessGate";
import "@/global.css";
import { initializeLanguage } from "@/i18n";
import LocationInitializer from "@/initializers/LocationInitializer";
import NotificationInitializer from "@/initializers/NotificationInitializer";
import QuranSyncInitializer from "@/initializers/QuranSyncInitializer";
import { setupNotificationHandler } from "@/lib/notifications";
import {
  hasLocalQuran,
  initializeQuranDatabase,
  prepareQuranDatabase,
} from "@/lib/quran/sync";
import { initialQuranBootstrapProgress } from "@/lib/quran/bootstrap-progress";
import {
  getQuranBootstrapErrorKind,
  type QuranBootstrapErrorKind,
} from "@/lib/quran/bootstrap-error";
import { QuranAudioProvider } from "@/providers/QuranAudioProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [bootstrapProgress, setBootstrapProgress] = useState(
    initialQuranBootstrapProgress,
  );
  const [quranDatabaseError, setQuranDatabaseError] =
    useState<QuranBootstrapErrorKind | null>(null);
  const splashHidden = useRef(false);
  const databaseInitializationInFlight = useRef(false);
  const databaseRef = useRef<SQLiteDatabase | null>(null);
  const [databaseOpenAttempt, setDatabaseOpenAttempt] = useState(0);
  const reportedOpenError = useRef<Error | null>(null);
  const [databaseOpenFailed, setDatabaseOpenFailed] = useState(false);

  const handleDatabaseOpenError = useCallback((error: Error) => {
    if (reportedOpenError.current === error) return;
    reportedOpenError.current = error;
    // SQLiteProvider invokes onError during render. Defer parent updates until
    // after that render completes.
    queueMicrotask(() => {
      databaseRef.current = null;
      setDatabaseOpenFailed(true);
      setQuranDatabaseError(getQuranBootstrapErrorKind(error));
      setQuranDatabaseReady(false);
    });
  }, []);

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
      if (!cancelled) setLanguageLoaded(true);
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

  // Open SQLite and create its schema before rendering app routes. Quran
  // content itself is downloaded later by QuranSyncInitializer in the
  // background, after the rest of the app is already usable.
  const initializeDatabase = useCallback(async (db: SQLiteDatabase) => {
    databaseRef.current = db;
    setDatabaseOpenFailed(false);
    try {
      await prepareQuranDatabase(db);
      const ready = await hasLocalQuran(db);
      setQuranDatabaseReady(ready);
      setQuranDatabaseError(null);
      setBootstrapProgress(
        ready
          ? {
              ...initialQuranBootstrapProgress(),
              stage: "complete",
              status: "complete",
            }
          : initialQuranBootstrapProgress(),
      );
    } catch (error) {
      setQuranDatabaseReady(false);
      setQuranDatabaseError(getQuranBootstrapErrorKind(error));
    }
  }, []);

  const runQuranInitialization = useCallback(async () => {
    const db = databaseRef.current;
    if (!db || databaseInitializationInFlight.current) return;

    databaseInitializationInFlight.current = true;
    setQuranDatabaseError(null);
    try {
      await initializeQuranDatabase(db, setBootstrapProgress);
      setQuranDatabaseReady(true);
      setQuranDatabaseError(null);
    } catch (error) {
      setQuranDatabaseReady(await hasLocalQuran(db));
      setQuranDatabaseError(getQuranBootstrapErrorKind(error));
    } finally {
      databaseInitializationInFlight.current = false;
    }
  }, []);

  const retryDatabaseInitialization = useCallback(() => {
    if (databaseRef.current) {
      void runQuranInitialization();
      return;
    }
    reportedOpenError.current = null;
    setDatabaseOpenFailed(false);
    setQuranDatabaseError(null);
    setDatabaseOpenAttempt((attempt) => attempt + 1);
  }, [runQuranInitialization]);

  const quranReadiness = useMemo(
    () => ({
      ready: quranDatabaseReady,
      progress: bootstrapProgress,
      error: quranDatabaseError,
      retry: retryDatabaseInitialization,
    }),
    [
      bootstrapProgress,
      quranDatabaseError,
      quranDatabaseReady,
      retryDatabaseInitialization,
    ],
  );

  useEffect(() => {
    if (!fontsLoaded || !languageLoaded || !rootLaidOut || splashHidden.current)
      return;

    splashHidden.current = true;
    void SplashScreen.hideAsync().catch((error: unknown) => {
      splashHidden.current = false;
      console.warn("Failed to hide splash screen", error);
    });
  }, [fontsLoaded, languageLoaded, rootLaidOut]);

  if (fontError) throw fontError;
  if (!fontsLoaded || !languageLoaded) return null;

  const appContent = (
    <QuranAudioProvider>
      {!databaseOpenFailed && (
        <QuranSyncInitializer onInitialize={runQuranInitialization} />
      )}
      <LocationInitializer />
      <NotificationInitializer />
      <AppNavigator />
    </QuranAudioProvider>
  );

  return (
    <ThemeProvider>
      <View className="flex-1" onLayout={handleRootLayout}>
        <AppStatusBar />
        <QuranReadinessContext.Provider value={quranReadiness}>
          {databaseOpenFailed ? (
            appContent
          ) : (
            <SQLiteProvider
              key={databaseOpenAttempt}
              databaseName="quran-v2.db"
              onInit={initializeDatabase}
              onError={handleDatabaseOpenError}
            >
              {appContent}
            </SQLiteProvider>
          )}
        </QuranReadinessContext.Provider>
      </View>
    </ThemeProvider>
  );
};

export default RootLayout;
