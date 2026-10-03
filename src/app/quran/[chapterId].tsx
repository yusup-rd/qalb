import { AyahCard } from "@/components/quran/AyahCard";
import { AyahCardSkeleton } from "@/components/ui/skeletons/AyahCardSkeleton";
import { useQuranChapter } from "@/hooks/useQuran";
import { useQuranAudio } from "@/providers/QuranAudioProvider";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(NativeSafeAreaView);

const QuranReader = () => {
  const { t } = useTranslation(undefined, { keyPrefix: "quran" });
  const router = useRouter();
  const params = useLocalSearchParams<{ chapterId: string }>();
  const chapterId = Number(params.chapterId);
  const { chapter, verses, error, loading } = useQuranChapter(chapterId);
  const { status, queueActive, playQueue, pause } = useQuranAudio();
  const [listenRequesting, setListenRequesting] = useState(false);
  const audioUrls = verses.flatMap((verse) =>
    verse.audio?.url ? [verse.audio.url] : [],
  );
  const isListening = queueActive && Boolean(status?.playing);

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-5"
        showsVerticalScrollIndicator={false}
      >
        {!loading && chapter ? (
          <View className="items-center gap-1">
            <Text className="text-primary font-sans-bold writingDirection-rtl text-2xl">
              {chapter.nameArabic}
            </Text>
            <Text className="text-muted-foreground font-sans-regular">
              {chapter.nameSimple} ·{" "}
              {t("ayahs", { count: chapter.versesCount })}
            </Text>
          </View>
        ) : null}
        {!loading && chapter ? (
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-2">
              {chapter.chapterNumber < 114 ? (
                <Pressable
                  accessibilityLabel={t("nextSurah")}
                  className="bg-card size-9 items-center justify-center rounded-full shadow-sm"
                  onPress={() =>
                    router.replace({
                      pathname: "/quran/[chapterId]",
                      params: { chapterId: String(chapter.id + 1) },
                    })
                  }
                >
                  <Fa name="arrow-left" size={13} className="text-primary" />
                </Pressable>
              ) : null}
              <Pressable
                accessibilityLabel={t("allSurahs")}
                className="bg-card flex-row items-center gap-2 rounded-full px-3 py-2 shadow-sm"
                onPress={() => router.replace("/quran")}
              >
                <Fa name="book-quran" size={13} className="text-primary" />
                <Text className="text-foreground font-sans-semibold text-xs">
                  {t("allSurahs")}
                </Text>
              </Pressable>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityLabel={t("listenSurah")}
                disabled={listenRequesting || audioUrls.length === 0}
                className="bg-primary flex-row items-center gap-2 rounded-full px-3 py-2 shadow-sm"
                onPress={async () => {
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
                  } finally {
                    setListenRequesting(false);
                  }
                }}
              >
                <Fa
                  name={isListening ? "pause" : "headphones"}
                  size={13}
                  className="text-primary-foreground"
                />
                <Text className="text-primary-foreground font-sans-semibold text-xs">
                  {t("listenSurah")}
                </Text>
              </Pressable>
              {chapter.chapterNumber > 1 ? (
                <Pressable
                  accessibilityLabel={t("previousSurah")}
                  className="bg-card size-9 items-center justify-center rounded-full shadow-sm"
                  onPress={() =>
                    router.replace({
                      pathname: "/quran/[chapterId]",
                      params: { chapterId: String(chapter.id - 1) },
                    })
                  }
                >
                  <Fa name="arrow-right" size={13} className="text-primary" />
                </Pressable>
              ) : null}
            </View>
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
