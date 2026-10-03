import { AyahCard } from "@/components/quran/AyahCard";
import { AyahCardSkeleton } from "@/components/ui/skeletons/AyahCardSkeleton";
import { useQuranChapter } from "@/hooks/useQuran";
import { Stack, useLocalSearchParams } from "expo-router";
import { styled } from "nativewind";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(NativeSafeAreaView);

const QuranReader = () => {
  const { t } = useTranslation(undefined, { keyPrefix: "quran" });
  const params = useLocalSearchParams<{ chapterId: string }>();
  const chapterId = Number(params.chapterId);
  const { chapter, verses, error, loading } = useQuranChapter(chapterId);

  return (
    <SafeAreaView className="bg-background flex-1" edges={[]}>
      <Stack.Screen options={{ title: chapter?.nameSimple ?? "Quran" }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-5"
        showsVerticalScrollIndicator={false}
      >
        {!loading && chapter ? (
          <View className="items-center gap-1">
            <Text className="text-foreground font-sans-bold text-2xl">
              {chapter.nameArabic}
            </Text>
            <Text className="text-muted-foreground font-sans-regular">
              {chapter.nameSimple} ·{" "}
              {t("ayahs", { count: chapter.versesCount })}
            </Text>
          </View>
        ) : null}
        {error ? (
          <Text className="text-destructive font-sans-regular">
            {t("loadError", { message: error.message })}
          </Text>
        ) : loading ? (
          Array.from({ length: 6 }, (_, index) => (
            <AyahCardSkeleton key={`ayah-skeleton-${index}`} />
          ))
        ) : verses.length === 0 ? (
          <Text className="text-muted-foreground font-sans-regular">
            {t("noAyahs")}
          </Text>
        ) : (
          verses.map((verse) => <AyahCard key={verse.id} verse={verse} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default QuranReader;
