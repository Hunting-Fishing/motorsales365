import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPER_ADMIN_EMAIL = "jordilwbailey@gmail.com";
// Roles permitted to view/download a staff member's QR code.
const ALLOWED_ROLES = ["admin", "super_admin"] as const;

/**
 * Server-side authorization for opening or downloading a 365 staff QR code.
 * Throws if the caller is not the super-admin email or does not hold an
 * admin-level role in `user_roles`. Audit-logs every successful access.
 */
export const authorizeStaffQrAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: true; link: string }> => {
    const email = ((context.claims?.email as string | undefined) ?? "").toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let authorized = email === SUPER_ADMIN_EMAIL;

    if (!authorized) {
      const { data: roles, error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId);
      if (roleErr) throw new Error(roleErr.message);
      authorized = (roles ?? []).some((r: any) => ALLOWED_ROLES.includes(r.role));
    }

    if (!authorized) {
      // Audit unauthorized attempt (best effort).
      try {
        await supabaseAdmin.from("admin_audit_log").insert({
          actor_id: context.userId,
          target_user_id: null,
          action: "staff_qr_access_denied",
          field: "referral_code",
          old_value: null,
          new_value: data.code,
          note: `Denied staff QR access for code ${data.code}`,
        } as any);
      } catch {
        // ignore
      }
      throw new Error("Not permitted to view staff QR codes");
    }

    // Verify the code actually belongs to a staff referral.
    const { data: row, error: refErr } = await supabaseAdmin
      .from("staff_referrals")
      .select("referral_code,staff_user_id,active")
      .eq("referral_code", data.code)
      .maybeSingle();
    if (refErr) throw new Error(refErr.message);
    if (!row) throw new Error("Unknown staff referral code");

    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_id: context.userId,
        target_user_id: row.staff_user_id,
        action: "staff_qr_viewed",
        field: "referral_code",
        old_value: null,
        new_value: data.code,
        note: `Admin viewed staff QR for code ${data.code}`,
      } as any);
    } catch {
      // ignore
    }

    // Build the canonical short link server-side so the client can't spoof it.
    const origin =
      process.env.PUBLIC_SITE_ORIGIN ??
      process.env.VITE_PUBLIC_SITE_ORIGIN ??
      "https://365motorsales.com";
    return { ok: true, link: `${origin.replace(/\/$/, "")}/r/${row.referral_code}` };
  });
