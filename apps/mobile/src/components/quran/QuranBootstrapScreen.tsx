import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import type { QuranBootstrapErrorKind } from "@/lib/quran/bootstrap-error";
import {
  getQuranStepState,
  getQuranWritingPercent,
  QURAN_PREPARATION_STEPS,
  type QuranBootstrapProgress,
} from "@/lib/quran/bootstrap-progress";
import { useTheme } from "@/providers/ThemeProvider";
import { FontAwesome6 as Fa, Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QuranBootstrapScreen({
  progress,
  error,
  onRetry,
  onExit,
}: {
  progress: QuranBootstrapProgress;
  error: QuranBootstrapErrorKind | null;
  onRetry: () => void;
  onExit?: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: "quran.bootstrap" });
  const { t: tTabs } = useTranslation(undefined, { keyPrefix: "tabs" });
  const { colors } = useTheme();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (error) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [error]);

  const stageSeconds = Math.max(
    0,
    Math.floor((now - progress.stageStartedAt) / 1000),
  );
  const percent = getQuranWritingPercent(progress);
  const stageLabel = t(`stages.${progress.stage}`);
  const errorMessage = error
    ? t(
        error === "storage"
          ? "storageErrorMessage"
          : error === "network"
            ? "networkErrorMessage"
            : "genericErrorMessage",
      )
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
          paddingVertical: 32,
        }}
      >
        <View className="w-full max-w-md gap-6 self-center">
          <View className="items-center gap-4">
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              className="size-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: colors.primarySoft }}
            >
              <Fa name="book-quran" size={26} color={colors.primary} />
            </View>
            <Text
              accessibilityRole="header"
              className="font-sans-bold text-center text-2xl"
              style={{ color: colors.foreground }}
            >
              {error ? t("errorTitle") : t("loadingTitle")}
            </Text>
            <Text
              className="text-center font-sans text-sm leading-6"
              style={{ color: colors.mutedForeground }}
            >
              {t("loadingMessage")}
            </Text>
          </View>

          <View
            className="gap-5 rounded-2xl border p-5"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <View className="gap-3">
              <Text
                accessibilityLiveRegion="polite"
                className="font-sans-semibold text-base"
                style={{
                  color: error ? colors.destructive : colors.foreground,
                }}
              >
                {error ? t("stoppedAt", { stage: stageLabel }) : stageLabel}
              </Text>
              {!error && percent !== null ? (
                <View
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={stageLabel}
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: percent,
                    text: t("writingProgress", { percent }),
                  }}
                  className="gap-2"
                >
                  <View
                    className="h-1.5 overflow-hidden rounded-full"
                    style={{ backgroundColor: colors.muted }}
                  >
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: colors.primary,
                      }}
                    />
                  </View>
                  <Text
                    className="font-sans-medium text-xs"
                    style={{ color: colors.mutedForeground }}
                  >
                    {t("writingProgress", { percent })}
                  </Text>
                </View>
              ) : !error ? (
                <View
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={stageLabel}
                  accessibilityValue={{ text: t("inProgress") }}
                  className="flex-row items-center gap-2"
                >
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    accessible={false}
                  />
                  <Text
                    className="font-sans text-xs"
                    style={{ color: colors.mutedForeground }}
                  >
                    {t("inProgress")}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="h-px" style={{ backgroundColor: colors.border }} />
            <View className="gap-4">
              {QURAN_PREPARATION_STEPS.map((step, index) => {
                const state = getQuranStepState(progress, step);
                const emphasized = state === "active" || state === "completed";
                const color =
                  state === "failed"
                    ? colors.destructive
                    : emphasized
                      ? colors.primary
                      : colors.mutedForeground;
                return (
                  <View
                    key={step}
                    accessible
                    accessibilityLabel={`${t(`stages.${step}`)}. ${t(`states.${state}`)}`}
                    className="flex-row items-center gap-3"
                  >
                    <View
                      className="size-6 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: emphasized
                          ? colors.primarySoft
                          : colors.muted,
                      }}
                    >
                      {state === "completed" || state === "failed" ? (
                        <Feather
                          name={
                            state === "completed" ? "check" : "alert-circle"
                          }
                          size={14}
                          color={color}
                        />
                      ) : state === "active" ? (
                        <View
                          className="size-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ) : (
                        <Text
                          className="font-sans-medium text-xs"
                          style={{ color }}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      className="font-sans-medium flex-1 text-sm"
                      style={{ color: emphasized ? colors.foreground : color }}
                    >
                      {t(`stages.${step}`)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {error ? (
            <View className="gap-4">
              <Text
                accessibilityRole="alert"
                className="font-sans text-sm leading-6"
                style={{ color: colors.mutedForeground }}
              >
                {errorMessage}
              </Text>
              <SmoothPressable
                onPress={onRetry}
                accessibilityRole="button"
                className="min-h-12 items-center justify-center rounded-xl px-5 py-3"
                style={{ backgroundColor: colors.primary }}
              >
                <Text
                  className="font-sans-semibold text-sm"
                  style={{ color: colors.primaryForeground }}
                >
                  {t("retry")}
                </Text>
              </SmoothPressable>
              {onExit && (
                <SmoothPressable
                  onPress={onExit}
                  accessibilityRole="button"
                  className="min-h-12 items-center justify-center rounded-xl px-5 py-3"
                  style={{ borderWidth: 1, borderColor: colors.border }}
                >
                  <Text
                    className="font-sans-semibold text-sm"
                    style={{ color: colors.foreground }}
                  >
                    {tTabs("home")}
                  </Text>
                </SmoothPressable>
              )}
            </View>
          ) : (
            <View className="gap-2">
              <Text
                className="font-sans text-sm leading-6"
                style={{ color: colors.mutedForeground }}
              >
                {stageSeconds >= 20 ? t("takingLonger") : t("offlineHint")}
              </Text>
              {stageSeconds >= 20 && (
                <Text
                  className="font-sans text-xs"
                  style={{ color: colors.mutedForeground }}
                >
                  {t("stageElapsed", { seconds: stageSeconds })}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
