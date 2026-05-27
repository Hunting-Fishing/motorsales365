import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { cleanShopUrl, detectNetworkSlug, isShortLink, looksLikeIconImage } from "@/lib/shop-url";

// ============ PUBLIC ============

export const listShopCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("shop_categories")
    .select("id, slug, name, description, icon, sort_order, parent_id, hero_image_url, department_slug, cross_department_slugs")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return { categories: data ?? [] };
});

export const listShopDepartments = createServerFn({ method: "GET" }).handler(async () => {
  const [{ data: deps, error: dErr }, { data: cats, error: cErr }, { data: pcRows }] = await Promise.all([
    supabaseAdmin.from("shop_departments").select("*").eq("active", true).order("sort_order"),
    supabaseAdmin
      .from("shop_categories")
      .select("id, slug, name, description, icon, sort_order, parent_id, hero_image_url, department_slug, cross_department_slugs")
      .eq("active", true)
      .order("sort_order"),
    supabaseAdmin.from("shop_product_categories").select("category_id").limit(5000),
  ]);
  if (dErr) throw new Error(dErr.message);
  if (cErr) throw new Error(cErr.message);
  const counts = new Map<string, number>();
  for (const r of pcRows ?? []) counts.set((r as any).category_id, (counts.get((r as any).category_id) ?? 0) + 1);
  const all = (cats ?? []).map((c: any) => ({ ...c, product_count: counts.get(c.id) ?? 0 }));
  const tops = all.filter((c: any) => !c.parent_id);
  const childrenOf = (parentId: string) => all.filter((c: any) => c.parent_id === parentId);

  const departments = (deps ?? []).map((d: any) => {
    const primary = tops.filter((t: any) => t.department_slug === d.slug);
    const crossChildren = all.filter((c: any) =>
      Array.isArray(c.cross_department_slugs) && c.cross_department_slugs.includes(d.slug),
    );
    return {
      ...d,
      categories: primary.map((p: any) => ({ ...p, children: childrenOf(p.id) })),
      cross_categories: crossChildren,
      product_count: primary.reduce(
        (sum: number, p: any) =>
          sum + p.product_count + childrenOf(p.id).reduce((s: number, c: any) => s + c.product_count, 0),
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
      .select("id, slug, name, description, icon, sort_order, parent_id, hero_image_url, department_slug")
      .eq("active", true)
      .order("sort_order"),
    supabaseAdmin.from("shop_departments").select("slug, name, sort_order").eq("active", true).order("sort_order"),
  ]);
  if (error) throw new Error(error.message);

  const { data: pcRows } = await supabaseAdmin
    .from("shop_product_categories")
    .select("category_id")
    .limit(5000);
  const counts = new Map<string, number>();
  for (const r of pcRows ?? []) counts.set((r as any).category_id, (counts.get((r as any).category_id) ?? 0) + 1);

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
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(80) }).parse(input))
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
      .select("id, slug, name, description, icon, parent_id, hero_image_url, department_slug, cross_department_slugs")
      .eq("active", true)
      .order("sort_order");
    const all = cats ?? [];
    const tops = all.filter((c: any) => !c.parent_id && c.department_slug === data.slug);
    const categories = tops.map((p: any) => ({
      ...p,
      children: all.filter((c: any) => c.parent_id === p.id),
    }));
    const cross_categories = all.filter((c: any) =>
      Array.isArray(c.cross_department_slugs) &&
      c.cross_department_slugs.includes(data.slug) &&
      c.department_slug !== data.slug,
    );
    return { department: dep, categories, cross_categories };
  });

export const getShopBreadcrumb = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const [{ data: cats }, { data: deps }] = await Promise.all([
      supabaseAdmin.from("shop_categories").select("id, slug, name, parent_id, department_slug").eq("active", true),
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
    z.object({
      productId: z.string().uuid(),
      linkId: z.string().uuid().optional(),
      referrer: z.string().max(500).optional(),
      utm_source: z.string().max(80).optional(),
      utm_medium: z.string().max(80).optional(),
      utm_campaign: z.string().max(80).optional(),
    }).parse(input),
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
  .inputValidator((input: {
    categorySlug?: string; subSlugs?: string[]; departmentSlug?: string;
    featured?: boolean; dealsOnly?: boolean;
    search?: string; limit?: number;
    make?: string; model?: string; year?: number; engine?: string; includeUniversal?: boolean;
    brand?: string; priceMin?: number; priceMax?: number;
    sort?: "featured" | "newest" | "price_asc" | "price_desc" | "popular";
  } = {}) =>
    z.object({
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
      includeUniversal: z.boolean().optional(),
      brand: z.string().max(120).optional(),
      priceMin: z.number().nonnegative().optional(),
      priceMax: z.number().nonnegative().optional(),
      sort: z.enum(["featured", "newest", "price_asc", "price_desc", "popular"]).optional(),
    }).parse(input),
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
        const cross = Array.isArray((c as any).cross_department_slugs) &&
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
        .select("product_id, make, model, year_start, year_end, engine");
      // make matches or is null (any-make rule)
      fq = fq.or(`make.is.null,make.ilike.${data.make}`);
      const { data: rows, error: fErr } = await fq.limit(5000);
      if (fErr) throw new Error(fErr.message);
      const visitorEngine = data.engine?.trim().toLowerCase();
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
        return true;
      });
      allowedIds = new Set(matched.map((r: any) => r.product_id));
    }

    let q = supabaseAdmin
      .from("shop_products")
      .select("id, slug, title, brand, image_url, price_php, currency, featured, category_id, click_count, universal_fit, is_deal, deal_ends_at, deal_price_php")
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
    else if (sort === "price_desc") q = q.order("price_php", { ascending: false, nullsFirst: false });
    else if (sort === "popular") q = q.order("click_count", { ascending: false });
    else if (sort === "newest") q = q.order("created_at", { ascending: false });
    else q = q.order("featured", { ascending: false }).order("created_at", { ascending: false });
    const { data: rows, error } = await q.limit(data.limit ?? 24);
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
      .select("id, slug, title, brand, image_url, price_php, currency, tags, featured, active, universal_fit, is_deal, click_count, view_count, category_id, created_at, category:shop_categories!category_id(name, slug, department_slug)")
      .order("created_at", { ascending: false })
      .limit(1000);
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
  engine: z.string().max(120).optional().nullable(),
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

// ============ URL SCRAPE (admin) ============

function pickPricePhp(price: unknown, currency: unknown): number | null {
  const n = typeof price === "number" ? price : Number(String(price ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const cur = String(currency ?? "").toUpperCase();
  // We only store PHP. If the marketplace returned PHP or no currency, keep the number.
  if (!cur || cur === "PHP" || cur === "₱") return Math.round(n * 100) / 100;
  return null; // unknown FX — let admin fill manually
}

function fuzzyCategoryMatch(hint: string, cats: Array<{ id: string; name: string; slug: string }>): string | null {
  if (!hint) return null;
  const h = hint.toLowerCase();
  for (const c of cats) {
    if (h.includes(c.slug.toLowerCase()) || h.includes(c.name.toLowerCase())) return c.id;
  }
  // token overlap fallback
  const tokens = h.split(/[^a-z0-9]+/).filter(Boolean);
  let best: { id: string; score: number } | null = null;
  for (const c of cats) {
    const ct = `${c.name} ${c.slug}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const score = tokens.filter((t) => ct.includes(t)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score };
  }
  return best?.id ?? null;
}

const NETWORK_SLUGS = ["shopee", "lazada", "tiktok", "amazon", "aliexpress", "carousell", "ebay", "zalora"] as const;

async function runNetworkScraper(slug: string | null, url: string): Promise<MarketplaceProductData | null> {
  switch (slug) {
    case "lazada":
      return fetchLazadaProductData(url);
    // Other networks fall through to Firecrawl for now (phase 2).
    default:
      return null;
  }
}

export const scrapeShopUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      url: z.string().url().max(2000).regex(/^https?:\/\//i),
      networkSlug: z.enum(NETWORK_SLUGS).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertShopManager(context.supabase, context.userId);

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
        description: { type: "string", description: "1-3 sentence product description focused on what the item is and key specs" },
        price: { type: "number", description: "Numeric price value of the main product" },
        currency: { type: "string", description: "ISO currency code, e.g. PHP, USD" },
        image_url: { type: "string", description: "Absolute URL of the primary product photo (NOT site icons, favorite hearts, or thumbnails of related items)" },
        category_hint: { type: "string", description: "Best-guess product category (e.g. car wax, oil filter, helmet)" },
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
            { type: "json", schema, prompt: "Extract real product fields for the main product on this marketplace listing. Ignore navigation, related items, recommendation rails, 'you may also like', and site-wide UI elements like favorite/heart icons." } as any,
          ] as any,
          onlyMainContent: true,
          waitFor: 2500,
          location: { country: "PH", languages: ["en"] },
        } as any);
        extracted = result?.json ?? result?.data?.json ?? null;
        metadata = result?.metadata ?? result?.data?.metadata ?? null;
        html = result?.rawHtml ?? result?.data?.rawHtml ?? result?.html ?? result?.data?.html ?? null;
      } catch (e: any) {
        return {
          error: `Could not fetch page: ${e?.message ?? "unknown error"}`,
          suggested: null,
          cleanedUrl,
          resolvedFrom,
          networkSlug,
          networkId,
        };
      }
    }

    // JSON-LD Product fallback
    const ld = html ? extractJsonLdProduct(html) : null;

    const pickStr = (...vals: any[]) =>
      vals.map((v) => (v == null ? "" : String(v).trim())).find((v) => v.length > 0) ?? "";

    const title = pickStr(marketplace?.title, ld?.name, extracted?.title, metadata?.ogTitle, metadata?.["og:title"], metadata?.title).slice(0, 200) || null;
    const brand = sanitizeBrand(pickStr(marketplace?.brand, ld?.brand, extracted?.brand).slice(0, 120) || null);
    const description = pickStr(marketplace?.description, ld?.description, extracted?.description, metadata?.ogDescription, metadata?.["og:description"], metadata?.description).slice(0, 2000) || null;

    // Image: JSON-LD > og:image > extractor; reject icons.
    const image_url = pickFirstNonIconImage(
      marketplace?.image_url,
      ld?.image,
      metadata?.ogImage,
      metadata?.["og:image"],
      extracted?.image_url,
    );

    // Price: JSON-LD > og:price > extractor.
    const rawPrice = marketplace?.price ?? ld?.price ?? metadata?.["og:price:amount"] ?? metadata?.["product:price:amount"] ?? extracted?.price ?? null;
    const rawCurrency = marketplace?.currency ?? ld?.currency ?? metadata?.["og:price:currency"] ?? metadata?.["product:price:currency"] ?? extracted?.currency ?? null;
    const price_php = pickPricePhp(rawPrice, rawCurrency);

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
      networkSlug: detectNetworkSlug(finalCleanedUrl) ?? networkSlug,
      networkId,
      suggested: {
        title,
        brand,
        description,
        image_url,
        price_php,
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
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^;]*;\s*url=([^"'>\s]+)/i,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i,
    /window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
    /location\.replace\(\s*["']([^"']+)["']\s*\)/i,
    /"redirectUrl"\s*:\s*"([^"]+)"/i,
    /data-spm-url=["']([^"']+)/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      try {
        const resolved = new URL(m[1].replace(/\\u002F/g, "/").replace(/\\\//g, "/"), base).toString();
        if (resolved !== base) return resolved;
      } catch { /* ignore */ }
    }
  }
  return null;
}

const BAD_BRANDS = new Set([
  "generic", "no brand", "no-brand", "nobrand", "unbranded",
  "oem", "none", "n/a", "na", "unknown", "other",
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
      const v = raw == null ? "" : (typeof raw === "string" ? raw : raw?.url ?? "");
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
  currency?: string;
  category_hint?: string;
  url?: string;
};

function extractLazadaIds(input: string): { itemId: string; skuId?: string; region: string } | null {
  try {
    const url = new URL(input);
    if (!/(^|\.)lazada\./i.test(url.hostname)) return null;
    const region = url.hostname.endsWith(".sg") ? "SG"
      : url.hostname.endsWith(".my") ? "MY"
      : url.hostname.endsWith(".co.th") ? "TH"
      : url.hostname.endsWith(".vn") ? "VN"
      : url.hostname.endsWith(".co.id") ? "ID"
      : "PH";
    const pathMatch = url.pathname.match(/(?:^|-)i(\d+)(?:-s(\d+))?\.html/i);
    const itemId = pathMatch?.[1] ?? url.searchParams.get("itemId") ?? url.searchParams.get("item_id");
    const skuId = pathMatch?.[2] ?? url.searchParams.get("skuId") ?? url.searchParams.get("sku_id") ?? undefined;
    return itemId ? { itemId, skuId, region } : null;
  } catch {
    return null;
  }
}

async function fetchLazadaProductData(input: string): Promise<MarketplaceProductData | null> {
  const ids = extractLazadaIds(input);
  if (!ids) return null;
  const api = "mtop.lazada.gsearch.appsearch";
  const appKey = "12574478";
  const data = JSON.stringify({ q: ids.itemId, m: "search", regionID: ids.region, language: "en" });
  const makeUrl = (t: string, sign: string) => {
    const qs = new URLSearchParams({
      jsv: "2.6.1",
      appKey,
      t,
      sign,
      api,
      v: "1.0",
      type: "jsonp",
      dataType: "jsonp",
      callback: "mtopjsonp1",
      data,
    });
    return `https://acs-m.lazada.com.ph/h5/${api}/1.0/?${qs.toString()}`;
  };
  const headers = {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "accept": "application/json,text/javascript,*/*;q=0.1",
    "referer": input,
  };
  try {
    const first = await fetch(makeUrl(String(Date.now()), ""), { headers, signal: AbortSignal.timeout(8_000) });
    const cookie = first.headers.get("set-cookie") ?? "";
    const tokenValue = cookie.match(/_m_h5_tk=([^;]+)/)?.[1];
    const tokenEnc = cookie.match(/_m_h5_tk_enc=([^;]+)/)?.[1];
    const token = tokenValue?.split("_")[0];
    if (!token) return null;
    const t = String(Date.now());
    const sign = createHash("md5").update(`${token}&${t}&${appKey}&${data}`).digest("hex");
    const cookieHeader = `_m_h5_tk=${tokenValue}${tokenEnc ? `; _m_h5_tk_enc=${tokenEnc}` : ""}`;
    const second = await fetch(makeUrl(t, sign), {
      headers: { ...headers, "cookie": cookieHeader },
      signal: AbortSignal.timeout(8_000),
    });
    const text = await second.text();
    const jsonText = text.replace(/^\s*mtopjsonp1\(/, "").replace(/\)\s*$/, "");
    const payload = JSON.parse(jsonText);
    const items: any[] = payload?.data?.mods?.listItems ?? [];
    const item = items.find((row) => String(row.itemId ?? row.nid) === ids.itemId && (!ids.skuId || String(row.skuId ?? "") === ids.skuId))
      ?? items.find((row) => String(row.itemId ?? row.nid) === ids.itemId)
      ?? items[0];
    if (!item) return null;
    const productUrl = item.productUrl ? new URL(String(item.productUrl), "https://www.lazada.com.ph").toString() : input;
    const description = Array.isArray(item.description) ? item.description.filter(Boolean).join("\n") : String(item.description ?? "").trim();
    const categoryHint = payload?.data?.mods?.filter?.filterItems?.find((f: any) => f?.name === "category")?.options?.[0]?.title;
    return {
      title: item.name,
      brand: item.brandName,
      description: description || undefined,
      image_url: item.image,
      price: Number(String(item.price ?? item.priceShow ?? "").replace(/[^0-9.]/g, "")) || undefined,
      currency: "PHP",
      category_hint: categoryHint,
      url: productUrl,
    };
  } catch {
    return null;
  }
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
  const blocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const m of blocks) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { continue; }
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
        url: typeof node.url === "string" ? node.url : (typeof node["@id"] === "string" ? node["@id"] : undefined),
      };
    }
  }
  return null;
}
