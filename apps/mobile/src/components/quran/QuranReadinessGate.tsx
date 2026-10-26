import QuranBootstrapScreen from "@/components/quran/QuranBootstrapScreen";
import type { QuranBootstrapErrorKind } from "@/lib/quran/bootstrap-error";
import {
  initialQuranBootstrapProgress,
  type QuranBootstrapProgress,
} from "@/lib/quran/bootstrap-progress";
import { createContext, useContext, type ReactNode } from "react";

export type QuranReadinessValue = {
  ready: boolean;
  progress: QuranBootstrapProgress;
  error: QuranBootstrapErrorKind | null;
  retry: () => void;
};

const defaultValue: QuranReadinessValue = {
  ready: false,
  progress: initialQuranBootstrapProgress(),
  error: null,
  retry: () => {},
};

export const QuranReadinessContext =
  createContext<QuranReadinessValue>(defaultValue);

export function useQuranReadiness() {
  return useContext(QuranReadinessContext);
}

export default function QuranReadinessGate({
  children,
  onExit,
}: {
  children: ReactNode;
  onExit?: () => void;
}) {
  const { ready, progress, error, retry } = useQuranReadiness();

  if (!ready) {
    return (
      <QuranBootstrapScreen
        progress={progress}
        error={error}
        onRetry={retry}
        onExit={onExit}
      />
    );
  }

  return children;
}
