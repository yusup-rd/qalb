import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, Platform, useColorScheme } from "react-native";

import {
  darkColors,
  lightColors,
  type ThemeColors,
  type ThemeMode,
} from "@/constants/theme";

const STORAGE_KEY = "@app/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();

  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (cancelled) {
        return;
      }

      if (value === "light" || value === "dark" || value === "system") {
        setModeState(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedMode: "light" | "dark" =
    mode === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : mode;

  useEffect(() => {
    if (Platform.OS !== "web") {
      Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
    }
  }, [mode]);

  const setMode = async (nextMode: ThemeMode) => {
    setModeState(nextMode);

    if (Platform.OS !== "web") {
      Appearance.setColorScheme(
        nextMode === "system" ? "unspecified" : nextMode,
      );
    }

    await AsyncStorage.setItem(STORAGE_KEY, nextMode);
  };

  const colors: ThemeColors =
    resolvedMode === "dark" ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      setMode,
      colors,
    }),
    [mode, resolvedMode, colors],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
