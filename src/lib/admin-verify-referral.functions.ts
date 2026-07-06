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

export type SignupCheck = {
  user_id: string;
  full_name: string | null;
  signup_date: string | null;
  signup_source: string | null;
  signup_intent: string | null;
  credited_referral_code: string | null;
  first_referral_code: string | null;
  referred_by_staff_id: string | null;
  // pass = referral wiring matches accreditation expectation for this signup
  referred_by_ok: boolean;
  credited_ok: boolean;
  // was this signup landed via the QR variant?
  from_qr: boolean;
};

export type VerifyReferralReport = {
  referral_code: string;
  staff: {
    id: string;
    full_name: string | null;
    email: string | null;
    active: boolean;
  } | null;
  accreditation: {
    approved: boolean;
    active: boolean;
    partner_id: string | null;
  };
  scans: {
    total: number;
    last_7d: number;
    recent: Array<{
      visitor_id: string | null;
      device_type: string | null;
      country: string | null;
      scanned_at: string;
    }>;
  };
  signups: {
    total: number;
    qr_sourced: number;
    credited: number;
    intent_breakdown: Record<string, number>;
    recent: SignupCheck[];
  };
  checks: Array<{ id: string; label: string; pass: boolean; detail: string }>;
};

/**
 * End-to-end diagnostic for a single staff referral code. Verifies that:
 *  - staff_referrals row exists and is active
 *  - Partner Program accreditation matches expectation
 *  - qr_scans landing on this code are recorded
 *  - user_referrals rows attribute signups to the staff_user_id
 *  - credited_referral_code is populated when accredited, blank when not
 *  - profiles.signup_source is "qr" for QR-landed signups
 *  - profiles.signup_intent is populated
 *
 * Read-only — does not create data.
 */
export const verifyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ referralCode: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<VerifyReferralReport> => {
    await assertAdmin(context);
    const code = data.referralCode.toLowerCase().trim();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Staff row
    const { data: sr, error: srErr } = await supabaseAdmin
      .from("staff_referrals")
      .select("id, staff_user_id, full_name, email, active, referral_code")
      .eq("referral_code", code)
      .maybeSingle();
    if (srErr) throw new Error(srErr.message);

    // 2) Accreditation
    const { data: partner } = await supabaseAdmin
      .from("partner_program_partners")
      .select("id, active")
      .eq("referral_code", code)
      .maybeSingle();
    const accreditation = {
      approved: !!partner,
      active: !!(partner as any)?.active,
      partner_id: (partner as any)?.id ?? null,
    };
    const canCredit = accreditation.approved && accreditation.active;

    // 3) QR scans
    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const [{ count: scanTotal }, { count: scanRecent }, { data: scanRows }] =
      await Promise.all([
        supabaseAdmin
          .from("qr_scans")
          .select("id", { count: "exact", head: true })
          .eq("referral_code", code),
        supabaseAdmin
          .from("qr_scans")
          .select("id", { count: "exact", head: true })
          .eq("referral_code", code)
          .gte("scanned_at", sevenDaysAgo),
        supabaseAdmin
          .from("qr_scans")
          .select("visitor_id, device_type, country, scanned_at")
          .eq("referral_code", code)
          .order("scanned_at", { ascending: false })
          .limit(10),
      ]);

    // 4) Signups attributed to this code (either credited or first-touch)
    const { data: refRows, error: refErr } = await supabaseAdmin
      .from("user_referrals")
      .select(
        "user_id, credited_referral_code, first_referral_code, referred_by_staff_id, signup_date",
      )
      .or(`credited_referral_code.eq.${code},first_referral_code.eq.${code}`)
      .order("signup_date", { ascending: false })
      .limit(20);
    if (refErr) throw new Error(refErr.message);

    const userIds = (refRows ?? []).map((r: any) => r.user_id);
    const profMap = new Map<
      string,
      { full_name: string | null; signup_source: string | null; signup_intent: string | null }
    >();
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, signup_source, signup_intent")
        .in("id", userIds);
      (profs ?? []).forEach((p: any) => {
        profMap.set(p.id, {
          full_name: p.full_name,
          signup_source: p.signup_source,
          signup_intent: p.signup_intent,
        });
      });
    }

    const intentBreakdown: Record<string, number> = {};
    let qrSourced = 0;
    let credited = 0;
    const recentSignups: SignupCheck[] = (refRows ?? []).map((r: any) => {
      const p = profMap.get(r.user_id);
      const fromQr = (p?.signup_source ?? "") === "qr";
      const isCredited = r.credited_referral_code === code;
      if (fromQr) qrSourced++;
      if (isCredited) credited++;
      const key = p?.signup_intent ?? "unset";
      intentBreakdown[key] = (intentBreakdown[key] ?? 0) + 1;
      // Expectation: when the referrer is accredited AND signup first-touched this code,
      // credited_referral_code should equal the code; otherwise it should be null.
      const credited_ok = canCredit
        ? r.credited_referral_code === code
        : r.credited_referral_code == null;
      // referred_by_staff_id should point at the staff row when credit landed
      const referred_by_ok = canCredit
        ? r.referred_by_staff_id === (sr as any)?.staff_user_id
        : true; // no expectation when not accredited
      return {
        user_id: r.user_id,
        full_name: p?.full_name ?? null,
        signup_date: r.signup_date ?? null,
        signup_source: p?.signup_source ?? null,
        signup_intent: p?.signup_intent ?? null,
        credited_referral_code: r.credited_referral_code ?? null,
        first_referral_code: r.first_referral_code ?? null,
        referred_by_staff_id: r.referred_by_staff_id ?? null,
        credited_ok,
        referred_by_ok,
        from_qr: fromQr,
      };
    });

    // 5) Build check list
    const checks: VerifyReferralReport["checks"] = [];
    checks.push({
      id: "staff_row",
      label: "Staff referral row exists",
      pass: !!sr,
      detail: sr ? `Owner: ${(sr as any).full_name ?? "—"} · active=${(sr as any).active}` : "No staff_referrals row for this code",
    });
    checks.push({
      id: "staff_active",
      label: "Staff referral is active",
      pass: !!(sr as any)?.active,
      detail: (sr as any)?.active ? "Active" : "Inactive — scans still record but no new attributions",
    });
    checks.push({
      id: "accredited",
      label: "Partner Program accreditation active",
      pass: canCredit,
      detail: canCredit
        ? "Approved & active — signups will credit the referrer"
        : accreditation.approved
          ? "Approved but revoked — new signups will NOT credit"
          : "Not accredited — first-touch is tracked, but credit is withheld",
    });
    checks.push({
      id: "scans_recorded",
      label: "QR scans are being recorded",
      pass: (scanTotal ?? 0) > 0,
      detail: `${scanTotal ?? 0} total scans (${scanRecent ?? 0} in last 7 days)`,
    });
    const missingCredit = recentSignups.filter((s) => !s.credited_ok);
    checks.push({
      id: "credit_wiring",
      label: "Credit column matches accreditation state",
      pass: missingCredit.length === 0,
      detail:
        missingCredit.length === 0
          ? `All ${recentSignups.length} recent signups match expectation`
          : `${missingCredit.length} row(s) do not match — inspect the table below`,
    });
    const missingStaffLink = recentSignups.filter((s) => !s.referred_by_ok);
    checks.push({
      id: "referred_by_wiring",
      label: "referred_by_staff_id points at owner",
      pass: missingStaffLink.length === 0,
      detail:
        missingStaffLink.length === 0
          ? "All credited signups link to the staff owner"
          : `${missingStaffLink.length} credited signup(s) missing staff link`,
    });
    const qrMislabeled = recentSignups.filter(
      (s) => s.from_qr === false && s.credited_referral_code === code,
    );
    checks.push({
      id: "qr_source_tagged",
      label: "signup_source captured for QR landings",
      pass: qrSourced > 0 || (scanTotal ?? 0) === 0,
      detail:
        qrSourced > 0
          ? `${qrSourced} signup(s) tagged signup_source='qr'`
          : (scanTotal ?? 0) === 0
            ? "No scans yet — nothing to check"
            : `${qrMislabeled.length} credited signup(s) not tagged 'qr' — QR param may be dropped`,
    });
    checks.push({
      id: "intent_present",
      label: "signup_intent populated on attributed signups",
      pass: recentSignups.length === 0 || (intentBreakdown.unset ?? 0) < recentSignups.length,
      detail:
        recentSignups.length === 0
          ? "No signups attributed yet"
          : Object.entries(intentBreakdown)
              .map(([k, v]) => `${k}=${v}`)
              .join(" · "),
    });

    return {
      referral_code: code,
      staff: sr
        ? {
            id: (sr as any).staff_user_id,
            full_name: (sr as any).full_name ?? null,
            email: (sr as any).email ?? null,
            active: !!(sr as any).active,
          }
        : null,
      accreditation,
      scans: {
        total: scanTotal ?? 0,
        last_7d: scanRecent ?? 0,
        recent: (scanRows ?? []).map((r: any) => ({
          visitor_id: r.visitor_id,
          device_type: r.device_type,
          country: r.country,
          scanned_at: r.scanned_at,
        })),
      },
      signups: {
        total: recentSignups.length,
        qr_sourced: qrSourced,
        credited,
        intent_breakdown: intentBreakdown,
        recent: recentSignups,
      },
      checks,
    };
  });
