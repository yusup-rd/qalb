import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

interface StarProps {
  x: number;
  y: number;
  scale: number;
  duration: number;
  delay?: number;
}

const AnimatedView = Animated.View;

const Star = ({ x, y, scale, duration, delay = 0 }: StarProps) => {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, duration, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x,
          top: y,
          width: 18,
          height: 18,
          transform: [{ scale }],
        },
        animatedStyle,
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Path
          d="
            M9 0
            L11 6
            L18 9
            L11 11
            L9 18
            L7 11
            L0 9
            L7 6
            Z
          "
          fill="#FFF6C7"
        />
      </Svg>
    </AnimatedView>
  );
};

export default Star;
