import useDeviceHeading from "@/hooks/useDeviceHeading";
import useQiblaBearing from "@/hooks/useQiblaBearing";
import {
  getAngularDifference,
  shortestRotationPath,
} from "@/lib/qibla-calculations";
import * as Haptics from "expo-haptics";
import { useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";

const SPRING_STIFFNESS = 320;
const SPRING_DAMPING = 36;
const QIBLA_ALIGNMENT_THRESHOLD = 5;

interface UseQiblaCompassOptions {
  hapticsEnabled?: boolean;
}

const useQiblaCompass = ({
  hapticsEnabled = true,
}: UseQiblaCompassOptions = {}) => {
  const isFocused = useIsFocused();

  const targetRotation = useSharedValue(0);
  const rotation = useSharedValue(0);
  const velocity = useSharedValue(0);
  const initialized = useSharedValue(false);

  const targetRotationRef = useRef<number | null>(null);

  const [showCalibration, setShowCalibration] = useState(false);

  const handleHeading = useCallback(
    (heading: number) => {
      if (!initialized.value) {
        // Reanimated SharedValues are intentionally mutable.
        // eslint-disable-next-line react-hooks/immutability
        initialized.value = true;

        targetRotationRef.current = heading;

        // Reanimated SharedValues are intentionally mutable.
        // eslint-disable-next-line react-hooks/immutability
        targetRotation.value = heading;

        // Reanimated SharedValues are intentionally mutable.
        // eslint-disable-next-line react-hooks/immutability
        rotation.value = heading;

        // Reanimated SharedValues are intentionally mutable.
        // eslint-disable-next-line react-hooks/immutability
        velocity.value = 0;

        return;
      }

      const previousTarget = targetRotationRef.current;

      if (previousTarget === null) {
        targetRotationRef.current = heading;

        // Reanimated SharedValues are intentionally mutable.
        targetRotation.value = heading;

        return;
      }

      const nextTarget = shortestRotationPath(previousTarget, heading);

      targetRotationRef.current = nextTarget;

      // Reanimated SharedValues are intentionally mutable.
      targetRotation.value = nextTarget;
    },
    [initialized, rotation, targetRotation, velocity],
  );

  const { heading, accuracy, hasSensor, permissionStatus } = useDeviceHeading({
    onHeading: handleHeading,
  });

  const qibla = useQiblaBearing();

  const qiblaDifference =
    heading === null || qibla === null
      ? null
      : getAngularDifference(heading, qibla.bearing);

  const isFacingQibla =
    qiblaDifference !== null && qiblaDifference <= QIBLA_ALIGNMENT_THRESHOLD;

  const wasFacingQibla = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      wasFacingQibla.current = false;
      return;
    }

    if (isFacingQibla && !wasFacingQibla.current) {
      if (hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    wasFacingQibla.current = isFacingQibla;
  }, [hapticsEnabled, isFacingQibla, isFocused]);

  useEffect(() => {
    const shouldShow = accuracy !== null && accuracy <= 1;

    const timeout = setTimeout(
      () => {
        setShowCalibration(shouldShow);
      },
      accuracy === null ? 0 : 500,
    );

    return () => clearTimeout(timeout);
  }, [accuracy]);

  const frameCallback = useCallback(
    (frame: { timeSincePreviousFrame: number | null }) => {
      "worklet";

      if (!initialized.value) {
        return;
      }

      const frameTime = frame.timeSincePreviousFrame;

      if (frameTime === null) {
        return;
      }

      const dt = Math.min(frameTime / 1000, 0.032);

      const displacement = targetRotation.value - rotation.value;

      const acceleration =
        displacement * SPRING_STIFFNESS - velocity.value * SPRING_DAMPING;

      // Reanimated SharedValues are intentionally mutable inside the worklet.
      // eslint-disable-next-line react-hooks/immutability
      velocity.value += acceleration * dt;

      // Reanimated SharedValues are intentionally mutable inside the worklet.
      // eslint-disable-next-line react-hooks/immutability
      rotation.value += velocity.value * dt;
    },
    [initialized, rotation, targetRotation, velocity],
  );

  useFrameCallback(frameCallback);

  return {
    heading,
    qibla,
    hasSensor,
    permissionStatus,
    showCalibration,
    isFacingQibla,
    rotation,
  };
};

export default useQiblaCompass;
