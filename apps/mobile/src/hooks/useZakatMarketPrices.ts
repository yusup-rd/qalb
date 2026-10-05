import { fetchZakatMarketPrices } from "@/api/metals-api";
import type { ZakatMarketPrices } from "@/types/zakat";
import { useEffect, useState } from "react";

interface UseZakatMarketPricesResult {
  prices: ZakatMarketPrices | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
}

const useZakatMarketPrices = (): UseZakatMarketPricesResult => {
  const [prices, setPrices] = useState<ZakatMarketPrices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPrices = async () => {
      setIsLoading(true);
      setError(null);
      setIsStale(false);

      try {
        const freshPrices = await fetchZakatMarketPrices({
          onStaleFallback: () => {
            if (isMounted) setIsStale(true);
          },
        });

        if (isMounted) setPrices(freshPrices);
      } catch {
        if (isMounted) setError("Unable to update market prices.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadPrices();
    return () => {
      isMounted = false;
    };
  }, []);

  return { prices, isLoading, error, isStale };
};

export default useZakatMarketPrices;
