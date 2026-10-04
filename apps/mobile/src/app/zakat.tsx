import { SmoothPressable } from "@/components/ui/animated/SmoothPressable";
import InfoSection from "@/components/ui/InfoSection";
import ZakatInput from "@/components/zakat/form/ZakatInput";
import ZakatSection from "@/components/zakat/form/ZakatSection";
import NisabCard from "@/components/zakat/nisab/NisabCard";
import ZakatResultCard from "@/components/zakat/result/ZakatResultCard";
import useZakatMarketPrices from "@/hooks/useZakatMarketPrices";
import { calculateZakatSummary } from "@/lib/zakat-calculations";
import { useZakatStore } from "@/store/zakatStore";
import { useTranslation } from "react-i18next";
import { ScrollView, Text } from "react-native";

const Zakat = () => {
  const { t } = useTranslation(undefined, {
    keyPrefix: "zakat",
  });

  const {
    nisabStandard,
    gold,
    silver,
    cashAndBank,
    futurePurposeSavings,
    moneyOwed,
    investments,
    businessStock,
    shortTermDebt,
    immediateBills,
    wagesDue,
    setField,
    reset,
  } = useZakatStore();

  const {
    prices: marketPrices,
    isLoading: isMarketPricesLoading,
    error: marketPricesError,
    isStale: areMarketPricesStale,
  } = useZakatMarketPrices();

  const summary = marketPrices
    ? calculateZakatSummary(
        {
          nisabStandard,
          gold,
          silver,
          cashAndBank,
          futurePurposeSavings,
          moneyOwed,
          investments,
          businessStock,
          shortTermDebt,
          immediateBills,
          wagesDue,
        },
        marketPrices,
      )
    : null;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-5 p-5"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {/* Nisab */}
      <NisabCard
        prices={marketPrices}
        isLoading={isMarketPricesLoading}
        error={marketPricesError}
        isStale={areMarketPricesStale}
        nisabStandard={nisabStandard}
        nisabAmount={summary?.nisabAmount ?? null}
        onNisabStandardChange={(value) => setField("nisabStandard", value)}
      />

      {/* Precious metals */}
      <ZakatSection
        title={t("preciousMetals.title")}
        description={t("preciousMetals.description")}
        icon="gem"
      >
        <ZakatInput
          label={t("preciousMetals.gold")}
          value={gold}
          onChange={(value) => setField("gold", value)}
        />

        <ZakatInput
          label={t("preciousMetals.silver")}
          value={silver}
          onChange={(value) => setField("silver", value)}
        />
      </ZakatSection>

      {/* Assets */}
      <ZakatSection
        title={t("assets.title")}
        description={t("assets.description")}
        icon="wallet"
      >
        <ZakatInput
          label={t("assets.cashAndBank")}
          description={t("assets.cashAndBankDescription")}
          value={cashAndBank}
          onChange={(value) => setField("cashAndBank", value)}
        />

        <ZakatInput
          label={t("assets.futurePurposeSavings")}
          description={t("assets.futurePurposeSavingsDescription")}
          value={futurePurposeSavings}
          onChange={(value) => setField("futurePurposeSavings", value)}
        />

        <ZakatInput
          label={t("assets.moneyOwed")}
          description={t("assets.moneyOwedDescription")}
          value={moneyOwed}
          onChange={(value) => setField("moneyOwed", value)}
        />

        <ZakatInput
          label={t("assets.investments")}
          description={t("assets.investmentsDescription")}
          value={investments}
          onChange={(value) => setField("investments", value)}
        />

        <ZakatInput
          label={t("assets.businessStock")}
          description={t("assets.businessStockDescription")}
          value={businessStock}
          onChange={(value) => setField("businessStock", value)}
        />
      </ZakatSection>

      {/* Liabilities */}
      <ZakatSection
        title={t("liabilities.title")}
        description={t("liabilities.description")}
        icon="file-invoice-dollar"
      >
        <ZakatInput
          label={t("liabilities.shortTermDebt")}
          description={t("liabilities.shortTermDebtDescription")}
          value={shortTermDebt}
          onChange={(value) => setField("shortTermDebt", value)}
        />

        <ZakatInput
          label={t("liabilities.immediateBills")}
          description={t("liabilities.immediateBillsDescription")}
          value={immediateBills}
          onChange={(value) => setField("immediateBills", value)}
        />

        <ZakatInput
          label={t("liabilities.wagesDue")}
          description={t("liabilities.wagesDueDescription")}
          value={wagesDue}
          onChange={(value) => setField("wagesDue", value)}
        />
      </ZakatSection>

      {/* Result */}
      {summary ? <ZakatResultCard summary={summary} /> : null}

      {/* Reset */}
      <SmoothPressable
        onPress={reset}
        className="border-border bg-card items-center rounded-2xl border px-5 py-4"
      >
        <Text className="font-sans-semibold text-foreground text-base">
          {t("reset")}
        </Text>
      </SmoothPressable>

      {/* Info */}
      <InfoSection message={t("info")} />
    </ScrollView>
  );
};

export default Zakat;
