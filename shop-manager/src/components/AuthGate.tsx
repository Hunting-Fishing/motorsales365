
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogIn } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { isAuthenticated, isLoading, error } = useAuthUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 space-y-4">
        <LoadingSpinner size="lg" label="Loading your session..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 space-y-4">
        <p className="text-sm text-muted-foreground text-center max-w-sm">{error}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
          <Button size="sm" onClick={() => window.location.href = '/login'}>
            <LogIn className="h-4 w-4 mr-1" /> Login
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthGate;
