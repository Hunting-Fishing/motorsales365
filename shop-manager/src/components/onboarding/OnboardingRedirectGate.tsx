
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { Skeleton } from '@/components/ui/skeleton';

interface OnboardingRedirectGateProps {
  children: React.ReactNode;
}

export function OnboardingRedirectGate({ children }: OnboardingRedirectGateProps) {
  const { status, loading } = useOnboardingStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !status.isComplete && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
    }
  }, [status.isComplete, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // If onboarding is not complete and we're not on the onboarding page, redirect
  if (!status.isComplete && location.pathname !== '/onboarding') {
    return null; // Navigation will happen in useEffect
  }

  // Show the main app if onboarding is complete or we're on the onboarding page
  return <>{children}</>;
}
