import { BEAD_COUNT, TASBIH_STORAGE_KEY } from "@/constants/tasbih";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";

interface TasbihStorage {
  currentCount: number;
  totalCount: number;
}

interface UseTasbihReturn {
  currentCount: number;
  totalCount: number;
  isHydrated: boolean;
  persistenceError: string | null;
  recordTap: (count: number) => Promise<boolean>;
  reset: () => Promise<boolean>;
}

export const useTasbih = (): UseTasbihReturn => {
  const [currentCount, setCurrentCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const currentCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const mutationVersion = useRef(0);
  const mutationQueue = useRef(Promise.resolve());

  /*
   * Restore the persisted Tasbih state.
   */
  useEffect(() => {
    let cancelled = false;

    const restoreTasbih = async () => {
      const version = mutationVersion.current;

      try {
        const storedValue = await AsyncStorage.getItem(TASBIH_STORAGE_KEY);

        if (cancelled || version !== mutationVersion.current) {
          return;
        }

        if (!storedValue) {
          return;
        }

        const stored: TasbihStorage = JSON.parse(storedValue);

        if (
          typeof stored.currentCount !== "number" ||
          !Number.isFinite(stored.currentCount) ||
          stored.currentCount < 0 ||
          typeof stored.totalCount !== "number" ||
          !Number.isFinite(stored.totalCount) ||
          stored.totalCount < 0
        ) {
          return;
        }

        const restoredCount = Math.max(
          0,
          Math.min(BEAD_COUNT, stored.currentCount),
        );
        const restoredTotal = Math.max(0, stored.totalCount);

        currentCountRef.current = restoredCount;
        totalCountRef.current = restoredTotal;

        setCurrentCount(restoredCount);
        setTotalCount(restoredTotal);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to restore Tasbih state.";

        setPersistenceError(message);
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    };

    restoreTasbih();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Serialize all persistence mutations.
   */
  const enqueueMutation = useCallback(
    <T>(mutation: () => Promise<T>): Promise<T> => {
      const nextMutation = mutationQueue.current.then(mutation);

      mutationQueue.current = nextMutation.then(
        () => undefined,
        () => undefined,
      );

      return nextMutation;
    },
    [],
  );

  /*
   * Record one user tap.
   */
  const recordTap = useCallback(
    (count: number): Promise<boolean> => {
      return enqueueMutation(async () => {
        const nextTotal = totalCountRef.current + 1;

        const value: TasbihStorage = {
          currentCount: count,
          totalCount: nextTotal,
        };

        try {
          await AsyncStorage.setItem(TASBIH_STORAGE_KEY, JSON.stringify(value));

          currentCountRef.current = count;
          totalCountRef.current = nextTotal;

          setCurrentCount(count);
          setTotalCount(nextTotal);
          setPersistenceError(null);

          if (nextTotal % BEAD_COUNT === 0) {
            try {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch {
              // Haptic feedback does not change the saved tap result.
            }
          }

          return true;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save Tasbih state.";

          setPersistenceError(message);
          return false;
        }
      });
    },
    [enqueueMutation],
  );

  /*
   * Reset the persisted logical state.
   */
  const reset = useCallback((): Promise<boolean> => {
    return enqueueMutation(async () => {
      try {
        await AsyncStorage.removeItem(TASBIH_STORAGE_KEY);

        mutationVersion.current += 1;
        currentCountRef.current = 0;
        totalCountRef.current = 0;

        setCurrentCount(0);
        setTotalCount(0);
        setPersistenceError(null);

        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to reset Tasbih state.";

        setPersistenceError(message);
        return false;
      }
    });
  }, [enqueueMutation]);

  return {
    currentCount,
    totalCount,
    isHydrated,
    persistenceError,
    recordTap,
    reset,
  };
};
