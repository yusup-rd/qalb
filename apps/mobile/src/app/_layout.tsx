import AppNavigator from "@/components/ui/AppNavigator";
import AppStatusBar from "@/components/ui/AppStatusBar";
import QuranBootstrapScreen from "@/components/quran/QuranBootstrapScreen";
import QuranReadinessGate, {
  QuranReadinessContext,
} from "@/components/quran/QuranReadinessGate";
import "@/global.css";
import { initializeLanguage } from "@/i18n";
import LocationInitializer from "@/initializers/LocationInitializer";
import NotificationInitializer from "@/initializers/NotificationInitializer";
import QuranSyncInitializer from "@/initializers/QuranSyncInitializer";
import { setupNotificationHandler } from "@/lib/notifications";
import { QuranAudioProvider } from "@/providers/QuranAudioProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { initializeQuranDatabase } from "@/lib/quran/sync";
import { initialQuranBootstrapProgress } from "@/lib/quran/bootstrap-progress";
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
  const [bootstrapProgress, setBootstrapProgress] = useState(
    initialQuranBootstrapProgress,
  );
  const [bootstrapDelayElapsed, setBootstrapDelayElapsed] = useState(false);
  const [quranDatabaseError, setQuranDatabaseError] =
    useState<QuranBootstrapErrorKind | null>(null);
  const splashHidden = useRef(false);
  const databaseInitializationInFlight = useRef(false);
  const databaseRef = useRef<SQLiteDatabase | null>(null);
  const [databaseOpenAttempt, setDatabaseOpenAttempt] = useState(0);
  const reportedOpenError = useRef<Error | null>(null);

  const handleDatabaseOpenError = useCallback((error: Error) => {
    if (reportedOpenError.current === error) return;
    reportedOpenError.current = error;
    // SQLiteProvider invokes onError during render. Defer parent updates until
    // after that render completes.
    queueMicrotask(() => {
      databaseRef.current = null;
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
      await initializeQuranDatabase(db, setBootstrapProgress);
      setQuranDatabaseError(null);
      setQuranDatabaseReady(true);
    } catch (error) {
      setQuranDatabaseError(getQuranBootstrapErrorKind(error));
      setQuranDatabaseReady(false);
    } finally {
      databaseInitializationInFlight.current = false;
    }
  }, []);

  const retryDatabaseInitialization = useCallback(() => {
    const db = databaseRef.current;
    if (databaseInitializationInFlight.current) return;
    setQuranDatabaseError(null);
    setQuranDatabaseReady(false);
    if (!db) {
      reportedOpenError.current = null;
      setDatabaseOpenAttempt((attempt) => attempt + 1);
      return;
    }
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

  // Avoid flashing setup UI for an already complete local database.
  useEffect(() => {
    if (!fontsLoaded || !languageLoaded || quranDatabaseReady) return;
    const timer = setTimeout(() => setBootstrapDelayElapsed(true), 300);
    return () => clearTimeout(timer);
  }, [fontsLoaded, languageLoaded, quranDatabaseReady]);

  const showBootstrap =
    !quranDatabaseReady &&
    (bootstrapDelayElapsed ||
      quranDatabaseError !== null ||
      bootstrapProgress.stage !== "checking");

  useEffect(() => {
    if (
      !fontsLoaded ||
      !languageLoaded ||
      !rootLaidOut ||
      (!quranDatabaseReady && !showBootstrap) ||
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
    showBootstrap,
    rootLaidOut,
  ]);

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded || !languageLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <View className="flex-1" onLayout={handleRootLayout}>
        <AppStatusBar />
        {showBootstrap && (
          <QuranBootstrapScreen
            progress={bootstrapProgress}
            error={quranDatabaseError}
            onRetry={retryDatabaseInitialization}
          />
        )}
        {/* The provider withholds its children until onInit resolves. */}
        <QuranReadinessContext.Provider value={quranDatabaseReady}>
          <SQLiteProvider
            key={databaseOpenAttempt}
            databaseName="quran-v2.db"
            onInit={initializeDatabase}
            onError={handleDatabaseOpenError}
          >
            <QuranReadinessGate>
              <QuranAudioProvider>
                <QuranSyncInitializer />
                <LocationInitializer />
                <NotificationInitializer />
                <AppNavigator />
              </QuranAudioProvider>
            </QuranReadinessGate>
          </SQLiteProvider>
        </QuranReadinessContext.Provider>
      </View>
    </ThemeProvider>
  );
};

export default RootLayout;
