import type { ZakatMarketPrices } from "@/types/zakat";

const METALS_API_URL = "https://api.metals.dev/v1/latest";
const METALS_API_KEY = process.env.EXPO_PUBLIC_METALS_API_KEY;
const METALS_API_TIMEOUT = 10_000;

interface MetalsApiResponse {
  status: "success" | "failure";
  currency: string;
  unit: string;
  timestamps?: {
    currency: string;
    metal: string;
  };
  metals?: {
    gold: number;
    silver: number;
  };
  error_code?: number;
  error_message?: string;
}

// TODO: Move market-price requests behind the NestJS API.
// The Metals.Dev API key must be stored server-side and never exposed
// through EXPO_PUBLIC_* environment variables.

export const fetchZakatMarketPrices = async (): Promise<ZakatMarketPrices> => {
  if (!METALS_API_KEY) {
    throw new Error("Metals.Dev API key is not configured.");
  }

  const url = new URL(METALS_API_URL);

  url.searchParams.set("api_key", METALS_API_KEY);
  url.searchParams.set("currency", "USD");
  url.searchParams.set("unit", "g");

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, METALS_API_TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    const data: MetalsApiResponse = await response.json();

    if (
      !response.ok ||
      data.status !== "success" ||
      !data.metals ||
      !Number.isFinite(data.metals.gold) ||
      data.metals.gold <= 0 ||
      !Number.isFinite(data.metals.silver) ||
      data.metals.silver <= 0
    ) {
      throw new Error(data.error_message ?? "Failed to fetch metal prices.");
    }

    return {
      goldPerGram: data.metals.gold,
      silverPerGram: data.metals.silver,
      updatedAt: data.timestamps?.metal ?? new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
};
