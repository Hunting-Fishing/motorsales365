
import React from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireOwner?: boolean;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}

export function RoleGuard({ 
  children, 
  allowedRoles = [], 
  requireOwner = false, 
  requireAdmin = false,
  fallback 
}: RoleGuardProps) {
  const { isLoading, isRolesLoading, isAuthenticated, isOwner, isAdmin, isManager, userRoles, error } = useAuthUser();

  // Show loading if auth OR roles are still loading
  if (isLoading || isRolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardContent className="py-6">
          <div className="text-center space-y-4">
            <ShieldX className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Permission Error</h3>
              <p className="text-sm text-gray-600 mt-2">{error}</p>
            </div>
            <Button asChild>
              <Link to="/module-hub">Go to Modules</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardContent className="py-6">
          <div className="text-center space-y-4">
            <ShieldX className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Authentication Required</h3>
              <p className="text-sm text-gray-600 mt-2">Please log in to access this page.</p>
            </div>
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check role-based access using the actual userRoles array
  const hasAccess = 
    (requireOwner && isOwner) ||
    (requireAdmin && (isAdmin || isOwner)) ||
    (allowedRoles.length === 0) || // No specific roles required
    (isOwner) || // Owners always have access
    (isAdmin) || // Admins have broad access
    (allowedRoles.some(role => userRoles.includes(role))); // Check if user has ANY of the allowed roles

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardContent className="py-6">
          <div className="text-center space-y-4">
            <ShieldX className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-sm text-gray-600 mt-2">
                You don't have permission to access this page.
              </p>
            </div>
            <Button asChild>
              <Link to="/module-hub">Go to Modules</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
