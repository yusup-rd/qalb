import TasbihBeads from "@/components/tasbih/artwork/TasbihBeads";
import TasbihCord from "@/components/tasbih/artwork/TasbihCord";
import TasbihImame from "@/components/tasbih/artwork/TasbihImame";
import TasbihTassel from "@/components/tasbih/artwork/TasbihTassel";
import { getTasbihLayout } from "@/components/tasbih/geometry/tasbih-geometry";
import {
  BEAD_COUNT,
  COUNT_DURATION,
  CYCLE_LENGTH,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  HORIZONTAL_PADDING,
  MAX_SCALE,
  RESET_DELAY,
  RESET_DURATION,
  VERTICAL_PADDING,
} from "@/constants/tasbih";
import { useMemo, useRef, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import {
  Easing,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

interface TasbihArtworkProps {
  initialCount: number;
  onTap: (count: number) => Promise<boolean>;
}

const TasbihArtwork = ({ initialCount, onTap }: TasbihArtworkProps) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  /*
   * If the persisted count is 33, the previous round has
   * already completed and the artwork should be ready for
   * the next tap.
   *
   * The screen counter can still display 33/33.
   * Animation-local state starts from 0.
   */
  const animationInitialCount = initialCount >= BEAD_COUNT ? 0 : initialCount;

  const [tapCount, setTapCount] = useState(animationInitialCount);

  /*
   * Prevent multiple presses from starting persistence
   * operations before the previous one has completed.
   */
  const isPressPending = useRef(false);

  /*
   * position is the sole source of truth for bead animation.
   *
   * Example:
   *
   * saved count = 17
   * position = 17
   *
   * saved count = 33
   * position = 0
   */
  const position = useSharedValue(animationInitialCount);

  const layout = useMemo(() => getTasbihLayout(), []);

  const scale = useMemo(() => {
    const availableWidth = screenWidth - HORIZONTAL_PADDING * 2;
    const availableHeight = screenHeight - VERTICAL_PADDING * 2;

    return Math.min(
      availableWidth / DESIGN_WIDTH,
      availableHeight / DESIGN_HEIGHT,
      MAX_SCALE,
    );
  }, [screenWidth, screenHeight]);

  const artworkWidth = DESIGN_WIDTH * scale;
  const artworkHeight = DESIGN_HEIGHT * scale;

  const handlePress = async () => {
    /*
     * This ref is synchronous, so a second physical press
     * cannot enter while the first persistence operation
     * is still pending.
     */
    if (isPressPending.current) {
      return;
    }

    if (tapCount >= BEAD_COUNT) {
      return;
    }

    isPressPending.current = true;

    const nextTap = tapCount + 1;

    try {
      /*
       * Persist the logical state first.
       *
       * Do not advance the animation unless persistence
       * succeeds.
       */
      const persisted = await onTap(nextTap);

      if (!persisted) {
        return;
      }

      /*
       * Update animation-local state only after persistence
       * succeeds.
       */
      setTapCount(nextTap);

      /*
       * Keep animation position continuous across cycles.
       */
      const cycleStart =
        Math.floor(position.value / CYCLE_LENGTH) * CYCLE_LENGTH;

      const nextPosition = cycleStart + nextTap;

      /*
       * Normal tap.
       */
      if (nextTap < BEAD_COUNT) {
        position.value = withTiming(nextPosition, {
          duration: COUNT_DURATION,
          easing: Easing.out(Easing.cubic),
        });

        return;
      }

      /*
       * 33rd tap:
       *
       * 1. Move final bead into place.
       * 2. Pause.
       * 3. Reset the whole string.
       * 4. Reset animation-local count to 0.
       */
      position.value = withSequence(
        withTiming(nextPosition, {
          duration: COUNT_DURATION,
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(
          RESET_DELAY,
          withTiming(
            cycleStart + CYCLE_LENGTH,
            {
              duration: RESET_DURATION,
              easing: Easing.inOut(Easing.cubic),
            },
            (finished) => {
              if (!finished) {
                return;
              }

              scheduleOnRN(setTapCount, 0);
            },
          ),
        ),
      );
    } catch {
      /*
       * Persistence failed unexpectedly.
       *
       * Keep the animation and local count unchanged.
       */
    } finally {
      isPressPending.current = false;
    }
  };

  return (
    <View
      style={{
        width: artworkWidth,
        height: artworkHeight,
      }}
    >
      <Pressable
        onPress={handlePress}
        style={{
          width: artworkWidth,
          height: artworkHeight,
        }}
      >
        <View
          style={{
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT,
            transformOrigin: "top left",
            transform: [{ scale }],
          }}
        >
          <TasbihCord width={DESIGN_WIDTH} height={520} />

          <View
            style={{
              position: "absolute",
              left: 122,
              top: 555,
            }}
          >
            <TasbihTassel />
          </View>

          <TasbihBeads layout={layout} position={position} />

          <View
            style={{
              position: "absolute",
              left: 131,
              top: 470,
            }}
          >
            <TasbihImame />
          </View>
        </View>
      </Pressable>
    </View>
  );
};

export default TasbihArtwork;
