import type { ZakatMarketPrices } from "@/types/zakat";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

interface MetalPricesProps {
  prices: ZakatMarketPrices;
}

const MetalPrices = ({ prices }: MetalPricesProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "zakat.nisab",
  });

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-regular text-muted-foreground text-base">
          {t("gold")}
        </Text>

        <Text className="font-sans-semibold text-foreground text-base">
          ${prices.goldPerGram.toFixed(2)}/g
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="font-sans-regular text-muted-foreground text-base">
          {t("silver")}
        </Text>

        <Text className="font-sans-semibold text-foreground text-base">
          ${prices.silverPerGram.toFixed(2)}/g
        </Text>
      </View>
    </View>
  );
};

export default MetalPrices;
