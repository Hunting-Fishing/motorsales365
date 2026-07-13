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
import { User, Shield, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UserPermissions = {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
};

import { PERMISSION_MODULES, MODULE_CATEGORIES } from "@/types/permissionModules";

// Use centralized module definitions
const MODULES = PERMISSION_MODULES.map(module => ({
  id: module.id,
  name: module.name,
  description: module.description,
  category: module.category
}));

export default function UserPermissionsSettings() {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users in the shop
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["shop-users"],
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
        .from("profiles")
        .select("id, first_name, last_name, email, shop_id")
        .eq("shop_id", profile.shop_id)
        .neq("id", user.id);

      if (error) throw error;

      // Fetch roles separately to avoid deep nesting
      const userIds = data?.map(u => u.id) || [];
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, roles(name)")
        .in("user_id", userIds);

      return data?.map((u: any) => {
        const userRole = rolesData?.find((r: any) => r.user_id === u.id);
        return {
          id: u.id,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          email: u.email,
          role: (userRole?.roles as any)?.name || 'No role',
        };
      });
    },
  });

  // Fetch custom permissions for selected user
  const { data: customPermissions, isLoading: loadingPermissions } = useQuery({
    queryKey: ["user-custom-permissions", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return {};

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error("No shop found");

      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", selectedUserId)
        .eq("shop_id", profile.shop_id);

      if (error) throw error;

      const permissionsMap: Record<string, UserPermissions> = {};
      data?.forEach((perm) => {
        permissionsMap[perm.module] = perm.actions as UserPermissions;
      });

      return permissionsMap;
    },
    enabled: !!selectedUserId,
  });

  // Fetch role default permissions for comparison
  const { data: roleDefaults } = useQuery({
    queryKey: ["role-defaults", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return {};

      const selectedUser = users?.find((u) => u.id === selectedUserId);
      if (!selectedUser) return {};

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
        .eq("role_name", selectedUser.role);

      if (error) throw error;

      const defaultsMap: Record<string, UserPermissions> = {};
      data?.forEach((perm) => {
        defaultsMap[perm.module] = perm.actions as UserPermissions;
      });

      return defaultsMap;
    },
    enabled: !!selectedUserId && !!users,
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

      const currentPerms = customPermissions?.[module] || { view: false };
      const updatedActions = { ...currentPerms, [action]: value };

      const { error } = await supabase
        .from("user_permissions")
        .upsert({
          user_id: selectedUserId,
          shop_id: profile.shop_id,
          module,
          actions: updatedActions,
          created_by: user.id,
        }, {
          onConflict: 'user_id,shop_id,module'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-custom-permissions", selectedUserId] });
      toast({
        title: "Permission updated",
        description: "User permissions have been saved successfully.",
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

  const resetToDefaultsMutation = useMutation({
    mutationFn: async (module: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error("No shop found");

      const { error } = await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", selectedUserId)
        .eq("shop_id", profile.shop_id)
        .eq("module", module);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-custom-permissions", selectedUserId] });
      toast({
        title: "Reset successful",
        description: "Permissions reset to role defaults.",
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

  const handleReset = (module: string) => {
    resetToDefaultsMutation.mutate(module);
  };

  const isCustomized = (module: string) => {
    return !!customPermissions?.[module];
  };

  const getEffectivePermissions = (module: string): UserPermissions => {
    return customPermissions?.[module] || roleDefaults?.[module] || {
      view: false,
      create: false,
      edit: false,
      delete: false,
    };
  };

  const selectedUser = users?.find((u) => u.id === selectedUserId);

  if (loadingUsers) {
    return (
      <SettingsPageLayout title="User Permissions" description="Customize individual employee access">
        <div>Loading...</div>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      title="User Permissions"
      description="Customize permissions for individual employees - overrides their role defaults"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Individual Employee Permissions</CardTitle>
          </div>
          <CardDescription>
            Grant custom permissions to specific employees beyond their role defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Select Employee</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee..." />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} - {user.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUser && (
            <>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Customizing permissions for: <strong>{selectedUser.name}</strong> (Role: {selectedUser.role})
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Custom permissions override role defaults. Reset to return to role defaults.
                  </span>
                </AlertDescription>
              </Alert>

              {loadingPermissions ? (
                <div>Loading permissions...</div>
              ) : (
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
                            const modulePerms = getEffectivePermissions(module.id);
                            const customized = isCustomized(module.id);

                            return (
                              <Card 
                                key={module.id} 
                                className={customized ? "border-l-4 border-l-primary" : "border-l-4 border-l-muted"}
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{module.name}</CardTitle>
                                        {customized && (
                                          <Badge variant="outline" className="text-xs">
                                            Custom
                                          </Badge>
                                        )}
                                      </div>
                                      {module.description && (
                                        <CardDescription className="text-sm mt-1">
                                          {module.description}
                                        </CardDescription>
                                      )}
                                    </div>
                                    {customized && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleReset(module.id)}
                                      >
                                        <RefreshCw className="h-4 w-4 mr-1" />
                                        Reset
                                      </Button>
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
              )}
            </>
          )}

          {!selectedUserId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select an employee to customize their permissions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </SettingsPageLayout>
  );
}
