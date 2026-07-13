import { useState } from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Save } from "lucide-react";
import { PermissionsGuide } from "@/components/settings/PermissionsGuide";

type RolePermissions = {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
};

import { PERMISSION_MODULES, MODULE_CATEGORIES } from "@/types/permissionModules";

const MARITIME_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Administrator" },
  { value: "manager", label: "Manager" },
  { value: "deckhand", label: "Deckhand" },
  { value: "captain", label: "Captain" },
  { value: "mate", label: "Mate" },
  { value: "chief_engineer", label: "Chief Engineer" },
  { value: "marine_engineer", label: "Marine Engineer" },
  { value: "fishing_master", label: "Fishing Master" },
  { value: "technician", label: "Technician" },
  { value: "service_advisor", label: "Service Advisor" },
  { value: "reception", label: "Reception" },
  { value: "parts_manager", label: "Parts Manager" },
];

// Use centralized module definitions
const MODULES = PERMISSION_MODULES.map(module => ({
  id: module.id,
  name: module.name,
  description: module.description,
  category: module.category
}));

export default function RolePermissionsSettings() {
  const [selectedRole, setSelectedRole] = useState<string>("deckhand");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["role-permissions", selectedRole],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error("No shop found");

      const { data, error } = await supabase
        .from("shop_role_permissions")
        .select("*")
        .eq("shop_id", profile.shop_id)
        .eq("role_name", selectedRole);

      if (error) throw error;

      // Convert to object for easier access
      const permissionsMap: Record<string, RolePermissions> = {};
      data?.forEach((perm) => {
        permissionsMap[perm.module] = perm.actions as RolePermissions;
      });

      return permissionsMap;
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      module,
      action,
      value,
    }: {
      module: string;
      action: string;
      value: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error("No shop found");

      const currentPerms = permissions?.[module] || { view: false };
      const updatedActions = { ...currentPerms, [action]: value };

      const { error } = await supabase
        .from("shop_role_permissions")
        .upsert({
          shop_id: profile.shop_id,
          role_name: selectedRole,
          module,
          actions: updatedActions,
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions", selectedRole] });
      toast({
        title: "Permission updated",
        description: "Role permissions have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (module: string, action: string, value: boolean) => {
    updatePermissionMutation.mutate({ module, action, value });
  };

  if (isLoading) {
    return (
      <SettingsPageLayout title="Role Permissions" description="Configure what each role can access">
        <div>Loading...</div>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      title="Role Permissions"
      description="Configure access control for maritime roles - control what deckhands, captains, and crew can see and do"
    >
      <PermissionsGuide />
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Role-Based Access Control</CardTitle>
          </div>
          <CardDescription>
            Manage permissions for each role. Deckhands and captains will only see their assigned vessels' inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Select Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARITIME_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-8">
            {MODULE_CATEGORIES.map((category) => {
              const categoryModules = MODULES.filter(m => m.category === category.id);
              if (categoryModules.length === 0) return null;
              
              return (
                <div key={category.id} className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold text-foreground">{category.label}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="space-y-4">
                    {categoryModules.map((module) => {
                      const modulePerms = permissions?.[module.id] || {
                        view: false,
                        create: false,
                        edit: false,
                        delete: false,
                      };

                      return (
                        <Card key={module.id} className="border-l-4 border-l-primary/20">
                          <CardHeader className="pb-3">
                            <div>
                              <CardTitle className="text-base">{module.name}</CardTitle>
                              {module.description && (
                                <CardDescription className="text-sm mt-1">
                                  {module.description}
                                </CardDescription>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`${module.id}-view`}>View</Label>
                              <Switch
                                id={`${module.id}-view`}
                                checked={modulePerms.view}
                                onCheckedChange={(checked) =>
                                  handleToggle(module.id, "view", checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`${module.id}-create`}>Create</Label>
                              <Switch
                                id={`${module.id}-create`}
                                checked={modulePerms.create || false}
                                onCheckedChange={(checked) =>
                                  handleToggle(module.id, "create", checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`${module.id}-edit`}>Edit</Label>
                              <Switch
                                id={`${module.id}-edit`}
                                checked={modulePerms.edit || false}
                                onCheckedChange={(checked) =>
                                  handleToggle(module.id, "edit", checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`${module.id}-delete`}>Delete</Label>
                              <Switch
                                id={`${module.id}-delete`}
                                checked={modulePerms.delete || false}
                                onCheckedChange={(checked) =>
                                  handleToggle(module.id, "delete", checked)
                                }
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Changes are saved automatically. All data is isolated to your organization.
            </p>
          </div>
        </CardContent>
      </Card>
    </SettingsPageLayout>
  );
}
