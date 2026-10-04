import { fetchZakatMarketPrices } from "@/api/metals-api";
import type { ZakatMarketPrices } from "@/types/zakat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const CACHE_KEY = "@app/zakat-market-prices";
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface CachedZakatMarketPrices {
  prices: ZakatMarketPrices;
  cachedAt: number;
}

interface UseZakatMarketPricesResult {
  prices: ZakatMarketPrices | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
}

const isValidCache = (cached: CachedZakatMarketPrices): boolean => {
  return (
    cached.prices.goldPerGram > 0 &&
    cached.prices.silverPerGram > 0 &&
    cached.cachedAt > 0
  );
};

const useZakatMarketPrices = (): UseZakatMarketPricesResult => {
  const [prices, setPrices] = useState<ZakatMarketPrices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPrices = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let cachedValue: string | null = null;

        try {
          cachedValue = await AsyncStorage.getItem(CACHE_KEY);
        } catch {
          // Cache is best-effort. Continue with the live request.
        }

        if (cachedValue) {
          try {
            const cached: CachedZakatMarketPrices = JSON.parse(cachedValue);

            if (isValidCache(cached)) {
              const cacheAge = Date.now() - cached.cachedAt;

              if (cacheAge < CACHE_TTL) {
                if (isMounted) {
                  setPrices(cached.prices);
                  setIsStale(false);
                  setIsLoading(false);
                }

                return;
              }

              // Cache exists but is expired.
              // Keep it as a fallback if the API fails.
              if (isMounted) {
                setPrices(cached.prices);
                setIsStale(true);
              }
            }
          } catch {
            try {
              await AsyncStorage.removeItem(CACHE_KEY);
            } catch {
              // Cache cleanup is best-effort.
            }
          }
        }

        let freshPrices: ZakatMarketPrices;

        try {
          freshPrices = await fetchZakatMarketPrices();
        } catch {
          if (isMounted) {
            setError("Unable to update market prices.");
          }

          return;
        }

        if (isMounted) {
          setPrices(freshPrices);
          setIsStale(false);
          setError(null);
        }

        const newCache: CachedZakatMarketPrices = {
          prices: freshPrices,
          cachedAt: Date.now(),
        };

        if (isMounted) {
          try {
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
          } catch {
            // Cache persistence is best-effort.
          }
        }
      } catch {
        if (isMounted) {
          setError("Unable to load market prices.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPrices();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    prices,
    isLoading,
    error,
    isStale,
  };
};

export default useZakatMarketPrices;
