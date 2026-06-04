import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_ADMIN_EMAIL = "jordilwbailey@gmail.com";

/**
 * Admin sets a specific password for any user. Bypasses Supabase's
 * "no password reuse" check (admin override). Restricted to the single
 * super-admin email.
 */
export const adminSetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        newPassword: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const callerEmail = (context.claims?.email as string | undefined)?.toLowerCase();
    if (!callerEmail || callerEmail !== ALLOWED_ADMIN_EMAIL) {
      throw new Error("Not permitted");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: getErr } = await supabaseAdmin.auth.admin.getUserById(
      data.targetUserId,
    );
    if (getErr || !target?.user) throw new Error("Target user not found");

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.newPassword,
    });
    if (updErr) throw new Error(updErr.message);

    // Best-effort audit log (no password value stored).
    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_id: context.userId,
        target_user_id: data.targetUserId,
        action: "password_reset",
        field: "password",
        old_value: null,
        new_value: null,
        note: `Password set by admin for ${target.user.email ?? "unknown"}`,
      } as any);
    } catch {
      // ignore audit failures
    }

    return { ok: true, email: target.user.email ?? null };
  });
