import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons as Io } from "@expo/vector-icons";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

const options = [
  {
    value: "light",
    icon: "sunny",
  },
  {
    value: "dark",
    icon: "moon",
  },
  {
    value: "system",
    icon: "phone-portrait",
  },
] as const;

const ThemeSelector = () => {
  const { mode, setMode } = useTheme();
  const { t } = useTranslation(undefined, {
    keyPrefix: "settings.sections.appearance.theme",
  });

  return (
    <View className="gap-2">
      <Text className="text-foreground font-sans-semibold text-sm">
        {t("title")}
      </Text>

      <View className="bg-muted flex-row rounded-xl p-1">
        {options.map((option) => {
          const selected = mode === option.value;

          return (
            <SmoothPressable
              key={option.value}
              onPress={() => setMode(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              className={clsx(
                "will-change-variable flex-1 items-center gap-1 rounded-lg px-2 py-2.5",
                selected && "bg-card shadow-sm",
              )}
            >
              <Io
                name={option.icon}
                size={15}
                className={clsx(
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              />

              <Text
                className={clsx(
                  "font-sans-medium text-xs",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(option.value)}
              </Text>
            </SmoothPressable>
          );
        })}
      </View>
    </View>
  );
};

export default ThemeSelector;
