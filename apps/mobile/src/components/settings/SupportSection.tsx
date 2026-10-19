import SettingsSection from "@/components/settings/SettingsSection";
import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import SheetWrapper from "@/components/ui/SheetWrapper";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Linking, Text, View } from "react-native";

type IconName = ComponentProps<typeof Fa>["name"];

export default function SupportSection() {
  const { t } = useTranslation(undefined, { keyPrefix: "settings.more" });
  const [donationSheetVisible, setDonationSheetVisible] = useState(false);

  const contact = async () => {
    const subject = encodeURIComponent("Qalb Feedback");
    try {
      await Linking.openURL(`mailto:yusuprd@icloud.com?subject=${subject}`);
    } catch {
      Alert.alert(
        t("support.emailUnavailableTitle"),
        t("support.emailUnavailableMessage"),
      );
    }
  };

  return (
    <View>
      <SettingsSection title={t("support.title")} icon="heart">
        {/* TODO: Donation feature to be implemented in future */}
        {/* <SettingsRow
          title={t("support.donate")}
          description={t("support.donateDescription")}
          icon="heart"
          onPress={() => setDonationSheetVisible(true)}
        />
        <View className="border-border border-t" /> */}
        <SettingsRow
          title={t("support.contact")}
          description="yusuprd@icloud.com"
          icon="envelope"
          onPress={contact}
        />
      </SettingsSection>
      <SheetWrapper
        visible={donationSheetVisible}
        onClose={() => setDonationSheetVisible(false)}
      >
        <View className="gap-3 py-6">
          <Text className="text-foreground font-sans-bold text-xl">
            {t("support.sheetTitle")}
          </Text>
          <Text className="text-muted-foreground font-sans text-sm">
            {t("support.sheetBody")}
          </Text>
          <Text className="text-secondary font-sans-medium text-sm">
            {t("support.unavailable")}
          </Text>
        </View>
      </SheetWrapper>
    </View>
  );
}

function SettingsRow({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description?: string;
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
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-foreground font-sans-semibold text-sm">
          {title}
        </Text>
        {description ? (
          <Text className="text-muted-foreground font-sans text-xs">
            {description}
          </Text>
        ) : null}
      </View>
      <Fa name="chevron-right" size={13} className="text-muted-foreground" />
    </SmoothPressable>
  );
}
