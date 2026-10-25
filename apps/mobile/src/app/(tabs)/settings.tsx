import AboutSection from "@/components/settings/AboutSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import QuranSection from "@/components/settings/QuranSection";
import SettingsHeader from "@/components/settings/SettingsHeader";
import SupportSection from "@/components/settings/SupportSection";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { ScrollView, Text } from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(NativeSafeAreaView);

const Settings = () => {
  const { t } = useTranslation(undefined, { keyPrefix: "settings.more" });

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 p-5"
        showsVerticalScrollIndicator={false}
      >
        <SettingsHeader />
        <AppearanceSection />
        <QuranSection />
        <SupportSection />
        <AboutSection />
        <Text className="text-muted-foreground text-center font-sans text-xs">
          {t("copyright", { year: new Date().getFullYear() })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
