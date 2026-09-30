import { DynamicColorIOS, Platform } from "react-native";

export const lightColors = {
  // Neutrals
  background: "#F8F9FA",
  foreground: "#0F172A",
  card: "#FFFFFF",
  cardForeground: "#0F172A",
  muted: "#F1F5F9",
  mutedForeground: "#64748B",
  border: "#E2E8F0",

  // Primary
  primary: "#134E43",
  primaryForeground: "#FFFFFF",
  primarySoft: "#E3EFEC",
  primarySoftForeground: "#4F8276",

  // Secondary
  secondary: "#C5A059",
  secondaryForeground: "#1B150A",
  secondarySoft: "#FAF1DE",
  secondarySoftForeground: "#8A6A2E",

  // Semantic
  success: "#16A34A",
  successForeground: "#FFFFFF",
  destructive: "#DC2626",
  destructiveForeground: "#FFFFFF",
} as const;

export const darkColors = {
  // Neutrals
  background: "#0A0E1A",
  foreground: "#E8ECF3",
  card: "#111A2C",
  cardForeground: "#E8ECF3",
  muted: "#161F33",
  mutedForeground: "#8A93A8",
  border: "#232C42",

  // Primary
  primary: "#4FB8A3",
  primaryForeground: "#06120F",
  primarySoft: "#16332E",
  primarySoftForeground: "#7FD6C3",

  // Secondary
  secondary: "#D9BA72",
  secondaryForeground: "#1B1508",
  secondarySoft: "#2B2413",
  secondarySoftForeground: "#E6C98A",

  // Semantic
  success: "#34D399",
  successForeground: "#06120F",
  destructive: "#F87171",
  destructiveForeground: "#1B0605",
} as const;

export type ThemeColors = typeof lightColors | typeof darkColors;

export type ThemeMode = "light" | "dark" | "system";

export const nativeTabColors =
  Platform.OS === "ios"
    ? {
        foreground: DynamicColorIOS({
          light: lightColors.foreground,
          dark: darkColors.foreground,
        }),
        primary: DynamicColorIOS({
          light: lightColors.primary,
          dark: darkColors.primary,
        }),
      }
    : {
        foreground: lightColors.foreground,
        primary: lightColors.primary,
      };
