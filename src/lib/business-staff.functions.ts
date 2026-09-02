import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = [
  "owner",
  "manager",
  "assistant_manager",
  "dispatcher",
  "driver",
  "mechanic",
  "clerk",
] as const;
type StaffRole = (typeof ROLES)[number];

async function assertManager(supabase: any, userId: string, businessId: string) {
  const { data: ok } = await supabase.rpc("has_business_role", {
    _user: userId,
    _business: businessId,
    _role: "manager",
  });
  if (!ok) throw new Error("Forbidden");
}

export const listBusinessStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", data.businessId)
      .maybeSingle();
    if (businessError) throw businessError;
    if (!business) throw new Error("Business not found");

    const { data: rows, error } = await supabase
      .from("business_staff")
      .select("id,user_id,role,title,duties,active,on_shift,created_at")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const staffRows = (rows ?? []).filter((r) => r.user_id !== business.owner_id);
    const { data: grants, error: grantsError } = await (supabase as any)
      .from("business_staff_temporary_permissions")
      .select("id,user_id,permission_key,reason,granted_at,expires_at,revoked_at")
      .eq("business_id", data.businessId)
      .eq("permission_key", "canonical_inventory_link")
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false });
    if (grantsError) throw grantsError;
    const grantByUser = new Map<string, any>();
    for (const grant of grants ?? []) {
      if (!grantByUser.has(grant.user_id)) grantByUser.set(grant.user_id, grant);
    }
    const ids = [business.owner_id, ...staffRows.map((r) => r.user_id)];
    let profiles: Record<string, { name: string; email?: string }> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("public_profiles")
        .select("id,full_name,business_name")
        .in("id", ids);
      (profs ?? []).forEach((p: any) => {
        profiles[p.id] = { name: p.full_name || p.business_name || "Member" };
      });
    }
    return [
      {
        id: `owner-${data.businessId}`,
        user_id: business.owner_id,
        role: "owner" as const,
        title: "Business owner",
        duties: [],
        active: true,
        on_shift: false,
        created_at: null,
        display_name: profiles[business.owner_id]?.name ?? "Business owner",
      },
      ...staffRows.map((r) => ({
        ...r,
        display_name: profiles[r.user_id]?.name ?? "Employee",
        canonical_link_permission: grantByUser.get(r.user_id) ?? null,
      })),
    ];
  });

export const addBusinessStaffByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      businessId: string;
      email: string;
      role: StaffRole;
      title?: string;
      duties?: string[];
    }) => {
      if (!ROLES.includes(d.role)) throw new Error("Invalid role");
      if (!d.email?.includes("@")) throw new Error("Invalid email");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);

    // Enforce plan staff cap (with auto-upgrade if enabled)
    try {
      const { enforceLimit, planLimitErrorPayload, PlanLimitError } =
        await import("@/lib/business-plan-enforcement.server");
      try {
        await enforceLimit(supabase as any, data.businessId, "staff", userId);
      } catch (e) {
        if (e instanceof PlanLimitError) return planLimitErrorPayload(e)!;
        throw e;
      }
    } catch (e: any) {
      if (e?.code === "plan_limit") return e;
      throw e;
    }

    // Privileged: look up user by email via admin client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error: listErr } = await (supabaseAdmin as any).auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const target = (list?.users ?? []).find(
      (u: any) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
    );
    if (!target) {
      throw new Error(
        "No account with that email yet. Ask them to sign up first, then invite again.",
      );
    }
    const { data: business } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", data.businessId)
      .maybeSingle();
    if (business?.owner_id === target.id) {
      throw new Error("The business owner already has full access and cannot be added as staff.");
    }

    const { error } = await supabase.from("business_staff").upsert(
      {
        business_id: data.businessId,
        user_id: target.id,
        role: data.role,
        title: data.title ?? null,
        duties: data.duties ?? [],
        active: true,
        invited_by: userId,
      },
      { onConflict: "business_id,user_id" },
    );
    if (error) throw error;
    return { ok: true };
  });

export const updateBusinessStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      staffId: string;
      businessId: string;
      role?: StaffRole;
      title?: string | null;
      duties?: string[];
      active?: boolean;
      on_shift?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Drivers can toggle their own on_shift; managers can change everything.
    const { data: row } = await supabase
      .from("business_staff")
      .select("user_id")
      .eq("id", data.staffId)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (!row) throw new Error("Not found");

    const isSelfShiftToggle =
      row.user_id === userId &&
      data.on_shift !== undefined &&
      data.role === undefined &&
      data.active === undefined &&
      data.title === undefined &&
      data.duties === undefined;

    if (!isSelfShiftToggle) {
      await assertManager(supabase, userId, data.businessId);
    }

    const patch: any = {};
    if (data.role !== undefined) patch.role = data.role;
    if (data.title !== undefined) patch.title = data.title;
    if (data.duties !== undefined) patch.duties = data.duties;
    if (data.active !== undefined) patch.active = data.active;
    if (data.on_shift !== undefined) patch.on_shift = data.on_shift;

    const { error } = await supabase
      .from("business_staff")
      .update(patch)
      .eq("id", data.staffId)
      .eq("business_id", data.businessId);
    if (error) throw error;
    return { ok: true };
  });

export const removeBusinessStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string; businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_staff")
      .delete()
      .eq("id", data.staffId)
      .eq("business_id", data.businessId);
    if (error) throw error;
    return { ok: true };
  });

export const grantTemporaryCanonicalLinkPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { businessId: string; targetUserId: string; durationHours: number; reason?: string }) => {
      if (!Number.isInteger(d.durationHours) || d.durationHours < 1 || d.durationHours > 720) {
        throw new Error("Permission duration must be between 1 hour and 30 days");
      }
      if ((d.reason ?? "").length > 300) throw new Error("Reason is too long");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);

    const { data: target } = await supabase
      .from("business_staff")
      .select("user_id,active")
      .eq("business_id", data.businessId)
      .eq("user_id", data.targetUserId)
      .eq("active", true)
      .maybeSingle();
    if (!target) throw new Error("Select an active employee");

    await (supabase as any)
      .from("business_staff_temporary_permissions")
      .update({ revoked_at: new Date().toISOString(), revoked_by: userId })
      .eq("business_id", data.businessId)
      .eq("user_id", data.targetUserId)
      .eq("permission_key", "canonical_inventory_link")
      .is("revoked_at", null);

    const expiresAt = new Date(Date.now() + data.durationHours * 60 * 60 * 1000).toISOString();
    const { data: grant, error } = await (supabase as any)
      .from("business_staff_temporary_permissions")
      .insert({
        business_id: data.businessId,
        user_id: data.targetUserId,
        permission_key: "canonical_inventory_link",
        granted_by: userId,
        reason: data.reason?.trim() || null,
        expires_at: expiresAt,
      })
      .select("id,expires_at")
      .single();
    if (error) throw error;
    return grant;
  });

export const revokeTemporaryCanonicalLinkPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; permissionId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);
    const { error } = await (supabase as any)
      .from("business_staff_temporary_permissions")
      .update({ revoked_at: new Date().toISOString(), revoked_by: userId })
      .eq("id", data.permissionId)
      .eq("business_id", data.businessId)
      .is("revoked_at", null);
    if (error) throw error;
    return { ok: true };
  });
