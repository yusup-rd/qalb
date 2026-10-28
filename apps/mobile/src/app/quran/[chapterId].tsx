import { AyahCard } from "@/components/quran/AyahCard";
import QuranReadinessGate from "@/components/quran/QuranReadinessGate";
import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { AyahCardSkeleton } from "@/components/ui/skeletons/AyahCardSkeleton";
import { useQuranChapter, useQuranChapters } from "@/hooks/useQuran";
import { saveLastOpenedSurah } from "@/lib/quran-reading";
import { useTheme } from "@/providers/ThemeProvider";
import { useQuranAudio } from "@/providers/QuranAudioProvider";
import { useQuranPreferencesStore } from "@/store/quranPreferencesStore";
import type { QuranVerseWithContent } from "@/types/quran";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ListRenderItem } from "react-native";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
const AyahSeparator = () => <View className="h-4" />;

type ReaderItem =
  | { type: "ayah"; id: string; verse: QuranVerseWithContent }
  | { type: "skeleton"; id: string }
  | { type: "message"; id: string; message: string };

const QuranReaderContent = () => {
  const { t } = useTranslation(undefined, { keyPrefix: "quran" });
  const { i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    chapterId: string;
    chapterName?: string;
  }>();
  const { colors } = useTheme();
  const chapterId = Number(params.chapterId);
  const {
    chapter: loadedChapter,
    verses,
    error,
    loading,
  } = useQuranChapter(chapterId);
  const { chapters } = useQuranChapters();
  const chapter =
    chapters.find((item) => item.id === chapterId) ?? loadedChapter;
  const chapterLoading = loading;
  const nextChapter = chapters.find(
    (item) => item.chapterNumber === (chapter?.chapterNumber ?? 0) + 1,
  );
  const previousChapter = chapters.find(
    (item) => item.chapterNumber === (chapter?.chapterNumber ?? 0) - 1,
  );
  const showTranslation = useQuranPreferencesStore(
    (state) => state.showTranslation,
  );
  const showTransliteration = useQuranPreferencesStore(
    (state) => state.showTransliteration,
  );
  const { status, queueActive, playQueue, pause } = useQuranAudio();
  const [listenRequesting, setListenRequesting] = useState(false);
  const audioUrls = useMemo(
    () =>
      chapterLoading
        ? []
        : verses.flatMap((verse) =>
            verse.audio?.url ? [verse.audio.url] : [],
          ),
    [chapterLoading, verses],
  );
  const isListening = queueActive && Boolean(status?.playing);
  const translationLanguage = i18n.language.startsWith("ru")
    ? "russian"
    : "english";

  useEffect(() => {
    if (chapter) saveLastOpenedSurah(chapter);
  }, [chapter]);

  const items = useMemo<ReaderItem[]>(
    () =>
      error
        ? [
            {
              type: "message",
              id: "error",
              message: t("loadError", { message: error.message }),
            },
          ]
        : chapterLoading
          ? Array.from({ length: 6 }, (_, index) => ({
              type: "skeleton" as const,
              id: `ayah-skeleton-${index}`,
            }))
          : verses.length === 0
            ? [{ type: "message", id: "empty", message: t("noAyahs") }]
            : verses.map((verse) => ({
                type: "ayah" as const,
                id: `ayah-${verse.id}`,
                verse,
              })),
    [error, chapterLoading, t, verses],
  );

  const handleListen = useCallback(async () => {
    if (isListening) {
      await pause();
      return;
    }

    setListenRequesting(true);
    try {
      const { isConnected } = await NetInfo.fetch();
      if (isConnected === false) {
        Alert.alert(t("audioTitle"), t("audioOffline"));
        return;
      }
      await playQueue(audioUrls);
    } catch {
      Alert.alert(t("audioTitle"), t("audioError"));
    } finally {
      setListenRequesting(false);
    }
  }, [audioUrls, isListening, pause, playQueue, t]);

  const renderItem = useCallback<ListRenderItem<ReaderItem>>(
    ({ item }) => {
      if (item.type === "ayah") {
        return (
          <AyahCard
            verse={item.verse}
            translation={item.verse[translationLanguage]?.text ?? null}
            showTranslation={showTranslation}
            showTransliteration={showTransliteration}
          />
        );
      }
      if (item.type === "skeleton") return <AyahCardSkeleton />;
      return (
        <Text className="text-destructive font-sans-regular">
          {item.message}
        </Text>
      );
    },
    [showTranslation, showTransliteration, translationLanguage],
  );

  const renderHeader = (
    <View className="bg-background -mx-5 px-5 py-3">
      {chapter ? (
        <View className="flex-row items-center justify-between gap-5">
          <View className="w-[30%] items-start gap-3">
            {nextChapter ? (
              <SmoothPressable
                accessibilityRole="button"
                accessibilityLabel={t("nextSurah")}
                className="bg-card h-11 w-full flex-row items-center justify-center gap-2 rounded-xl px-3 shadow-sm"
                onPress={() =>
                  router.replace({
                    pathname: "/quran/[chapterId]",
                    params: {
                      chapterId: String(nextChapter.id),
                      chapterName: nextChapter.nameSimple,
                    },
                  })
                }
              >
                <Fa name="chevron-left" size={11} className="text-primary" />
                <Text
                  numberOfLines={1}
                  className="text-foreground font-sans-semibold text-center text-[11px]"
                >
                  {t("nextSurah")}
                </Text>
              </SmoothPressable>
            ) : null}
            {chapter.chapterNumber >= 114 ? (
              <View className="h-11 w-full" />
            ) : null}
          </View>

          <View className="min-w-0 flex-1 items-center gap-0.5">
            <Text
              numberOfLines={1}
              className="text-primary font-sans-bold writingDirection-rtl text-center text-lg"
            >
              {chapter.nameArabic}
            </Text>
            <Text
              numberOfLines={1}
              className="text-muted-foreground font-sans-semibold text-center text-[11px]"
            >
              {chapter.nameSimple}
            </Text>
            <Text className="text-muted-foreground font-sans-regular text-center text-[10px]">
              {t("surahPosition", {
                current: chapter.chapterNumber,
                total: 114,
              })}
            </Text>
            <Text className="text-muted-foreground font-sans-regular text-center text-[10px]">
              {t("ayahs", { count: chapter.versesCount })}
            </Text>
          </View>

          <View className="w-[30%] items-end gap-3">
            {previousChapter ? (
              <SmoothPressable
                accessibilityRole="button"
                accessibilityLabel={t("previousSurah")}
                className="bg-card h-11 w-full flex-row items-center justify-center gap-2 rounded-xl px-3 shadow-sm"
                onPress={() =>
                  router.replace({
                    pathname: "/quran/[chapterId]",
                    params: {
                      chapterId: String(previousChapter.id),
                      chapterName: previousChapter.nameSimple,
                    },
                  })
                }
              >
                <Text
                  numberOfLines={1}
                  className="text-foreground font-sans-semibold text-center text-[11px]"
                >
                  {t("previousSurah")}
                </Text>
                <Fa name="chevron-right" size={11} className="text-primary" />
              </SmoothPressable>
            ) : null}
            {chapter.chapterNumber <= 1 ? (
              <View className="h-11 w-full" />
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );

  const keyExtractor = useCallback((item: ReaderItem) => item.id, []);

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          title: chapter?.nameSimple ?? params.chapterName ?? "",
          headerRight: ({ tintColor }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(isListening ? "pauseSurah" : "listenSurah")}
              disabled={
                listenRequesting || (!isListening && audioUrls.length === 0)
              }
              onPress={handleListen}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Fa
                name={isListening ? "pause" : "headphones"}
                size={20}
                color={tintColor ?? colors.foreground}
              />
            </Pressable>
          ),
          unstable_headerRightItems: () => [
            {
              type: "button",
              identifier: "surah-audio",
              label: t(isListening ? "pauseSurah" : "listenSurah"),
              icon: {
                type: "sfSymbol",
                name: isListening ? "pause.fill" : "headphones",
              },
              disabled:
                listenRequesting || (!isListening && audioUrls.length === 0),
              onPress: handleListen,
            },
          ],
        }}
      />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        className="bg-background flex-1 px-5"
        contentContainerClassName="pb-5"
        data={items}
        initialNumToRender={10}
        ListHeaderComponent={renderHeader}
        ItemSeparatorComponent={AyahSeparator}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        updateCellsBatchingPeriod={50}
        windowSize={5}
      />
    </View>
  );
};

const QuranReader = () => {
  const router = useRouter();
  return (
    <QuranReadinessGate onExit={() => router.replace("/(tabs)")}>
      <QuranReaderContent />
    </QuranReadinessGate>
  );
};

export default QuranReader;
