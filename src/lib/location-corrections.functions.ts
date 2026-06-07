import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getClientIp(): string | null {
  try {
    const raw =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-real-ip") ||
      getRequestHeader("x-forwarded-for") ||
      "";
    if (!raw) return null;
    return raw.split(",")[0].trim().slice(0, 64) || null;
  } catch {
    return null;
  }
}

async function assertModerator(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("Failed to verify role");
  const roles = (data ?? []).map((r: any) => String(r.role));
  if (!roles.some((r) => r === "admin" || r === "moderator")) {
    throw new Error("Forbidden");
  }
}

/** Public — anyone (incl. guests) can suggest a corrected lat/lng. */
export const submitLocationCorrection = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        note: z.string().max(300).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Snapshot current business location for potential revert.
    const { data: biz, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select("id, lat, lng")
      .eq("id", data.businessId)
      .maybeSingle();
    if (bizErr || !biz) throw new Error("Business not found");

    // Best-effort: identify submitter (logged-in user) and IP.
    let submitterUserId: string | null = null;
    try {
      const auth = getRequestHeader("authorization") || "";
      const token = auth.replace(/^Bearer\s+/i, "");
      if (token) {
        const { data: u } = await supabaseAdmin.auth.getUser(token);
        submitterUserId = u?.user?.id ?? null;
      }
    } catch {
      /* anonymous */
    }
    const ip = getClientIp();

    // Rate limit: one pending suggestion per (business, submitter).
    if (submitterUserId || ip) {
      let q = supabaseAdmin
        .from("business_location_corrections")
        .select("id", { count: "exact", head: true })
        .eq("business_id", data.businessId)
        .eq("status", "pending");
      if (submitterUserId) q = q.eq("submitter_user_id", submitterUserId);
      else if (ip) q = q.eq("submitter_ip", ip);
      const { count } = await q;
      if ((count ?? 0) > 0) {
        return { ok: false, reason: "duplicate_pending" as const };
      }
    }

    const { error } = await supabaseAdmin
      .from("business_location_corrections")
      .insert({
        business_id: data.businessId,
        proposed_lat: data.lat,
        proposed_lng: data.lng,
        previous_lat: (biz as any).lat ?? null,
        previous_lng: (biz as any).lng ?? null,
        note: data.note?.trim() || null,
        submitter_user_id: submitterUserId,
        submitter_ip: ip,
        status: "pending",
      } as any);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Admin — list corrections with optional filters. Joins business info. */
export const listLocationCorrections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z
          .enum(["pending", "approved", "rejected", "reverted", "all"])
          .default("pending"),
        fromDate: z.string().optional().nullable(),
        toDate: z.string().optional().nullable(),
        query: z.string().max(120).optional().nullable(),
        limit: z.number().min(1).max(200).default(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertModerator(context.userId);

    let q = supabaseAdmin
      .from("business_location_corrections")
      .select(
        "id, business_id, proposed_lat, proposed_lng, previous_lat, previous_lng, note, submitter_user_id, status, reviewed_by, reviewed_at, review_note, created_at, businesses:business_id(name, slug)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.fromDate) q = q.gte("created_at", new Date(data.fromDate).toISOString());
    if (data.toDate) {
      const end = new Date(data.toDate);
      end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    let filtered = rows ?? [];
    if (data.query) {
      const needle = data.query.toLowerCase();
      filtered = filtered.filter((r: any) => {
        const name = (r.businesses?.name ?? "").toLowerCase();
        const slug = (r.businesses?.slug ?? "").toLowerCase();
        return name.includes(needle) || slug.includes(needle);
      });
    }
    return { rows: filtered };
  });

/** Admin — approve / reject / revert. */
export const reviewLocationCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "reject", "revert"]),
        reviewNote: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertModerator(context.userId);

    const { data: row, error: rowErr } = await supabaseAdmin
      .from("business_location_corrections")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (rowErr || !row) throw new Error("Correction not found");
    const r = row as any;

    if (data.action === "approve") {
      if (r.status !== "pending") throw new Error("Only pending corrections can be approved");
      const { error: upErr } = await supabaseAdmin
        .from("businesses")
        .update({ lat: r.proposed_lat, lng: r.proposed_lng })
        .eq("id", r.business_id);
      if (upErr) throw new Error(upErr.message);
    } else if (data.action === "revert") {
      if (r.status !== "approved") throw new Error("Only approved corrections can be reverted");
      if (r.previous_lat == null || r.previous_lng == null) {
        throw new Error("No previous location snapshot to revert to");
      }
      const { error: upErr } = await supabaseAdmin
        .from("businesses")
        .update({ lat: r.previous_lat, lng: r.previous_lng })
        .eq("id", r.business_id);
      if (upErr) throw new Error(upErr.message);
    }

    const newStatus =
      data.action === "approve"
        ? "approved"
        : data.action === "reject"
          ? "rejected"
          : "reverted";

    const { error: stErr } = await supabaseAdmin
      .from("business_location_corrections")
      .update({
        status: newStatus,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        review_note: data.reviewNote?.trim() || null,
      } as any)
      .eq("id", data.id);
    if (stErr) throw new Error(stErr.message);

    // Best-effort audit log
    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_id: context.userId,
        target_user_id: r.submitter_user_id ?? context.userId,
        action: ("location_correction_" + data.action) as any,
        field: "lat_lng" as any,
        old_value: `${r.previous_lat},${r.previous_lng}`,
        new_value: `${r.proposed_lat},${r.proposed_lng}`,
        note: data.reviewNote ?? null,
      } as any);
    } catch {
      /* non-blocking */
    }

    return { ok: true as const, status: newStatus };
  });
