import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import SheetWrapper from "@/components/ui/SheetWrapper";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const references = [
  {
    label: "quranTerms",
    url: "https://api-docs.quran.foundation/legal/developer-terms/#31-acceptable-use",
  },
  {
    label: "quranOfflineSync",
    url: "https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started#content-available-for-offline-sync",
  },
  {
    label: "quranAttribution",
    url: "https://api-docs.quran.foundation/docs/tutorials/faq#what-attribution-or-copyright-information-should-i-show",
  },
] as const;

export function QuranCredits() {
  const { t } = useTranslation(undefined, { keyPrefix: "quran.credits" });
  const [visible, setVisible] = useState(false);
  const { height } = useWindowDimensions();

  return (
    <>
      <SmoothPressable
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t("source")}. ${t("title")}`}
        className="min-h-11 flex-row items-center gap-2 py-2"
      >
        <Text className="text-muted-foreground font-sans-regular min-w-0 flex-1 text-xs leading-5">
          {t("source")}
        </Text>
        <Fa name="circle-info" size={14} className="text-muted-foreground" />
      </SmoothPressable>
      <SheetWrapper
        visible={visible}
        onClose={() => setVisible(false)}
        snapPoints={["full"]}
      >
        <ScrollView
          style={{ maxHeight: height * 0.8 }}
          contentContainerStyle={{ gap: 20, paddingVertical: 24 }}
        >
          <Text className="text-foreground font-sans-bold text-xl">
            {t("title")}
          </Text>
          <QuranCreditDetails />
        </ScrollView>
      </SheetWrapper>
    </>
  );
}

export function QuranCreditDetails() {
  const { t } = useTranslation(undefined, { keyPrefix: "quran.credits" });
  const { t: tAbout } = useTranslation(undefined, {
    keyPrefix: "settings.more.about",
  });

  return (
    <View className="gap-4">
      <View className="gap-2">
        {(
          [
            "source",
            "english",
            "russian",
            "transliteration",
            "recitation",
          ] as const
        ).map((key) => (
          <Text
            key={key}
            className="text-muted-foreground font-sans-regular text-sm leading-5"
          >
            {t(key)}
          </Text>
        ))}
      </View>
      <View className="border-border overflow-hidden rounded-xl border">
        {references.map(({ label, url }, index) => (
          <SmoothPressable
            key={label}
            accessibilityRole="link"
            accessibilityLabel={tAbout(label)}
            className={`min-h-11 flex-row items-center gap-3 px-3 py-3 ${index > 0 ? "border-border border-t" : ""}`}
            onPress={() =>
              void Linking.openURL(url).catch(() =>
                Alert.alert(
                  tAbout("linkErrorTitle"),
                  tAbout("linkErrorMessage"),
                ),
              )
            }
          >
            <Text className="text-primary font-sans-medium min-w-0 flex-1 text-xs leading-5">
              {tAbout(label)}
            </Text>
            <Fa
              name="arrow-up-right-from-square"
              size={11}
              className="text-muted-foreground"
            />
          </SmoothPressable>
        ))}
      </View>
    </View>
  );
}
