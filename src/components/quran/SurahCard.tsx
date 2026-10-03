import type { QuranChapter } from "@/types/quran";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

export const SurahCard = ({ chapter }: { chapter: QuranChapter }) => {
  const { t } = useTranslation(undefined, { keyPrefix: "quran" });

  return (
    <Link
      href={{
        pathname: "/quran/[chapterId]",
        params: { chapterId: String(chapter.id) },
      }}
      asChild
    >
      <Pressable className="bg-card flex-row items-center gap-4 rounded-2xl p-4 shadow-md">
        <View className="bg-primary-soft size-10 items-center justify-center rounded-full">
          <Text className="text-primary font-sans-bold">
            {chapter.chapterNumber}
          </Text>
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-foreground font-sans-bold">
            {chapter.nameSimple}
          </Text>
          <Text className="text-muted-foreground font-sans-regular text-sm">
            {t("ayahs", { count: chapter.versesCount })}
          </Text>
        </View>
        <Text className="text-foreground font-sans-regular text-xl">
          {chapter.nameArabic}
        </Text>
      </Pressable>
    </Link>
  );
};
