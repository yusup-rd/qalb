import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { formatAmount } from "@/lib/format";
import type { ZakatSummary } from "@/types/zakat";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share, Text, View } from "react-native";
import ZakatSummaryRow from "./ZakatSummaryRow";

interface ZakatResultCardProps {
  summary: ZakatSummary;
}

const ZakatResultCard = ({ summary }: ZakatResultCardProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "zakat.result",
  });

  const [isCopied, setIsCopied] = useState(false);

  const zakatAmount = formatAmount(summary.zakatAmount);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(zakatAmount);

    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 1500);
  };

  const handleShare = async () => {
    await Share.share({
      message: t("shareMessage", {
        amount: zakatAmount,
      }),
    });
  };

  return (
    <View className="bg-card gap-5 rounded-2xl p-5 shadow-md">
      <View className="gap-1">
        <View className="flex-row items-center gap-3">
          <View className="bg-primary-soft size-10 items-center justify-center rounded-lg">
            <Fa name="hand-holding-dollar" size={18} className="text-primary" />
          </View>

          <Text className="font-sans-semibold text-primary text-lg">
            {t("title")}
          </Text>
        </View>

        <Text className="font-sans-regular text-muted-foreground text-sm leading-5">
          {t("description")}
        </Text>
      </View>

      <View className="gap-4">
        <ZakatSummaryRow
          label={t("totalAssets")}
          value={formatAmount(summary.totalAssets)}
        />

        <ZakatSummaryRow
          label={t("deductibleLiabilities")}
          value={`-${formatAmount(summary.totalLiabilities)}`}
          color="destructive"
        />

        <View className="bg-border h-px" />

        <ZakatSummaryRow
          label={t("netWealth")}
          value={formatAmount(summary.netWealth)}
          emphasized
        />

        <ZakatSummaryRow
          label={summary.meetsNisab ? t("nisabMet") : t("nisabNotMet")}
          value={formatAmount(summary.nisabAmount)}
        />
      </View>

      <View className="bg-muted rounded-2xl p-5">
        <Text className="font-sans-medium text-muted-foreground text-center text-sm">
          {t("zakatAmount")}
        </Text>

        <Text className="font-sans-bold text-primary mt-1 text-center text-3xl">
          {zakatAmount}
        </Text>

        <Text className="font-sans-regular text-muted-foreground mt-2 text-center text-xs leading-5">
          {summary.meetsNisab ? t("meetsNisab") : t("belowNisab")}
        </Text>

        <View className="mt-4 flex-row gap-3">
          <SmoothPressable
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel={t("copyAccessibilityLabel")}
            accessibilityHint={t("copyAccessibilityHint")}
            className="border-border bg-background flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3"
          >
            <Fa
              name={isCopied ? "check" : "copy"}
              size={14}
              className={isCopied ? "text-success" : "text-foreground"}
            />

            <Text className="font-sans-semibold text-foreground text-sm">
              {isCopied ? t("copied") : t("copyZakat")}
            </Text>
          </SmoothPressable>

          <SmoothPressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel={t("shareAccessibilityLabel")}
            accessibilityHint={t("shareAccessibilityHint")}
            className="bg-primary flex-1 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"
          >
            <Fa
              name="share-nodes"
              size={14}
              className="text-primary-foreground"
            />

            <Text className="font-sans-semibold text-primary-foreground text-sm">
              {t("shareZakat")}
            </Text>
          </SmoothPressable>
        </View>
      </View>
    </View>
  );
};

export default ZakatResultCard;
