import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Public reads ----------

/** List countries 365 Parts is (or will be) available in. */
export const listPartsCountries = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("parts_countries")
    .select("code,name,currency_code,is_active,sort_order,launched_at")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

/** Public outlet directory for a given country (active only). */
export const listPartsOutlets = createServerFn({ method: "POST" })
  .inputValidator((d: { country?: string; brand?: string; outlet_type?: string } | undefined) =>
    z
      .object({
        country: z.string().trim().length(2).optional(),
        brand: z.string().trim().max(60).optional(),
        outlet_type: z.string().trim().max(40).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("parts_outlets")
      .select(
        "id,country_code,name,slug,outlet_type,brands,region,city,phone,website,is_verified,is_d2c_enabled",
      )
      .eq("is_active", true)
      .order("is_verified", { ascending: false })
      .order("name", { ascending: true })
      .limit(200);
    if (data.country) q = q.eq("country_code", data.country.toUpperCase());
    if (data.outlet_type) q = q.eq("outlet_type", data.outlet_type);
    if (data.brand) q = q.contains("brands", [data.brand]);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Search outlets that carry a given brand in a country (for OEM search results). */
export const searchOemOutlets = createServerFn({ method: "POST" })
  .inputValidator((d: { country: string; make: string; model?: string; year?: number } | undefined) =>
    z
      .object({
        country: z.string().trim().length(2),
        make: z.string().trim().min(1).max(60),
        model: z.string().trim().max(80).optional(),
        year: z.number().int().min(1900).max(2100).optional(),
      })
      .parse(d ?? ({} as any)),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const make = data.make.trim();
    // Match brand case-insensitively by checking both raw and title-cased variants.
    const variants = Array.from(
      new Set([
        make,
        make.toLowerCase(),
        make.toUpperCase(),
        make[0].toUpperCase() + make.slice(1).toLowerCase(),
      ]),
    );
    const { data: rows, error } = await supabaseAdmin
      .from("parts_outlets")
      .select(
        "id,country_code,name,slug,outlet_type,brands,region,city,phone,website,is_verified,is_d2c_enabled",
      )
      .eq("is_active", true)
      .eq("country_code", data.country.toUpperCase())
      .overlaps("brands", variants)
      .order("is_verified", { ascending: false })
      .order("is_d2c_enabled", { ascending: false })
      .order("name", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- Admin ----------

async function requireStaff(context: any) {
  const { data: admin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (admin) return;
  const { data: mod } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "moderator",
  });
  if (!mod) throw new Error("Forbidden");
}

async function requireAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const adminListCountries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("parts_countries")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const CountrySchema = z.object({
  code: z.string().trim().toUpperCase().length(2),
  name: z.string().trim().min(1).max(80),
  currency_code: z.string().trim().toUpperCase().length(3),
  is_active: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export const adminUpsertCountry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CountrySchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = { ...data };
    if (data.is_active) patch.launched_at = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("parts_countries")
      .upsert(patch, { onConflict: "code" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListOutlets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { country?: string } | undefined) =>
    z.object({ country: z.string().trim().length(2).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("parts_outlets")
      .select("*")
      .order("country_code", { ascending: true })
      .order("name", { ascending: true })
      .limit(500);
    if (data.country) q = q.eq("country_code", data.country.toUpperCase());
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const OutletSchema = z.object({
  id: z.string().uuid().optional(),
  country_code: z.string().trim().toUpperCase().length(2),
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/i, "Slug: lowercase letters, numbers, hyphens"),
  outlet_type: z.enum(["oem_dealer", "parts_shop", "junkyard", "online", "distributor"]),
  brands: z.array(z.string().trim().min(1).max(60)).default([]),
  region: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional().or(z.literal("").transform(() => null)),
  website: z.string().trim().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  contact_name: z.string().trim().max(120).nullable().optional(),
  contact_role: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  is_active: z.boolean().default(true),
  is_verified: z.boolean().default(false),
  is_d2c_enabled: z.boolean().default(false),
  commission_pct: z.number().min(0).max(100).nullable().optional(),
  business_id: z.string().uuid().nullable().optional(),
});

export const adminUpsertOutlet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OutletSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row: any = { ...data };
    if (!row.id) row.created_by = context.userId;
    const { error } = await supabaseAdmin.from("parts_outlets").upsert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteOutlet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("parts_outlets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
