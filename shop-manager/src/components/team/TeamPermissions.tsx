import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { PermissionSet, RolePreset } from "@/types/permissions";
import { defaultPermissions, permissionPresets } from "@/data/permissionPresets";
import { PermissionModuleCard } from "./permissions/PermissionModuleCard";
import { PermissionPresetButtons } from "./permissions/PermissionPresetButtons";
import { ResponsiveGrid } from "@/components/ui/responsive-grid";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface TeamPermissionsProps {
  memberId?: string;
  memberRole: string;
  initialPermissions?: PermissionSet;
  onChange?: (permissions: PermissionSet) => void;
}

export function TeamPermissions({ 
  memberId,
  memberRole, 
  initialPermissions, 
  onChange 
}: TeamPermissionsProps) {
  const [saving, setSaving] = useState(false);
  
  // Get the appropriate permissions for the role, with fallbacks
  const getInitialPermissions = (): PermissionSet => {
    // If initialPermissions are provided, use those
    if (initialPermissions) {
      return initialPermissions;
    }
    
    // If memberRole is provided and exists in permissionPresets, use those
    if (memberRole && permissionPresets[memberRole as keyof typeof permissionPresets]) {
      return permissionPresets[memberRole as keyof typeof permissionPresets];
    }
    
    // Otherwise use default permissions
    return defaultPermissions;
  };

  // Initialize with safe permissions
  const [permissions, setPermissions] = useState<PermissionSet>(getInitialPermissions());

  // Handle toggling a permission
  const handleTogglePermission = (module: string, action: string, value: boolean) => {
    const updatedPermissions = {
      ...permissions,
      [module]: {
        ...permissions[module as keyof typeof permissions],
        [action]: value,
      },
    } as PermissionSet;
    
    setPermissions(updatedPermissions);
    
    if (onChange) {
      onChange(updatedPermissions);
    }
  };

  // Apply a permission preset based on role
  const applyPreset = (role: RolePreset) => {
    if (role in permissionPresets) {
      const preset = permissionPresets[role];
      setPermissions(preset);
      
      if (onChange) {
        onChange(preset);
      }
      
      toast({
        title: "Permissions updated",
        description: `Applied ${role} permission preset`,
        variant: "success",
      });
    }
  };

  // Save permissions to database
  const savePermissions = async () => {
    if (!memberId) {
      toast({
        title: "Cannot save permissions",
        description: "No member ID provided",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    
    try {
      // Get current user and shop_id
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user?.id)
        .single();
      
      if (!profile?.shop_id) {
        throw new Error('Shop ID not found');
      }
      
      // Delete existing permissions for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', memberId);
      
      // Insert permissions per module
      const permissionEntries = Object.entries(permissions).map(([module, actions]) => ({
        user_id: memberId,
        shop_id: profile.shop_id,
        module,
        actions: actions as Json,
        created_by: user?.id,
      }));
      
      const { error } = await supabase
        .from('user_permissions')
        .insert(permissionEntries);
      
      if (error) throw error;
      
      toast({
        title: "Permissions saved successfully",
        description: "User permissions have been updated",
        variant: "success",
      });
    } catch (error: any) {
      console.error('Failed to save permissions:', error);
      toast({
        title: "Failed to save permissions",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Permissions & Access</h2>
          <p className="text-sm text-slate-500">
            Configure what this team member can access and modify in the system
          </p>
        </div>
        
        <PermissionPresetButtons onApplyPreset={applyPreset} />
      </div>

      <ResponsiveGrid 
        cols={{ 
          default: 1, 
          md: 2, 
          lg: 2, 
          xl: 3 
        }}
        gap="md"
        className="w-full"
      >
        {permissions && Object.entries(permissions).map(([module, actions]) => (
          <PermissionModuleCard
            key={module}
            moduleName={module}
            actions={actions}
            onTogglePermission={handleTogglePermission}
          />
        ))}
      </ResponsiveGrid>

      <div className="flex justify-end">
        <Button 
          onClick={savePermissions}
          disabled={saving || !memberId}
          className="bg-esm-blue-600 hover:bg-esm-blue-700"
        >
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Permissions
        </Button>
      </div>
    </div>
  );
}
