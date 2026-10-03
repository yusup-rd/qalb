import { useQuranAudio } from "@/providers/QuranAudioProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { AyahAudio } from "@/types/quran";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Pressable } from "react-native";

export const AudioButton = ({ audio }: { audio: AyahAudio | null }) => {
  const { colors } = useTheme();
  const { t } = useTranslation(undefined, { keyPrefix: "quran" });
  const { activeUrl, status, play, pause } = useQuranAudio();
  const [requesting, setRequesting] = useState(false);

  if (!audio?.url) return null;

  const isActive = activeUrl === audio.url;
  const playing = isActive && Boolean(status?.playing && !status.didJustFinish);
  const isLoading =
    requesting ||
    (isActive && !playing && (!status || !status.isLoaded || status.isBuffering));

  return (
    <Pressable
      accessibilityLabel={
        isLoading
          ? t("audioLoading")
          : playing
            ? t("audioPause")
            : t("audioPlay")
      }
      disabled={isLoading}
      className="bg-primary-soft size-9 items-center justify-center rounded-full"
      onPress={async () => {
        if (playing) {
          await pause();
          return;
        }

        setRequesting(true);

        try {
          const { isConnected } = await NetInfo.fetch();
          if (isConnected === false) {
            Alert.alert(t("audioTitle"), t("audioOffline"));
            return;
          }

          await play(audio.url);
        } finally {
          setRequesting(false);
        }
      }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Fa
          name={playing ? "pause" : "play"}
          size={13}
          color={colors.primary}
        />
      )}
    </Pressable>
  );
};
