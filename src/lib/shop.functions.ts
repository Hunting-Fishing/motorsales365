import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireDomainRole } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { cleanShopUrl, detectNetworkSlug, isShortLink, looksLikeIconImage } from "@/lib/shop-url";
import { scrapeLazadaProduct } from "@/lib/lazada-scraper.server";
import { scrapeAliExpressProduct } from "@/lib/aliexpress-scraper.server";
import type { Database } from "@/integrations/supabase/types";

type ShopProductUpdate = Database["public"]["Tables"]["shop_products"]["Update"];

// ============ PUBLIC ============

export const listShopCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("shop_categories")
    .select(
      "id, slug, name, description, icon, sort_order, parent_id, hero_image_url, department_slug, cross_department_slugs",
    )
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return { categories: data ?? [] };
});

export const listShopDepartments = createServerFn({ method: "GET" }).handler(async () => {
  const [{ data: deps, error: dErr }, { data: cats, error: cErr }, { data: pcRows }] =
    await Promise.all([
      supabaseAdmin.from("shop_departments").select("*").eq("active", true).order("sort_order"),
      supabaseAdmin
        .from("shop_categories")
        .select(
          "id, slug, name, description, icon, sort_order, parent_id, hero_image_url, department_slug, cross_department_slugs",
        )
        .eq("active", true)
        .order("sort_order"),
      supabaseAdmin.from("shop_product_categories").select("category_id").limit(5000),
    ]);
  if (dErr) throw new Error(dErr.message);
  if (cErr) throw new Error(cErr.message);
  const counts = new Map<string, number>();
  for (const r of pcRows ?? [])
    counts.set((r as any).category_id, (counts.get((r as any).category_id) ?? 0) + 1);
  const all = (cats ?? []).map((c: any) => ({ ...c, product_count: counts.get(c.id) ?? 0 }));
  const tops = all.filter((c: any) => !c.parent_id);
  const childrenOf = (parentId: string) => all.filter((c: any) => c.parent_id === parentId);

  const departments = (deps ?? []).map((d: any) => {
    const primary = tops.filter((t: any) => t.department_slug === d.slug);
    const crossChildren = all.filter(
      (c: any) =>
        Array.isArray(c.cross_department_slugs) && c.cross_department_slugs.includes(d.slug),
    );
    return {
      ...d,
      categories: primary.map((p: any) => ({ ...p, children: childrenOf(p.id) })),
      cross_categories: crossChildren,
      product_count: primary.reduce(
        (sum: number, p: any) =>
          sum +
          p.product_count +
          childrenOf(p.id).reduce((s: number, c: any) => s + c.product_count, 0),
        0,
      ),
    };
  });
  return { departments };
});

export const listShopCategoryTree = createServerFn({ method: "GET" }).handler(async () => {
  const [{ data: cats, error }, { data: deps }] = await Promise.all([
    supabaseAdmin
      .from("shop_categories")
      .select(
        "id, slug, name, description, icon, sort_order, parent_id, hero_image_url, department_slug",
      )
      .eq("active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("shop_departments")
      .select("slug, name, sort_order")
      .eq("active", true)
      .order("sort_order"),
  ]);
  if (error) throw new Error(error.message);

  const { data: pcRows } = await supabaseAdmin
    .from("shop_product_categories")
    .select("category_id")
    .limit(5000);
  const counts = new Map<string, number>();
  for (const r of pcRows ?? [])
    counts.set((r as any).category_id, (counts.get((r as any).category_id) ?? 0) + 1);

  const all = (cats ?? []).map((c: any) => ({ ...c, product_count: counts.get(c.id) ?? 0 }));
  const byParent = new Map<string | null, any[]>();
  for (const c of all) {
    const k = c.parent_id ?? null;
    const arr = byParent.get(k) ?? [];
    arr.push(c);
    byParent.set(k, arr);
  }
  const tree = (byParent.get(null) ?? []).map((parent: any) => ({
    ...parent,
    children: (byParent.get(parent.id) ?? []) as any[],
  }));
  return { tree, departments: deps ?? [] };
});

export const getShopDepartment = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: dep } = await supabaseAdmin
      .from("shop_departments")
      .select("*")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (!dep) return { department: null, categories: [], cross_categories: [] };
    const { data: cats } = await supabaseAdmin
      .from("shop_categories")
      .select(
        "id, slug, name, description, icon, parent_id, hero_image_url, department_slug, cross_department_slugs",
      )
      .eq("active", true)
      .order("sort_order");
    const all = cats ?? [];
    const tops = all.filter((c: any) => !c.parent_id && c.department_slug === data.slug);
    const categories = tops.map((p: any) => ({
      ...p,
      children: all.filter((c: any) => c.parent_id === p.id),
    }));
    const cross_categories = all.filter(
      (c: any) =>
        Array.isArray(c.cross_department_slugs) &&
        c.cross_department_slugs.includes(data.slug) &&
        c.department_slug !== data.slug,
    );
    return { department: dep, categories, cross_categories };
  });

export const getShopBreadcrumb = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const [{ data: cats }, { data: deps }] = await Promise.all([
      supabaseAdmin
        .from("shop_categories")
        .select("id, slug, name, parent_id, department_slug")
        .eq("active", true),
      supabaseAdmin.from("shop_departments").select("slug, name").eq("active", true),
    ]);
    const list = cats ?? [];
    const byId = new Map(list.map((c: any) => [c.id, c]));
    const depByslug = new Map((deps ?? []).map((d: any) => [d.slug, d]));
    const start = list.find((c: any) => c.slug === data.slug);
    if (!start) return { trail: [] };
    const trail: Array<{ slug: string; name: string }> = [];
    let cur: any = start;
    let guard = 0;
    let topDeptSlug: string | null = null;
    while (cur && guard++ < 8) {
      trail.unshift({ slug: cur.slug, name: cur.name });
      if (cur.department_slug) topDeptSlug = cur.department_slug;
      cur = cur.parent_id ? byId.get(cur.parent_id) : null;
    }
    if (topDeptSlug && depByslug.has(topDeptSlug)) {
      const d: any = depByslug.get(topDeptSlug);
      trail.unshift({ slug: `department/${d.slug}`, name: d.name });
    }
    return { trail };
  });

export const trackShopClick = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        linkId: z.string().uuid().optional(),
        referrer: z.string().max(500).optional(),
        utm_source: z.string().max(80).optional(),
        utm_medium: z.string().max(80).optional(),
        utm_campaign: z.string().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await supabaseAdmin.from("shop_click_events").insert({
      product_id: data.productId,
      link_id: data.linkId ?? null,
      referrer: data.referrer ?? null,
      utm_source: data.utm_source ?? null,
      utm_medium: data.utm_medium ?? null,
      utm_campaign: data.utm_campaign ?? null,
    });
    return { ok: true };
  });

export const listShopProducts = createServerFn({ method: "GET" })
  .inputValidator(
    (
      input: {
        categorySlug?: string;
        subSlugs?: string[];
        departmentSlug?: string;
        featured?: boolean;
        dealsOnly?: boolean;
        search?: string;
        limit?: number;
        make?: string;
        model?: string;
        year?: number;
        engine?: string;
        transmission?: string;
        includeUniversal?: boolean;
        brand?: string;
        priceMin?: number;
        priceMax?: number;
        sort?: "featured" | "newest" | "price_asc" | "price_desc" | "popular";
        network?: string;
      } = {},
    ) =>
      z
        .object({
          categorySlug: z.string().max(80).optional(),
          subSlugs: z.array(z.string().max(80)).max(20).optional(),
          departmentSlug: z.string().max(80).optional(),
          featured: z.boolean().optional(),
          dealsOnly: z.boolean().optional(),
          search: z.string().max(120).optional(),
          limit: z.number().int().min(1).max(60).optional(),
          make: z.string().max(80).optional(),
          model: z.string().max(120).optional(),
          year: z.number().int().min(1900).max(2100).optional(),
          engine: z.string().max(120).optional(),
          transmission: z.string().max(120).optional(),
          includeUniversal: z.boolean().optional(),
          brand: z.string().max(120).optional(),
          priceMin: z.number().nonnegative().optional(),
          priceMax: z.number().nonnegative().optional(),
          sort: z.enum(["featured", "newest", "price_asc", "price_desc", "popular"]).optional(),
          network: z.string().max(40).optional(),
        })
        .parse(input),
    )
  .handler(async ({ data }) => {
    // Resolve a primary category + any extra sub-category slugs to ids
    const wantedSlugs = new Set<string>();
    if (data.categorySlug) wantedSlugs.add(data.categorySlug);
    for (const s of data.subSlugs ?? []) wantedSlugs.add(s);

    // If a department is supplied, expand it to all category slugs that
    // belong (or are cross-tagged) to that department.
    if (data.departmentSlug && !data.categorySlug && (data.subSlugs?.length ?? 0) === 0) {
      const { data: depCats } = await supabaseAdmin
        .from("shop_categories")
        .select("slug, department_slug, cross_department_slugs")
        .eq("active", true);
      for (const c of depCats ?? []) {
        const own = (c as any).department_slug === data.departmentSlug;
        const cross =
          Array.isArray((c as any).cross_department_slugs) &&
          (c as any).cross_department_slugs.includes(data.departmentSlug);
        if (own || cross) wantedSlugs.add((c as any).slug);
      }
      if (wantedSlugs.size === 0) return { products: [] };
    }

    let catIds: string[] = [];
    if (wantedSlugs.size > 0) {
      const { data: rows } = await supabaseAdmin
        .from("shop_categories")
        .select("id, slug")
        .in("slug", Array.from(wantedSlugs));
      catIds = (rows ?? []).map((r: any) => r.id);
      if (catIds.length === 0) return { products: [] };
    }
    const cat: string | null = data.categorySlug ? (catIds[0] ?? null) : null;

    // Vehicle fitment filter: find matching product_ids first, then filter.
    let allowedIds: Set<string> | null = null;
    if (data.make && data.model) {
      let fq = supabaseAdmin
        .from("shop_product_fitment")
        .select("product_id, make, model, year_start, year_end, engine, transmission");
      // make matches or is null (any-make rule)
      fq = fq.or(`make.is.null,make.ilike.${data.make}`);
      const { data: rows, error: fErr } = await fq.limit(5000);
      if (fErr) throw new Error(fErr.message);
      const visitorEngine = data.engine?.trim().toLowerCase();
      const visitorTransmission = data.transmission?.trim().toLowerCase();
      const matched = (rows ?? []).filter((r: any) => {
        const modelOk = !r.model || r.model.toLowerCase() === data.model!.toLowerCase();
        if (!modelOk) return false;
        if (data.year) {
          if (r.year_start && data.year < r.year_start) return false;
          if (r.year_end && data.year > r.year_end) return false;
        }
        // Engine rule: if the rule pins an engine, only match when the visitor
        // supplied that same engine (case-insensitive). If the visitor hasn't
        // chosen an engine, engine-specific rules are ignored entirely so we
        // never hide otherwise-fitting parts.
        const ruleEngine = (r.engine ?? "").trim().toLowerCase();
        if (ruleEngine) {
          if (!visitorEngine) return true; // visitor hasn't narrowed yet
          if (ruleEngine !== visitorEngine) return false;
        }
        // Transmission rule: same logic. When the visitor leaves transmission
        // as "Any", we don't enforce transmission-specific rules so generic
        // parts still show. When the visitor picks one, rules pinning a
        // different transmission are excluded.
        const ruleTransmission = (r.transmission ?? "").trim().toLowerCase();
        if (ruleTransmission) {
          if (!visitorTransmission) return true;
          if (ruleTransmission !== visitorTransmission) return false;
        }
        return true;
      });
      allowedIds = new Set(matched.map((r: any) => r.product_id));
    }

    let q = supabaseAdmin
      .from("shop_products")
      .select(
        "id, slug, title, brand, image_url, price_php, currency, featured, category_id, click_count, universal_fit, is_deal, deal_ends_at, deal_price_php",
      )
      .eq("active", true);
    if (cat && catIds.length <= 1) {
      q = q.eq("category_id", cat);
    } else if (catIds.length > 0) {
      // multi-category: filter via join table
      const { data: pcRows } = await supabaseAdmin
        .from("shop_product_categories")
        .select("product_id")
        .in("category_id", catIds)
        .limit(5000);
      const ids = Array.from(new Set((pcRows ?? []).map((r: any) => r.product_id as string)));
      if (ids.length === 0) return { products: [] };
      q = q.in("id", ids);
    }
    if (data.featured) q = q.eq("featured", true);
    if (data.dealsOnly) q = q.eq("is_deal", true);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    if (data.brand) q = q.ilike("brand", data.brand);
    if (typeof data.priceMin === "number") q = q.gte("price_php", data.priceMin);
    if (typeof data.priceMax === "number") q = q.lte("price_php", data.priceMax);
    const sort = data.sort ?? "featured";
    if (sort === "price_asc") q = q.order("price_php", { ascending: true, nullsFirst: false });
    else if (sort === "price_desc")
      q = q.order("price_php", { ascending: false, nullsFirst: false });
    else if (sort === "popular") q = q.order("click_count", { ascending: false });
    else if (sort === "newest") q = q.order("created_at", { ascending: false });
    else q = q.order("featured", { ascending: false }).order("created_at", { ascending: false });
    const { data: rows, error } = await q.limit(data.limit ?? 24);
    if (error) throw new Error(error.message);

    let products = rows ?? [];
    if (allowedIds) {
      const includeU = data.includeUniversal ?? true;
      products = products.filter(
        (p: any) => allowedIds!.has(p.id) || (includeU && p.universal_fit),
      );
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
      const { data: c } = await supabaseAdmin
        .from("shop_categories")
        .select("id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      cat = c?.id ?? null;
      if (!cat) return { brands: [] as string[] };
    }
    let q = supabaseAdmin
      .from("shop_products")
      .select("brand")
      .eq("active", true)
      .not("brand", "is", null);
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
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: product, error } = await supabaseAdmin
      .from("shop_products")
      .select("*")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!product) return { product: null, links: [], fitment: [] };
    const [{ data: category }, { data: links }, { data: fitment }, { data: history }] =
      await Promise.all([
        product.category_id
          ? supabaseAdmin
              .from("shop_categories")
              .select("slug, name")
              .eq("id", product.category_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabaseAdmin
          .from("shop_product_links")
          .select(
            "id, url, sku, price_php, sale_price_php, in_stock, last_checked_at, network:affiliate_networks(id, slug, name, tag_param, tag_value, deeplink_template, active)",
          )
          .eq("product_id", product.id),
        supabaseAdmin
          .from("shop_product_fitment")
          .select("id, category, make, model, year_start, year_end, notes")
          .eq("product_id", product.id)
          .order("make", { ascending: true }),
        supabaseAdmin
          .from("shop_price_history")
          .select("price_php, sale_price_php, captured_at, network_id")
          .eq("product_id", product.id)
          .gte("captured_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order("captured_at", { ascending: true })
          .limit(500),
      ]);
    const visible = (links ?? []).filter((l: any) => l.network?.active);
    return {
      product: { ...product, category },
      links: visible,
      fitment: fitment ?? [],
      history: history ?? [],
    };
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
  slug: emptyToNull(
    z
      .string()
      .max(120)
      .regex(/^[a-z0-9-]+$/)
      .nullable(),
  ).optional(),
  title: z.string().min(1).max(200),
  description: emptyToNull(z.string().max(5000).nullable()).optional(),
  brand: emptyToNull(z.string().max(120).nullable()).optional(),
  image_url: emptyToNull(z.string().url().max(2000).nullable()).optional(),
  category_id: emptyToNull(z.string().uuid().nullable()).optional(),
  price_php: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.number().nonnegative().nullable(),
    )
    .optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  universal_fit: z.boolean().optional(),
});


export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("shop_manager", "shop.adminListProducts")])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("shop_products")
      .select(
        "id, slug, title, brand, image_url, price_php, currency, tags, featured, active, universal_fit, is_deal, click_count, view_count, category_id, created_at, category:shop_categories!category_id(name, slug, department_slug)",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return { products: data ?? [] };
  });

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("shop_manager", "shop.adminUpsertProduct")])
  .inputValidator((input: unknown) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data as any;
    const slug = rest.slug || slugify(rest.title);
    if (!slug) throw new Error("A slug or title is required");
    const payload: any = { ...rest, slug, created_by: userId };
    if (id) {
      const { error } = await supabase.from("shop_products").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("shop_products")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("shop_manager", "shop.adminDeleteProduct")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shop_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const adminListNetworks = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("shop_manager", "shop.adminListNetworks")])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("affiliate_networks")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return { networks: data ?? [] };
  });

export const adminUpsertNetwork = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("shop_manager", "shop.adminUpsertNetwork")])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        slug: z
          .string()
          .min(1)
          .max(60)
          .regex(/^[a-z0-9_-]+$/),
        name: z.string().min(1).max(120),
        tag_param: z.string().max(60).optional().nullable(),
        tag_value: z.string().max(200).optional().nullable(),
        deeplink_template: z.string().max(2000).optional().nullable(),
        active: z.boolean().optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("affiliate_networks")
        .update(data)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("affiliate_networks")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminUpsertLink = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("shop_manager", "shop.adminUpsertLink")])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        product_id: z.string().uuid(),
        network_id: z.string().uuid(),
        url: z.string().url().max(2000),
        sku: z.string().max(120).optional().nullable(),
      })
      .parse(input),
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
  .middleware([requireDomainRole("shop_manager", "shop.adminDeleteLink")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shop_product_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminProductLinks = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("shop_manager", "shop.adminProductLinks")])
  .inputValidator((input: { productId: string }) =>
    z.object({ productId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
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
  engine: z.string().max(120).optional().nullable(),
  transmission: z.string().max(120).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const adminListFitment = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("shop_manager", "shop.adminListFitment")])
  .inputValidator((input: { productId: string }) =>
    z.object({ productId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("shop_product_fitment")
      .select("*")
      .eq("product_id", data.productId)
      .order("make", { ascending: true });
    if (error) throw new Error(error.message);
    return { fitment: rows ?? [] };
  });

export const adminUpsertFitment = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("shop_manager", "shop.adminUpsertFitment")])
  .inputValidator((input: unknown) => fitmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("shop_product_fitment")
        .update(data)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("shop_product_fitment")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteFitment = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("shop_manager", "shop.adminDeleteFitment")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shop_product_fitment")
      .delete()
      .eq("id", data.id);
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
      .select(
        "created_at, product:shop_products(id, slug, title, brand, image_url, price_php, currency, featured, universal_fit, active)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const products = (data ?? []).map((r: any) => r.product).filter((p: any) => p && p.active);
    return { products };
  });

export const toggleShopFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string; favorite: boolean }) =>
    z
      .object({
        productId: z.string().uuid(),
        favorite: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.favorite) {
      const { error } = await supabase
        .from("shop_favorites")
        .upsert(
          { user_id: userId, product_id: data.productId },
          { onConflict: "user_id,product_id" },
        );
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

// ============ URL SCRAPE (admin) ============

type FxMap = Record<string, number>; // upper-cased currency → rate_to_php

async function loadFxMap(): Promise<FxMap> {
  const { data } = await supabaseAdmin
    .from("currencies")
    .select("code, rate_to_php")
    .eq("active", true);
  const map: FxMap = {};
  for (const row of (data ?? []) as any[]) {
    if (row?.code && row?.rate_to_php) {
      map[String(row.code).toUpperCase()] = Number(row.rate_to_php);
    }
  }
  if (!map.PHP) map.PHP = 1;
  return map;
}

/**
 * Convert a scraped price into PHP. If currency is unknown or zero/invalid,
 * returns null and pushes a warning so the admin UI can prompt for manual entry.
 */
function pickPricePhp(
  price: unknown,
  currency: unknown,
  fx?: FxMap,
  warnings?: string[],
): number | null {
  const n = typeof price === "number" ? price : Number(String(price ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const cur = String(currency ?? "").toUpperCase();
  if (!cur || cur === "PHP" || cur === "₱") return Math.round(n * 100) / 100;
  const rate = fx?.[cur];
  if (rate && rate > 0) {
    warnings?.push(`Converted ${cur} ${n} → PHP at rate ${rate} (today's FX).`);
    return Math.round(n * rate * 100) / 100;
  }
  warnings?.push(`Source price was ${cur} ${n}; unknown FX, please enter PHP price manually.`);
  return null;
}

function fuzzyCategoryMatch(
  hint: string,
  cats: Array<{ id: string; name: string; slug: string }>,
): string | null {
  if (!hint) return null;
  const h = hint.toLowerCase();
  for (const c of cats) {
    if (h.includes(c.slug.toLowerCase()) || h.includes(c.name.toLowerCase())) return c.id;
  }
  // token overlap fallback
  const tokens = h.split(/[^a-z0-9]+/).filter(Boolean);
  let best: { id: string; score: number } | null = null;
  for (const c of cats) {
    const ct = `${c.name} ${c.slug}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    const score = tokens.filter((t) => ct.includes(t)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score };
  }
  return best?.id ?? null;
}

const NETWORK_SLUGS = [
  "shopee",
  "lazada",
  "tiktok",
  "amazon",
  "aliexpress",
  "carousell",
  "ebay",
  "zalora",
] as const;

async function runNetworkScraper(
  slug: string | null,
  url: string,
): Promise<MarketplaceProductData | null> {
  switch (slug) {
    case "lazada":
      return fetchLazadaProductData(url);
    case "aliexpress":
      return fetchAliExpressProductData(url);
    // Other networks fall through to Firecrawl for now (phase 2).
    default:
      return null;
  }
}

export const scrapeShopUrl = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("shop_manager", "shop.scrapeShopUrl")])
  .inputValidator((input: unknown) =>
    z
      .object({
        url: z
          .string()
          .url()
          .max(2000)
          .regex(/^https?:\/\//i),
        networkSlug: z.enum(NETWORK_SLUGS).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const forcedSlug = data.networkSlug ?? null;

    // Resolve short / redirect links to the real product URL first.
    const pasted = data.url;
    let workingUrl = pasted;
    let resolvedFrom: string | null = null;
    if (isShortLink(pasted)) {
      const resolved = await resolveFinalUrl(pasted);
      if (resolved && resolved !== pasted) {
        workingUrl = resolved;
        resolvedFrom = pasted;
      }
    }

    const cleanedUrl = cleanShopUrl(workingUrl);
    const detectedSlug = detectNetworkSlug(cleanedUrl);
    // Manual override takes precedence over host detection.
    const networkSlug = forcedSlug ?? detectedSlug;

    // Look up matching active network
    let networkId: string | null = null;
    if (networkSlug) {
      const { data: net } = await context.supabase
        .from("affiliate_networks")
        .select("id")
        .eq("slug", networkSlug)
        .eq("active", true)
        .maybeSingle();
      networkId = net?.id ?? null;
    }

    // Load categories for fuzzy mapping
    const { data: cats } = await supabaseAdmin
      .from("shop_categories")
      .select("id, slug, name")
      .eq("active", true);

    // Try a per-network scraper (currently only lazada has a custom path).
    // Anything else (or a failed custom path) falls through to Firecrawl.
    const marketplace = await runNetworkScraper(networkSlug, cleanedUrl);

    if (!apiKey && !marketplace) {
      return {
        error: "Scraper not configured — please connect Firecrawl.",
        suggested: null,
        cleanedUrl,
        resolvedFrom,
        networkSlug,
        detectedSlug,
        networkId,
      };
    }

    // Firecrawl scrape
    const schema = {
      type: "object",
      properties: {
        title: { type: "string", description: "Concise product title without seller/shop name" },
        brand: { type: "string", description: "Brand / manufacturer if mentioned" },
        description: {
          type: "string",
          description: "1-3 sentence product description focused on what the item is and key specs",
        },
        price: { type: "number", description: "Numeric price value of the main product" },
        currency: { type: "string", description: "ISO currency code, e.g. PHP, USD" },
        image_url: {
          type: "string",
          description:
            "Absolute URL of the primary product photo (NOT site icons, favorite hearts, or thumbnails of related items)",
        },
        category_hint: {
          type: "string",
          description: "Best-guess product category (e.g. car wax, oil filter, helmet)",
        },
      },
    };

    let extracted: any = null;
    let metadata: any = null;
    let html: string | null = null;
    if (apiKey && !marketplace) {
      try {
        const { default: Firecrawl } = await import("@mendable/firecrawl-js");
        const firecrawl = new Firecrawl({ apiKey });
        const result: any = await firecrawl.scrape(cleanedUrl, {
          formats: [
            "markdown",
            "rawHtml",
            {
              type: "json",
              schema,
              prompt:
                "Extract real product fields for the main product on this marketplace listing. Ignore navigation, related items, recommendation rails, 'you may also like', and site-wide UI elements like favorite/heart icons.",
            } as any,
          ] as any,
          onlyMainContent: true,
          waitFor: 2500,
          location: { country: "PH", languages: ["en"] },
        } as any);
        extracted = result?.json ?? result?.data?.json ?? null;
        metadata = result?.metadata ?? result?.data?.metadata ?? null;
        html =
          result?.rawHtml ?? result?.data?.rawHtml ?? result?.html ?? result?.data?.html ?? null;
      } catch (e: any) {
        return {
          error: `Could not fetch page: ${e?.message ?? "unknown error"}`,
          suggested: null,
          cleanedUrl,
          resolvedFrom,
          networkSlug,
          detectedSlug,
          networkId,
        };
      }
    }

    // JSON-LD Product fallback
    const ld = html ? extractJsonLdProduct(html) : null;

    const pickStr = (...vals: any[]) =>
      vals.map((v) => (v == null ? "" : String(v).trim())).find((v) => v.length > 0) ?? "";

    const title =
      pickStr(
        marketplace?.title,
        ld?.name,
        extracted?.title,
        metadata?.ogTitle,
        metadata?.["og:title"],
        metadata?.title,
      ).slice(0, 200) || null;
    const brand = sanitizeBrand(
      pickStr(marketplace?.brand, ld?.brand, extracted?.brand).slice(0, 120) || null,
    );
    const description =
      pickStr(
        marketplace?.description,
        ld?.description,
        extracted?.description,
        metadata?.ogDescription,
        metadata?.["og:description"],
        metadata?.description,
      ).slice(0, 2000) || null;

    // Image: JSON-LD > og:image > extractor; reject icons.
    const image_url = pickFirstNonIconImage(
      marketplace?.image_url,
      ld?.image,
      metadata?.ogImage,
      metadata?.["og:image"],
      extracted?.image_url,
    );

    // Price: marketplace > JSON-LD > og:price > extractor.
    const warnings: string[] = [];
    const fx = await loadFxMap();
    const rawPrice =
      marketplace?.price ??
      ld?.price ??
      metadata?.["og:price:amount"] ??
      metadata?.["product:price:amount"] ??
      extracted?.price ??
      null;
    const rawCurrency =
      marketplace?.currency ??
      ld?.currency ??
      metadata?.["og:price:currency"] ??
      metadata?.["product:price:currency"] ??
      extracted?.currency ??
      null;
    const price_php = pickPricePhp(rawPrice, rawCurrency, fx, warnings);
    const sale_price_php = marketplace?.sale_price
      ? pickPricePhp(marketplace.sale_price, marketplace?.currency ?? rawCurrency ?? "PHP", fx)
      : null;
    const is_deal = !!(sale_price_php && price_php && sale_price_php < price_php);
    if (rawPrice && price_php == null) {
      warnings.push("Could not store price — please enter PHP price manually.");
    } else if (!rawPrice) {
      warnings.push("Source page did not expose a price — please enter PHP price manually.");
    }

    const category_id = fuzzyCategoryMatch(
      String(marketplace?.category_hint ?? extracted?.category_hint ?? title ?? ""),
      (cats ?? []) as any[],
    );

    // Canonical URL hardening — prefer the marketplace's own URL if present.
    const canonical = pickStr(
      marketplace?.url,
      metadata?.ogUrl,
      metadata?.["og:url"],
      metadata?.sourceURL,
      ld?.url,
    );
    let finalCleanedUrl = cleanedUrl;
    if (canonical && /^https?:\/\//i.test(canonical)) {
      const cleanedCanonical = cleanShopUrl(canonical);
      const sameNet = detectNetworkSlug(cleanedCanonical);
      if (sameNet && (!networkSlug || sameNet === networkSlug)) {
        finalCleanedUrl = cleanedCanonical;
      }
    }

    return {
      error: null,
      cleanedUrl: finalCleanedUrl,
      resolvedFrom,
      // Forced slug always wins; otherwise re-detect from final URL.
      networkSlug: forcedSlug ?? detectNetworkSlug(finalCleanedUrl) ?? networkSlug,
      detectedSlug: detectNetworkSlug(finalCleanedUrl) ?? detectedSlug,
      networkId,
      warnings,
      suggested: {
        title,
        brand,
        description,
        image_url,
        price_php,
        deal_price_php: is_deal ? sale_price_php : null,
        is_deal,
        currency: "PHP",
        category_id,
      },
    };
  });

// ---------- helpers for scrapeShopUrl ----------

async function resolveFinalUrl(input: string): Promise<string> {
  let current = input;
  for (let hop = 0; hop < 3; hop++) {
    try {
      const res = await fetch(current, {
        method: "GET",
        redirect: "follow",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(10_000),
      });
      let next = res.url || current;
      if (next === current) {
        // No HTTP redirect happened — inspect body for meta-refresh / JS redirect.
        const body = await res.text().catch(() => "");
        const fromHtml = extractRedirectFromHtml(body, current);
        if (fromHtml && fromHtml !== current) next = fromHtml;
      }
      if (next === current) return current;
      current = next;
      // Stop early if we've landed on a real product page (heuristic).
      if (/\/products?\/|\/p\/|\/item\/|\/dp\/|-i\.\d+\.\d+/i.test(current)) return current;
    } catch {
      return current;
    }
  }
  return current;
}

function extractRedirectFromHtml(html: string, base: string): string | null {
  if (!html) return null;
  const patterns: RegExp[] = [
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^;]*;\s*url=([^"'>\s]+)/gi,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/gi,
    /window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/gi,
    /location\.replace\(\s*["']([^"']+)["']\s*\)/gi,
    /"redirectUrl"\s*:\s*"([^"]+)"/gi,
    /data-spm-url=["']([^"']+)/gi,
  ];
  let baseHost = "";
  try {
    baseHost = new URL(base).hostname.toLowerCase();
  } catch {
    /* ignore */
  }
  const sameHostCandidates: string[] = [];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const raw = m[1]
        ?.replace(/\\u002F/g, "/")
        .replace(/\\\//g, "/")
        .trim();
      if (!raw) continue;
      // Reject JS variable / template refs (e.g. `url`, `${x}`, `lazShareInfo`).
      if (!/^(https?:)?\/\//i.test(raw) && !raw.startsWith("/")) continue;
      try {
        const resolved = new URL(raw, base).toString();
        if (!/^https?:/i.test(resolved) || resolved === base) continue;
        const host = new URL(resolved).hostname.toLowerCase();
        // Prefer URLs that escape the short-link host.
        if (baseHost && host === baseHost) {
          sameHostCandidates.push(resolved);
          continue;
        }
        return resolved;
      } catch {
        /* ignore */
      }
    }
  }
  return sameHostCandidates[0] ?? null;
}

const BAD_BRANDS = new Set([
  "generic",
  "no brand",
  "no-brand",
  "nobrand",
  "unbranded",
  "oem",
  "none",
  "n/a",
  "na",
  "unknown",
  "other",
]);
function sanitizeBrand(b: string | null | undefined): string | null {
  if (!b) return null;
  const v = b.trim();
  if (!v) return null;
  if (BAD_BRANDS.has(v.toLowerCase())) return null;
  return v;
}

function pickFirstNonIconImage(...candidates: any[]): string | null {
  for (const c of candidates) {
    const list = Array.isArray(c) ? c : [c];
    for (const raw of list) {
      const v = raw == null ? "" : typeof raw === "string" ? raw : (raw?.url ?? "");
      const s = String(v).trim();
      if (s && /^https?:\/\//i.test(s) && !looksLikeIconImage(s)) return s;
    }
  }
  return null;
}

type MarketplaceProductData = {
  title?: string;
  brand?: string;
  description?: string;
  image_url?: string;
  price?: number;
  sale_price?: number;
  currency?: string;
  category_hint?: string;
  url?: string;
};

async function fetchLazadaProductData(input: string): Promise<MarketplaceProductData | null> {
  const result = await scrapeLazadaProduct(input);
  if (!result) return null;
  return {
    title: result.title,
    brand: result.brand,
    description: result.description,
    image_url: result.image_url,
    price: result.price,
    sale_price: result.sale_price,
    currency: result.currency,
    category_hint: result.category_hint,
    url: result.url,
  };
}

async function fetchAliExpressProductData(
  input: string,
): Promise<MarketplaceProductData | null> {
  const result = await scrapeAliExpressProduct(input);
  if (!result) return null;
  return {
    title: result.title,
    brand: result.brand,
    description: result.description,
    image_url: result.image_url,
    price: result.price,
    sale_price: result.sale_price,
    currency: result.currency,
    category_hint: result.category_hint,
    url: result.url,
  };
}

type LdProduct = {
  name?: string;
  brand?: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
  url?: string;
};

function extractJsonLdProduct(html: string): LdProduct | null {
  const blocks = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  );
  for (const m of blocks) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const candidates: any[] = Array.isArray(parsed) ? parsed : (parsed["@graph"] ?? [parsed]);
    for (const node of candidates) {
      if (!node || typeof node !== "object") continue;
      const t = node["@type"];
      const isProduct = t === "Product" || (Array.isArray(t) && t.includes("Product"));
      if (!isProduct) continue;
      const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
      const image = Array.isArray(node.image) ? node.image[0] : node.image;
      const brandRaw = node.brand;
      const brand = typeof brandRaw === "string" ? brandRaw : brandRaw?.name;
      const priceRaw = offer?.price ?? offer?.lowPrice;
      const price = priceRaw != null ? Number(String(priceRaw).replace(/[^\d.]/g, "")) : undefined;
      return {
        name: typeof node.name === "string" ? node.name : undefined,
        brand: typeof brand === "string" ? brand : undefined,
        description: typeof node.description === "string" ? node.description : undefined,
        image: typeof image === "string" ? image : image?.url,
        price: Number.isFinite(price) ? price : undefined,
        currency: typeof offer?.priceCurrency === "string" ? offer.priceCurrency : undefined,
        url:
          typeof node.url === "string"
            ? node.url
            : typeof node["@id"] === "string"
              ? node["@id"]
              : undefined,
      };
    }
  }
  return null;
}

// ============ RESCRAPE / BACKFILL (admin) ============

async function rescrapeOne(productId: string): Promise<{
  ok: boolean;
  updatedFields: string[];
  warnings: string[];
  error?: string;
}> {
  const updatedFields: string[] = [];
  const warnings: string[] = [];

  const { data: product, error: pErr } = await supabaseAdmin
    .from("shop_products")
    .select("id, title, brand, description, image_url, price_php, deal_price_php, is_deal")
    .eq("id", productId)
    .maybeSingle();
  if (pErr || !product) return { ok: false, updatedFields, warnings, error: pErr?.message ?? "Product not found" };

  const { data: links } = await supabaseAdmin
    .from("shop_product_links")
    .select("id, url, network_id, network:affiliate_networks(slug)")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  const link = (links ?? [])[0] as any;
  if (!link?.url) return { ok: false, updatedFields, warnings, error: "No source URL on file for this product" };

  const networkSlug: string | null = link.network?.slug ?? detectNetworkSlug(link.url);
  const cleaned = cleanShopUrl(link.url);

  // Try network-specific scraper, then Firecrawl if available.
  let marketplace = await runNetworkScraper(networkSlug, cleaned);
  let metadata: any = null;
  let html: string | null = null;
  let extracted: any = null;
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!marketplace && apiKey) {
    try {
      const { default: Firecrawl } = await import("@mendable/firecrawl-js");
      const fc = new Firecrawl({ apiKey });
      const r: any = await fc.scrape(cleaned, {
        formats: ["rawHtml", { type: "json", prompt: "Extract product title, brand, description, numeric price, ISO currency code, primary image_url." } as any] as any,
        onlyMainContent: true,
        waitFor: 2500,
        location: { country: "PH", languages: ["en"] },
      } as any);
      extracted = r?.json ?? r?.data?.json ?? null;
      metadata = r?.metadata ?? r?.data?.metadata ?? null;
      html = r?.rawHtml ?? r?.data?.rawHtml ?? null;
    } catch (e: any) {
      warnings.push(`Firecrawl failed: ${e?.message ?? "unknown"}`);
    }
  }

  const ld = html ? extractJsonLdProduct(html) : null;
  const fx = await loadFxMap();

  const pick = (...vals: any[]) =>
    vals.map((v) => (v == null ? "" : String(v).trim())).find((v) => v.length > 0) ?? "";

  const newBrand = sanitizeBrand(pick(marketplace?.brand, ld?.brand, extracted?.brand).slice(0, 120) || null);
  const newDesc = pick(marketplace?.description, ld?.description, extracted?.description, metadata?.ogDescription).slice(0, 2000) || null;
  const newImage = pickFirstNonIconImage(marketplace?.image_url, ld?.image, metadata?.ogImage, extracted?.image_url);
  const rawPrice = marketplace?.price ?? ld?.price ?? extracted?.price ?? metadata?.["og:price:amount"] ?? null;
  const rawCur = marketplace?.currency ?? ld?.currency ?? extracted?.currency ?? metadata?.["og:price:currency"] ?? null;
  const newPrice = pickPricePhp(rawPrice, rawCur, fx, warnings);
  const salePhp = marketplace?.sale_price
    ? pickPricePhp(marketplace.sale_price, marketplace?.currency ?? rawCur ?? "PHP", fx)
    : null;
  const isDeal = !!(salePhp && newPrice && salePhp < newPrice);

  const patch: ShopProductUpdate = {};
  // Only fill fields that are currently empty, or where price clearly changed.
  if (!product.brand && newBrand) { patch.brand = newBrand; updatedFields.push("brand"); }
  if ((!product.description || product.description.length < 40) && newDesc) {
    patch.description = newDesc; updatedFields.push("description");
  }
  if (!product.image_url && newImage) { patch.image_url = newImage; updatedFields.push("image_url"); }
  if (newPrice != null && Number(newPrice) !== Number(product.price_php ?? 0)) {
    patch.price_php = newPrice; updatedFields.push("price_php");
  }
  const newDealPrice = isDeal ? salePhp : null;
  if (Number(newDealPrice ?? 0) !== Number(product.deal_price_php ?? 0)) {
    patch.deal_price_php = newDealPrice; updatedFields.push("deal_price_php");
  }
  if (Boolean(isDeal) !== Boolean(product.is_deal)) {
    patch.is_deal = isDeal; updatedFields.push("is_deal");
  }

  if (Object.keys(patch).length > 0) {
    patch.updated_at = new Date().toISOString();
    const { error: uErr } = await supabaseAdmin.from("shop_products").update(patch).eq("id", productId);
    if (uErr) return { ok: false, updatedFields, warnings, error: uErr.message };
  }

  // Also update the link's price snapshot.
  if (newPrice != null) {
    await supabaseAdmin
      .from("shop_product_links")
      .update({
        price_php: newPrice,
        sale_price_php: isDeal ? salePhp : null,
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", link.id);
  } else {
    await supabaseAdmin
      .from("shop_product_links")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", link.id);
  }

  return { ok: true, updatedFields, warnings };
}

export const rescrapeShopProduct = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("shop_manager", "shop.rescrapeShopProduct")])
  .inputValidator((input: unknown) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => rescrapeOne(data.productId));

export const backfillMissingShopPrices = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("shop_manager", "shop.backfillMissingShopPrices")])
  .handler(async () => {
    const { data: rows } = await supabaseAdmin
      .from("shop_products")
      .select("id")
      .is("price_php", null)
      .eq("active", true)
      .limit(50);
    let scanned = 0, filledPrice = 0, stillMissing = 0;
    const errors: string[] = [];
    for (const r of (rows ?? []) as any[]) {
      scanned++;
      try {
        const res = await rescrapeOne(r.id);
        if (res.updatedFields.includes("price_php")) filledPrice++;
        else stillMissing++;
        if (res.error) errors.push(`${r.id}: ${res.error}`);
      } catch (e: any) {
        stillMissing++;
        errors.push(`${r.id}: ${e?.message ?? "scrape failed"}`);
      }
    }
    return { scanned, filledPrice, stillMissing, errors: errors.slice(0, 20) };
  });
