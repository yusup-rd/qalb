import type { ApiRequestEvent } from "@/api/client";

export const QURAN_PREPARATION_STEPS = [
  "connecting",
  "downloading",
  "validating",
  "saving",
  "finishing",
] as const;

export type QuranBootstrapStage =
  "checking" | (typeof QURAN_PREPARATION_STEPS)[number] | "complete";

export type QuranBootstrapProgress = {
  stage: QuranBootstrapStage;
  status: "running" | "failed" | "complete";
  startedAt: number;
  stageStartedAt: number;
  rows?: { completed: number; total: number };
};

export type QuranBootstrapObserver = (progress: QuranBootstrapProgress) => void;

export function initialQuranBootstrapProgress(): QuranBootstrapProgress {
  const now = Date.now();
  return {
    stage: "checking",
    status: "running",
    startedAt: now,
    stageStartedAt: now,
  };
}

// This is writing progress within a transaction, never overall completion.
export function getQuranWritingPercent(progress: QuranBootstrapProgress) {
  if (
    progress.status !== "running" ||
    progress.stage !== "saving" ||
    !progress.rows
  )
    return null;
  const { completed, total } = progress.rows;
  if (total <= 0 || completed < 0 || completed > total) return null;
  return Math.floor((completed / total) * 100);
}

export function getQuranStepState(
  progress: QuranBootstrapProgress,
  step: (typeof QURAN_PREPARATION_STEPS)[number],
): "completed" | "active" | "pending" | "failed" {
  if (progress.status === "complete") return "completed";
  const current = QURAN_PREPARATION_STEPS.indexOf(
    progress.stage as typeof step,
  );
  const index = QURAN_PREPARATION_STEPS.indexOf(step);
  // Finishing includes commit: failed writes must not be presented as saved.
  if (
    progress.status === "failed" &&
    progress.stage === "finishing" &&
    step === "saving"
  )
    return "failed";
  if (index === current)
    return progress.status === "failed" ? "failed" : "active";
  return index < current ? "completed" : "pending";
}

export function createQuranBootstrapReporter(
  onProgress?: QuranBootstrapObserver,
) {
  let progress = initialQuranBootstrapProgress();
  const log = (event: string, fields: Record<string, unknown> = {}) => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.info("[QuranBootstrap]", {
        event,
        stage: progress.stage,
        elapsedMs: Date.now() - progress.startedAt,
        stageElapsedMs: Date.now() - progress.stageStartedAt,
        ...fields,
      });
    }
  };
  const emit = () => {
    // Observability must never change transaction success or retry behavior.
    try {
      onProgress?.(progress);
    } catch {
      /* Ignore observer errors. */
    }
  };
  log("start");
  emit();
  return {
    stage(stage: QuranBootstrapStage) {
      log("stage_complete");
      progress = {
        ...progress,
        stage,
        stageStartedAt: Date.now(),
        rows: undefined,
      };
      log("stage_started");
      emit();
    },
    rows(completed: number, total: number) {
      progress = { ...progress, rows: { completed, total } };
      emit();
    },
    log,
    request(event: ApiRequestEvent) {
      const { elapsedMs: requestElapsedMs, ...fields } = event;
      log(`request_${event.type}`, { ...fields, requestElapsedMs });
    },
    complete() {
      log("stage_complete");
      progress = {
        ...progress,
        stage: "complete",
        status: "complete",
        rows: undefined,
      };
      log("success");
      emit();
    },
    fail(kind: string) {
      progress = { ...progress, status: "failed", rows: undefined };
      log("failure", { kind });
      emit();
    },
  };
}

export type QuranBootstrapReporter = ReturnType<
  typeof createQuranBootstrapReporter
>;
