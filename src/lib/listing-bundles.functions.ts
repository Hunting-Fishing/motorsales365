import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// PUBLIC: list active bundles
export const listListingBundles = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("listing_bundles")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("price_php", { ascending: true });
    if (error) throw new Error(error.message);
    return { bundles: data ?? [] };
  });

// AUTHENTICATED: list my purchases
export const listMyBundlePurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("bundle_purchases")
      .select("*, bundle:listing_bundles(name, listing_credits, boost_credits, duration_days)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { purchases: data ?? [] };
  });

// AUTHENTICATED: purchase a bundle (records intent; payment handled via existing payments flow downstream)
export const purchaseBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bundleId: string; businessId?: string }) =>
    z
      .object({
        bundleId: z.string().uuid(),
        businessId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: bundle, error: bErr } = await supabaseAdmin
      .from("listing_bundles")
      .select("*")
      .eq("id", data.bundleId)
      .eq("is_active", true)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!bundle) throw new Error("Bundle not found.");

    const expiresAt = new Date(Date.now() + ((bundle as any).duration_days ?? 30) * 24 * 60 * 60 * 1000);
    const { data: row, error } = await supabaseAdmin
      .from("bundle_purchases")
      .insert({
        user_id: userId,
        business_id: data.businessId ?? null,
        bundle_id: data.bundleId,
        listing_credits_remaining: (bundle as any).listing_credits,
        boost_credits_remaining: (bundle as any).boost_credits,
        expires_at: expiresAt.toISOString(),
        price_paid_php: (bundle as any).price_php,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id, expiresAt: expiresAt.toISOString() };
  });

// ADMIN: upsert
export const adminUpsertBundle = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("bundles.upsert")])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional().nullable(),
        listing_credits: z.number().int().min(0).max(1000),
        boost_credits: z.number().int().min(0).max(1000),
        duration_days: z.number().int().min(1).max(365),
        price_php: z.number().min(0).max(99999999),
        is_active: z.boolean().default(true),
        sort_order: z.number().int().min(0).max(1000).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.id) {
      const id = data.id;
      const { id: _omit, ...payload } = data;
      const { error } = await supabaseAdmin.from("listing_bundles").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("listing_bundles")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const adminListBundles = createServerFn({ method: "GET" })
  .middleware([requireAdminRoleAudited("bundles.list")])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("listing_bundles")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { bundles: data ?? [] };
  });
