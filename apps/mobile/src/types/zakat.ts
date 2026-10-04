export type ZakatNisabStandard = "gold" | "silver";

export interface ZakatFormData {
  nisabStandard: ZakatNisabStandard;

  // Wealth
  gold: number;
  silver: number;

  // Assets
  cashAndBank: number;
  futurePurposeSavings: number;
  moneyOwed: number;
  investments: number;
  businessStock: number;

  // Deductible liabilities
  shortTermDebt: number;
  immediateBills: number;
  wagesDue: number;
}

export interface ZakatMarketPrices {
  goldPerGram: number;
  silverPerGram: number;
  updatedAt: string;
}

export interface ZakatSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWealth: number;
  nisabAmount: number;
  meetsNisab: boolean;
  zakatAmount: number;
}

export interface ZakatStore extends ZakatFormData {
  setField: <K extends keyof ZakatFormData>(
    field: K,
    value: ZakatFormData[K],
  ) => void;

  reset: () => void;
}
