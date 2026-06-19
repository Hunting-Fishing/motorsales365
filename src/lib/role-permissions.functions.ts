import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RolePermissionRow = {
  role: string;
  permission_key: string;
  enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
};

export const listRolePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RolePermissionRow[]> => {
    const { data, error } = await context.supabase
      .from("role_permissions")
      .select("role,permission_key,enabled,updated_at,updated_by");
    if (error) throw new Error(error.message);
    return (data ?? []) as RolePermissionRow[];
  });

export const setRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: string; permission_key: string; enabled: boolean }) => {
    if (!input?.role) throw new Error("role required");
    if (!input?.permission_key) throw new Error("permission_key required");
    if (input.role === "admin") throw new Error("Admin permissions cannot be edited.");
    const allowed = ["sales", "moderator", "support", "advertising"];
    if (!allowed.includes(input.role)) throw new Error("Invalid role");
    return {
      role: input.role,
      permission_key: input.permission_key,
      enabled: !!input.enabled,
    };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await context.supabase.from("role_permissions").upsert(
      {
        role: data.role as any,
        permission_key: data.permission_key,
        enabled: data.enabled,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "role,permission_key" },
    );
    if (error) throw new Error(error.message);

    // Audit the change.
    await context.supabase.from("admin_audit_log").insert({
      actor_id: context.userId,
      target_user_id: context.userId,
      action: "permission_changed",
      field: "permission",
      old_value: null,
      new_value: data.enabled ? "enabled" : "disabled",
      entity_type: "role_permission",
      entity_id: `${data.role}:${data.permission_key}`,
      metadata: { role: data.role, permission_key: data.permission_key, enabled: data.enabled } as any,
    } as any);

    return { ok: true };
  });
