import { AudioButton } from "@/components/quran/AudioButton";
import type { QuranVerseWithContent } from "@/types/quran";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

export const AyahCard = ({ verse }: { verse: QuranVerseWithContent }) => {
  const { i18n } = useTranslation();
  const translation = i18n.language.startsWith("ru")
    ? verse.russian
    : verse.english;

  return (
    <View className="bg-card gap-3 rounded-2xl p-4 shadow-md">
      <View className="flex-row items-center justify-between">
        <Text className="text-muted-foreground font-sans-medium">
          {verse.verseKey}
        </Text>
        <AudioButton audio={verse.audio} />
      </View>
      <Text className="text-primary font-sans-semibold writingDirection-rtl text-right text-2xl leading-10">
        {verse.textUthmani}
      </Text>
      {verse.transliteration ? (
        <Text className="text-secondary font-sans-regular italic">
          {verse.transliteration.text}
        </Text>
      ) : null}
      {translation ? (
        <Text className="text-card-foreground font-sans-regular">
          {translation.text}
        </Text>
      ) : null}
    </View>
  );
};
