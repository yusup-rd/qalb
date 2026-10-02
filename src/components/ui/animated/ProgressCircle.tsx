import { useTheme } from "@/providers/ThemeProvider";
import { clsx } from "clsx";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedText = Animated.createAnimatedComponent(Text);

type ProgressCircleProps = {
  count: number;
  target: number;
  active: boolean;
  completed: boolean;
  progressColor?: string;
  trackColor?: string;
  textColor?: string;
  colorOnComplete?: boolean;
};

const ProgressCircle = ({
  count,
  target,
  active,
  completed,
  progressColor = "white",
  trackColor = "rgba(255,255,255,0.3)",
  textColor = "white",
  colorOnComplete = true,
}: ProgressCircleProps) => {
  const { colors } = useTheme();

  const size = 44;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(target > 0 ? Math.min(count / target, 1) : 0);
  const scale = useSharedValue(1);
  const completionColorProgress = useSharedValue(
    completed && colorOnComplete ? 1 : 0,
  );

  useEffect(() => {
    const nextProgress = target > 0 ? Math.min(count / target, 1) : 0;
    progress.value = withTiming(nextProgress, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });

    if (completed && colorOnComplete) {
      completionColorProgress.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withSequence(
        withTiming(1.08, {
          duration: 100,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(1, {
          duration: 140,
          easing: Easing.out(Easing.cubic),
        }),
      );

      return;
    }
    completionColorProgress.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [
    count,
    target,
    completed,
    colorOnComplete,
    progress,
    scale,
    completionColorProgress,
  ]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    stroke: interpolateColor(
      completionColorProgress.value,
      [0, 1],
      [progressColor, colors.success],
    ),
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      completionColorProgress.value,
      [0, 1],
      [textColor, colors.success],
    ),
  }));

  return (
    <Animated.View
      className="size-11 items-center justify-center"
      style={{
        transform: [{ scale }],
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke={trackColor}
            fill="transparent"
          />

          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedCircleProps}
          />
        </G>
      </Svg>

      <View className="absolute inset-0 items-center justify-center">
        <AnimatedText
          style={animatedTextStyle}
          className={clsx(
            "font-sans-semibold text-xs",
            !active && !completed && "opacity-60",
          )}
        >
          {count}
        </AnimatedText>
      </View>
    </Animated.View>
  );
};

export default ProgressCircle;
