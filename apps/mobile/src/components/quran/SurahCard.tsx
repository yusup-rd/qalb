import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import type { QuranChapter } from "@/types/quran";
import { Link } from "expo-router";
import { memo } from "react";
import { Text, View } from "react-native";

type SurahCardProps = {
  chapter: QuranChapter;
  ayahsLabel: string;
};

export const SurahCard = memo(function SurahCard({
  chapter,
  ayahsLabel,
}: SurahCardProps) {
  return (
    <Link
      href={{
        pathname: "/quran/[chapterId]",
        params: { chapterId: String(chapter.id) },
      }}
      asChild
    >
      <SmoothPressable className="bg-card flex-row items-center gap-4 rounded-2xl p-4 shadow-md">
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
            {ayahsLabel}
          </Text>
        </View>
        <Text className="text-primary font-sans-regular writingDirection-rtl text-xl">
          {chapter.nameArabic}
        </Text>
      </SmoothPressable>
    </Link>
  );
});
