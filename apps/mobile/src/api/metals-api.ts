import type { ZakatMarketPrices } from "@qalb/shared";
import { apiRequest } from "./client";
import { requestCached } from "./client-cache";

const METALS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const fetchZakatMarketPrices = (
  options?: { onStaleFallback?: () => void },
) =>
  requestCached(
    "metals:latest",
    METALS_CACHE_TTL_MS,
    () => apiRequest<ZakatMarketPrices>("/api/metals/latest"),
    { allowStaleOnError: true, onStaleFallback: options?.onStaleFallback },
  );
