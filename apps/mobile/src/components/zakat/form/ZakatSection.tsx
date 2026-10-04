import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface ZakatSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon: React.ComponentProps<typeof Fa>["name"];
}

const ZakatSection = ({
  title,
  description,
  children,
  icon,
}: ZakatSectionProps) => {
  return (
    <View className="gap-3">
      {/* Header */}
      <View className="gap-2">
        <View className="flex-row items-center gap-3">
          {/* Icon */}
          <View className="bg-primary-soft size-10 items-center justify-center rounded-lg">
            <Fa name={icon} size={18} className="text-primary" />
          </View>

          {/* Title */}
          <Text className="font-sans-bold text-primary text-lg">{title}</Text>
        </View>

        {/* Description */}
        {description ? (
          <View className="bg-primary-soft rounded-xl p-4">
            <Text className="font-sans-regular text-muted-foreground text-sm leading-5">
              {description}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Children */}
      <View className="gap-3">{children}</View>
    </View>
  );
};

export default ZakatSection;
