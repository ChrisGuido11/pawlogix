import { useState, useEffect, useRef } from 'react';
import type { PurchasesPackage } from 'react-native-purchases';
import { getPackages } from '@/lib/revenucat';

interface UseOfferingsResult {
  packages: PurchasesPackage[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOfferings(): UseOfferingsResult {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);

  const fetchPackages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const pkgs = await getPackages();
      if (pkgs.length === 0 && retryCount.current < 3) {
        // RevenueCat may not be configured yet — retry after a short delay
        retryCount.current += 1;
        setTimeout(fetchPackages, 1500);
        return;
      }
      setPackages(pkgs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load offerings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  return { packages, isLoading, error, refetch: fetchPackages };
}
