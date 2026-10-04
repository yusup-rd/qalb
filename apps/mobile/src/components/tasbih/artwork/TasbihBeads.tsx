import TasbihBead from "@/components/tasbih/artwork/TasbihBead";
import {
  TasbihLayout,
  TasbihPoint,
} from "@/components/tasbih/geometry/tasbih-geometry";
import { BEAD_COUNT, BEAD_SIZE, CYCLE_LENGTH } from "@/constants/tasbih";
import { memo } from "react";
import { View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

interface TasbihBeadsProps {
  layout: TasbihLayout;
  position: SharedValue<number>;
}

const TasbihBeads = ({ layout, position }: TasbihBeadsProps) => {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 320,
        height: 520,
      }}
    >
      {layout.beads.map((originalPoint, index) => {
        const beadNumber = index + 1;

        const target =
          beadNumber === 1 ? layout.gap : layout.beads[beadNumber - 2];

        return (
          <AnimatedBead
            key={beadNumber}
            beadNumber={beadNumber}
            originalPoint={originalPoint}
            target={target}
            position={position}
          />
        );
      })}
    </View>
  );
};

interface AnimatedBeadProps {
  beadNumber: number;
  originalPoint: TasbihPoint;
  target: TasbihPoint;
  position: SharedValue<number>;
}

const AnimatedBead = memo(
  ({ beadNumber, originalPoint, target, position }: AnimatedBeadProps) => {
    const animatedStyle = useAnimatedStyle(() => {
      // Keep the animation position continuous across cycles.
      const cycleStart =
        Math.floor(position.value / CYCLE_LENGTH) * CYCLE_LENGTH;

      const localPosition = position.value - cycleStart;

      if (localPosition < BEAD_COUNT) {
        const localProgress = localPosition - (beadNumber - 1);

        let x = originalPoint.x;
        let y = originalPoint.y;

        if (localProgress <= 0) {
          x = originalPoint.x;
          y = originalPoint.y;
        } else if (localProgress >= 1) {
          x = target.x;
          y = target.y;
        } else {
          x = originalPoint.x + (target.x - originalPoint.x) * localProgress;

          y = originalPoint.y + (target.y - originalPoint.y) * localProgress;
        }

        return {
          position: "absolute",
          left: 0,
          top: 0,
          width: BEAD_SIZE,
          height: BEAD_SIZE,
          transform: [
            {
              translateX: x - BEAD_SIZE / 2,
            },
            {
              translateY: y - BEAD_SIZE / 2,
            },
          ],
        };
      }

      if (localPosition === BEAD_COUNT) {
        return {
          position: "absolute",
          left: 0,
          top: 0,
          width: BEAD_SIZE,
          height: BEAD_SIZE,
          transform: [
            {
              translateX: target.x - BEAD_SIZE / 2,
            },
            {
              translateY: target.y - BEAD_SIZE / 2,
            },
          ],
        };
      }

      // During reset, all beads move from their targets back to their originals.
      const resetProgress = localPosition - BEAD_COUNT;

      const x = target.x + (originalPoint.x - target.x) * resetProgress;

      const y = target.y + (originalPoint.y - target.y) * resetProgress;

      return {
        position: "absolute",
        left: 0,
        top: 0,
        width: BEAD_SIZE,
        height: BEAD_SIZE,
        transform: [
          {
            translateX: x - BEAD_SIZE / 2,
          },
          {
            translateY: y - BEAD_SIZE / 2,
          },
        ],
      };
    });

    return (
      <Animated.View
        pointerEvents="none"
        style={animatedStyle}
        renderToHardwareTextureAndroid={false}
        shouldRasterizeIOS={false}
      >
        <TasbihBead size={BEAD_SIZE} />
      </Animated.View>
    );
  },
);

AnimatedBead.displayName = "AnimatedBead";

export default TasbihBeads;
