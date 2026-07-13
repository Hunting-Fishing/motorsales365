
import React from 'react';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { Skeleton } from '@/components/ui/skeleton';

interface OnboardingGateProps {
  children: React.ReactNode;
}

export const OnboardingGate: React.FC<OnboardingGateProps> = ({ children }) => {
  const { status, loading } = useOnboardingStatus();

  if (loading) {
    return (
      <div className="flex flex-col space-y-4 p-8">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // For now, always consider onboarding complete to avoid blocking
  return <>{children}</>;
};
