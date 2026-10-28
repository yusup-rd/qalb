import { useTheme } from "@/providers/ThemeProvider";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

const AppNavigator = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={
        Platform.OS === "android"
          ? {
              headerStyle: {
                backgroundColor: colors.background,
              },
              headerTintColor: colors.foreground,
              headerTitleStyle: {
                color: colors.foreground,
              },
            }
          : undefined
      }
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          animation: "fade",
          title: t("tabs.quran"),
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="prayer-times"
        options={{
          presentation: "modal",
          headerShown: Platform.OS === "android",
          headerBackButtonDisplayMode: "minimal",
          headerTitle: t("prayerTimes.title"),
        }}
      />

      <Stack.Screen
        name="zakat"
        options={{
          presentation: "modal",
          headerShown: Platform.OS === "android",
          headerBackButtonDisplayMode: "minimal",
          headerTitle: t("zakat.title"),
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
        options={({ route }) => ({
          animation: "fade",
          gestureEnabled: false,
          title:
            (route.params as { chapterName?: string } | undefined)
              ?.chapterName ?? "",
          headerShown: true,
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          headerBackTitle: t("tabs.quran"),
          headerBackButtonDisplayMode: "minimal",
        })}
      />
    </Stack>
  );
};

export default AppNavigator;
