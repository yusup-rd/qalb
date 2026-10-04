import TasbihArtwork from "@/components/tasbih/artwork/TasbihArtwork";
import TasbihCounter from "@/components/tasbih/counter/TasbihCounter";
import { BEAD_COUNT } from "@/constants/tasbih";
import { useTasbih } from "@/hooks/useTasbih";
import { useTheme } from "@/providers/ThemeProvider";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, View } from "react-native";

const Tasbih = () => {
  const { colors } = useTheme();
  const { t } = useTranslation(undefined, {
    keyPrefix: "tasbih.reset",
  });

  const {
    currentCount,
    totalCount,
    isHydrated,
    persistenceError,
    recordTap,
    reset,
  } = useTasbih();

  const [resetKey, setResetKey] = useState(0);

  const rounds = Math.floor(totalCount / BEAD_COUNT);

  const handleReset = useCallback(() => {
    Alert.alert(t("title"), t("description"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("confirm"),
        style: "destructive",
        onPress: async () => {
          const success = await reset();

          if (success) {
            setResetKey((value) => value + 1);
          } else {
            Alert.alert(
              t("failedTitle"),
              persistenceError ?? t("failedDescription"),
            );
          }
        },
      },
    ]);
  }, [persistenceError, reset, t]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable onPress={handleReset} hitSlop={12}>
              <Fa
                name="arrow-rotate-left"
                size={17}
                color={colors.foreground}
              />
            </Pressable>
          ),
        }}
      />

      <View className="bg-card flex-1">
        <View className="flex-1 items-center justify-center">
          {isHydrated && (
            <TasbihArtwork
              key={resetKey}
              initialCount={currentCount}
              onTap={recordTap}
            />
          )}
        </View>

        <View pointerEvents="none" className="absolute bottom-8 left-5">
          <TasbihCounter
            currentCount={currentCount}
            rounds={rounds}
            totalCount={totalCount}
          />
        </View>
      </View>
    </>
  );
};

export default Tasbih;
