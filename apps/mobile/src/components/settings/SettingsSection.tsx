import { AntDesign as Ant, FontAwesome6 as Fa } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View } from "react-native";

type IconName = ComponentProps<typeof Fa>["name"];
type AntIconName = ComponentProps<typeof Ant>["name"];

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
} & (
  | { icon: IconName; iconFamily?: "fontawesome6" }
  | { icon: AntIconName; iconFamily: "ant" }
);

export default function SettingsSection(props: SettingsSectionProps) {
  const { title, children } = props;

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        {props.iconFamily === "ant" ? (
          <Ant name={props.icon} size={14} className="text-secondary" />
        ) : (
          <Fa name={props.icon} size={14} className="text-secondary" />
        )}
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
