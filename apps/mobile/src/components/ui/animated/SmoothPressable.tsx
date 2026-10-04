import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SmoothPressableProps extends Omit<
  PressableProps,
  "children" | "onPressIn" | "onPressOut"
> {
  children: ReactNode;
  className?: string;
  duration?: number;
  pressedOpacity?: number;
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
  onPressIn?: PressableProps["onPressIn"];
  onPressOut?: PressableProps["onPressOut"];
}

export const SmoothPressable = ({
  children,
  className,
  duration = 120,
  pressedOpacity = 0.75,
  pressedScale = 0.98,
  style,
  onPressIn,
  onPressOut,
  ...props
}: SmoothPressableProps) => {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * (1 - pressedOpacity),
    transform: [{ scale: 1 - pressed.value * (1 - pressedScale) }],
  }));

  const animatePress = (value: number) => {
    pressed.value = withTiming(value, {
      duration,
      reduceMotion: ReduceMotion.System,
    });
  };

  return (
    <AnimatedPressable
      {...props}
      className={className}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        animatePress(1);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animatePress(0);
        onPressOut?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
};
