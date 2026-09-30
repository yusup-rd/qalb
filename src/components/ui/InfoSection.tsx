import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

interface InfoSectionProps {
  message: string;
  collapsible?: boolean;
}

const COLLAPSED_LINES = 2;
const ANIMATION_DURATION = 250;

const InfoSection = ({ message, collapsible = false }: InfoSectionProps) => {
  const expanded = useSharedValue(0);

  const [isExpanded, setIsExpanded] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState(0);
  const [expandedHeight, setExpandedHeight] = useState(0);

  const finishCollapse = () => {
    setIsExpanded(false);
  };

  const toggleExpanded = () => {
    if (!collapsible) {
      return;
    }

    if (!isExpanded) {
      setIsExpanded(true);

      expanded.value = withTiming(1, {
        duration: ANIMATION_DURATION,
      });

      return;
    }

    expanded.value = withTiming(
      0,
      {
        duration: ANIMATION_DURATION,
      },
      (finished) => {
        if (finished) {
          scheduleOnRN(finishCollapse);
        }
      },
    );
  };

  const contentAnimatedStyle = useAnimatedStyle(() => {
    if (collapsedHeight === 0 || expandedHeight === 0) {
      return {};
    }

    return {
      height: interpolate(
        expanded.value,
        [0, 1],
        [collapsedHeight, expandedHeight],
      ),
    };
  });

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(expanded.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  if (!collapsible) {
    return (
      <View className="border-border flex-row items-center gap-2 rounded-lg border p-2">
        <Fa name="circle-info" size={16} className="text-muted-foreground" />

        <Text className="text-muted-foreground flex-1 font-sans text-xs">
          {message}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={toggleExpanded}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      className="border-border overflow-hidden rounded-lg border p-2"
    >
      <View className="flex-row items-center gap-2">
        <Fa name="circle-info" size={16} className="text-muted-foreground" />

        <Animated.View
          className="flex-1 overflow-hidden"
          style={contentAnimatedStyle}
        >
          {/* Collapsed text */}
          <Text
            className="text-muted-foreground font-sans text-xs"
            numberOfLines={COLLAPSED_LINES}
            ellipsizeMode="tail"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              opacity: isExpanded ? 0 : 1,
            }}
          >
            {message}
          </Text>

          {/* Expanded text */}
          <Text
            className="text-muted-foreground font-sans text-xs"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              opacity: isExpanded ? 1 : 0,
            }}
          >
            {message}
          </Text>

          {/* Collapsed height measurement */}
          <Text
            className="text-muted-foreground font-sans text-xs"
            numberOfLines={COLLAPSED_LINES}
            ellipsizeMode="tail"
            pointerEvents="none"
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;

              setCollapsedHeight((current) =>
                current === height ? current : height,
              );
            }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              opacity: 0,
            }}
          >
            {message}
          </Text>

          {/* Expanded height measurement */}
          <Text
            className="text-muted-foreground font-sans text-xs"
            pointerEvents="none"
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;

              setExpandedHeight((current) =>
                current === height ? current : height,
              );
            }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              opacity: 0,
            }}
          >
            {message}
          </Text>
        </Animated.View>

        <Animated.View style={chevronAnimatedStyle}>
          <Fa name="chevron-down" size={12} className="text-muted-foreground" />
        </Animated.View>
      </View>
    </Pressable>
  );
};

export default InfoSection;
