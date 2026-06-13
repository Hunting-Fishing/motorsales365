import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const baseSchema = z.object({
  kind: z.enum(["part", "parting_out"]).default("part"),
  title: z.string().trim().min(4).max(140),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  vehicle_category: z.string().optional().nullable(),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional().nullable(),
  engine_code: z.string().trim().max(40).optional().nullable(),
  trim: z.string().trim().max(60).optional().nullable(),
  part_category: z.string().trim().max(60).optional().nullable(),
  part_keywords: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  condition_pref: z.enum(["any", "used", "new", "oem", "aftermarket"]).default("any"),
  budget_max_php: z.number().nonnegative().nullable().optional(),
  region: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  alert_frequency: z.enum(["off", "instant", "daily"]).default("instant"),
});

export const createPartsWanted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => baseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const insert = {
      ...data,
      user_id: userId,
      notes: data.notes || null,
    };
    const { data: row, error } = await supabase
      .from("parts_wanted")
      .insert(insert as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Backfill matches against recent listings (service role)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("backfill_parts_wanted", { p_wanted_id: (row as any).id });
    } catch (e) {
      console.warn("[parts-wanted] backfill failed", e);
    }
    return { id: (row as any).id };
  });

export const updatePartsWanted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).merge(baseSchema.partial()).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("parts_wanted")
      .update(rest as never)
      .eq("id", id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const closePartsWanted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("parts_wanted")
      .update({ status: "closed" } as never)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePartsWanted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("parts_wanted")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyPartsWanted = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("parts_wanted")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ wanted_id: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Get wanted ids owned by user
    const { data: mine } = await supabase
      .from("parts_wanted")
      .select("id, title, make, model, year, engine_code")
      .eq("user_id", userId);
    const ids = (mine ?? []).map((r: any) => r.id);
    if (ids.length === 0) return [];
    let q = supabase
      .from("parts_wanted_matches")
      .select("id, wanted_id, listing_id, score, matched_at, notified_at, dismissed_at")
      .in("wanted_id", data.wanted_id ? [data.wanted_id] : ids)
      .is("dismissed_at", null)
      .order("matched_at", { ascending: false })
      .limit(100);
    const { data: matches, error } = await q;
    if (error) throw new Error(error.message);
    if (!matches || matches.length === 0) return [];

    const listingIds = matches.map((m: any) => m.listing_id);
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, price_php, region, city, category_slug, published_at")
      .in("id", listingIds);
    const lmap = new Map<string, any>((listings ?? []).map((l: any) => [l.id, l]));
    const wmap = new Map<string, any>((mine ?? []).map((w: any) => [w.id, w]));
    return matches.map((m: any) => ({
      ...m,
      listing: lmap.get(m.listing_id) ?? null,
      wanted: wmap.get(m.wanted_id) ?? null,
    }));
  });

export const dismissMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("parts_wanted_matches")
      .update({ dismissed_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPublicPartsWanted = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        make: z.string().optional(),
        model: z.string().optional(),
        year: z.number().int().optional(),
        kind: z.enum(["part", "parting_out"]).optional(),
        region: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("parts_wanted")
      .select(
        "id, kind, title, make, model, year, engine_code, part_category, part_keywords, condition_pref, budget_max_php, region, city, created_at",
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.make) q = q.ilike("make", data.make);
    if (data.model) q = q.ilike("model", data.model);
    if (data.year) q = q.eq("year", data.year);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.region) q = q.eq("region", data.region);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getListingWantedCount = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ listing_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: n } = await supabaseAdmin.rpc("get_listing_wanted_count", {
      p_listing_id: data.listing_id,
    });
    return { count: Number(n ?? 0) };
  });
