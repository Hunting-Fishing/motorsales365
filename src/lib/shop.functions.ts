import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { cleanShopUrl, detectNetworkSlug } from "@/lib/shop-url";

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
    brand?: string;
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
      brand: z.string().max(120).optional(),
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
    if (data.brand) q = q.ilike("brand", data.brand);
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

export const listShopBrands = createServerFn({ method: "GET" })
  .inputValidator((input: { categorySlug?: string } = {}) =>
    z.object({ categorySlug: z.string().max(80).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    let cat: string | null = null;
    if (data.categorySlug) {
      const { data: c } = await supabaseAdmin.from("shop_categories").select("id").eq("slug", data.categorySlug).maybeSingle();
      cat = c?.id ?? null;
      if (!cat) return { brands: [] as string[] };
    }
    let q = supabaseAdmin.from("shop_products").select("brand").eq("active", true).not("brand", "is", null);
    if (cat) q = q.eq("category_id", cat);
    const { data: rows, error } = await q.limit(1000);
    if (error) throw new Error(error.message);
    const set = new Set<string>();
    for (const r of rows ?? []) {
      const b = (r as any).brand?.trim();
      if (b) set.add(b);
    }
    return { brands: Array.from(set).sort((a, b) => a.localeCompare(b)) };
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

const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), schema);

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const productSchema = z.object({
  id: emptyToNull(z.string().uuid().nullable()).optional(),
  slug: emptyToNull(z.string().max(120).regex(/^[a-z0-9-]+$/).nullable()).optional(),
  title: z.string().min(1).max(200),
  description: emptyToNull(z.string().max(5000).nullable()).optional(),
  brand: emptyToNull(z.string().max(120).nullable()).optional(),
  image_url: emptyToNull(z.string().url().max(2000).nullable()).optional(),
  category_id: emptyToNull(z.string().uuid().nullable()).optional(),
  price_php: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().nullable(),
  ).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  universal_fit: z.boolean().optional(),
});

async function assertShopManagerInline(supabase: any, userId: string) {
  const { data: ok } = await supabase.rpc("can_manage_shop", { _user_id: userId });
  if (!ok) throw new Error("Forbidden");
}

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertShopManagerInline(supabase, userId);
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
    await assertShopManagerInline(supabase, userId);
    const { id, ...rest } = data as any;
    const slug = rest.slug || slugify(rest.title);
    if (!slug) throw new Error("A slug or title is required");
    const payload: any = { ...rest, slug, created_by: userId };
    if (id) {
      const { error } = await supabase.from("shop_products").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase.from("shop_products").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertShopManagerInline(context.supabase, context.userId);
    const { error } = await context.supabase.from("shop_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertShopManager(supabase: any, userId: string) {
  const { data: ok } = await supabase.rpc("can_manage_shop", { _user_id: userId });
  if (!ok) throw new Error("Forbidden");
}

export const adminListNetworks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertShopManager(context.supabase, context.userId);
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
    await assertShopManager(context.supabase, context.userId);
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
    await assertShopManager(context.supabase, context.userId);
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
    await assertShopManager(context.supabase, context.userId);
    const { error } = await context.supabase.from("shop_product_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminProductLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string }) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertShopManager(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("shop_product_links")
      .select("*, network:affiliate_networks(id, slug, name)")
      .eq("product_id", data.productId);
    if (error) throw new Error(error.message);
    return { links: rows ?? [] };
  });

// ============ FITMENT ============

const fitmentSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  category: z.enum(["car", "motorcycle"]).default("car"),
  make: z.string().max(80).optional().nullable(),
  model: z.string().max(120).optional().nullable(),
  year_start: z.number().int().min(1900).max(2100).optional().nullable(),
  year_end: z.number().int().min(1900).max(2100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const adminListFitment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string }) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertShopManager(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("shop_product_fitment")
      .select("*")
      .eq("product_id", data.productId)
      .order("make", { ascending: true });
    if (error) throw new Error(error.message);
    return { fitment: rows ?? [] };
  });

export const adminUpsertFitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => fitmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertShopManager(context.supabase, context.userId);
    if (data.id) {
      const { error } = await context.supabase.from("shop_product_fitment").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("shop_product_fitment").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteFitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertShopManager(context.supabase, context.userId);
    const { error } = await context.supabase.from("shop_product_fitment").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ SHOP FAVORITES ============

export const listShopFavoriteIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("shop_favorites")
      .select("product_id")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ids: (data ?? []).map((r: any) => r.product_id as string) };
  });

export const listShopFavoriteProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("shop_favorites")
      .select("created_at, product:shop_products(id, slug, title, brand, image_url, price_php, currency, featured, universal_fit, active)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const products = (data ?? [])
      .map((r: any) => r.product)
      .filter((p: any) => p && p.active);
    return { products };
  });

export const toggleShopFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string; favorite: boolean }) =>
    z.object({
      productId: z.string().uuid(),
      favorite: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.favorite) {
      const { error } = await supabase
        .from("shop_favorites")
        .upsert({ user_id: userId, product_id: data.productId }, { onConflict: "user_id,product_id" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("shop_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", data.productId);
      if (error) throw new Error(error.message);
    }
    return { ok: true, favorite: data.favorite };
  });
