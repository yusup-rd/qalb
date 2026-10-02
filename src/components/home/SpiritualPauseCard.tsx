import AutoScrollText from "@/components/ui/animated/AutoScrollText";
import ProgressCircle from "@/components/ui/animated/ProgressCircle";
import { SPIRITUAL_PAUSE_PHRASE_TARGET } from "@/constants/spiritual-pause";
import { useSpiritualPause } from "@/hooks/useSpiritualPause";
import type { SpiritualPauseType } from "@/types/spiritual-pause";
import { AntDesign as Ant, FontAwesome6 as Fa } from "@expo/vector-icons";
import { clsx } from "clsx";
import { BlurView } from "expo-blur";
import { ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Alert, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

type FaIconName = ComponentProps<typeof Fa>["name"];
type AntIconName = ComponentProps<typeof Ant>["name"];
type SpiritualPauseIcon =
  | {
      family: "fa";
      name: FaIconName;
    }
  | {
      family: "ant";
      name: AntIconName;
    };
type SpiritualPauseConfig = {
  titleKey: "morning" | "postPrayer" | "evening" | "night";
  phraseKeys: (
    "subhanAllah" | "alhamdulillah" | "allahuAkbar" | "astaghfirullah"
  )[];
  icon: SpiritualPauseIcon;
  backgroundImage: ImageSourcePropType;
};

const spiritualPauseConfigs: Record<SpiritualPauseType, SpiritualPauseConfig> =
  {
    morning: {
      titleKey: "morning",
      phraseKeys: ["subhanAllah"],
      icon: {
        family: "fa",
        name: "cloud-sun",
      },
      backgroundImage: require("@/assets/images/spiritual-pause-card/morning.webp"),
    },
    postPrayer: {
      titleKey: "postPrayer",
      phraseKeys: ["subhanAllah", "alhamdulillah", "allahuAkbar"],
      icon: {
        family: "fa",
        name: "hands-praying",
      },
      backgroundImage: require("@/assets/images/spiritual-pause-card/post-prayer.webp"),
    },
    evening: {
      titleKey: "evening",
      phraseKeys: ["subhanAllah"],
      icon: {
        family: "fa",
        name: "cloud-moon",
      },
      backgroundImage: require("@/assets/images/spiritual-pause-card/evening.webp"),
    },
    night: {
      titleKey: "night",
      phraseKeys: ["astaghfirullah"],
      icon: {
        family: "ant",
        name: "moon",
      },
      backgroundImage: require("@/assets/images/spiritual-pause-card/night.webp"),
    },
  };

const SpiritualPauseCard = () => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "home.spiritualPause",
  });
  const { t: tDhikrs } = useTranslation(undefined, {
    keyPrefix: "dhikrs",
  });
  const { session, counts, currentPhraseIndex, increment, reset } =
    useSpiritualPause();

  const handleReset = () => {
    Alert.alert(t("reset.title"), t("reset.description"), [
      {
        text: t("reset.cancel"),
        style: "cancel",
      },
      {
        text: t("reset.confirm"),
        style: "destructive",
        onPress: reset,
      },
    ]);
  };

  if (!session) {
    return null;
  }

  const config = spiritualPauseConfigs[session.type];
  const title = t(config.titleKey);
  const phrases = config.phraseKeys.map((key) => tDhikrs(key));

  return (
    <Animated.View
      key={session.sessionId}
      entering={FadeInDown.duration(260)}
      exiting={FadeOutUp.duration(220)}
      className="h-52"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${phrases
          .map((phrase, index) => {
            const count = counts[index] ?? 0;
            return t("progressLabel", {
              phrase,
              count,
              target: SPIRITUAL_PAUSE_PHRASE_TARGET,
            });
          })
          .join(", ")}`}
        onPress={increment}
        className="bg-card flex-1 overflow-hidden rounded-xl shadow-md"
      >
        <ImageBackground
          source={config.backgroundImage}
          contentFit="cover"
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.9)"]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              inset: 0,
            }}
          />

          <View className="flex-1 justify-between p-4">
            {/* Top controls */}
            <View className="flex-row items-start justify-between gap-3">
              <BlurView
                intensity={30}
                tint="default"
                className="overflow-hidden rounded-full"
              >
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    handleReset();
                  }}
                  className="items-center justify-center p-3"
                  accessibilityRole="button"
                  accessibilityLabel={t("reset.accessibilityLabel")}
                >
                  <Fa
                    name="arrow-rotate-left"
                    size={14}
                    className="text-white"
                  />
                </Pressable>
              </BlurView>

              <BlurView
                intensity={30}
                tint="default"
                className="items-center justify-center overflow-hidden rounded-lg p-2"
              >
                <View className="flex-row items-center justify-center gap-3">
                  {phrases.map((phrase, index) => {
                    const count = counts[index] ?? 0;
                    const isActive = currentPhraseIndex === index;
                    const isCompleted = count >= SPIRITUAL_PAUSE_PHRASE_TARGET;

                    return (
                      <View key={phrase} className="items-center gap-1">
                        <ProgressCircle
                          count={count}
                          target={SPIRITUAL_PAUSE_PHRASE_TARGET}
                          active={isActive}
                          completed={isCompleted}
                        />

                        <Text
                          numberOfLines={1}
                          className={clsx(
                            "font-sans-medium max-w-20 text-center text-[8px]",
                            isCompleted
                              ? "text-success"
                              : isActive
                                ? "text-white"
                                : "text-white/60",
                          )}
                        >
                          {phrase}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </BlurView>
            </View>

            {/* Bottom information */}
            <View className="flex-row items-end justify-between gap-4">
              <View className="shrink-0 gap-0.5">
                <Text className="font-sans-semibold text-secondary text-xs uppercase">
                  {t("label")}
                </Text>

                <Text className="font-sans-semibold text-sm text-white">
                  {title}
                </Text>
              </View>

              <View className="max-w-[65%] min-w-0 items-end">
                <BlurView
                  intensity={30}
                  tint="default"
                  className="max-w-full flex-row items-center gap-1 overflow-hidden rounded-full px-2.5 py-1"
                >
                  {config.icon.family === "fa" ? (
                    <Fa
                      name={config.icon.name}
                      size={14}
                      className="text-primary-soft-foreground shrink-0"
                    />
                  ) : (
                    <Ant
                      name={config.icon.name}
                      size={14}
                      className="text-primary-soft-foreground shrink-0"
                    />
                  )}

                  <View className="shrink">
                    <AutoScrollText className="text-primary-soft-foreground font-sans-semibold text-xs">
                      {phrases
                        .map(
                          (phrase) =>
                            `${SPIRITUAL_PAUSE_PHRASE_TARGET}x ${phrase}`,
                        )
                        .join(" • ")}
                    </AutoScrollText>
                  </View>
                </BlurView>
              </View>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
};

export default SpiritualPauseCard;
