// Admin-only server functions to manage scheduled Google Places discovery
// searches and the resulting candidate queue.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("can_moderate", { _user_id: ctx.userId });
  if (error || !data) throw new Error("Forbidden: staff only");
}

const PlaceTypeEnum = z.enum([
  "car_dealer",
  "used_car_dealer",
  "car_repair",
  "car_wash",
  "gas_station",
  "auto_parts_store",
  "motorcycle_dealer",
  "motorcycle_repair",
  "tire_shop",
  "body_shop",
  "auto_body_shop",
  "car_body_shop",
  "insurance_agency",
  "towing_service",
]);

// ---------- Searches ----------

export const listDiscoverySearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("business_discovery_searches")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { searches: data ?? [] };
  });

const CreateSearchInput = z.object({
  query: z.string().min(2).max(200),
  city: z.string().max(100).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
  placeType: PlaceTypeEnum,
  active: z.boolean().optional(),
});

export const createDiscoverySearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateSearchInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: row, error } = await context.supabase
      .from("business_discovery_searches")
      .insert({
        query: data.query,
        city: data.city ?? null,
        region: data.region ?? null,
        place_type: data.placeType,
        active: data.active ?? true,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { search: row };
  });

const UpdateSearchInput = z.object({
  id: z.string().uuid(),
  active: z.boolean().optional(),
});

export const updateDiscoverySearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateSearchInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const patch: Record<string, unknown> = {};
    if (typeof data.active === "boolean") patch.active = data.active;
    const { error } = await context.supabase
      .from("business_discovery_searches")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const IdInput = z.object({ id: z.string().uuid() });

export const deleteDiscoverySearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("business_discovery_searches")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Queue ----------

const ListQueueInput = z.object({
  status: z.enum(["pending", "imported", "dismissed"]).default("pending"),
  limit: z.number().int().min(1).max(200).default(100),
}).default({ status: "pending", limit: 100 });

export const listDiscoveryQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListQueueInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("business_discovery_queue")
      .select("*")
      .eq("status", data.status)
      .order("last_seen_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

const IdsInput = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });

export const dismissQueueItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => IdsInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("business_discovery_queue")
      .update({ status: "dismissed", reviewed_at: new Date().toISOString(), reviewed_by: context.userId })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const importQueueItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => IdsInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("business_discovery_queue" as never)
      .select("*")
      .in("id", data.ids)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";
    const photoBase = "https://places.googleapis.com/v1";

    const inserts = (rows ?? [])
      .filter((r: any) => r.our_type && r.lat != null && r.lng != null)
      .map((r: any) => {
        const photoUrl = r.photo_name
          ? `${photoBase}/${r.photo_name}/media?maxWidthPx=1200&key=${encodeURIComponent(apiKey)}`
          : null;
        return {
          slug: `${slugify(r.name) || "business"}-${String(r.external_id).slice(-6).toLowerCase()}`,
          name: r.name,
          type_slug: r.our_type,
          street_address: r.address,
          lat: r.lat,
          lng: r.lng,
          phone: r.phone,
          website: r.website,
          rating_avg: r.rating ?? 0,
          rating_count: r.rating_count ?? 0,
          region: r.region,
          city: r.city,
          status: "active" as const,
          claim_state: "unclaimed",
          source: "google_places",
          source_external_id: r.external_id,
          attribution: "Listing data © Google",
          import_metadata: { google_types: r.types, photo_name: r.photo_name, via: "auto_sync" },
          photos: photoUrl ? [{ url: photoUrl, source: "google" }] : [],
          cover_url: photoUrl,
          owner_id: null,
        };
      });

    let imported = 0;
    if (inserts.length) {
      const { data: ins, error: insErr } = await (supabaseAdmin as any)
        .from("businesses")
        .upsert(inserts, { onConflict: "source,source_external_id", ignoreDuplicates: true })
        .select("id");
      if (insErr) throw new Error(insErr.message);
      imported = ins?.length ?? 0;
    }

    const importedIds = (rows ?? []).filter((r: any) => r.our_type && r.lat != null && r.lng != null).map((r: any) => r.id);
    const skippedIds = (rows ?? []).filter((r: any) => !(r.our_type && r.lat != null && r.lng != null)).map((r: any) => r.id);

    if (importedIds.length) {
      await supabaseAdmin
        .from("business_discovery_queue" as never)
        .update({ status: "imported", reviewed_at: new Date().toISOString(), reviewed_by: context.userId })
        .in("id", importedIds);
    }

    return { imported, marked_imported: importedIds.length, skipped: skippedIds.length };
  });

// ---------- Run now (manual trigger) ----------

const RunNowInput = z.object({ searchIds: z.array(z.string().uuid()).max(50).optional() }).default({});

export const runDiscoverySyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RunNowInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { runDiscoverySync } = await import("./business-discovery-sync.server");
    const summary = await runDiscoverySync({ searchIds: data.searchIds });
    return summary;
  });
