import { useEffect, useState } from "react";
import { Text, type TextLayoutEvent, type TextProps, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface AutoScrollTextProps extends TextProps {
  children: string;
  scrollSpeed?: number;
  initialDelay?: number;
  endPause?: number;
}

const AutoScrollText = ({
  children,
  scrollSpeed = 50,
  initialDelay = 1200,
  endPause = 1000,
  onTextLayout,
  ...textProps
}: AutoScrollTextProps) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);

  const translateX = useSharedValue(0);

  const overflow = Math.max(textWidth - containerWidth, 0);

  useEffect(() => {
    cancelAnimation(translateX);
    translateX.value = 0;

    if (overflow <= 1) {
      return;
    }

    const duration = Math.max(1500, overflow * scrollSpeed);

    translateX.value = withDelay(
      initialDelay,
      withRepeat(
        withSequence(
          withTiming(-overflow, {
            duration,
            easing: Easing.linear,
          }),
          withDelay(
            endPause,
            withTiming(-overflow, {
              duration: 0,
            }),
          ),
          withTiming(0, {
            duration,
            easing: Easing.linear,
          }),
          withDelay(
            endPause,
            withTiming(0, {
              duration: 0,
            }),
          ),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(translateX);
    };
  }, [overflow, scrollSpeed, initialDelay, endPause, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleTextLayout = (event: TextLayoutEvent) => {
    const line = event.nativeEvent.lines[0];

    if (line) {
      setTextWidth(line.width);
    }

    onTextLayout?.(event);
  };

  return (
    <View
      className="min-w-0 overflow-hidden"
      onLayout={(event) => {
        setContainerWidth(event.nativeEvent.layout.width);
      }}
    >
      <Text
        {...textProps}
        numberOfLines={1}
        onTextLayout={handleTextLayout}
        pointerEvents="none"
        style={[
          textProps.style,
          {
            position: "absolute",
            left: 0,
            top: 0,
            width: 10000,
            opacity: 0,
          },
        ]}
      >
        {children}
      </Text>

      <Animated.Text
        {...textProps}
        numberOfLines={1}
        ellipsizeMode="clip"
        style={[
          textProps.style,
          {
            width: textWidth || undefined,
          },
          animatedStyle,
        ]}
      >
        {children}
      </Animated.Text>
    </View>
  );
};

export default AutoScrollText;
