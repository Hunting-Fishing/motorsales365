import { supabase } from "@/integrations/supabase/client";

export type AdminAuditEntry = {
  actor_id: string;
  target_user_id: string;
  action: "role_granted" | "role_revoked" | "verification_changed" | "seller_type_changed";
  field: "role" | "verification_status" | "seller_type";
  old_value?: string | null;
  new_value?: string | null;
  note?: string | null;
};

/**
 * Best-effort write to the admin audit log. Never throws — auditing should
 * not block the underlying admin action if logging fails.
 */
export async function logAdminAudit(entries: AdminAuditEntry | AdminAuditEntry[]) {
  const rows = Array.isArray(entries) ? entries : [entries];
  if (rows.length === 0) return;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const payload = rows.map((r) => ({ ...r, actor_id: user.id }));
    await supabase.from("admin_audit_log").insert(payload as any);
  } catch (e) {
    console.warn("[admin-audit] failed to log", e);
  }
}
