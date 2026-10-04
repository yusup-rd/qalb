import { useEffect } from "react";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

const AnimatedView = Animated.View;

const MOON_WIDTH = 78;
const MOON_HEIGHT = 78;

const MOVEMENT_DISTANCE = 10;
const MOVEMENT_DURATION = 7000;

const Moon = () => {
  const movement = useSharedValue(0);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    // Calm left → right → left movement.
    movement.value = withRepeat(
      withTiming(MOVEMENT_DISTANCE, {
        duration: MOVEMENT_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );

    // Slow independent glow pulse.
    glow.value = withRepeat(
      withTiming(0.7, {
        duration: 3000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [glow, movement]);

  const moonStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: movement.value,
      },
      {
        rotate: `${interpolate(
          movement.value,
          [0, MOVEMENT_DISTANCE],
          [-3, 3],
        )}deg`,
      },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0.35, 0.7], [0.05, 0.12]),
    transform: [
      {
        translateX: movement.value * 0.35,
      },
      {
        scale: interpolate(glow.value, [0.35, 0.7], [0.96, 1.12]),
      },
    ],
  }));

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          right: 26,
          top: 22,
          width: MOON_WIDTH,
          height: MOON_HEIGHT,
        },
        moonStyle,
      ]}
    >
      {/* Soft atmospheric glow */}
      <AnimatedView
        style={[
          {
            position: "absolute",
            left: -1,
            top: 3,
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "#DCE8FF",
          },
          glowStyle,
        ]}
      />

      {/* Moon */}
      <Svg width={MOON_WIDTH} height={MOON_HEIGHT} viewBox="0 0 78 78">
        <Defs>
          <LinearGradient id="moonGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFDEB" />
            <Stop offset="1" stopColor="#D9E4F5" />
          </LinearGradient>
        </Defs>

        <Path
          d="
            M49 8
            C38 12 30 23 30 36
            C30 51 40 63 54 67
            C49 70 43 72 37 72
            C20 72 7 59 6 42
            C5 24 18 9 35 6
            C40 5 45 6 49 8
            Z
          "
          fill="url(#moonGradient)"
        />

        <Circle cx="27" cy="28" r="3" fill="#FFFFFF" opacity={0.5} />
      </Svg>
    </AnimatedView>
  );
};

export default Moon;
