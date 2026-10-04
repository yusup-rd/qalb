import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import type { AyahOfDay } from "@/hooks/useQuran";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

const AyahCard = ({ ayah }: { ayah: AyahOfDay | null }) => {
  const { t, i18n } = useTranslation(undefined, { keyPrefix: "home" });
  if (!ayah) return null;

  const translation = i18n.language.startsWith("ru")
    ? ayah.verse.russian
    : ayah.verse.english;

  return (
    <View className="bg-card overflow-hidden rounded-xl shadow-md">
      <View className="border-l-secondary gap-2 border-l-6 p-6">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-1.5">
            <Text className="font-sans-extrabold text-secondary text-xs">
              {ayah.verse.verseNumber}
            </Text>
            <Text className="font-sans-semibold text-secondary text-xs uppercase">
              {t("ayahOfDay.title")}
            </Text>
          </View>

          <Text className="font-sans-semibold text-muted-foreground text-xs">
            {ayah.chapter.nameSimple} ({ayah.verse.verseKey})
          </Text>
        </View>

        {/* Arabic text */}
        <Text className="text-primary font-sans-semibold writingDirection-rtl text-right text-2xl">
          {ayah.verse.textUthmani}
        </Text>

        {translation ? (
          <Text className="text-card-foreground font-sans-italic text-sm">
            “{translation.text}”
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between gap-2 self-end">
          <SmoothPressable
            className="bg-primary/10 flex-row items-center gap-1 rounded-full px-4 py-2"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/quran",
                params: { query: ayah.verse.verseKey },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={t("ayahOfDay.reflect")}
          >
            <Text className="font-sans-semibold text-primary text-xs">
              {t("ayahOfDay.reflect")}
            </Text>
            <Fa name="arrow-right" size={12} className="text-primary" />
          </SmoothPressable>
        </View>
      </View>
    </View>
  );
};

export default AyahCard;
