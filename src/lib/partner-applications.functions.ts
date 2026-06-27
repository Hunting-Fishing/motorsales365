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
    (d: { id: string; status: "pending" | "reviewing" | "approved" | "rejected"; admin_notes?: string | null }) => d,
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: any = {
      status: data.status,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    };
    if (typeof data.admin_notes === "string") patch.admin_notes = data.admin_notes;
    const { error } = await context.supabase
      .from("parts_supplier_applications" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
