import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import {
  getSpiritualPauseType,
  type SpiritualPauseType,
} from "@/lib/spiritual-pause";
import { AntDesign as Ant, FontAwesome6 as Fa } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ComponentProps } from "react";
import type { ImageSourcePropType } from "react-native";
import { Text, View } from "react-native";
import AutoScrollText from "../ui/animated/AutoScrollText";

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
  title: string;
  phrases: string[];
  target: number;
  icon: SpiritualPauseIcon;
  backgroundImage: ImageSourcePropType;
};

const spiritualPauseConfigs: Record<SpiritualPauseType, SpiritualPauseConfig> =
  {
    morning: {
      title: "Morning Adhkar",
      phrases: ["SubhanAllah"],
      target: 33,
      icon: {
        family: "fa",
        name: "cloud-sun",
      },
      backgroundImage: require("@/assets/images/spiritual-pause-card/morning-adhkar.webp"),
    },
    postPrayer: {
      title: "Post-Prayer Dhikr",
      phrases: ["SubhanAllah", "Alhamdulillah", "Allahu Akbar"],
      target: 33,
      icon: {
        family: "fa",
        name: "hands-praying",
      },
      backgroundImage: require("@/assets/images/spiritual-pause-card/post-prayer-dhikr.webp"),
    },
    evening: {
      title: "Evening Adhkar",
      phrases: ["SubhanAllah"],
      target: 33,
      icon: {
        family: "fa",
        name: "cloud-moon",
      },
      backgroundImage: require("@/assets/images/spiritual-pause-card/evening-adhkar.webp"),
    },
    night: {
      title: "Night Istighfar",
      phrases: ["Astaghfirullah"],
      target: 33,
      icon: {
        family: "ant",
        name: "moon",
      },
      backgroundImage: require("@/assets/images/spiritual-pause-card/night-istighfar.webp"),
    },
  };

const SpiritualPauseCard = () => {
  const { prayers, sunrise, now } = usePrayerTimes();

  const type = getSpiritualPauseType({
    prayers,
    sunrise,
    now,
  });

  const config = spiritualPauseConfigs[type];

  return (
    <View className="bg-card h-52 overflow-hidden rounded-xl shadow-md">
      <ImageBackground
        source={config.backgroundImage}
        contentFit="cover"
        style={{ flex: 1, justifyContent: "flex-end" }}
        imageStyle={{ width: "100%", height: "100%" }}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.9)"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />

        <View className="flex-row items-end gap-4 p-4">
          <View className="shrink-0 gap-0.5">
            <Text className="font-sans-semibold text-secondary text-xs uppercase">
              Spiritual Pause
            </Text>

            <Text className="font-sans-semibold text-sm text-white">
              {config.title}
            </Text>
          </View>

          <View className="min-w-0 flex-1 items-end">
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
                  {config.phrases
                    .map((phrase) => `${config.target}x ${phrase}`)
                    .join(" • ")}
                </AutoScrollText>
              </View>
            </BlurView>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default SpiritualPauseCard;
