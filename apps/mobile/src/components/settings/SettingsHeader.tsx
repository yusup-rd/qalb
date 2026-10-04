import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

const SettingsHeader = () => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "settings.header",
  });

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <Fa name="seedling" size={16} className="text-primary" />
        <Text className="font-sans-semibold text-primary text-lg">
          {t("title")}
        </Text>
      </View>
      <Text className="text-muted-foreground font-sans text-xs">
        {t("description")}
      </Text>
    </View>
  );
};

export default SettingsHeader;
