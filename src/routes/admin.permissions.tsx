import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listRolePermissions,
  setRolePermission,
  type RolePermissionRow,
} from "@/lib/role-permissions.functions";
import {
  PERMISSION_CATALOG,
  NON_ADMIN_ROLES,
  type EditableRole,
  type PermissionCategory,
} from "@/lib/permissions";

export const Route = createFileRoute("/admin/permissions")({
  component: AdminPermissions,
  head: () => ({ meta: [{ title: "Role permissions — Admin" }] }),
});

function AdminPermissions() {
  const fetchAll = useServerFn(listRolePermissions);
  const saveOne = useServerFn(setRolePermission);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => fetchAll(),
  });

  const mut = useMutation({
    mutationFn: (vars: { role: EditableRole; permission_key: string; enabled: boolean }) =>
      saveOne({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(`${vars.role} · ${vars.permission_key} ${vars.enabled ? "enabled" : "disabled"}`);
      qc.invalidateQueries({ queryKey: ["role-permissions"] });
      qc.invalidateQueries({ queryKey: ["my-permissions"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const enabledMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const r of (data ?? []) as RolePermissionRow[]) {
      m.set(`${r.role}:${r.permission_key}`, r.enabled);
    }
    return m;
  }, [data]);

  const grouped = useMemo(() => {
    const g: Record<PermissionCategory, typeof PERMISSION_CATALOG> = {} as any;
    for (const p of PERMISSION_CATALOG) {
      (g[p.category] ||= []).push(p);
    }
    return g;
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Role permissions</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Toggle permissions per role</CardTitle>
          <CardDescription>
            Changes apply instantly — no redeploy needed. Admins always have every permission and
            cannot be edited from this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-6">
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{category}</h2>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Permission</TableHead>
                        {NON_ADMIN_ROLES.map((r) => (
                          <TableHead key={r} className="text-center capitalize">
                            {r}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((p) => (
                        <TableRow key={p.key}>
                          <TableCell>
                            <div className="font-medium">{p.label}</div>
                            <div className="text-xs text-muted-foreground">{p.key}</div>
                          </TableCell>
                          {NON_ADMIN_ROLES.map((role) => {
                            const checked = enabledMap.get(`${role}:${p.key}`) ?? false;
                            const isPending =
                              mut.isPending &&
                              mut.variables?.role === role &&
                              mut.variables?.permission_key === p.key;
                            return (
                              <TableCell key={role} className="text-center">
                                <Switch
                                  checked={checked}
                                  disabled={isPending}
                                  onCheckedChange={(v) =>
                                    mut.mutate({ role, permission_key: p.key, enabled: v })
                                  }
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
          <div className="mt-4 text-xs text-muted-foreground">
            <Badge variant="outline" className="mr-2">Tip</Badge>
            Navigation permissions (<code>nav.*</code>) control which admin sidebar entries each
            role sees. Action permissions (<code>action.*</code>) are honored by buttons wired
            through the AdminActionButton component.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
