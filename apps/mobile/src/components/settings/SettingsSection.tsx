import { FontAwesome6 as Fa } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View } from "react-native";

type IconName = ComponentProps<typeof Fa>["name"];

export default function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Fa name={icon} size={14} className="text-secondary" />
        <Text className="font-sans-semibold text-secondary text-sm">
          {title}
        </Text>
      </View>
      <View className="bg-card overflow-hidden rounded-2xl shadow-md">
        {children}
      </View>
    </View>
  );
}
