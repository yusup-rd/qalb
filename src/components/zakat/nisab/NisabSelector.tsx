import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import { formatAmount } from "@/lib/format";
import type { ZakatNisabStandard } from "@/types/zakat";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

interface NisabSelectorProps {
  value: ZakatNisabStandard;
  onChange: (value: ZakatNisabStandard) => void;
  amount: number;
}

const NisabSelector = ({ value, onChange, amount }: NisabSelectorProps) => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "zakat.nisab",
  });

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <SmoothPressable
          onPress={() => onChange("silver")}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === "silver" }}
          className={
            value === "silver"
              ? "border-primary bg-primary-muted flex-1 rounded-2xl border-2 p-4"
              : "border-border bg-card flex-1 rounded-2xl border p-4"
          }
        >
          <Text className="font-sans-semibold text-foreground text-base">
            {t("silver")}
          </Text>

          <Text className="font-sans-regular text-muted-foreground mt-1 text-sm">
            {t("silverAmount")}
          </Text>
        </SmoothPressable>

        <SmoothPressable
          onPress={() => onChange("gold")}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === "gold" }}
          className={
            value === "gold"
              ? "border-primary bg-primary-muted flex-1 rounded-2xl border-2 p-4"
              : "border-border bg-card flex-1 rounded-2xl border p-4"
          }
        >
          <Text className="font-sans-semibold text-foreground text-base">
            {t("gold")}
          </Text>

          <Text className="font-sans-regular text-muted-foreground mt-1 text-sm">
            {t("goldAmount")}
          </Text>
        </SmoothPressable>
      </View>

      <View className="bg-muted rounded-xl p-4">
        <Text className="font-sans-regular text-muted-foreground text-sm">
          {t("currentNisab")}
        </Text>

        <Text className="font-sans-bold text-foreground mt-1 text-xl">
          {formatAmount(amount)}
        </Text>
      </View>
    </View>
  );
};

export default NisabSelector;
