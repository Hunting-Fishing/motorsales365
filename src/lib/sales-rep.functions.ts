import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

/* ============= Rep profile (self) ============= */

export const getMyRepProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("sales_rep_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: data };
  });

export const saveMyRepProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().max(80).nullable().optional(),
        bio: z.string().max(600).nullable().optional(),
        public_email: z.string().email().max(255).nullable().optional(),
        public_phone: z.string().max(40).nullable().optional(),
        photo_url: z.string().url().max(500).nullable().optional(),
        accepting_new_clients: z.boolean().optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("sales_rep_profiles")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============= Territories ============= */

export const listMyTerritories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("sales_rep_territories")
      .select("*")
      .eq("rep_user_id", userId)
      .order("is_primary", { ascending: false })
      .order("region", { ascending: true });
    if (error) throw new Error(error.message);
    return { territories: data ?? [] };
  });

export const addMyTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        region: z.string().min(1).max(100),
        province: z.string().max(100).nullable().optional(),
        city: z.string().max(100).nullable().optional(),
        is_primary: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("sales_rep_territories")
      .insert({ rep_user_id: userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMyTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("sales_rep_territories")
      .delete()
      .eq("id", data.id)
      .eq("rep_user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============= Assignments (rep's book of business) ============= */

export const listMyAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        type: z.enum(["all", "user", "business"]).default("all"),
        q: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("sales_rep_assignments")
      .select("*")
      .eq("rep_user_id", userId)
      .eq("active", true)
      .order("assigned_at", { ascending: false })
      .limit(data.limit);
    if (data.type !== "all") q = q.eq("subject_type", data.type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = (rows ?? []).filter((r: any) => r.subject_type === "user").map((r: any) => r.subject_id);
    const bizIds = (rows ?? []).filter((r: any) => r.subject_type === "business").map((r: any) => r.subject_id);

    const [profilesRes, bizRes] = await Promise.all([
      userIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, first_name, last_name, phone_e164, signup_city, signup_region")
            .in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      bizIds.length
        ? supabase
            .from("businesses")
            .select("id, name, slug, business_city, business_region")
            .in("id", bizIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const bizMap = new Map((bizRes.data ?? []).map((b: any) => [b.id, b]));

    const enriched = (rows ?? []).map((r: any) => ({
      ...r,
      subject:
        r.subject_type === "user"
          ? profileMap.get(r.subject_id)
          : bizMap.get(r.subject_id),
    }));

    const term = (data.q ?? "").trim().toLowerCase();
    const filtered = term
      ? enriched.filter((r: any) => {
          const s = r.subject ?? {};
          return (
            (s.full_name ?? s.name ?? "").toLowerCase().includes(term) ||
            (s.signup_city ?? s.business_city ?? "").toLowerCase().includes(term) ||
            (s.signup_region ?? s.business_region ?? "").toLowerCase().includes(term)
          );
        })
      : enriched;

    return { assignments: filtered };
  });

/* ============= Stats ============= */

export const getMyRepStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - data.days * 86400000).toISOString();

    // Active assignments count
    const { count: activeAccounts } = await supabase
      .from("sales_rep_assignments")
      .select("id", { count: "exact", head: true })
      .eq("rep_user_id", userId)
      .eq("active", true);

    // Signups via referral in window
    const { count: signupsInWindow } = await supabase
      .from("sales_rep_assignments")
      .select("id", { count: "exact", head: true })
      .eq("rep_user_id", userId)
      .eq("source", "referral")
      .gte("assigned_at", since);

    // Open followups
    const { count: openFollowups } = await supabase
      .from("sales_rep_followups")
      .select("id", { count: "exact", head: true })
      .eq("rep_user_id", userId)
      .eq("status", "open");

    // Find staff_referrals row(s) for redemptions/QR scans
    const { data: refRows } = await supabase
      .from("staff_referrals")
      .select("id, referral_code")
      .eq("staff_user_id", userId);
    const refIds = (refRows ?? []).map((r: any) => r.id);
    const refCodes = (refRows ?? []).map((r: any) => r.referral_code);

    let redemptions = 0;
    let revenuePhp = 0;
    let qrScans = 0;

    if (refCodes.length) {
      const { data: reds } = await supabase
        .from("referral_redemptions")
        .select("final_amount_php, created_at")
        .in("referral_code", refCodes)
        .gte("created_at", since);
      redemptions = reds?.length ?? 0;
      revenuePhp = (reds ?? []).reduce(
        (s: number, r: any) => s + Number(r.final_amount_php ?? 0),
        0,
      );
    }
    if (refIds.length) {
      const { count } = await supabase
        .from("qr_scans")
        .select("id", { count: "exact", head: true })
        .in("staff_referral_id", refIds)
        .gte("created_at", since);
      qrScans = count ?? 0;
    }

    return {
      activeAccounts: activeAccounts ?? 0,
      signupsInWindow: signupsInWindow ?? 0,
      openFollowups: openFollowups ?? 0,
      redemptions,
      revenuePhp,
      qrScans,
      days: data.days,
    };
  });

/* ============= Followups ============= */

export const listMyFollowups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["all", "open", "done", "snoozed"]).default("open"),
        subject_type: z.enum(["user", "business"]).optional(),
        subject_id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("sales_rep_followups")
      .select("*")
      .eq("rep_user_id", userId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.subject_type) q = q.eq("subject_type", data.subject_type);
    if (data.subject_id) q = q.eq("subject_id", data.subject_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { followups: rows ?? [] };
  });

export const createFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        subject_type: z.enum(["user", "business"]),
        subject_id: z.string().uuid(),
        kind: z.enum(["note", "call", "email", "sms", "meeting", "request"]).default("note"),
        title: z.string().min(1).max(160),
        body: z.string().max(2000).optional(),
        due_at: z.string().datetime().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("sales_rep_followups").insert({
      rep_user_id: userId,
      ...data,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "done", "snoozed"]).optional(),
        title: z.string().min(1).max(160).optional(),
        body: z.string().max(2000).nullable().optional(),
        due_at: z.string().datetime().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const patch: any = { ...rest };
    if (rest.status === "done") patch.completed_at = new Date().toISOString();
    const { error } = await supabase
      .from("sales_rep_followups")
      .update(patch)
      .eq("id", id)
      .eq("rep_user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============= Customer-facing rep card ============= */

export const getAssignedRep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        subject_type: z.enum(["user", "business"]),
        subject_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.rpc("get_assigned_rep_card", {
      _subject_type: data.subject_type,
      _subject_id: data.subject_id,
    });
    if (error) throw new Error(error.message);
    return { rep: (row && row[0]) ?? null };
  });

/* ============= Admin ============= */

export const adminListReps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "sales");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (!ids.length) return { reps: [] };

    const [profilesRes, repProfilesRes, territoriesRes, assignmentsRes, authRes] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, full_name, first_name, last_name, avatar_url")
          .in("id", ids),
        supabaseAdmin.from("sales_rep_profiles").select("*").in("user_id", ids),
        supabaseAdmin.from("sales_rep_territories").select("*").in("rep_user_id", ids),
        supabaseAdmin
          .from("sales_rep_assignments")
          .select("rep_user_id, active")
          .in("rep_user_id", ids)
          .eq("active", true),
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const repProfMap = new Map((repProfilesRes.data ?? []).map((p: any) => [p.user_id, p]));
    const emailMap = new Map(
      (authRes.data?.users ?? []).map((u: any) => [u.id, (u.email ?? "").toLowerCase()]),
    );
    const terrByRep = new Map<string, any[]>();
    for (const t of territoriesRes.data ?? []) {
      const arr = terrByRep.get(t.rep_user_id) ?? [];
      arr.push(t);
      terrByRep.set(t.rep_user_id, arr);
    }
    const countByRep = new Map<string, number>();
    for (const a of assignmentsRes.data ?? []) {
      countByRep.set(a.rep_user_id, (countByRep.get(a.rep_user_id) ?? 0) + 1);
    }

    const reps = ids.map((id) => ({
      user_id: id,
      email: emailMap.get(id) ?? "",
      profile: profileMap.get(id) ?? null,
      rep_profile: repProfMap.get(id) ?? null,
      territories: terrByRep.get(id) ?? [],
      active_accounts: countByRep.get(id) ?? 0,
    }));
    return { reps };
  });

export const adminAssignRep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        rep_user_id: z.string().uuid(),
        subject_type: z.enum(["user", "business"]),
        subject_id: z.string().uuid(),
        notes: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find existing active assignment to capture previous rep for audit
    const { data: existing } = await supabaseAdmin
      .from("sales_rep_assignments")
      .select("id, rep_user_id")
      .eq("subject_type", data.subject_type)
      .eq("subject_id", data.subject_id)
      .eq("active", true)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("sales_rep_assignments")
        .update({ active: false, ended_at: new Date().toISOString() })
        .eq("id", existing.id);
    }

    const { error } = await supabaseAdmin.from("sales_rep_assignments").insert({
      rep_user_id: data.rep_user_id,
      subject_type: data.subject_type,
      subject_id: data.subject_id,
      source: "manual",
      assigned_by: userId,
      notes: data.notes,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("sales_rep_audit_log").insert({
      actor_id: userId,
      action: existing ? "reassign" : "assign",
      rep_user_id: data.rep_user_id,
      prev_rep_user_id: existing?.rep_user_id ?? null,
      subject_type: data.subject_type,
      subject_id: data.subject_id,
      details: { notes: data.notes ?? null, source: "manual" },
    });
    return { ok: true };
  });

export const adminUnassign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("sales_rep_assignments")
      .select("rep_user_id, subject_type, subject_id, source")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("sales_rep_assignments")
      .update({ active: false, ended_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row) {
      await supabaseAdmin.from("sales_rep_audit_log").insert({
        actor_id: userId,
        action: "unassign",
        rep_user_id: row.rep_user_id,
        subject_type: row.subject_type,
        subject_id: row.subject_id,
        details: { assignment_id: data.id, source: row.source },
      });
    }
    return { ok: true };
  });

export const adminBulkAssignByTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: terrs } = await supabaseAdmin
      .from("sales_rep_territories")
      .select("rep_user_id, region, province, city");
    if (!terrs?.length) return { assigned: 0 };

    // Build region/city → rep map (city wins over province wins over region-only)
    const byKey = new Map<string, string>();
    for (const t of terrs) {
      const keys = [
        t.city ? `c:${t.region}|${t.province ?? ""}|${t.city}` : null,
        t.province ? `p:${t.region}|${t.province}` : null,
        `r:${t.region}`,
      ].filter(Boolean) as string[];
      for (const k of keys) if (!byKey.has(k)) byKey.set(k, t.rep_user_id);
    }

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, signup_region, signup_province, signup_city");
    let assigned = 0;
    for (const p of profiles ?? []) {
      if (!p.signup_region) continue;
      const rep =
        byKey.get(`c:${p.signup_region}|${p.signup_province ?? ""}|${p.signup_city ?? ""}`) ??
        byKey.get(`p:${p.signup_region}|${p.signup_province ?? ""}`) ??
        byKey.get(`r:${p.signup_region}`);
      if (!rep) continue;
      const { data: existing } = await supabaseAdmin
        .from("sales_rep_assignments")
        .select("id")
        .eq("subject_type", "user")
        .eq("subject_id", p.id)
        .eq("active", true)
        .maybeSingle();
      if (existing) continue;
      const { error } = await supabaseAdmin.from("sales_rep_assignments").insert({
        rep_user_id: rep,
        subject_type: "user",
        subject_id: p.id,
        source: "territory",
        assigned_by: userId,
      });
      if (!error) {
        assigned += 1;
        await supabaseAdmin.from("sales_rep_audit_log").insert({
          actor_id: userId,
          action: "assign",
          rep_user_id: rep,
          subject_type: "user",
          subject_id: p.id,
          details: { source: "territory", bulk: true },
        });
      }
    }
    await supabaseAdmin.from("sales_rep_audit_log").insert({
      actor_id: userId,
      action: "bulk_territory_assign",
      details: { assigned },
    });
    return { assigned };
  });

/* ============= Admin wrappers ============= */

export const adminAddTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        rep_user_id: z.string().uuid(),
        region: z.string().min(1).max(100),
        province: z.string().max(100).nullable().optional(),
        city: z.string().max(100).nullable().optional(),
        is_primary: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("sales_rep_territories")
      .insert(data)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("sales_rep_audit_log").insert({
      actor_id: userId,
      action: "territory_add",
      rep_user_id: data.rep_user_id,
      territory_id: row?.id ?? null,
      details: {
        region: data.region,
        province: data.province ?? null,
        city: data.city ?? null,
        is_primary: !!data.is_primary,
      },
    });
    return { ok: true };
  });

export const adminRemoveTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("sales_rep_territories")
      .select("rep_user_id, region, province, city, is_primary")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("sales_rep_territories")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("sales_rep_audit_log").insert({
      actor_id: userId,
      action: "territory_remove",
      rep_user_id: row?.rep_user_id ?? null,
      territory_id: data.id,
      details: row
        ? {
            region: row.region,
            province: row.province,
            city: row.city,
            is_primary: row.is_primary,
          }
        : {},
    });
    return { ok: true };
  });

export const adminSaveRepProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        rep_user_id: z.string().uuid(),
        title: z.string().max(80).nullable().optional(),
        bio: z.string().max(600).nullable().optional(),
        public_email: z.string().email().max(255).nullable().optional(),
        public_phone: z.string().max(40).nullable().optional(),
        photo_url: z.string().url().max(500).nullable().optional(),
        accepting_new_clients: z.boolean().optional(),
        active: z.boolean().optional(),
        commission_rate_override: z.number().min(0).max(1).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rep_user_id, ...rest } = data;
    const { error } = await supabaseAdmin
      .from("sales_rep_profiles")
      .upsert({ user_id: rep_user_id, ...rest }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        rep_user_id: z.string().uuid().optional(),
        source: z.enum(["referral", "manual", "territory"]).optional(),
        subject_type: z.enum(["user", "business"]).optional(),
        active_only: z.boolean().default(true),
        q: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("sales_rep_assignments")
      .select("*")
      .order("assigned_at", { ascending: false })
      .limit(data.limit);
    if (data.active_only) q = q.eq("active", true);
    if (data.rep_user_id) q = q.eq("rep_user_id", data.rep_user_id);
    if (data.source) q = q.eq("source", data.source);
    if (data.subject_type) q = q.eq("subject_type", data.subject_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = (rows ?? []).filter((r: any) => r.subject_type === "user").map((r: any) => r.subject_id);
    const bizIds = (rows ?? []).filter((r: any) => r.subject_type === "business").map((r: any) => r.subject_id);
    const repIds = Array.from(new Set((rows ?? []).map((r: any) => r.rep_user_id)));

    const [profilesRes, bizRes, repsRes] = await Promise.all([
      userIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("id, full_name, first_name, last_name, signup_city, signup_region")
            .in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      bizIds.length
        ? supabaseAdmin
            .from("businesses")
            .select("id, name, slug, business_city, business_region")
            .in("id", bizIds)
        : Promise.resolve({ data: [] as any[] }),
      repIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("id, full_name, first_name, last_name")
            .in("id", repIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const bizMap = new Map((bizRes.data ?? []).map((b: any) => [b.id, b]));
    const repMap = new Map((repsRes.data ?? []).map((r: any) => [r.id, r]));

    const enriched = (rows ?? []).map((r: any) => ({
      ...r,
      subject: r.subject_type === "user" ? profileMap.get(r.subject_id) : bizMap.get(r.subject_id),
      rep: repMap.get(r.rep_user_id) ?? null,
    }));

    const term = (data.q ?? "").trim().toLowerCase();
    const filtered = term
      ? enriched.filter((r: any) => {
          const s = r.subject ?? {};
          return (
            (s.full_name ?? s.name ?? "").toLowerCase().includes(term) ||
            (s.signup_city ?? s.business_city ?? "").toLowerCase().includes(term) ||
            (s.signup_region ?? s.business_region ?? "").toLowerCase().includes(term)
          );
        })
      : enriched;

    return { assignments: filtered };
  });

export const adminListAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        rep_user_id: z.string().uuid().optional(),
        action: z
          .enum([
            "assign",
            "reassign",
            "unassign",
            "territory_add",
            "territory_remove",
            "bulk_territory_assign",
          ])
          .optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("sales_rep_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.rep_user_id) q = q.eq("rep_user_id", data.rep_user_id);
    if (data.action) q = q.eq("action", data.action);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const actorIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean)),
    );
    const repIds = Array.from(
      new Set(
        (rows ?? [])
          .flatMap((r: any) => [r.rep_user_id, r.prev_rep_user_id])
          .filter(Boolean),
      ),
    );
    const userSubjectIds = (rows ?? [])
      .filter((r: any) => r.subject_type === "user" && r.subject_id)
      .map((r: any) => r.subject_id);
    const bizSubjectIds = (rows ?? [])
      .filter((r: any) => r.subject_type === "business" && r.subject_id)
      .map((r: any) => r.subject_id);

    const profileIds = Array.from(new Set([...actorIds, ...repIds, ...userSubjectIds]));

    const [profilesRes, bizRes, authRes] = await Promise.all([
      profileIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("id, full_name, first_name, last_name")
            .in("id", profileIds)
        : Promise.resolve({ data: [] as any[] }),
      bizSubjectIds.length
        ? supabaseAdmin
            .from("businesses")
            .select("id, name, slug")
            .in("id", bizSubjectIds)
        : Promise.resolve({ data: [] as any[] }),
      actorIds.length
        ? supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        : Promise.resolve({ data: { users: [] as any[] } } as any),
    ]);

    const nameOf = (p: any) =>
      p?.full_name ||
      [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
      null;
    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const bizMap = new Map((bizRes.data ?? []).map((b: any) => [b.id, b]));
    const emailMap = new Map(
      (authRes.data?.users ?? []).map((u: any) => [u.id, (u.email ?? "").toLowerCase()]),
    );

    const enriched = (rows ?? []).map((r: any) => ({
      ...r,
      actor: r.actor_id
        ? { name: nameOf(profileMap.get(r.actor_id)), email: emailMap.get(r.actor_id) ?? null }
        : null,
      rep_name: r.rep_user_id ? nameOf(profileMap.get(r.rep_user_id)) : null,
      prev_rep_name: r.prev_rep_user_id ? nameOf(profileMap.get(r.prev_rep_user_id)) : null,
      subject:
        r.subject_type === "user"
          ? { name: nameOf(profileMap.get(r.subject_id)) }
          : r.subject_type === "business"
            ? bizMap.get(r.subject_id) ?? null
            : null,
    }));

    return { entries: enriched };
  });

/* ============= Admin rep detail dossier ============= */

export const adminGetRepDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        rep_user_id: z.string().uuid(),
        days: z.number().int().min(1).max(365).default(30),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const repId = data.rep_user_id;
    const since = new Date(Date.now() - data.days * 86400000).toISOString();

    // Site-default commission rate
    const { data: settingRow } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "sales_rep_commission_rate")
      .maybeSingle();
    const siteRate = Number(settingRow?.value ?? "0.10");
    const defaultRate = Number.isFinite(siteRate) ? siteRate : 0.1;

    const [
      profileRes,
      repProfileRes,
      rolesRes,
      authUserRes,
      territoriesRes,
      activeAssignRes,
      signupsInWindowRes,
      openFollowupsRes,
      staffReferralsRes,
      businessesOwnedRes,
      listingsCountRes,
      clubsRes,
      partnerRes,
      openTicketsRes,
      recentAuditRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, first_name, last_name, avatar_url, phone, phone_e164, phone_verified_at, signup_city, signup_region, business_city, business_region, created_at",
        )
        .eq("id", repId)
        .maybeSingle(),
      supabaseAdmin.from("sales_rep_profiles").select("*").eq("user_id", repId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", repId),
      supabaseAdmin.auth.admin.getUserById(repId),
      supabaseAdmin.from("sales_rep_territories").select("*").eq("rep_user_id", repId),
      supabaseAdmin
        .from("sales_rep_assignments")
        .select("id", { count: "exact", head: true })
        .eq("rep_user_id", repId)
        .eq("active", true),
      supabaseAdmin
        .from("sales_rep_assignments")
        .select("id", { count: "exact", head: true })
        .eq("rep_user_id", repId)
        .eq("source", "referral")
        .gte("assigned_at", since),
      supabaseAdmin
        .from("sales_rep_followups")
        .select("id", { count: "exact", head: true })
        .eq("rep_user_id", repId)
        .eq("status", "open"),
      supabaseAdmin
        .from("staff_referrals")
        .select("id, referral_code")
        .eq("staff_user_id", repId),
      supabaseAdmin
        .from("businesses")
        .select("id, name, slug, status")
        .eq("owner_id", repId)
        .limit(20),
      supabaseAdmin
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", repId),
      supabaseAdmin.from("clubs").select("id, name, slug, status").eq("owner_id", repId).limit(20),
      supabaseAdmin
        .from("partner_program_partners" as any)
        .select("*")
        .eq("user_id", repId)
        .maybeSingle(),
      supabaseAdmin
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", repId)
        .in("status", ["open", "in_progress"]),
      supabaseAdmin
        .from("admin_audit_log")
        .select("id, action, created_at, actor_id, entity_type, entity_id, note, field")
        .eq("target_user_id", repId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const authUser: any = (authUserRes as any)?.data?.user ?? null;
    const account = {
      id: repId,
      email: (authUser?.email ?? "").toLowerCase(),
      phone: authUser?.phone ?? profileRes.data?.phone ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      created_at: authUser?.created_at ?? profileRes.data?.created_at ?? null,
      profile: profileRes.data ?? null,
      roles: (rolesRes.data ?? []).map((r: any) => r.role),
    };

    const commissionRate =
      repProfileRes.data?.commission_rate_override != null
        ? Number(repProfileRes.data.commission_rate_override)
        : defaultRate;

    // Referral redemptions -> per-user aggregation
    const refCodes = (staffReferralsRes.data ?? []).map((r: any) => r.referral_code);
    const refIds = (staffReferralsRes.data ?? []).map((r: any) => r.id);

    let redemptionsRows: any[] = [];
    let qrScansInWindow = 0;
    if (refCodes.length) {
      const { data: reds } = await supabaseAdmin
        .from("referral_redemptions")
        .select("user_id, final_amount_php, created_at")
        .in("referral_code", refCodes)
        .order("created_at", { ascending: true });
      redemptionsRows = reds ?? [];
    }
    if (refIds.length) {
      const { count } = await supabaseAdmin
        .from("qr_scans")
        .select("id", { count: "exact", head: true })
        .in("staff_referral_id", refIds)
        .gte("created_at", since);
      qrScansInWindow = count ?? 0;
    }

    // Group redemptions by user
    const byUser = new Map<
      string,
      { user_id: string; redemptions: number; spent_php: number; first_at: string; last_at: string }
    >();
    for (const r of redemptionsRows) {
      const uid = r.user_id as string;
      const amt = Number(r.final_amount_php ?? 0);
      const cur =
        byUser.get(uid) ??
        {
          user_id: uid,
          redemptions: 0,
          spent_php: 0,
          first_at: r.created_at,
          last_at: r.created_at,
        };
      cur.redemptions += 1;
      cur.spent_php += amt;
      if (r.created_at < cur.first_at) cur.first_at = r.created_at;
      if (r.created_at > cur.last_at) cur.last_at = r.created_at;
      byUser.set(uid, cur);
    }
    const referredUserIds = Array.from(byUser.keys());
    let profilesById = new Map<string, any>();
    let emailsById = new Map<string, string>();
    if (referredUserIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, first_name, last_name, avatar_url, created_at")
        .in("id", referredUserIds);
      profilesById = new Map((profs ?? []).map((p: any) => [p.id, p]));
      // Auth emails — pull page 1 (existing pattern in adminListReps)
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      emailsById = new Map(
        (authList?.users ?? [])
          .filter((u: any) => referredUserIds.includes(u.id))
          .map((u: any) => [u.id, (u.email ?? "").toLowerCase()]),
      );
    }
    const nameOf = (p: any) =>
      p?.full_name ||
      [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() ||
      null;

    const referredUsers = Array.from(byUser.values())
      .map((r) => {
        const commission_php = Math.round(r.spent_php * commissionRate * 100) / 100;
        return {
          user_id: r.user_id,
          name: nameOf(profilesById.get(r.user_id)),
          email: emailsById.get(r.user_id) ?? null,
          signed_up_at: profilesById.get(r.user_id)?.created_at ?? r.first_at,
          first_redemption_at: r.first_at,
          last_redemption_at: r.last_at,
          redemptions: r.redemptions,
          spent_php: Math.round(r.spent_php * 100) / 100,
          commission_rate: commissionRate,
          commission_php,
        };
      })
      .sort((a, b) => b.spent_php - a.spent_php);

    const totalSpent = referredUsers.reduce((s, r) => s + r.spent_php, 0);
    const totalCommission = referredUsers.reduce((s, r) => s + r.commission_php, 0);

    // Revenue in window
    const revenueInWindow = redemptionsRows
      .filter((r) => r.created_at >= since)
      .reduce((s, r) => s + Number(r.final_amount_php ?? 0), 0);
    const redemptionsInWindow = redemptionsRows.filter((r) => r.created_at >= since).length;

    // Signups per ISO week within window
    const weekMap = new Map<string, number>();
    const cutoff = new Date(since).getTime();
    for (const r of redemptionsRows) {
      const t = new Date(r.created_at).getTime();
      if (t < cutoff) continue;
      const d = new Date(r.created_at);
      // Start of week (Mon)
      const day = d.getUTCDay();
      const diff = (day + 6) % 7;
      const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
      const key = monday.toISOString().slice(0, 10);
      weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
    }
    const signupsByWeek = Array.from(weekMap.entries())
      .map(([weekStart, count]) => ({ weekStart, count }))
      .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

    const stats = {
      days: data.days,
      activeAccounts: (activeAssignRes as any).count ?? 0,
      territoriesCount: (territoriesRes.data ?? []).length,
      openFollowups: (openFollowupsRes as any).count ?? 0,
      signupsInWindow: (signupsInWindowRes as any).count ?? 0,
      qrScans: qrScansInWindow,
      redemptions: redemptionsInWindow,
      revenuePhp: Math.round(revenueInWindow * 100) / 100,
      commissionRate,
      commissionPhpEstimated: Math.round(revenueInWindow * commissionRate * 100) / 100,
      // Lifetime, since we have no paid-out state today
      lifetimeSpentPhp: Math.round(totalSpent * 100) / 100,
      lifetimeCommissionPhpEstimated: Math.round(totalCommission * 100) / 100,
      payoutOwedPhpEstimated: Math.round(totalCommission * 100) / 100,
      signupsByWeek,
    };

    const connections = {
      businesses_owned: businessesOwnedRes.data ?? [],
      listings_count: (listingsCountRes as any).count ?? 0,
      clubs_owned: clubsRes.data ?? [],
      partner_program: (partnerRes as any).data ?? null,
      open_support_tickets: (openTicketsRes as any).count ?? 0,
      recent_admin_audit: recentAuditRes.data ?? [],
    };

    return { account, stats, referredUsers, connections, rep_profile: repProfileRes.data ?? null };
  });

/** Admin: auto-populate a rep's territory from their profile signup area, if empty. */
export const adminAutoSetupTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ rep_user_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin.rpc(
      "auto_setup_sales_rep_territory" as any,
      { _rep_user_id: data.rep_user_id },
    );
    if (error) throw new Error(error.message);
    const row: any = Array.isArray(rows) ? rows[0] : rows;
    const added = !!row?.added;
    const reason = row?.reason ?? null;

    if (added) {
      await supabaseAdmin.from("sales_rep_audit_log").insert({
        actor_id: userId,
        action: "territory_add",
        rep_user_id: data.rep_user_id,
        details: {
          region: row.region,
          province: row.province,
          city: row.city,
          is_primary: true,
          source: "auto_from_signup_area",
        },
      });
    }
    return {
      added,
      reason,
      region: row?.region ?? null,
      province: row?.province ?? null,
      city: row?.city ?? null,
    };
  });
