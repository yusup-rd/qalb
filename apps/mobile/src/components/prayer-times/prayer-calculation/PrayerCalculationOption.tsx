import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { clsx } from "clsx";
import { Text, View } from "react-native";

interface PrayerCalculationOptionProps {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

const PrayerCalculationOption = ({
  title,
  description,
  selected,
  onPress,
}: PrayerCalculationOptionProps) => {
  return (
    <SmoothPressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={clsx(
        "flex-row items-center justify-between rounded-xl border px-4 py-3",
        selected ? "border-primary bg-primary-soft" : "border-border bg-card",
      )}
    >
      <View className="flex-1 pr-3">
        <Text
          className={clsx(
            "font-sans-semibold text-sm",
            selected ? "text-primary" : "text-foreground",
          )}
        >
          {title}
        </Text>

        <Text className="text-muted-foreground font-sans-medium mt-0.5 text-xs">
          {description}
        </Text>
      </View>

      <View
        className={clsx(
          "size-5 items-center justify-center rounded-full border-2",
          selected
            ? "border-primary bg-primary"
            : "border-border bg-transparent",
        )}
      >
        {selected && (
          <Fa name="check" size={10} className="text-primary-foreground" />
        )}
      </View>
    </SmoothPressable>
  );
};

export default PrayerCalculationOption;
