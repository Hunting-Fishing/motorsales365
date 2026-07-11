import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Save, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useToast } from "@/hooks/use-toast";
import { PERMISSION_MODULES, MODULE_CATEGORIES } from "@/types/permissionModules";

interface PermissionsTabProps {
  memberRole: string;
  memberId: string;
  memberEmail?: string;
}

interface PermissionActions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface UserPermission {
  module: string;
  actions: PermissionActions;
}

type PendingPermissions = Record<string, PermissionActions>;

export function PermissionsTab({ memberRole, memberId, memberEmail }: PermissionsTabProps) {
  const { userRole } = useUserRole();
  const { userId: currentUserId } = useAuthUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for pending changes
  const [pendingPermissions, setPendingPermissions] = useState<PendingPermissions>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Check if current user can edit permissions
  const canEditPermissions = userRole?.name === 'owner' || userRole?.name === 'admin';
  
  // Fetch member's profile with fallback lookup by email if ID fails
  const { data: memberProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['member-profile-for-permissions', memberId, memberEmail],
    queryFn: async () => {
      // First try by ID
      const { data: byId, error: idError } = await supabase
        .from('profiles')
        .select('id, shop_id, email')
        .eq('id', memberId)
        .maybeSingle();
      
      if (byId) {
        return byId;
      }
      
      // If not found by ID and we have email, try by email
      if (memberEmail) {
        const { data: byEmail, error: emailError } = await supabase
          .from('profiles')
          .select('id, shop_id, email')
          .eq('email', memberEmail)
          .maybeSingle();
        
        if (byEmail) {
          return byEmail;
        }
      }
      
      // Still not found - return null
      return null;
    },
    enabled: !!memberId
  });

  // The actual user ID to use for permissions (handles ID mismatch)
  const effectiveUserId = memberProfile?.id || memberId;
  const shopId = memberProfile?.shop_id;

  // Fetch member's permissions using effective user ID
  const { data: permissions = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['user-permissions', effectiveUserId, shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('module, actions')
        .eq('user_id', effectiveUserId)
        .eq('shop_id', shopId);
      
      if (error) throw error;
      
      // Map the data to ensure correct types
      return (data || []).map(item => ({
        module: item.module,
        actions: item.actions as unknown as PermissionActions
      })) as UserPermission[];
    },
    enabled: !!effectiveUserId && !!shopId
  });

  // Initialize pending permissions from fetched data
  useEffect(() => {
    if (permissions.length > 0) {
      const initial: PendingPermissions = {};
      permissions.forEach(p => {
        initial[p.module] = { ...p.actions };
      });
      setPendingPermissions(initial);
      setHasChanges(false);
    }
  }, [permissions]);

  // Save all permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!shopId || !currentUserId) {
        throw new Error('Missing required data');
      }

      // Get all modules that have pending changes
      const modulesToSave = Object.entries(pendingPermissions);
      
      if (modulesToSave.length === 0) {
        throw new Error('No changes to save');
      }

      // Batch upsert all permissions
      const promises = modulesToSave.map(([module, actions]) => {
        return supabase
          .from('user_permissions')
          .upsert({
            user_id: effectiveUserId,
            shop_id: shopId,
            module,
            actions: actions as unknown as Record<string, boolean>,
            created_by: currentUserId,
          } as any, {
            onConflict: 'user_id,shop_id,module'
          });
      });

      const results = await Promise.all(promises);
      
      // Check for any errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || 'Failed to save permissions');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', effectiveUserId] });
      setHasChanges(false);
      toast({
        title: "Permissions saved",
        description: "All permission changes have been saved successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving permissions",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleTogglePermission = useCallback((module: string, action: keyof PermissionActions, value: boolean) => {
    if (!canEditPermissions) return;
    
    setPendingPermissions(prev => {
      const currentModulePermissions = prev[module] || { view: false, create: false, edit: false, delete: false };
      return {
        ...prev,
        [module]: {
          ...currentModulePermissions,
          [action]: value
        }
      };
    });
    setHasChanges(true);
  }, [canEditPermissions]);

  const handleToggleAll = useCallback((module: string, allEnabled: boolean) => {
    if (!canEditPermissions) return;
    
    setPendingPermissions(prev => ({
      ...prev,
      [module]: {
        view: allEnabled,
        create: allEnabled,
        edit: allEnabled,
        delete: allEnabled
      }
    }));
    setHasChanges(true);
  }, [canEditPermissions]);

  const getPermissionValue = useCallback((moduleId: string, action: keyof PermissionActions): boolean => {
    // Check pending permissions first (local state)
    if (pendingPermissions[moduleId]) {
      return pendingPermissions[moduleId][action] || false;
    }
    // Fallback to fetched permissions
    const permission = permissions.find(p => p.module === moduleId);
    return permission?.actions[action] || false;
  }, [pendingPermissions, permissions]);

  const areAllPermissionsEnabled = useCallback((moduleId: string): boolean => {
    const actions = pendingPermissions[moduleId];
    if (!actions) {
      const permission = permissions.find(p => p.module === moduleId);
      if (!permission) return false;
      return permission.actions.view && permission.actions.create && permission.actions.edit && permission.actions.delete;
    }
    return actions.view && actions.create && actions.edit && actions.delete;
  }, [pendingPermissions, permissions]);

  const areSomePermissionsEnabled = useCallback((moduleId: string): boolean => {
    const actions = pendingPermissions[moduleId] || permissions.find(p => p.module === moduleId)?.actions;
    if (!actions) return false;
    const { view, create, edit, delete: del } = actions;
    const enabledCount = [view, create, edit, del].filter(Boolean).length;
    return enabledCount > 0 && enabledCount < 4;
  }, [pendingPermissions, permissions]);

  const handleSave = () => {
    savePermissionsMutation.mutate();
  };

  const PermissionRow = ({ 
    label, 
    moduleId, 
    action 
  }: { 
    label: string; 
    moduleId: string; 
    action: keyof PermissionActions;
  }) => {
    const isAllowed = getPermissionValue(moduleId, action);
    
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-foreground">{label}</span>
        <Switch
          checked={isAllowed}
          onCheckedChange={(checked) => handleTogglePermission(moduleId, action, checked)}
          disabled={!canEditPermissions}
        />
      </div>
    );
  };

  const PermissionModuleCard = ({ module }: { module: typeof PERMISSION_MODULES[0] }) => {
    const actions: { key: keyof PermissionActions; label: string }[] = [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ];

    const allEnabled = areAllPermissionsEnabled(module.id);
    const someEnabled = areSomePermissionsEnabled(module.id);

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">{module.name}</CardTitle>
              <CardDescription className="text-sm">{module.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-medium text-muted-foreground">All</span>
              <Switch
                checked={allEnabled}
                onCheckedChange={(checked) => handleToggleAll(module.id, checked)}
                disabled={!canEditPermissions}
                className={someEnabled && !allEnabled ? 'data-[state=unchecked]:bg-amber-500' : ''}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {actions.map(action => (
              <PermissionRow
                key={`${module.id}-${action.key}`}
                label={action.label}
                moduleId={module.id}
                action={action.key}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const isLoading = isLoadingProfile || isLoadingPermissions;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show warning if profile not found
  if (!memberProfile) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load permissions. The user profile could not be found. This may be due to a data mismatch.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>User Permissions</CardTitle>
            </div>
            {canEditPermissions && (
              <Button
                onClick={handleSave}
                disabled={!hasChanges || savePermissionsMutation.isPending}
                className="gap-2"
              >
                {savePermissionsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Permissions
                    {hasChanges && (
                      <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-600">
                        Unsaved
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            )}
          </div>
          <CardDescription>
            Manage what this team member can access and modify in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role:</span>
            <Badge variant="outline" className="text-base px-3 py-1">
              {memberRole}
            </Badge>
          </div>
          
          {!canEditPermissions && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Only Owners and Administrators can modify permissions. You are viewing this user's current permissions.
              </AlertDescription>
            </Alert>
          )}
          
          {hasChanges && canEditPermissions && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-600">
                You have unsaved changes. Click "Save Permissions" to apply them.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="space-y-8">
        {MODULE_CATEGORIES.map((category) => {
          const categoryModules = PERMISSION_MODULES.filter(m => m.category === category.id);
          if (categoryModules.length === 0) return null;

          return (
            <div key={category.id} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{category.label}</h3>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryModules.map(module => (
                  <PermissionModuleCard key={module.id} module={module} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Save Button for mobile */}
      {canEditPermissions && hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:hidden z-50">
          <Button
            onClick={handleSave}
            disabled={savePermissionsMutation.isPending}
            size="lg"
            className="shadow-lg gap-2"
          >
            {savePermissionsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Permissions
              </>
            )}
          </Button>
        </div>
      )}

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Custom permissions override role defaults. These permissions are stored in the database and will persist across sessions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
