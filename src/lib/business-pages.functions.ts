import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Lenient URL: accept bare domain, normalize to https://, allow null/empty.
const lenientUrl = (max = 500) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return v;
      const t = v.trim();
      if (!t) return null;
      const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
      try {
        return new URL(withScheme).toString();
      } catch {
        throw new Error(`Invalid URL: ${v}`);
      }
    });

const HIDDEN_BUSINESS_STATUSES = ["archived", "hidden", "removed", "banned"] as const;

export const resolveBusinessMiniSiteSlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const lookup = data.slug.trim().toLowerCase();

    const select = "id,slug,vanity_slug,status";
    const { data: initial, error } = await supabaseAdmin
      .from("businesses")
      .select(select)
      .or(`slug.eq.${lookup},vanity_slug.eq.${lookup}`)
      .maybeSingle();
    if (error) throw new Error(error.message);

    let biz = initial;
    if (!biz) {
      const { data: hist } = await supabaseAdmin
        .from("business_slug_history")
        .select("business_id")
        .ilike("old_slug", lookup)
        .limit(1)
        .maybeSingle();
      if (hist) {
        const { data: historical } = await supabaseAdmin
          .from("businesses")
          .select(select)
          .eq("id", (hist as any).business_id)
          .maybeSingle();
        biz = historical ?? null;
      }
    }

    if (!biz || HIDDEN_BUSINESS_STATUSES.includes(String((biz as any).status) as any)) {
      return { business: null };
    }
    return { business: biz as { id: string; slug: string; vanity_slug: string | null; status: string } };
  });


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
    const lookup = data.slug.toLowerCase();
    const { data: initialBiz, error } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .or(`slug.eq.${lookup},vanity_slug.eq.${lookup}`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    let biz = initialBiz;
    if (!biz) {
      // fall back to slug history → resolve to canonical
      const { data: hist } = await supabaseAdmin
        .from("business_slug_history")
        .select("business_id")
        .ilike("old_slug", lookup)
        .limit(1)
        .maybeSingle();
      if (hist) {
        const { data: b2 } = await supabaseAdmin
          .from("businesses")
          .select("*")
          .eq("id", (hist as any).business_id)
          .maybeSingle();
        biz = b2 ?? null;
      }
    }
    if (!biz || HIDDEN_BUSINESS_STATUSES.includes(String((biz as any).status) as any)) {
      return { business: null };
    }

    const [
      { data: typeRow },
      { data: tagLinks },
      { data: services },
      { data: products },
      { data: posts },
      { data: reviews },
      { data: albums },
      { data: photos },
      { data: contactChannels },
      { data: bookableItems },
    ] = await Promise.all([
      supabaseAdmin
        .from("business_types")
        .select("label")
        .eq("slug", (biz as any).type_slug)
        .maybeSingle(),
      supabaseAdmin
        .from("business_tag_links")
        .select("tag_slug")
        .eq("business_id", (biz as any).id),
      supabaseAdmin
        .from("business_services")
        .select("id, title, description, price_label, price_php, sale_price_php, max_price_php, unit, photo_url, sort_order, region_scope, service_radius_km, eta_minutes, tags, available_24_7")
        .eq("business_id", (biz as any).id)
        .eq("active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("business_products")
        .select(
          "id, title, description, price_php, sale_price_php, photo_url, in_stock, sort_order",
        )
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
      supabaseAdmin
        .from("business_gallery_albums")
        .select("id, title, description, cover_url, sort_order")
        .eq("business_id", (biz as any).id)
        .order("sort_order"),
      supabaseAdmin
        .from("business_gallery_photos")
        .select("id, album_id, url, caption, sort_order")
        .eq("business_id", (biz as any).id)
        .order("sort_order"),
      supabaseAdmin
        .from("business_contact_channels")
        .select("id, kind, label, value, sort_order")
        .eq("business_id", (biz as any).id)
        .order("sort_order"),
      supabaseAdmin
        .from("business_bookable_items")
        .select("id, title, duration_min, price_php")
        .eq("business_id", (biz as any).id)
        .eq("active", true)
        .order("sort_order"),
    ]);

    let tagLabels: string[] = [];
    let tags: {
      slug: string;
      label: string;
      category: string | null;
      type_slug: string | null;
    }[] = [];
    const typeLabels: Record<string, string> = {};
    const tagSlugs = (tagLinks ?? []).map((l: any) => l.tag_slug);
    if (tagSlugs.length > 0) {
      const { data: tagRows } = await supabaseAdmin
        .from("business_tags")
        .select("slug,label,category,type_slug,description")
        .in("slug", tagSlugs);
      tags = (tagRows ?? []).map((r: any) => ({
        slug: r.slug,
        label: r.label,
        category: r.category ?? null,
        type_slug: r.type_slug ?? null,
        description: r.description ?? null,
      }));
      tagLabels = tags.map((t) => t.label);
      const otherTypeSlugs = Array.from(
        new Set(
          tags
            .map((t) => t.type_slug)
            .filter(
              (s): s is string => !!s && s !== (biz as any).type_slug,
            ),
        ),
      );
      if (otherTypeSlugs.length > 0) {
        const { data: typeRows } = await supabaseAdmin
          .from("business_types")
          .select("slug,label")
          .in("slug", otherTypeSlugs);
        for (const t of typeRows ?? []) {
          typeLabels[(t as any).slug] = (t as any).label;
        }
      }
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
      primaryTypeSlug: (biz as any).type_slug ?? null,
      typeLabels,
      tagLabels,
      tags,
      services: services ?? [],
      products: products ?? [],
      posts: posts ?? [],
      reviews: reviews ?? [],
      reviewerNames,
      albums: albums ?? [],
      photos: photos ?? [],
      contactChannels: contactChannels ?? [],
      bookableItems: bookableItems ?? [],
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
    try {
      await supabaseAdmin.from("business_page_events").insert({
        business_id: data.businessId,
        kind: "inquiry_submitted",
      } as any);
    } catch {
      /* ignore */
    }
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

    const [
      { data: biz },
      { data: services },
      { data: products },
      { data: posts },
      { data: inquiries },
      { data: albums },
      { data: photos },
      { data: contactChannels },
      { data: bookableItems },
      { data: availability },
      { data: exceptions },
      { data: bookings },
    ] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", data.businessId).maybeSingle(),
      supabase
        .from("business_services")
        .select("*")
        .eq("business_id", data.businessId)
        .order("sort_order"),
      supabase
        .from("business_products")
        .select("*")
        .eq("business_id", data.businessId)
        .order("sort_order"),
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
      supabase
        .from("business_gallery_albums")
        .select("*")
        .eq("business_id", data.businessId)
        .order("sort_order"),
      supabase
        .from("business_gallery_photos")
        .select("*")
        .eq("business_id", data.businessId)
        .order("sort_order"),
      supabase
        .from("business_contact_channels")
        .select("*")
        .eq("business_id", data.businessId)
        .order("sort_order"),
      supabase
        .from("business_bookable_items")
        .select("*")
        .eq("business_id", data.businessId)
        .order("sort_order"),
      supabase.from("business_availability").select("*").eq("business_id", data.businessId),
      supabase
        .from("business_availability_exceptions")
        .select("*")
        .eq("business_id", data.businessId)
        .order("date"),
      supabase
        .from("business_bookings")
        .select("*")
        .eq("business_id", data.businessId)
        .order("starts_at", { ascending: false })
        .limit(200),
    ]);

    return {
      business: biz,
      services: services ?? [],
      products: products ?? [],
      posts: posts ?? [],
      inquiries: inquiries ?? [],
      albums: albums ?? [],
      photos: photos ?? [],
      contactChannels: contactChannels ?? [],
      bookableItems: bookableItems ?? [],
      availability: availability ?? [],
      exceptions: exceptions ?? [],
      bookings: bookings ?? [],
    };
  });

export const updateBusinessPageSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessId: z.string().uuid(),
        name: z.string().trim().min(2).max(160).optional(),
        tagline: z.string().max(160).nullable().optional(),
        description: z.string().max(4000).nullable().optional(),
        phone: z.string().max(40).nullable().optional(),
        email: z.string().email().max(200).nullable().optional(),
        website: lenientUrl(500),
        messenger_url: lenientUrl(500),
        facebook_url: lenientUrl(500),
        whatsapp_number: z.string().max(40).nullable().optional(),
        brands_carried: z.string().max(2000).nullable().optional(),
        brands: z
          .array(z.object({ name: z.string().trim().min(1).max(80) }))
          .max(60)
          .optional(),
        theme_color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .nullable()
          .optional(),
        show_services: z.boolean().optional(),
        show_products: z.boolean().optional(),
        show_posts: z.boolean().optional(),
        show_gallery: z.boolean().optional(),
        show_contact: z.boolean().optional(),
        cta_primary: z.enum(["inquiry", "call", "messenger"]).optional(),
        logo_url: lenientUrl(2048),
        cover_url: lenientUrl(2048),
        featured_video_url: lenientUrl(500),
        featured_video_provider: z.enum(["youtube", "vimeo", "facebook"]).nullable().optional(),
        // Location fields (editable post-submission)
        street_address: z.string().max(300).nullable().optional(),
        region: z.string().max(120).nullable().optional(),
        province: z.string().max(120).nullable().optional(),
        city: z.string().max(120).nullable().optional(),
        barangay: z.string().max(120).nullable().optional(),
        postal_code: z.string().max(20).nullable().optional(),
        lat: z.number().min(-90).max(90).nullable().optional(),
        lng: z.number().min(-180).max(180).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEditor(supabase, userId, data.businessId);
    const { businessId, brands, whatsapp_number, ...rest } = data;

    // Normalize WhatsApp: digits-only, default PH +63 when local format
    let normalizedWhatsapp: string | null | undefined = whatsapp_number;
    if (whatsapp_number !== undefined && whatsapp_number !== null) {
      const trimmed = whatsapp_number.trim();
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length === 0) normalizedWhatsapp = null;
      else if (trimmed.startsWith("+")) normalizedWhatsapp = `+${digits}`;
      else if (digits.startsWith("63")) normalizedWhatsapp = `+${digits}`;
      else if (digits.startsWith("0")) normalizedWhatsapp = `+63${digits.slice(1)}`;
      else if (digits.startsWith("9") && digits.length === 10) normalizedWhatsapp = `+63${digits}`;
      else normalizedWhatsapp = `+${digits}`;
    }

    const patch: Record<string, unknown> = { ...rest };
    if (whatsapp_number !== undefined) patch.whatsapp_number = normalizedWhatsapp;

    const { error } = await supabase
      .from("businesses")
      .update(patch as any)
      .eq("id", businessId);
    if (error) throw new Error(error.message);

    if (brands !== undefined) {
      // Replace strategy: clear & reinsert in order (≤60 rows).
      const { error: delErr } = await supabase
        .from("business_brands")
        .delete()
        .eq("business_id", businessId);
      if (delErr) throw new Error(delErr.message);

      const seen = new Set<string>();
      const rows = brands
        .map((b, i) => {
          const name = b.name.trim();
          const slug = name
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
          if (!slug || seen.has(slug)) return null;
          seen.add(slug);
          return { business_id: businessId, name, slug, sort_order: i };
        })
        .filter((r): r is { business_id: string; name: string; slug: string; sort_order: number } => r !== null);

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("business_brands").insert(rows as any);
        if (insErr) throw new Error(insErr.message);
      }
    }

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
