import { create } from "zustand";

import type { ZakatFormData, ZakatStore } from "@/types/zakat";

const INITIAL_ZAKAT_DATA: ZakatFormData = {
  nisabStandard: "silver",

  gold: 0,
  silver: 0,

  cashAndBank: 0,
  futurePurposeSavings: 0,
  moneyOwed: 0,
  investments: 0,
  businessStock: 0,

  shortTermDebt: 0,
  immediateBills: 0,
  wagesDue: 0,
};

export const useZakatStore = create<ZakatStore>((set) => ({
  ...INITIAL_ZAKAT_DATA,

  setField: (field, value) => {
    set({
      [field]: value,
    } as Partial<ZakatStore>);
  },

  reset: () => {
    set(INITIAL_ZAKAT_DATA);
  },
}));
