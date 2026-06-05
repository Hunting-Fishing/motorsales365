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
      if (!error) assigned += 1;
    }
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
    const { error } = await supabaseAdmin.from("sales_rep_territories").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRemoveTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("sales_rep_territories")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
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
