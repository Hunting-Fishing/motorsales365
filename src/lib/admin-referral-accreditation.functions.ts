import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPER_ADMIN_EMAIL = "jordilwbailey@gmail.com";

async function assertAdmin(context: { userId: string; claims?: Record<string, unknown> | null }) {
  const email = ((context.claims?.email as string | undefined) ?? "").toLowerCase();
  if (email === SUPER_ADMIN_EMAIL) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Not permitted");
}

/**
 * List Partner Program accreditation status for a batch of referral codes.
 * Returns a map { referral_code -> { approved, active, partner_id } }.
 * "approved" means a partner row exists; "active" means it's currently
 * credit-eligible. Both are needed for the admin approval UI.
 */
export const listReferralAccreditation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ codes: z.array(z.string().min(1).max(80)).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.codes.length === 0) return { rows: [] as Array<{ referral_code: string; approved: boolean; active: boolean; partner_id: string | null }> };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("partner_program_partners")
      .select("id, referral_code, active")
      .in("referral_code", data.codes);
    if (error) throw new Error(error.message);
    return {
      rows: (rows ?? []).map((r: any) => ({
        referral_code: r.referral_code as string,
        approved: true,
        active: !!r.active,
        partner_id: r.id as string,
      })),
    };
  });

/**
 * Approve or revoke a staff referral code's Partner Program accreditation.
 * Approving creates (or reactivates) a partner_program_partners row using
 * the staff_referrals row as the source of truth for display_name/user.
 * Revoking flips active=false — the row is kept for audit/history.
 */
export const setReferralAccreditation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ referralCode: z.string().min(1).max(80), approved: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sr, error: srErr } = await supabaseAdmin
      .from("staff_referrals")
      .select("id, staff_user_id, referral_code, full_name, email, phone")
      .eq("referral_code", data.referralCode)
      .maybeSingle();
    if (srErr) throw new Error(srErr.message);
    if (!sr) throw new Error("Referral code not found");

    const { data: existing } = await supabaseAdmin
      .from("partner_program_partners")
      .select("id, active, application_id")
      .eq("referral_code", data.referralCode)
      .maybeSingle();

    if (data.approved) {
      if (existing) {
        const { error } = await supabaseAdmin
          .from("partner_program_partners")
          .update({ active: true })
          .eq("id", (existing as any).id);
        if (error) throw new Error(error.message);
      } else {
        // Create an approved application + active partner row.
        const { data: app, error: appErr } = await supabaseAdmin
          .from("partner_program_applications")
          .insert({
            user_id: sr.staff_user_id,
            full_name: sr.full_name,
            email: sr.email,
            phone: sr.phone,
            channel_type: "internal_staff",
            platforms: ["internal"],
            status: "approved",
            agreed_terms: true,
            agreed_terms_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewer_id: context.userId,
            admin_notes: "Manually approved via /admin/referrals",
          } as any)
          .select("id")
          .single();
        if (appErr) throw new Error(appErr.message);
        const { error: pErr } = await supabaseAdmin.from("partner_program_partners").insert({
          user_id: sr.staff_user_id,
          application_id: (app as any).id,
          referral_code: sr.referral_code,
          display_name: sr.full_name,
          active: true,
          agreed_terms_at: new Date().toISOString(),
          agreed_terms_version: "admin-approved-v1",
        } as any);
        if (pErr) throw new Error(pErr.message);
      }
    } else {
      if (!existing) return { ok: true, changed: false };
      const { error } = await supabaseAdmin
        .from("partner_program_partners")
        .update({ active: false })
        .eq("id", (existing as any).id);
      if (error) throw new Error(error.message);
    }

    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_id: context.userId,
        target_user_id: sr.staff_user_id,
        action: data.approved ? "referral_approved" : "referral_revoked",
        field: "partner_program_accreditation",
        old_value: existing ? String((existing as any).active) : "none",
        new_value: data.approved ? "true" : "false",
        note: `Referral code ${sr.referral_code}`,
      } as any);
    } catch {
      // ignore
    }

    return { ok: true, changed: true };
  });
