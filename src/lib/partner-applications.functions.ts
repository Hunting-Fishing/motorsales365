import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const PartnershipType = z.enum([
  "affiliate",
  "api",
  "wholesale",
  "dropship",
  "sponsored",
  "other",
]);

const DocItem = z.object({
  name: z.string().max(200),
  path: z.string().max(400),
  size: z.number().int().nonnegative().optional(),
  type: z.string().max(120).optional(),
  kind: z.string().max(60).optional(), // e.g. "business_permit", "tax_cert", "id"
});

const SubmitInput = z.object({
  company_name: z.string().trim().min(2).max(120),
  contact_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  country: z.string().trim().min(2).max(40).default("PH"),
  business_kind: z.string().trim().min(2).max(60),
  partnership_type: PartnershipType,
  monthly_volume: z.string().trim().max(60).optional().nullable(),
  brands_carried: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  // Onboarding (optional so the short /partners/parts form still works)
  legal_business_name: z.string().trim().max(160).optional().nullable(),
  tax_id: z.string().trim().max(60).optional().nullable(),
  business_address: z.string().trim().max(240).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  province_state: z.string().trim().max(80).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  years_in_business: z.number().int().min(0).max(200).optional().nullable(),
  warehouse_locations: z.string().trim().max(500).optional().nullable(),
  ships_nationwide: z.boolean().optional(),
  payment_terms: z.string().trim().max(120).optional().nullable(),
  catalog_feed_url: z.string().trim().max(300).optional().nullable(),
  catalog_feed_format: z.string().trim().max(40).optional().nullable(),
  documents: z.array(DocItem).max(20).optional(),
  agreed_terms: z.boolean().optional(),
});

/** Public: submit a B2B parts-supplier / affiliate partnership application. */
export const submitPartnerApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { error } = await sb
      .from("parts_supplier_applications" as any)
      .insert({
        company_name: data.company_name,
        contact_name: data.contact_name,
        email: data.email,
        phone: data.phone || null,
        website: data.website || null,
        country: data.country,
        business_kind: data.business_kind,
        partnership_type: data.partnership_type,
        monthly_volume: data.monthly_volume || null,
        brands_carried: data.brands_carried || null,
        notes: data.notes || null,
        legal_business_name: data.legal_business_name || null,
        tax_id: data.tax_id || null,
        business_address: data.business_address || null,
        city: data.city || null,
        province_state: data.province_state || null,
        postal_code: data.postal_code || null,
        years_in_business: data.years_in_business ?? null,
        warehouse_locations: data.warehouse_locations || null,
        ships_nationwide: data.ships_nationwide ?? false,
        payment_terms: data.payment_terms || null,
        catalog_feed_url: data.catalog_feed_url || null,
        catalog_feed_format: data.catalog_feed_format || null,
        documents: data.documents ?? [],
        agreed_terms: data.agreed_terms ?? false,
        agreed_terms_at: data.agreed_terms ? new Date().toISOString() : null,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Public storefront ----

export type PartnerStorefront = {
  storefront_slug: string;
  company_name: string;
  country: string;
  business_kind: string;
  website: string | null;
  storefront_blurb: string | null;
  storefront_logo_url: string | null;
  storefront_categories: string[] | null;
};

/** Public: fetch a published partner storefront by slug. */
export const getPartnerStorefront = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<PartnerStorefront | null> => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("parts_supplier_applications" as any)
      .select(
        "storefront_slug,company_name,country,business_kind,website,storefront_blurb,storefront_logo_url,storefront_categories",
      )
      .eq("storefront_slug", data.slug)
      .eq("storefront_published", true)
      .maybeSingle();
    return (row as any) ?? null;
  });

/** Public: list all published partner storefronts (for /shop index). */
export const listPartnerStorefronts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PartnerStorefront[]> => {
    const sb = publicClient();
    const { data } = await sb
      .from("parts_supplier_applications" as any)
      .select(
        "storefront_slug,company_name,country,business_kind,website,storefront_blurb,storefront_logo_url,storefront_categories",
      )
      .eq("storefront_published", true)
      .order("company_name", { ascending: true });
    return ((data as any) ?? []) as PartnerStorefront[];
  },
);


// ---- Admin ----

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const adminListPartnerApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("parts_supplier_applications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data as any[]) ?? [];
  });

export const adminUpdatePartnerApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      status?: "pending" | "reviewing" | "approved" | "rejected";
      admin_notes?: string | null;
      storefront_slug?: string | null;
      storefront_published?: boolean;
      storefront_blurb?: string | null;
      storefront_logo_url?: string | null;
      storefront_categories?: string[] | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: any = {};
    if (data.status) {
      patch.status = data.status;
      patch.reviewed_by = context.userId;
      patch.reviewed_at = new Date().toISOString();
    }
    if (typeof data.admin_notes === "string") patch.admin_notes = data.admin_notes;
    if (data.storefront_slug !== undefined) {
      const s = (data.storefront_slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      patch.storefront_slug = s || null;
    }
    if (data.storefront_published !== undefined) patch.storefront_published = data.storefront_published;
    if (data.storefront_blurb !== undefined) patch.storefront_blurb = data.storefront_blurb;
    if (data.storefront_logo_url !== undefined) patch.storefront_logo_url = data.storefront_logo_url;
    if (data.storefront_categories !== undefined) patch.storefront_categories = data.storefront_categories;
    const { error } = await context.supabase
      .from("parts_supplier_applications" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });


/** Admin: produce a signed URL to view an uploaded supplier document. */
export const adminGetSupplierDocUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string; expiresIn?: number }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("supplier-docs")
      .createSignedUrl(data.path, data.expiresIn ?? 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
