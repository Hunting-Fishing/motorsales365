import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ItemSchema = z.object({
  kind: z.enum(["catalog", "custom"]),
  catalog_id: z.string().uuid().optional().nullable(),
  label: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(99).optional().nullable(),
});

/** Read listing.attributes.needed_parts + join in any matched catalog rows. */
export const getNeededPartsForListing = createServerFn({ method: "POST" })
  .inputValidator((d: { listingId: string }) =>
    z.object({ listingId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listing } = await supabaseAdmin
      .from("listings")
      .select("id,attributes,category_slug")
      .eq("id", data.listingId)
      .maybeSingle();
    if (!listing) return { needed: [], tireSize: null, suggested: [] };

    const attrs = (listing.attributes ?? {}) as any;
    const needed = Array.isArray(attrs.needed_parts) ? attrs.needed_parts : [];
    const tireSize: string | null = attrs.tire_size_confirmed ?? null;
    const make: string | null = attrs.make ?? null;

    // Build a suggested catalog set: match by category keys present in needed[], plus tires if tireSize is set.
    const wantedCats = new Set<string>();
    for (const n of needed) {
      if (typeof n?.category === "string") wantedCats.add(n.category);
    }
    if (tireSize) wantedCats.add("tires");

    let suggested: any[] = [];
    if (wantedCats.size > 0) {
      const { data: cat } = await supabaseAdmin
        .from("parts_catalog")
        .select("id,slug,title,description,category,base_price_php,photo_url,compatible_makes")
        .eq("active", true)
        .in("category", Array.from(wantedCats))
        .order("sort_order", { ascending: true })
        .limit(24);
      suggested = (cat ?? []).filter((row: any) => {
        if (!row.compatible_makes?.length || !make) return true;
        return row.compatible_makes.some(
          (m: string) => m.toLowerCase() === String(make).toLowerCase(),
        );
      });
    }
    return { needed, tireSize, suggested };
  });

/**
 * Look up factory tire spec for a given vehicle.
 * Returns a status so the UI can show validation/confirmation prompts when uncertain.
 *  - matched:   exactly one spec matches make+model (+year if given)
 *  - uncertain: model found but year is out of any known range, or multiple specs match
 *  - none:      no spec on file for this make/model
 */
export const getTireSpec = createServerFn({ method: "POST" })
  .inputValidator((d: { make: string; model: string; year?: number; engine?: string }) =>
    z
      .object({
        make: z.string().min(1).max(100),
        model: z.string().min(1).max(100),
        year: z.number().int().min(1900).max(2100).optional(),
        engine: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("vehicle_tire_specs")
      .select("*")
      .ilike("make", data.make)
      .ilike("model", data.model);
    if (!rows?.length) {
      return { status: "none" as const, match: null, candidates: [] };
    }
    const y = data.year ?? null;
    const inRange = (r: any) =>
      y != null && (!r.year_min || y >= r.year_min) && (!r.year_max || y <= r.year_max);
    const yearMatches = y != null ? rows.filter(inRange) : rows;

    if (y != null && yearMatches.length === 0) {
      // Model known but no spec covers this year — flag as uncertain.
      return { status: "uncertain" as const, match: null, candidates: rows };
    }
    if (yearMatches.length === 1) {
      return { status: "matched" as const, match: yearMatches[0], candidates: yearMatches };
    }
    // Multiple overlapping rows (e.g. trim/engine variants) — let user pick.
    return { status: "uncertain" as const, match: yearMatches[0], candidates: yearMatches };
  });



/** Anyone can submit a quote request. Server enforces shape + light rate limit. */
export const createPartQuoteRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        listingId: z.string().uuid().optional().nullable(),
        rideId: z.string().uuid().optional().nullable(),
        contact_name: z.string().trim().min(1).max(120),
        contact_phone: z.string().trim().max(40).optional().nullable(),
        contact_email: z.string().trim().email().max(255).optional().nullable(),
        delivery_method: z.enum(["pickup", "delivery"]).default("pickup"),
        notes: z.string().trim().max(2000).optional().nullable(),
        items: z.array(ItemSchema).min(1).max(40),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Light rate limit: cap to 5 requests per email per hour.
    if (data.contact_email) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("part_quote_requests")
        .select("id", { count: "exact", head: true })
        .eq("contact_email", data.contact_email)
        .gte("created_at", since);
      if ((count ?? 0) >= 5) {
        throw new Error("Too many recent quote requests. Please try again later.");
      }
    }
    const { data: row, error } = await supabaseAdmin
      .from("part_quote_requests")
      .insert({
        listing_id: data.listingId ?? null,
        ride_id: data.rideId ?? null,
        contact_name: data.contact_name,
        contact_phone: data.contact_phone ?? null,
        contact_email: data.contact_email ?? null,
        delivery_method: data.delivery_method,
        notes: data.notes ?? null,
        items: data.items,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ---------- Admin ----------

async function requireAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const adminListQuoteRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } | undefined) =>
    z.object({ status: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("part_quote_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpdateQuoteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "quoted", "accepted", "rejected", "cancelled"]).optional(),
        internal_notes: z.string().max(4000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = {};
    if (data.status) patch.status = data.status;
    if (data.internal_notes !== undefined) patch.internal_notes = data.internal_notes;
    const { error } = await supabaseAdmin
      .from("part_quote_requests")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("parts_catalog")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const CatalogSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().trim().min(1).max(60),
  base_price_php: z.number().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  compatible_makes: z.array(z.string()).default([]),
  compatible_models: z.array(z.string()).default([]),
  year_min: z.number().int().nullable().optional(),
  year_max: z.number().int().nullable().optional(),
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const adminUpsertCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CatalogSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("parts_catalog").upsert(data as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("parts_catalog").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListTireSpecs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("vehicle_tire_specs")
      .select("*")
      .order("make")
      .order("model");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const TireSpecSchema = z.object({
  id: z.string().uuid().optional(),
  make: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  year_min: z.number().int().nullable().optional(),
  year_max: z.number().int().nullable().optional(),
  front_size: z.string().trim().max(40).nullable().optional(),
  rear_size: z.string().trim().max(40).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const adminUpsertTireSpec = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TireSpecSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("vehicle_tire_specs").upsert(data as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTireSpec = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("vehicle_tire_specs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- OEM parts interest (Coming Soon ordering capture) ----------

const OemInterestSchema = z
  .object({
    vin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-HJ-NPR-Z0-9]{11,17}$/i, "VIN/chassis must be 11–17 characters (no I, O, Q)")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    make: z.string().trim().max(100).optional().or(z.literal("").transform(() => undefined)),
    model: z.string().trim().max(100).optional().or(z.literal("").transform(() => undefined)),
    year: z
      .number()
      .int()
      .min(1900)
      .max(2100)
      .optional()
      .nullable(),
    trim: z.string().trim().max(100).optional().or(z.literal("").transform(() => undefined)),
    engine: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
    parts_description: z.string().trim().min(5).max(1000),
    contact_email: z.string().trim().email().max(255),
    contact_phone: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
    source: z.string().trim().max(50).optional(),
  })
  .refine((d) => !!d.vin || (!!d.make && !!d.model && !!d.year), {
    message: "Provide a VIN/chassis number, or make + model + year.",
    path: ["vin"],
  });

export const submitOemPartsInterest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => OemInterestSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Best-effort rate limit: max 5 submissions per email per hour.
    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("oem_parts_interest")
      .select("id", { count: "exact", head: true })
      .eq("contact_email", data.contact_email)
      .gte("created_at", sinceIso);
    if ((count ?? 0) >= 5) {
      throw new Error("Too many submissions from this email — please try again later.");
    }

    const { error } = await supabaseAdmin.from("oem_parts_interest").insert({
      vin: data.vin ?? null,
      make: data.make ?? null,
      model: data.model ?? null,
      year: data.year ?? null,
      trim: data.trim ?? null,
      engine: data.engine ?? null,
      parts_description: data.parts_description,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone ?? null,
      source: data.source ?? "parts_page",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListPartsInterest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } | undefined) =>
    z.object({ status: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("oem_parts_interest")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpdatePartsInterest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status?: string; admin_notes?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "quoted", "closed_won", "closed_lost"]).optional(),
        admin_notes: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = {};
    if (data.status) patch.status = data.status;
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await supabaseAdmin
      .from("oem_parts_interest")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
