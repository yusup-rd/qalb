import {
  darkColors,
  lightColors,
  type ThemeColors,
  type ThemeMode,
} from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";

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
    const loadTheme = async () => {
      const value = await AsyncStorage.getItem(STORAGE_KEY);

      if (cancelled) {
        return;
      }

      if (value === "light" || value === "dark" || value === "system") {
        setModeState(value);
      }
    };
    void loadTheme();

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

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);

    Appearance.setColorScheme(nextMode === "system" ? "unspecified" : nextMode);

    void AsyncStorage.setItem(STORAGE_KEY, nextMode);
  }, []);

  const colors: ThemeColors =
    resolvedMode === "dark" ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      setMode,
      colors,
    }),
    [mode, resolvedMode, setMode, colors],
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
