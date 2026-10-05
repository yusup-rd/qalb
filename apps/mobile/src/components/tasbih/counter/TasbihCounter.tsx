import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface AnimatedLastDigitProps {
  value: number;
  className: string;
}

const AnimatedLastDigit = ({ value, className }: AnimatedLastDigitProps) => {
  const previousValue = useRef(value);
  const progress = useSharedValue(1);

  useEffect(() => {
    if (previousValue.current === value) {
      return;
    }

    previousValue.current = value;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [-8, 0]),
        },
      ],
    };
  });

  const stringValue = String(value);
  const prefix = stringValue.slice(0, -1);
  const lastDigit = stringValue.slice(-1);

  return (
    <View className="flex-row">
      {prefix.length > 0 && <Text className={className}>{prefix}</Text>}

      <Animated.Text className={className} style={animatedStyle}>
        {lastDigit}
      </Animated.Text>
    </View>
  );
};

interface TasbihCounterProps {
  currentCount: number;
  rounds: number;
  totalCount: number;
}

const TasbihCounter = ({
  currentCount,
  rounds,
  totalCount,
}: TasbihCounterProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "tasbih.counter",
  });

  return (
    <>
      <View className="flex-row items-baseline">
        <AnimatedLastDigit
          value={currentCount}
          className="text-foreground font-sans-bold text-3xl tabular-nums"
        />

        <Text className="text-foreground font-sans-medium text-lg tabular-nums">
          {" / 33"}
        </Text>
      </View>

      <View className="gap-1">
        <View className="flex-row items-center gap-3">
          <Text className="text-muted-foreground font-sans-medium text-xs">
            {t("rounds")}
          </Text>

          <AnimatedLastDigit
            value={rounds}
            className="text-foreground font-sans-semibold text-sm tabular-nums"
          />
        </View>

        <View className="flex-row items-center gap-3">
          <Text className="text-muted-foreground font-sans-medium text-xs">
            {t("total")}
          </Text>

          <AnimatedLastDigit
            value={totalCount}
            className="text-foreground font-sans-semibold text-sm tabular-nums"
          />
        </View>
      </View>
    </>
  );
};

export default TasbihCounter;
