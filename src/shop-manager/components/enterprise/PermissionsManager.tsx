import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Lock } from 'lucide-react';
import { usePermissionsManager } from '@/hooks/usePermissionsManager';
import { Skeleton } from '@/components/ui/skeleton';
import type { Permission } from '@/types/phase4';

export function PermissionsManager() {
  const { loading, permissions } = usePermissionsManager();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Permissions Management</CardTitle>
        </div>
        <CardDescription>
          Configure role-based access control and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([module, perms]: [string, Permission[]]) => (
            <div key={module} className="space-y-2">
              <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {module}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {perms.map((perm) => (
                  <div
                    key={perm.id}
                    className="p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="font-medium text-sm">{perm.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {perm.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Action: <span className="font-mono">{perm.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
