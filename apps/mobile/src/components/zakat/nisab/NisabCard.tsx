import MetalPrices from "@/components/zakat/nisab/MetalPrices";
import NisabSelector from "@/components/zakat/nisab/NisabSelector";
import { formatUpdatedAt } from "@/lib/format";
import type { ZakatMarketPrices, ZakatNisabStandard } from "@/types/zakat";
import { FontAwesome6 as Fa } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

interface NisabCardProps {
  prices: ZakatMarketPrices | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
  nisabStandard: ZakatNisabStandard;
  nisabAmount: number | null;
  onNisabStandardChange: (value: ZakatNisabStandard) => void;
}

const NisabCard = ({
  prices,
  isLoading,
  error,
  isStale,
  nisabStandard,
  nisabAmount,
  onNisabStandardChange,
}: NisabCardProps) => {
  const { t, i18n } = useTranslation(undefined, {
    keyPrefix: "zakat.nisab",
  });

  return (
    <View className="bg-card gap-5 rounded-2xl p-5 shadow-md">
      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="bg-primary-soft size-10 items-center justify-center rounded-lg">
              <Fa name="scale-balanced" size={18} className="text-primary" />
            </View>

            <Text className="font-sans-semibold text-primary text-lg">
              {t("title")}
            </Text>
          </View>

          {isLoading ? <ActivityIndicator /> : null}
        </View>

        <Text className="font-sans-regular text-muted-foreground text-sm leading-5">
          {t("description")}
        </Text>
      </View>

      {prices ? (
        <>
          <MetalPrices prices={prices} />

          <View className="bg-border h-px" />

          <NisabSelector
            value={nisabStandard}
            onChange={onNisabStandardChange}
            amount={nisabAmount ?? 0}
          />

          <Text className="font-sans-regular text-muted-foreground text-xs">
            {isStale
              ? t("usingSavedPrices")
              : formatUpdatedAt(
                  prices.updatedAt,
                  t("lastUpdatedRecently"),
                  (date) => t("updated", { date }),
                  i18n.language,
                )}
          </Text>
        </>
      ) : error ? (
        <Text className="font-sans-regular text-destructive text-sm leading-5">
          {error}
        </Text>
      ) : (
        <Text className="font-sans-regular text-muted-foreground text-sm leading-5">
          {t("loadingPrices")}
        </Text>
      )}
    </View>
  );
};

export default NisabCard;
