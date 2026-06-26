import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPER_ADMIN_EMAIL = "jordilwbailey@gmail.com";
// Roles permitted to view/download a staff member's QR code.
const ALLOWED_ROLES = ["admin", "super_admin"] as const;

type AuthorizedQr = { link: string; staffUserId: string; code: string };

/**
 * Shared server-side gate: verifies the caller may view/download a staff QR
 * code, verifies the referral code is real, and audit-logs the access (or
 * the denial). Throws on denial. Used by both the view + download endpoints
 * so the download cannot be triggered without a fresh permission check.
 */
async function authorizeAndResolve(
  context: { userId: string; claims?: Record<string, unknown> | null },
  code: string,
  action: "staff_qr_viewed" | "staff_qr_downloaded",
): Promise<AuthorizedQr> {
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
    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_id: context.userId,
        target_user_id: null,
        action: "staff_qr_access_denied",
        field: "referral_code",
        old_value: action,
        new_value: code,
        note: `Denied staff QR ${action === "staff_qr_downloaded" ? "download" : "view"} for code ${code}`,
      } as any);
    } catch {
      // ignore
    }
    throw new Error("Not permitted to view staff QR codes");
  }

  const { data: row, error: refErr } = await supabaseAdmin
    .from("staff_referrals")
    .select("referral_code,staff_user_id,active")
    .eq("referral_code", code)
    .maybeSingle();
  if (refErr) throw new Error(refErr.message);
  if (!row) throw new Error("Unknown staff referral code");

  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      target_user_id: row.staff_user_id,
      action,
      field: "referral_code",
      old_value: null,
      new_value: code,
      note: `Admin ${action === "staff_qr_downloaded" ? "downloaded" : "viewed"} staff QR for code ${code}`,
    } as any);
  } catch {
    // ignore
  }

  const origin =
    process.env.PUBLIC_SITE_ORIGIN ??
    process.env.VITE_PUBLIC_SITE_ORIGIN ??
    "https://365motorsales.com";
  return {
    link: `${origin.replace(/\/$/, "")}/r/${row.referral_code}`,
    staffUserId: row.staff_user_id as string,
    code: row.referral_code as string,
  };
}

/** Open the QR dialog — returns the canonical link, audit-logs the view. */
export const authorizeStaffQrAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: true; link: string }> => {
    const res = await authorizeAndResolve(context, data.code, "staff_qr_viewed");
    return { ok: true, link: res.link };
  });

/**
 * Re-authorize and return a freshly-rendered PNG (base64 data URL). The PNG
 * is generated server-side so an unauthorized caller cannot bypass the UI by
 * downloading a client-cached image — the download endpoint itself rejects
 * the request.
 */
export const downloadStaffQrPng = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: true; dataUrl: string; filename: string }> => {
    const res = await authorizeAndResolve(context, data.code, "staff_qr_downloaded");
    const { default: QRCode } = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(res.link, {
      width: 900,
      margin: 2,
      errorCorrectionLevel: "H",
    });
    return { ok: true, dataUrl, filename: `${res.code}-qr.png` };
  });
