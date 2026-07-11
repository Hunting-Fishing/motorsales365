import { useState } from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, UserCog, Search, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_name: string;
  has_custom_permissions: boolean;
};

type ModulePermissions = {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
};

const MODULES = [
  { id: "work_orders", name: "Work Orders" },
  { id: "inventory", name: "Inventory" },
  { id: "equipment_tracking", name: "Equipment Tracking" },
  { id: "customers", name: "Customers" },
  { id: "accounting", name: "Accounting" },
  { id: "team", name: "Team Management" },
  { id: "reports", name: "Reports" },
];

export default function EmployeePermissions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-with-permissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error("No shop found");

      // Get all employees in shop
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("shop_id", profile.shop_id);

      if (profilesError) throw profilesError;

      // Get role for each profile separately
      const profilesWithRoles = await Promise.all(
        (profiles || []).map(async (p) => {
          const { data: userRole } = await supabase
            .from("user_roles")
            .select("roles(name)")
            .eq("user_id", p.id)
            .limit(1)
            .single();
          
          return {
            ...p,
            role_name: (userRole?.roles as any)?.name || "No role",
          };
        })
      );

      // Check which employees have custom permissions
      const { data: customPerms } = await supabase
        .from("user_permissions")
        .select("user_id")
        .eq("shop_id", profile.shop_id);

      const customPermUserIds = new Set(customPerms?.map((p) => p.user_id) || []);

      const employees: Employee[] = profilesWithRoles.map((p) => ({
        id: p.id,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        email: p.email,
        role_name: p.role_name,
        has_custom_permissions: customPermUserIds.has(p.id),
      }));

      return employees;
    },
  });

  const { data: selectedEmployeePermissions } = useQuery({
    queryKey: ["employee-permissions", selectedEmployee?.id],
    enabled: !!selectedEmployee,
    queryFn: async () => {
      if (!selectedEmployee) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error("No shop found");

      const { data: customPerms } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", selectedEmployee.id)
        .eq("shop_id", profile.shop_id);

      // Convert to map
      const permsMap: Record<string, ModulePermissions> = {};
      customPerms?.forEach((perm) => {
        permsMap[perm.module] = perm.actions as ModulePermissions;
      });

      return permsMap;
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      userId,
      module,
      action,
      value,
    }: {
      userId: string;
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

      const currentPerms = selectedEmployeePermissions?.[module] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };

      const updatedActions = { ...currentPerms, [action]: value };

      const { error } = await supabase.from("user_permissions").upsert({
        user_id: userId,
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
      queryClient.invalidateQueries({ queryKey: ["employee-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["employees-with-permissions"] });
      toast({
        title: "Permission updated",
        description: "Employee permissions have been saved.",
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

  const clearCustomPermissionsMutation = useMutation({
    mutationFn: async (userId: string) => {
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
        .eq("user_id", userId)
        .eq("shop_id", profile.shop_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["employees-with-permissions"] });
      setIsDialogOpen(false);
      toast({
        title: "Custom permissions cleared",
        description: "Employee will now use role default permissions.",
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

  const filteredEmployees = employees?.filter((emp) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      emp.first_name?.toLowerCase().includes(searchLower) ||
      emp.last_name?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.role_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleToggle = (module: string, action: string, value: boolean) => {
    if (!selectedEmployee) return;
    updatePermissionMutation.mutate({
      userId: selectedEmployee.id,
      module,
      action,
      value,
    });
  };

  return (
    <SettingsPageLayout
      title="Employee Permissions"
      description="Manage individual employee access - customize permissions beyond role defaults"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Employee Access Control</CardTitle>
            </div>
          </div>
          <CardDescription>
            Click on an employee to customize their permissions. By default, employees inherit permissions from their role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div>Loading employees...</div>
          ) : (
            <div className="space-y-2">
              {filteredEmployees?.map((employee) => (
                <Card
                  key={employee.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setIsDialogOpen(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserCog className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{employee.role_name}</Badge>
                        {employee.has_custom_permissions && (
                          <Badge variant="secondary">
                            <Shield className="h-3 w-3 mr-1" />
                            Custom
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Customize Permissions for {selectedEmployee?.first_name}{" "}
              {selectedEmployee?.last_name}
            </DialogTitle>
            <DialogDescription>
              Set custom permissions for this employee. Leave unchanged to use role defaults ({selectedEmployee?.role_name}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {selectedEmployee?.has_custom_permissions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedEmployee && clearCustomPermissionsMutation.mutate(selectedEmployee.id)}
              >
                Reset to Role Defaults
              </Button>
            )}

            {MODULES.map((module) => {
              const modulePerms = selectedEmployeePermissions?.[module.id] || {
                view: false,
                create: false,
                edit: false,
                delete: false,
              };

              return (
                <Card key={module.id} className="border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{module.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>View</Label>
                      <Switch
                        checked={modulePerms.view}
                        onCheckedChange={(checked) => handleToggle(module.id, "view", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Create</Label>
                      <Switch
                        checked={modulePerms.create || false}
                        onCheckedChange={(checked) => handleToggle(module.id, "create", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Edit</Label>
                      <Switch
                        checked={modulePerms.edit || false}
                        onCheckedChange={(checked) => handleToggle(module.id, "edit", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Delete</Label>
                      <Switch
                        checked={modulePerms.delete || false}
                        onCheckedChange={(checked) => handleToggle(module.id, "delete", checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </SettingsPageLayout>
  );
}
