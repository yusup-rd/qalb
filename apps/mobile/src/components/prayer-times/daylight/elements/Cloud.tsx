import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

interface CloudProps {
  x: number;
  y: number;
  scale?: number;
  distance: number;
  duration: number;
  opacity?: number;
  sceneScale?: number;
}

const AnimatedView = Animated.View;

const CLOUD_WIDTH = 76;
const CLOUD_HEIGHT = 38;

const Cloud = ({
  x,
  y,
  scale = 1,
  distance,
  duration,
  opacity = 1,
  sceneScale = 1,
}: CloudProps) => {
  const movement = useSharedValue(0);

  useEffect(() => {
    movement.value = withRepeat(
      withTiming(distance, {
        duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [distance, duration, movement]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: movement.value * sceneScale,
      },
      {
        scale,
      },
    ],
  }));

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x * sceneScale,
          top: y * sceneScale,
          opacity,
        },
        animatedStyle,
      ]}
    >
      <Svg
        width={CLOUD_WIDTH * sceneScale}
        height={CLOUD_HEIGHT * sceneScale}
        viewBox="0 0 76 38"
      >
        <Path
          d="
            M11 30
            C5 30 2 27 3 22
            C4 18 8 15 14 15
            C15 9 20 5 26 5
            C32 5 37 9 39 15
            C41 12 45 10 49 10
            C56 10 61 15 61 21
            C67 21 72 24 73 29
            C73 33 69 35 64 35
            H13
            C11 35 10 33 11 30
            Z
          "
          fill="#FFFFFF"
        />

        <Path
          d="
            M13 30
            C23 32 48 32 64 30
            C67 30 70 29 72 27
            C72 32 68 35 63 35
            H13
            C11 35 10 33 13 30
            Z
          "
          fill="#EAF7FC"
          opacity={0.45}
        />
      </Svg>
    </AnimatedView>
  );
};

export default Cloud;
