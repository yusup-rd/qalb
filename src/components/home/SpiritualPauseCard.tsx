import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

const SpiritualPauseCard = () => {
  // TODO: Make this dynamic based on the time of day - morning/evening dhikr, etc.
  // const backgroundImage = require("@/assets/images/spiritual-pause-card/morning-adhkar.webp");
  // const backgroundImage = require("@/assets/images/spiritual-pause-card/post-prayer-dhikr.webp");
  // const backgroundImage = require("@/assets/images/spiritual-pause-card/evening-adhkar.webp");
  const backgroundImage = require("@/assets/images/spiritual-pause-card/night-istighfar.webp");

  return (
    <View className="bg-card h-52 overflow-hidden rounded-xl shadow-md">
      <ImageBackground
        source={backgroundImage}
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

        <View className="flex-row items-end justify-between gap-2 p-4">
          <View className="gap-0.5">
            <Text className="font-sans-semibold text-secondary text-xs uppercase">
              Spiritual Pause
            </Text>

            <Text className="font-sans-semibold text-sm text-white">
              Evening Dhikr & Istighfar
            </Text>
          </View>

          <BlurView
            intensity={30}
            tint="default"
            className="flex-row items-center gap-1 overflow-hidden rounded-full px-2.5 py-1"
          >
            <Fa
              name="heart"
              size={14}
              className="text-primary-soft-foreground"
            />
            <Text className="text-primary-soft-foreground font-sans-semibold text-xs">
              33x SubhanAllah
            </Text>
          </BlurView>
        </View>
      </ImageBackground>
    </View>
  );
};

export default SpiritualPauseCard;
