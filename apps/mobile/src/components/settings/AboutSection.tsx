import SettingsSection from "@/components/settings/SettingsSection";
import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import SheetWrapper from "@/components/ui/SheetWrapper";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import Constants from "expo-constants";
import type { ComponentProps } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Text, View } from "react-native";

type IconName = ComponentProps<typeof Fa>["name"];

export default function AboutSection() {
  const { t } = useTranslation(undefined, { keyPrefix: "settings.more" });
  const [aboutSheetVisible, setAboutSheetVisible] = useState(false);
  const version = Constants.expoConfig?.version ?? "—";
  const showLegalPending = () =>
    Alert.alert(t("about.legalPendingTitle"), t("about.legalPendingMessage"));

  return (
    <View>
      <SettingsSection title={t("about.title")} icon="circle-info">
        <SettingsRow
          title={t("about.aboutQalb")}
          icon="seedling"
          onPress={() => setAboutSheetVisible(true)}
        />
        <View className="border-border border-t" />
        <SettingsRow
          title={t("about.privacy")}
          icon="shield-halved"
          onPress={showLegalPending}
        />
        <View className="border-border border-t" />
        <SettingsRow
          title={t("about.terms")}
          icon="file-lines"
          onPress={showLegalPending}
        />
      </SettingsSection>
      <SheetWrapper
        visible={aboutSheetVisible}
        onClose={() => setAboutSheetVisible(false)}
        snapPoints={["full"]}
      >
        <View className="gap-3 py-6">
          <Text className="text-foreground font-sans-bold text-xl">
            {t("about.aboutQalb")}
          </Text>
          <Text className="text-muted-foreground font-sans text-sm">
            {t("about.description")}
          </Text>
          <Text className="text-muted-foreground font-sans text-sm">
            {t("about.free")}
          </Text>
          <Text className="text-secondary font-sans-medium text-sm">
            {t("about.version", { version })}
          </Text>
          <Text className="text-muted-foreground font-sans text-xs">
            {t("about.credits")}
          </Text>
          <Text className="text-muted-foreground font-sans text-xs">
            {t("about.noticesPending")}
          </Text>
        </View>
      </SheetWrapper>
    </View>
  );
}

function SettingsRow({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <SmoothPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="flex-row items-center gap-3 px-3 py-3"
    >
      <View className="bg-primary-soft size-9 items-center justify-center rounded-full">
        <Fa name={icon} size={15} className="text-primary-soft-foreground" />
      </View>
      <Text className="text-foreground font-sans-semibold flex-1 text-sm">
        {title}
      </Text>
      <Fa name="chevron-right" size={13} className="text-muted-foreground" />
    </SmoothPressable>
  );
}
