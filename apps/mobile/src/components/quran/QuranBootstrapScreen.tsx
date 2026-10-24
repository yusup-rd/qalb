import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { ActivityIndicator, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { QuranBootstrapErrorKind } from "@/lib/quran/bootstrap-error";

export default function QuranBootstrapScreen({
  error,
  onRetry,
}: {
  error: QuranBootstrapErrorKind | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: "quran.bootstrap" });
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
    <View className="bg-background flex-1 items-center justify-center gap-4 px-6">
      <Text className="text-foreground font-sans-bold text-xl">
        {error ? t("errorTitle") : t("loadingTitle")}
      </Text>
      <Text className="text-muted-foreground text-center font-sans text-sm">
        {errorMessage ?? t("loadingMessage")}
      </Text>
      {error ? (
        <SmoothPressable
          onPress={onRetry}
          accessibilityRole="button"
          className="bg-primary items-center rounded-lg px-5 py-3"
        >
          <Text className="text-primary-foreground font-sans-semibold text-sm">
            {t("retry")}
          </Text>
        </SmoothPressable>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
