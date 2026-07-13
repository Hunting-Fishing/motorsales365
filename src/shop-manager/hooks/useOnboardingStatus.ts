import { useState, useEffect } from 'react';
import { useShopData } from '@/hooks/useShopData';

interface OnboardingStatus {
  isComplete: boolean;
  currentStep: number;
}

export function useOnboardingStatus() {
  const { shopData, loading: shopLoading } = useShopData();
  const [status, setStatus] = useState<OnboardingStatus>({ isComplete: true, currentStep: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopLoading) {
      if (shopData) {
        setStatus({
          isComplete: shopData.onboarding_completed ?? false,
          currentStep: shopData.setup_step ?? 0
        });
      } else {
        // No shop data means user needs to complete initial onboarding
        setStatus({ isComplete: false, currentStep: 0 });
      }
      setLoading(false);
    }
  }, [shopData, shopLoading]);

  return { status, loading };
}
