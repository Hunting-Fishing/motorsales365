import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type NetworkPartner = {
  storefront_slug: string;
  company_name: string;
  country: string;
  business_kind: string;
  website: string | null;
  storefront_blurb: string | null;
  storefront_logo_url: string | null;
  storefront_categories: string[] | null;
};

/**
 * Public: published 365 network partners (parts stores, shops, wholesalers).
 * Reads the published-only view, so nothing unapproved is ever exposed.
 */
export const listNetworkPartners = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; country?: string; kind?: string } | undefined) => ({
    q: (d?.q ?? "").toString().trim().slice(0, 80),
    country: (d?.country ?? "").toString().trim().toUpperCase().slice(0, 2),
    kind: (d?.kind ?? "").toString().trim().slice(0, 60),
  }))
  .handler(async ({ data }): Promise<NetworkPartner[]> => {
    const sb = publicClient();
    let q = sb
      .from("partner_storefronts_public" as any)
      .select(
        "storefront_slug,company_name,country,business_kind,website,storefront_blurb,storefront_logo_url,storefront_categories",
      )
      .order("company_name", { ascending: true })
      .limit(200);
    if (data.country) q = q.eq("country", data.country);
    if (data.kind) q = q.eq("business_kind", data.kind);
    if (data.q) q = q.ilike("company_name", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) return [];
    return ((rows as any[]) ?? []).filter((r) => r.storefront_slug) as NetworkPartner[];
  });

export type MyPartnerApplication = {
  id: string;
  company_name: string;
  business_kind: string;
  partnership_type: string;
  country: string;
  status: string;
  storefront_slug: string | null;
  storefront_published: boolean;
  created_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
};

/**
 * Authenticated: the partner applications submitted with this user's own
 * confirmed email address. Requires a verified email so an unverified account
 * can never read another business's application by claiming their address.
 */
export const myPartnerApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyPartnerApplication[]> => {
    const claims = context.claims as any;
    const verified = claims?.email_verified ?? claims?.user_metadata?.email_verified;
    const email = (claims?.email ?? "").toString().trim().toLowerCase();
    if (!email || verified !== true) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("parts_supplier_applications" as any)
      .select(
        "id,company_name,business_kind,partnership_type,country,status,storefront_slug,storefront_published,created_at,reviewed_at,admin_notes",
      )
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return ((data as any[]) ?? []) as MyPartnerApplication[];
  });
