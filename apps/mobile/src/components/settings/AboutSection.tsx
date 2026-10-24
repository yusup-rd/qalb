import SettingsSection from "@/components/settings/SettingsSection";
import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import SheetWrapper from "@/components/ui/SheetWrapper";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import type { ComponentProps } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type IconName = ComponentProps<typeof Fa>["name"];

export default function AboutSection() {
  const { t, i18n } = useTranslation(undefined, {
    keyPrefix: "settings.more",
  });
  const [aboutSheetVisible, setAboutSheetVisible] = useState(false);
  const { height } = useWindowDimensions();
  const version = Constants.expoConfig?.version ?? "—";
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("ru")
    ? "ru"
    : "en";
  const legalUrls = {
    privacy: `https://yusup-rd.github.io/qalb/privacy/${language === "ru" ? "ru/" : ""}`,
    terms: `https://yusup-rd.github.io/qalb/terms/${language === "ru" ? "ru/" : ""}`,
  };
  const openLegalUrl = (url: string) => {
    void Linking.openURL(url).catch(() =>
      Alert.alert(t("about.linkErrorTitle"), t("about.linkErrorMessage")),
    );
  };

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
          onPress={() => openLegalUrl(legalUrls.privacy)}
          accessibilityRole="link"
        />
        <View className="border-border border-t" />
        <SettingsRow
          title={t("about.terms")}
          icon="file-lines"
          onPress={() => openLegalUrl(legalUrls.terms)}
          accessibilityRole="link"
        />
      </SettingsSection>
      <SheetWrapper
        visible={aboutSheetVisible}
        onClose={() => setAboutSheetVisible(false)}
        snapPoints={["full"]}
      >
        <ScrollView
          style={{ maxHeight: height * 0.8 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 24 }}
        >
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
          <Text className="text-foreground font-sans-semibold text-sm">
            {t("about.dataCredits")}
          </Text>
          <Text className="text-muted-foreground font-sans text-xs">
            {t("about.credits")}
          </Text>
          <LicenseLink
            label={t("about.locationCredits")}
            url="https://www.openstreetmap.org/copyright"
          />
          <Text className="text-muted-foreground font-sans text-xs">
            {t("about.locationServices")}
          </Text>
          <Text className="text-foreground font-sans-semibold text-sm">
            {t("about.softwareNotices")}
          </Text>
          <LicenseLink
            label={t("about.licenseExpo")}
            url="https://github.com/expo/expo/blob/main/LICENSE"
          />
          <LicenseLink
            label={t("about.licenseReactNative")}
            url="https://github.com/facebook/react-native/blob/main/LICENSE"
          />
          <LicenseLink
            label={t("about.licenseMapsAndStorage")}
            url="https://github.com/react-native-maps/react-native-maps/blob/master/LICENSE"
          />
          <LicenseLink
            label={t("about.licensePluralRules")}
            url="https://github.com/eemeli/intl-pluralrules/blob/main/LICENSE"
          />
          <Text className="text-muted-foreground font-sans text-xs">
            {t("about.contentRightsNote")}
          </Text>
        </ScrollView>
      </SheetWrapper>
    </View>
  );
}

function LicenseLink({ label, url }: { label: string; url: string }) {
  const { t: tLicense } = useTranslation(undefined, {
    keyPrefix: "settings.more.about",
  });
  return (
    <SmoothPressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() =>
        void Linking.openURL(url).catch(() =>
          Alert.alert(tLicense("linkErrorTitle"), tLicense("linkErrorMessage")),
        )
      }
    >
      <Text className="text-primary font-sans text-xs underline">{label}</Text>
    </SmoothPressable>
  );
}

function SettingsRow({
  title,
  icon,
  onPress,
  accessibilityRole = "button",
}: {
  title: string;
  icon: IconName;
  onPress: () => void;
  accessibilityRole?: "button" | "link";
}) {
  return (
    <SmoothPressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
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
