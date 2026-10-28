import { AyahCard } from "@/components/quran/AyahCard";
import QuranReadinessGate from "@/components/quran/QuranReadinessGate";
import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { AyahCardSkeleton } from "@/components/ui/skeletons/AyahCardSkeleton";
import { useQuranChapter } from "@/hooks/useQuran";
import { saveLastOpenedSurah } from "@/lib/quran-reading";
import { useQuranAudio } from "@/providers/QuranAudioProvider";
import { useQuranPreferencesStore } from "@/store/quranPreferencesStore";
import type { QuranVerseWithContent } from "@/types/quran";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ListRenderItem } from "react-native";
import { Alert, FlatList, Text, View } from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(NativeSafeAreaView);

type ReaderItem =
  | { type: "ayah"; id: string; verse: QuranVerseWithContent }
  | { type: "skeleton"; id: string }
  | { type: "message"; id: string; message: string };

const QuranReaderContent = () => {
  const { t } = useTranslation(undefined, { keyPrefix: "quran" });
  const { i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ chapterId: string }>();
  const chapterId = Number(params.chapterId);
  const { chapter, verses, error, loading } = useQuranChapter(chapterId);
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
      verses.flatMap((verse) => (verse.audio?.url ? [verse.audio.url] : [])),
    [verses],
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
        : loading
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
    [error, loading, t, verses],
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
    <View className="bg-background -mx-5 px-5 pb-3">
      {!loading && chapter ? (
        <View className="flex-row items-center justify-between gap-5">
          <View className="w-[30%] items-start gap-3">
            <SmoothPressable
              accessibilityRole="button"
              accessibilityLabel={t("goBack")}
              className="bg-card h-11 w-full flex-row items-center justify-center gap-2 rounded-xl px-3 shadow-sm"
              onPress={() => router.replace("/(tabs)/quran")}
            >
              <Fa name="book-quran" size={11} className="text-primary" />
              <Text
                numberOfLines={1}
                className="text-foreground font-sans-semibold text-[11px]"
              >
                {t("goBack")}
              </Text>
            </SmoothPressable>

            {chapter.chapterNumber < 114 ? (
              <SmoothPressable
                accessibilityRole="button"
                accessibilityLabel={t("nextSurah")}
                className="bg-card h-11 max-w-full flex-row items-center justify-center gap-2 rounded-xl px-3 shadow-sm"
                onPress={() =>
                  router.replace({
                    pathname: "/quran/[chapterId]",
                    params: { chapterId: String(chapter.id + 1) },
                  })
                }
              >
                <Fa name="chevron-left" size={11} className="text-primary" />
                <Text
                  numberOfLines={1}
                  className="text-center text-foreground font-sans-semibold text-[11px]"
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
              className="text-center text-primary font-sans-bold writingDirection-rtl text-lg"
            >
              {chapter.nameArabic}
            </Text>
            <Text
              numberOfLines={1}
              className="text-center text-muted-foreground font-sans-semibold text-[11px]"
            >
              {chapter.nameSimple}
            </Text>
            <Text className="text-center text-muted-foreground font-sans-regular text-[10px]">
              {t("surahPosition", {
                current: chapter.chapterNumber,
                total: 114,
              })}
            </Text>
            <Text className="text-center text-muted-foreground font-sans-regular text-[10px]">
              {t("ayahs", { count: chapter.versesCount })}
            </Text>
          </View>

          <View className="w-[30%] items-end gap-3">
            <SmoothPressable
              accessibilityRole="button"
              accessibilityLabel={t("listenSurah")}
              disabled={listenRequesting || audioUrls.length === 0}
              className="bg-primary h-11 w-full flex-row items-center justify-center gap-2 rounded-xl px-3 shadow-sm"
              onPress={handleListen}
            >
              <Fa
                name={isListening ? "pause" : "headphones"}
                size={11}
                className="text-primary-foreground"
              />
              <Text
                numberOfLines={1}
                className="text-center text-primary-foreground font-sans-semibold text-[11px]"
              >
                {t("listenSurah")}
              </Text>
            </SmoothPressable>

            {chapter.chapterNumber > 1 ? (
              <SmoothPressable
                accessibilityRole="button"
                accessibilityLabel={t("previousSurah")}
                className="bg-card h-11 max-w-full flex-row items-center justify-center gap-2 rounded-xl px-3 shadow-sm"
                onPress={() =>
                  router.replace({
                    pathname: "/quran/[chapterId]",
                    params: { chapterId: String(chapter.id - 1) },
                  })
                }
              >
                <Text
                  numberOfLines={1}
                  className="text-center text-foreground font-sans-semibold text-[11px]"
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
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <FlatList
        className="bg-background flex-1 px-5"
        contentContainerClassName="gap-4 pb-5"
        data={items}
        initialNumToRender={10}
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

const QuranReader = () => {
  const router = useRouter();
  return (
    <QuranReadinessGate onExit={() => router.replace("/(tabs)")}>
      <QuranReaderContent />
    </QuranReadinessGate>
  );
};

export default QuranReader;
