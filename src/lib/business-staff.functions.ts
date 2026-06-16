import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = [
  "owner",
  "manager",
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
    const { data: isMember } = await supabase.rpc("is_business_member", {
      _user: userId,
      _business: data.businessId,
    });
    if (!isMember) throw new Error("Forbidden");

    const { data: rows, error } = await supabase
      .from("business_staff")
      .select("id,user_id,role,title,duties,active,on_shift,created_at")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const ids = (rows ?? []).map((r) => r.user_id);
    let profiles: Record<string, { name: string; email?: string }> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("public_profiles")
        .select("id,full_name,business_name")
        .in("id", ids);
      (profs ?? []).forEach((p: any) => {
        profiles[p.id] = { name: p.business_name || p.full_name || "Member" };
      });
    }
    return (rows ?? []).map((r) => ({
      ...r,
      display_name: profiles[r.user_id]?.name ?? "Member",
    }));
  });

export const addBusinessStaffByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { businessId: string; email: string; role: StaffRole; title?: string; duties?: string[] }) => {
      if (!ROLES.includes(d.role)) throw new Error("Invalid role");
      if (!d.email?.includes("@")) throw new Error("Invalid email");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);

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

    const { error } = await supabase.from("business_staff").update(patch).eq("id", data.staffId);
    if (error) throw error;
    return { ok: true };
  });

export const removeBusinessStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string; businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);
    const { error } = await supabase.from("business_staff").delete().eq("id", data.staffId);
    if (error) throw error;
    return { ok: true };
  });
