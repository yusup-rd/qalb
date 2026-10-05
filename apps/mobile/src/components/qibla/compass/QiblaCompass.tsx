import { useTheme } from "@/providers/ThemeProvider";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import CompassDial from "./CompassDial";
import CompassIndicator from "./CompassIndicator";

interface QiblaCompassProps {
  bearing: number;
  rotation: SharedValue<number>;
}

const QiblaCompass = ({ bearing, rotation }: QiblaCompassProps) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const MAX_DIAL_SIZE = 300;
  const SIDE_PADDING = 48;

  const dialSize = Math.max(0, Math.min(width - SIDE_PADDING, MAX_DIAL_SIZE));

  const dialAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          rotate: `${-rotation.value}deg`,
        },
      ],
    }),
    [rotation],
  );

  return (
    <View
      style={{
        width: dialSize,
        height: dialSize,
      }}
      className="relative"
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: dialSize,
            height: dialSize,
          },
          dialAnimatedStyle,
        ]}
      >
        <CompassDial
          size={dialSize}
          color={colors.primary}
          mutedColor={colors.mutedForeground}
          cardColor={colors.card}
          qiblaBearing={bearing}
          qiblaColor={colors.secondary}
        />
      </Animated.View>

      <CompassIndicator
        size={dialSize}
        color={colors.primary}
        cardColor={colors.card}
      />
    </View>
  );
};

export default QiblaCompass;
