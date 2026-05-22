import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============ PUBLIC ============

export const listShopCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("shop_categories")
    .select("id, slug, name, description, icon, sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return { categories: data ?? [] };
});

export const listShopProducts = createServerFn({ method: "GET" })
  .inputValidator((input: {
    categorySlug?: string; featured?: boolean; search?: string; limit?: number;
    make?: string; model?: string; year?: number; includeUniversal?: boolean;
  } = {}) =>
    z.object({
      categorySlug: z.string().max(80).optional(),
      featured: z.boolean().optional(),
      search: z.string().max(120).optional(),
      limit: z.number().int().min(1).max(60).optional(),
      make: z.string().max(80).optional(),
      model: z.string().max(120).optional(),
      year: z.number().int().min(1900).max(2100).optional(),
      includeUniversal: z.boolean().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    let cat: string | null = null;
    if (data.categorySlug) {
      const { data: c } = await supabaseAdmin.from("shop_categories").select("id").eq("slug", data.categorySlug).maybeSingle();
      cat = c?.id ?? null;
      if (!cat) return { products: [] };
    }

    // Vehicle fitment filter: find matching product_ids first, then filter.
    let allowedIds: Set<string> | null = null;
    if (data.make && data.model) {
      let fq = supabaseAdmin
        .from("shop_product_fitment")
        .select("product_id, make, model, year_start, year_end");
      // make matches or is null (any-make rule)
      fq = fq.or(`make.is.null,make.ilike.${data.make}`);
      const { data: rows, error: fErr } = await fq.limit(5000);
      if (fErr) throw new Error(fErr.message);
      const matched = (rows ?? []).filter((r: any) => {
        const modelOk = !r.model || r.model.toLowerCase() === data.model!.toLowerCase();
        if (!modelOk) return false;
        if (data.year) {
          if (r.year_start && data.year < r.year_start) return false;
          if (r.year_end && data.year > r.year_end) return false;
        }
        return true;
      });
      allowedIds = new Set(matched.map((r: any) => r.product_id));
    }

    let q = supabaseAdmin
      .from("shop_products")
      .select("id, slug, title, brand, image_url, price_php, currency, featured, category_id, click_count, universal_fit")
      .eq("active", true);
    if (cat) q = q.eq("category_id", cat);
    if (data.featured) q = q.eq("featured", true);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    const { data: rows, error } = await q
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 24);
    if (error) throw new Error(error.message);

    let products = rows ?? [];
    if (allowedIds) {
      const includeU = data.includeUniversal ?? true;
      products = products.filter((p: any) => allowedIds!.has(p.id) || (includeU && p.universal_fit));
    }
    return { products };
  });

export const getShopProduct = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const { data: product, error } = await supabaseAdmin
      .from("shop_products")
      .select("*, category:shop_categories(slug, name)")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!product) return { product: null, links: [], fitment: [] };
    const [{ data: links }, { data: fitment }] = await Promise.all([
      supabaseAdmin
        .from("shop_product_links")
        .select("id, url, sku, network:affiliate_networks(id, slug, name, tag_param, tag_value, deeplink_template, active)")
        .eq("product_id", product.id),
      supabaseAdmin
        .from("shop_product_fitment")
        .select("id, category, make, model, year_start, year_end, notes")
        .eq("product_id", product.id)
        .order("make", { ascending: true }),
    ]);
    const visible = (links ?? []).filter((l: any) => l.network?.active);
    return { product, links: visible, fitment: fitment ?? [] };
  });

// ============ ADMIN ============

const productSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  brand: z.string().max(120).optional().nullable(),
  image_url: z.string().url().max(2000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  price_php: z.number().nonnegative().optional().nullable(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  universal_fit: z.boolean().optional(),
});

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase.rpc("can_manage_shop", { _user_id: userId });
    if (!ok) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("shop_products")
      .select("*, category:shop_categories(name, slug)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { products: data ?? [] };
  });

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, created_by: userId };
    if (data.id) {
      const { error } = await supabase.from("shop_products").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase.from("shop_products").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shop_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListNetworks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("affiliate_networks").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return { networks: data ?? [] };
  });

export const adminUpsertNetwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      slug: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/),
      name: z.string().min(1).max(120),
      tag_param: z.string().max(60).optional().nullable(),
      tag_value: z.string().max(200).optional().nullable(),
      deeplink_template: z.string().max(2000).optional().nullable(),
      active: z.boolean().optional(),
      sort_order: z.number().int().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("affiliate_networks").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("affiliate_networks").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminUpsertLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      product_id: z.string().uuid(),
      network_id: z.string().uuid(),
      url: z.string().url().max(2000),
      sku: z.string().max(120).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.id) {
      const { error } = await supabase.from("shop_product_links").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("shop_product_links")
      .upsert(data, { onConflict: "product_id,network_id" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shop_product_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminProductLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string }) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("shop_product_links")
      .select("*, network:affiliate_networks(id, slug, name)")
      .eq("product_id", data.productId);
    if (error) throw new Error(error.message);
    return { links: rows ?? [] };
  });
