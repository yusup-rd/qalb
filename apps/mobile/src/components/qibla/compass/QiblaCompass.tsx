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
  const MARKER_BLEED = 42;

  // The Qibla badge sits outside the circular dial. Include its 39px overflow
  // plus a small rendering margin on both sides so the SVG does not clip it.
  const dialSize = Math.max(
    0,
    Math.min(width - SIDE_PADDING - MARKER_BLEED * 2, MAX_DIAL_SIZE),
  );
  const viewportSize = dialSize + MARKER_BLEED * 2;

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
        width: viewportSize,
        height: viewportSize,
      }}
      className="relative"
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: viewportSize,
            height: viewportSize,
          },
          dialAnimatedStyle,
        ]}
      >
        <CompassDial
          size={viewportSize}
          dialSize={dialSize}
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
        style={{ left: MARKER_BLEED, top: MARKER_BLEED }}
      />
    </View>
  );
};

export default QiblaCompass;
