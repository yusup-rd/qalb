import type { AsrMethod, CalculationMethodId } from "@/types/prayer";

interface CalculationMethodOption {
  id: CalculationMethodId;
  key: string;
}

interface AsrMethodOption {
  id: AsrMethod;
  key: string;
}

export const calculationMethods: CalculationMethodOption[] = [
  {
    id: "mwl",
    key: "mwl",
  },
  {
    id: "isna",
    key: "isna",
  },
  {
    id: "egyptian",
    key: "egyptian",
  },
  {
    id: "karachi",
    key: "karachi",
  },
  {
    id: "umm-al-qura",
    key: "ummAlQura",
  },
  {
    id: "dubai",
    key: "dubai",
  },
  {
    id: "moonsighting-committee",
    key: "moonsightingCommittee",
  },
  {
    id: "kuwait",
    key: "kuwait",
  },
  {
    id: "qatar",
    key: "qatar",
  },
  {
    id: "singapore",
    key: "singapore",
  },
  {
    id: "tehran",
    key: "tehran",
  },
  {
    id: "turkey",
    key: "turkey",
  },
];

export const asrMethods: AsrMethodOption[] = [
  {
    id: "standard",
    key: "standard",
  },
  {
    id: "hanafi",
    key: "hanafi",
  },
];
