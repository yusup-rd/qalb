import { AyahCard } from "@/components/quran/AyahCard";
import { SurahCard } from "@/components/quran/SurahCard";
import { AyahCardSkeleton } from "@/components/ui/skeletons/AyahCardSkeleton";
import { SurahCardSkeleton } from "@/components/ui/skeletons/SurahCardSkeleton";
import { useQuranChapters, useQuranSearch } from "@/hooks/useQuran";
import { useTheme } from "@/providers/ThemeProvider";
import type { QuranChapter, QuranVerseWithContent } from "@/types/quran";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ListRenderItem } from "react-native";
import { FlatList, Text, TextInput, View } from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(NativeSafeAreaView);

type QuranListItem =
  | {
      type: "surah";
      id: string;
      chapter: QuranChapter;
    }
  | {
      type: "ayah";
      id: string;
      verse: QuranVerseWithContent;
    }
  | {
      type: "section";
      id: string;
      title: string;
    }
  | {
      type: "message";
      id: string;
      message: string;
    }
  | {
      type: "surah-skeleton";
      id: string;
    }
  | {
      type: "ayah-skeleton";
      id: string;
    };

const Quran = () => {
  const { colors } = useTheme();
  const { t } = useTranslation(undefined, {
    keyPrefix: "quran",
  });
  const params = useLocalSearchParams<{ query?: string }>();
  const router = useRouter();
  const { i18n } = useTranslation();
  const { chapters, error, loading: chaptersLoading } = useQuranChapters();
  const [query, setQuery] = useState(params.query ?? "");
  const {
    chapters: matchedChapters,
    verses: matchedVerses,
    loading: searchLoading,
    error: searchError,
  } = useQuranSearch(query);

  useEffect(() => {
    queueMicrotask(() => {
      setQuery(params.query ?? "");
    });
  }, [params.query]);

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      setQuery(nextQuery);
      router.setParams({
        query: nextQuery || undefined,
      });
    },
    [router],
  );

  const listItems = useMemo<QuranListItem[]>(() => {
    if (error || searchError) {
      return [
        {
          type: "message",
          id: "database-error",
          message: t("databaseError"),
        },
      ];
    }

    if (query.trim()) {
      if (searchLoading) {
        return [
          ...Array.from({ length: 2 }, (_, index) => ({
            type: "surah-skeleton" as const,
            id: `surah-skeleton-${index}`,
          })),
          ...Array.from({ length: 3 }, (_, index) => ({
            type: "ayah-skeleton" as const,
            id: `ayah-skeleton-${index}`,
          })),
        ];
      }

      return [
        ...(matchedChapters.length > 0
          ? [
              {
                type: "section" as const,
                id: "surahs-section",
                title: t("surahs"),
              },
              ...matchedChapters.map((chapter) => ({
                type: "surah" as const,
                id: `surah-${chapter.id}`,
                chapter,
              })),
            ]
          : []),

        ...(matchedVerses.length > 0
          ? [
              {
                type: "section" as const,
                id: "ayahs-section",
                title: t("ayahsTitle"),
              },
              ...matchedVerses.map((verse) => ({
                type: "ayah" as const,
                id: `ayah-${verse.id}`,
                verse,
              })),
            ]
          : []),

        ...(matchedChapters.length === 0 && matchedVerses.length === 0
          ? [
              {
                type: "message" as const,
                id: "no-results",
                message: t("noResults"),
              },
            ]
          : []),
      ];
    }

    if (chaptersLoading) {
      return Array.from({ length: 6 }, (_, index) => ({
        type: "surah-skeleton" as const,
        id: `surah-skeleton-${index}`,
      }));
    }

    return chapters.map((chapter) => ({
      type: "surah" as const,
      id: `surah-${chapter.id}`,
      chapter,
    }));
  }, [
    chapters,
    chaptersLoading,
    error,
    matchedChapters,
    matchedVerses,
    query,
    searchError,
    searchLoading,
    t,
  ]);

  const translationLanguage = i18n.language.startsWith("ru")
    ? "russian"
    : "english";

  const renderItem = useCallback<ListRenderItem<QuranListItem>>(
    ({ item }) => {
      switch (item.type) {
        case "surah":
          return (
            <SurahCard
              chapter={item.chapter}
              ayahsLabel={t("ayahs", {
                count: item.chapter.versesCount,
              })}
            />
          );

        case "ayah":
          return (
            <AyahCard
              verse={item.verse}
              translation={item.verse[translationLanguage]?.text ?? null}
            />
          );

        case "section":
          return (
            <Text className="text-muted-foreground font-sans-bold">
              {item.title}
            </Text>
          );

        case "message":
          return (
            <Text className="text-destructive font-sans-regular">
              {item.message}
            </Text>
          );

        case "surah-skeleton":
          return <SurahCardSkeleton />;

        case "ayah-skeleton":
          return <AyahCardSkeleton />;
      }
    },
    [t, translationLanguage],
  );

  const renderHeader = (
    <View className="bg-background -mx-5 gap-3 px-5 pb-4">
      <Text className="text-foreground font-sans-bold text-2xl">
        {t("title")}
      </Text>

      <View className="bg-muted flex-row items-center gap-2 rounded-2xl px-4">
        <Fa
          name="magnifying-glass"
          size={15}
          className="text-muted-foreground"
        />

        <TextInput
          className="text-foreground font-sans-regular flex-1 py-3"
          placeholder={t("search")}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={handleQueryChange}
        />
      </View>
    </View>
  );

  const keyExtractor = useCallback((item: QuranListItem) => item.id, []);

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <FlatList
        className="bg-background flex-1 px-5"
        contentContainerClassName="gap-3 pb-5"
        data={listItems}
        initialNumToRender={10}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        updateCellsBatchingPeriod={50}
        windowSize={5}
      />
    </SafeAreaView>
  );
};

export default Quran;
