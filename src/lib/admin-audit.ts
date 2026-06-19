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

export type AdminActionLog = {
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  target_user_id?: string | null;
  metadata?: Record<string, unknown> | null;
  note?: string | null;
};

/**
 * Generic admin-action logger for button clicks and arbitrary operations.
 * Writes a row to admin_audit_log with the new (entity_type, entity_id,
 * metadata) columns. Best-effort: never throws.
 */
export async function logAdminAction(entry: AdminActionLog) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("admin_audit_log").insert({
      actor_id: user.id,
      target_user_id: entry.target_user_id ?? user.id,
      action: entry.action,
      field: entry.entity_type ?? "action",
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      metadata: (entry.metadata ?? null) as any,
      note: entry.note ?? null,
    } as any);
  } catch (e) {
    console.warn("[admin-action] failed to log", e);
  }
}
