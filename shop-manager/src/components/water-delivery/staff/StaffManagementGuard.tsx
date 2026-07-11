import React from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface StaffManagementGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function StaffManagementGuard({ children, fallback }: StaffManagementGuardProps) {
  const { isOwner, isManager, isAdmin, isLoading, isRolesLoading, userRoles } = useAuthUser();

  // Show loading if auth OR roles are still loading
  if (isLoading || isRolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const canManageStaff = isOwner || isManager || isAdmin;

  if (!canManageStaff) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="max-w-md mx-auto mt-12 border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 rounded-full bg-amber-500/10">
              <ShieldAlert className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Access Restricted</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You don't have permission to manage staff members.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Only Owners, Managers, and Administrators can create and edit staff.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Your current roles: {userRoles.length > 0 ? userRoles.join(', ') : 'None assigned'}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

// Hook to check if user can manage staff
export function useCanManageStaff() {
  const { isOwner, isManager, isAdmin, isLoading, isRolesLoading } = useAuthUser();
  return {
    canManage: isOwner || isManager || isAdmin,
    canDeactivate: isOwner, // Only owners can deactivate
    isLoading: isLoading || isRolesLoading,
  };
}
