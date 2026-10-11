import { useTheme } from "@/providers/ThemeProvider";
import { Stack } from "expo-router";
import { Platform } from "react-native";

const AppNavigator = () => {
  const { colors } = useTheme();

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
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="prayer-times"
        options={{
          presentation: "modal",
          headerShown: Platform.OS === "android",
          headerBackButtonDisplayMode: "minimal",
          headerTitle: "Prayer Times",
        }}
      />

      <Stack.Screen
        name="zakat"
        options={{
          presentation: "modal",
          headerShown: Platform.OS === "android",
          headerBackButtonDisplayMode: "minimal",
          headerTitle: "Zakat",
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
  );
};

export default AppNavigator;
