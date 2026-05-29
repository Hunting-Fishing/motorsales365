import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============== PUBLIC ==============

/**
 * Full mini-site bundle for the public business page.
 * Single round-trip: business + type label + tag labels + active services +
 * active products + recent published posts + active reviews + reviewer names.
 */
export const getBusinessPage = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: biz, error } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!biz) return { business: null };

    const [
      { data: typeRow },
      { data: tagLinks },
      { data: services },
      { data: products },
      { data: posts },
      { data: reviews },
    ] = await Promise.all([
      supabaseAdmin.from("business_types").select("label").eq("slug", (biz as any).type_slug).maybeSingle(),
      supabaseAdmin.from("business_tag_links").select("tag_slug").eq("business_id", (biz as any).id),
      supabaseAdmin
        .from("business_services")
        .select("id, title, description, price_label, photo_url, sort_order")
        .eq("business_id", (biz as any).id)
        .eq("active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("business_products")
        .select("id, title, description, price_php, sale_price_php, photo_url, in_stock, sort_order")
        .eq("business_id", (biz as any).id)
        .eq("active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("business_posts")
        .select("id, body, photo_url, created_at")
        .eq("business_id", (biz as any).id)
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("business_reviews")
        .select("id, user_id, rating, body, created_at")
        .eq("business_id", (biz as any).id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    ]);

    let tagLabels: string[] = [];
    const tagSlugs = (tagLinks ?? []).map((l: any) => l.tag_slug);
    if (tagSlugs.length > 0) {
      const { data: tagRows } = await supabaseAdmin
        .from("business_tags")
        .select("slug,label")
        .in("slug", tagSlugs);
      tagLabels = (tagRows ?? []).map((r: any) => r.label);
    }

    const uids = Array.from(new Set((reviews ?? []).map((r: any) => r.user_id)));
    const reviewerNames: Record<string, string> = {};
    if (uids.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("public_profiles")
        .select("id,full_name")
        .in("id", uids);
      for (const p of profs ?? []) reviewerNames[(p as any).id] = (p as any).full_name ?? "User";
    }

    return {
      business: biz,
      typeLabel: typeRow?.label ?? "",
      tagLabels,
      services: services ?? [],
      products: products ?? [],
      posts: posts ?? [],
      reviews: reviews ?? [],
      reviewerNames,
    };
  });

/**
 * Submit an inquiry from the public mini-site. Open to anon visitors.
 * RLS additionally enforces length limits.
 */
export const submitBusinessInquiry = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        name: z.string().min(1).max(120),
        phone: z.string().max(40).optional().nullable(),
        email: z.string().email().max(200).optional().nullable(),
        message: z.string().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("business_inquiries").insert({
      business_id: data.businessId,
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      message: data.message.trim(),
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== OWNER (authed) ==============

async function assertEditor(supabase: any, userId: string, businessId: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, owner_id, organization_id")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Business not found");
  if ((data as any).owner_id === userId) return data;
  if ((data as any).organization_id) {
    const { data: m } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", (data as any).organization_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (m) return data;
  }
  throw new Error("Not authorized");
}

export const getMyBusinessPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);

    const [{ data: biz }, { data: services }, { data: products }, { data: posts }, { data: inquiries }] =
      await Promise.all([
        supabase.from("businesses").select("*").eq("id", data.businessId).maybeSingle(),
        supabase.from("business_services").select("*").eq("business_id", data.businessId).order("sort_order"),
        supabase.from("business_products").select("*").eq("business_id", data.businessId).order("sort_order"),
        supabase
          .from("business_posts")
          .select("*")
          .eq("business_id", data.businessId)
          .order("created_at", { ascending: false }),
        supabase
          .from("business_inquiries")
          .select("*")
          .eq("business_id", data.businessId)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    return {
      business: biz,
      services: services ?? [],
      products: products ?? [],
      posts: posts ?? [],
      inquiries: inquiries ?? [],
    };
  });

export const updateBusinessPageSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        tagline: z.string().max(160).nullable().optional(),
        description: z.string().max(4000).nullable().optional(),
        theme_color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .nullable()
          .optional(),
        show_services: z.boolean().optional(),
        show_products: z.boolean().optional(),
        show_posts: z.boolean().optional(),
        cta_primary: z.enum(["inquiry", "call", "messenger"]).optional(),
        logo_url: z.string().url().nullable().optional(),
        cover_url: z.string().url().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { businessId, ...patch } = data;
    const { error } = await supabase.from("businesses").update(patch as any).eq("id", businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Services --------
const serviceInput = z.object({
  id: z.string().uuid().optional(),
  businessId: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  price_label: z.string().max(60).nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  sort_order: z.number().int().optional(),
  active: z.boolean().optional(),
  category: z.string().max(40).nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  price_php: z.number().nonnegative().nullable().optional(),
  sale_price_php: z.number().nonnegative().nullable().optional(),
  catalog_key: z.string().max(60).nullable().optional(),
});

export const upsertBusinessService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => serviceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { businessId, id, ...payload } = data;
    if (id) {
      const { error } = await supabase
        .from("business_services")
        .update(payload as any)
        .eq("id", id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("business_services")
      .insert({ business_id: businessId, ...payload } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const deleteBusinessService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ businessId: z.string().uuid(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_services")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Products --------
const productInput = z.object({
  id: z.string().uuid().optional(),
  businessId: z.string().uuid(),
  title: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  price_php: z.number().nonnegative().nullable().optional(),
  sale_price_php: z.number().nonnegative().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  in_stock: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const upsertBusinessProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { businessId, id, ...payload } = data;
    if (id) {
      const { error } = await supabase
        .from("business_products")
        .update(payload as any)
        .eq("id", id)
        .eq("business_id", businessId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("business_products")
      .insert({ business_id: businessId, ...payload } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const deleteBusinessProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ businessId: z.string().uuid(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_products")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Posts --------
export const createBusinessPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        body: z.string().min(1).max(4000),
        photo_url: z.string().url().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase.from("business_posts").insert({
      business_id: data.businessId,
      body: data.body.trim(),
      photo_url: data.photo_url ?? null,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBusinessPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ businessId: z.string().uuid(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_posts")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Inquiries --------
export const updateInquiryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        id: z.string().uuid(),
        status: z.enum(["new", "open", "closed"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_inquiries")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
