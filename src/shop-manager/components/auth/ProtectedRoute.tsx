
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { RoleGuard } from './RoleGuard';
import { ShopGuard } from './ShopGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, LogIn, Home } from 'lucide-react';
import { performAuthRecovery } from '@/utils/authCleanup';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  allowedRoles?: string[];
  requireOwner?: boolean;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  allowedRoles = [],
  requireOwner = false,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isLoading, error } = useAuthUser();
  const location = useLocation();

  // Combine legacy requiredRole with new allowedRoles array
  const finalAllowedRoles = requiredRole ? [...allowedRoles, requiredRole] : allowedRoles;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 space-y-4">
        <LoadingSpinner size="lg" label="Authenticating..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Authentication Error</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Retry
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.location.href = '/'}>
                  <Home className="h-4 w-4 mr-1" /> Home
                </Button>
                <Button size="sm" onClick={performAuthRecovery}>
                  <LogIn className="h-4 w-4 mr-1" /> Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <ShopGuard>
      <RoleGuard
        allowedRoles={finalAllowedRoles}
        requireOwner={requireOwner}
        requireAdmin={requireAdmin}
      >
        {children}
      </RoleGuard>
    </ShopGuard>
  );
};
