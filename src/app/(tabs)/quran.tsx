import { AyahCard } from "@/components/quran/AyahCard";
import { SurahCard } from "@/components/quran/SurahCard";
import { AyahCardSkeleton } from "@/components/ui/skeletons/AyahCardSkeleton";
import { SurahCardSkeleton } from "@/components/ui/skeletons/SurahCardSkeleton";
import { useQuranChapters, useQuranSearch } from "@/hooks/useQuran";
import { useTheme } from "@/providers/ThemeProvider";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { styled } from "nativewind";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(NativeSafeAreaView);

const Quran = () => {
  const { colors } = useTheme();
  const { t } = useTranslation(undefined, { keyPrefix: "quran" });
  const { chapters, error, loading: chaptersLoading } = useQuranChapters();
  const [query, setQuery] = useState("");
  const {
    chapters: matchedChapters,
    verses: matchedVerses,
    loading: searchLoading,
  } = useQuranSearch(query);

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 p-5"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-foreground font-sans-bold text-2xl">Quran</Text>
        <View className="bg-muted flex-row items-center gap-2 rounded-2xl px-4">
          <Fa
            name="magnifying-glass"
            size={15}
            color={colors.mutedForeground}
          />
          <TextInput
            className="text-foreground font-sans-regular flex-1 py-3"
            placeholder={t("search")}
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        {error ? (
          <Text className="text-destructive font-sans-regular">
            {t("databaseError")}
          </Text>
        ) : query.trim() ? (
          searchLoading ? (
            <>
              {Array.from({ length: 2 }, (_, index) => (
                <SurahCardSkeleton key={`surah-skeleton-${index}`} />
              ))}
              {Array.from({ length: 3 }, (_, index) => (
                <AyahCardSkeleton key={`ayah-skeleton-${index}`} />
              ))}
            </>
          ) : (
            <>
              {matchedChapters.length > 0 ? (
                <>
                  <Text className="text-muted-foreground font-sans-bold">
                    {t("surahs")}
                  </Text>
                  {matchedChapters.map((chapter) => (
                    <SurahCard key={chapter.id} chapter={chapter} />
                  ))}
                </>
              ) : null}
              {matchedVerses.length > 0 ? (
                <>
                  <Text className="text-muted-foreground font-sans-bold">
                    {t("ayahsTitle")}
                  </Text>
                  {matchedVerses.map((verse) => (
                    <AyahCard key={verse.id} verse={verse} />
                  ))}
                </>
              ) : null}
              {matchedChapters.length === 0 && matchedVerses.length === 0 ? (
                <Text className="text-muted-foreground font-sans-regular">
                  {t("noResults")}
                </Text>
              ) : null}
            </>
          )
        ) : chaptersLoading ? (
          Array.from({ length: 6 }, (_, index) => (
            <SurahCardSkeleton key={`surah-skeleton-${index}`} />
          ))
        ) : (
          chapters.map((chapter) => (
            <SurahCard key={chapter.id} chapter={chapter} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Quran;
