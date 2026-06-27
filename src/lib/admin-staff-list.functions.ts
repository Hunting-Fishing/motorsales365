import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_ADMIN_EMAIL = "jordilwbailey@gmail.com";
const STAFF_DOMAIN = "@365motorsales.com";

export type Staff365Row = {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  personal_email: string | null;
  avatar_url: string | null;
  street_address: string | null;
  postal_code: string | null;
  signup_city: string | null;
  signup_region: string | null;
  signup_province: string | null;
  business_name: string | null;
  business_kind: string | null;
  business_address: string | null;
  business_region: string | null;
  business_province: string | null;
  business_city: string | null;
  business_postal_code: string | null;
  seller_type: string | null;
  verification_status: string | null;
  roles: string[];
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  disabled: boolean;
  has_route: boolean;
  route_destination: string | null;
  referral_code: string | null;
  referral_active: boolean;
};

async function assertSuperAdmin(callerEmail: string | undefined) {
  if (!callerEmail || callerEmail.toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
    throw new Error("Not permitted");
  }
}

export const listStaff365 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rows: Staff365Row[] }> => {
    await assertSuperAdmin(context.claims?.email as string | undefined);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const allUsers: any[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      const users = data?.users ?? [];
      for (const u of users) {
        if ((u.email ?? "").toLowerCase().endsWith(STAFF_DOMAIN)) allUsers.push(u);
      }
      if (users.length < 1000) break;
      page += 1;
      if (page > 20) break;
    }

    const ids = allUsers.map((u) => u.id);
    const roleMap = new Map<string, string[]>();
    const profileMap = new Map<string, any>();
    if (ids.length > 0) {
      const { data: rs } = await supabaseAdmin
        .from("user_roles")
        .select("user_id,role")
        .in("user_id", ids);
      (rs ?? []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      const { data: ps } = await supabaseAdmin
        .from("profiles")
        .select(
          "id,full_name,first_name,last_name,phone,personal_email,avatar_url,street_address,postal_code,signup_city,signup_region,signup_province,business_name,business_kind,business_address,business_region,business_province,business_city,business_postal_code,seller_type,verification_status",
        )
        .in("id", ids);
      (ps ?? []).forEach((p: any) => profileMap.set(p.id, p));
    }

    // Cross-reference with Cloudflare Email Routing entries so we can flag
    // staff inboxes that won't actually receive mail.
    const routeMap = new Map<string, string | null>();
    {
      const { data: routes } = await supabaseAdmin
        .from("email_routes")
        .select("address,destination,active")
        .eq("active", true);
      (routes ?? []).forEach((r: any) => {
        const addr = String(r.address ?? "").toLowerCase();
        if (addr) routeMap.set(addr, r.destination ?? null);
      });
    }

    // Pull each staff member's personal referral code so admins can download
    // the matching QR from the staff list directly.
    const referralMap = new Map<string, { code: string; active: boolean }>();
    if (ids.length > 0) {
      const { data: refs } = await supabaseAdmin
        .from("staff_referrals")
        .select("staff_user_id,referral_code,active")
        .in("staff_user_id", ids);
      (refs ?? []).forEach((r: any) => {
        if (!r.staff_user_id || !r.referral_code) return;
        const existing = referralMap.get(r.staff_user_id);
        // Prefer an active code if a staff member somehow has multiple rows.
        if (!existing || (r.active && !existing.active)) {
          referralMap.set(r.staff_user_id, { code: r.referral_code, active: !!r.active });
        }
      });
    }

    const rows: Staff365Row[] = allUsers.map((u) => {
      const emailLc = (u.email ?? "").toLowerCase();
      const dest = routeMap.get(emailLc) ?? null;
      const ref = referralMap.get(u.id) ?? null;
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: nameMap.get(u.id) ?? null,
        roles: roleMap.get(u.id) ?? [],
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        disabled: !!(u.banned_until && new Date(u.banned_until).getTime() > Date.now()),
        has_route: routeMap.has(emailLc),
        route_destination: dest,
        referral_code: ref?.code ?? null,
        referral_active: ref?.active ?? false,
      };
    });

    rows.sort((a, b) => (a.email > b.email ? 1 : -1));
    return { rows };
  });

export const setStaff365Disabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ targetUserId: z.string().uuid(), disabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.claims?.email as string | undefined);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: getErr } = await supabaseAdmin.auth.admin.getUserById(
      data.targetUserId,
    );
    if (getErr || !target?.user?.email) throw new Error("Target not found");
    if (!target.user.email.toLowerCase().endsWith(STAFF_DOMAIN)) {
      throw new Error("Only 365motorsales.com staff can be toggled here");
    }

    const ban_duration = data.disabled ? "876000h" : "none"; // ~100 yrs vs unban
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      ban_duration,
    } as any);
    if (error) throw new Error(error.message);

    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_id: context.userId,
        target_user_id: data.targetUserId,
        action: data.disabled ? "account_disabled" : "account_enabled",
        field: "account_status",
        old_value: data.disabled ? "enabled" : "disabled",
        new_value: data.disabled ? "disabled" : "enabled",
        note: `Staff ${target.user.email}`,
      } as any);
    } catch {
      // ignore
    }

    return { ok: true };
  });
