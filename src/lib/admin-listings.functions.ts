import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

const LISTING_STATUS_VALUES = [
  "draft",
  "pending_payment",
  "active",
  "pending_sale",
  "hidden",
  "sold",
  "expired",
] as const;

const SELLER_FIELDS =
  "id, full_name, first_name, last_name, business_name, seller_type, verification_status, verified_at, phone, phone_verified_at, seller_rating_avg, seller_rating_count, account_status, created_at";

const LIST_FIELDS =
  "id, title, price_php, status, category_slug, seller_type, plan, created_at, published_at, expires_at, boost_until, user_id, view_count, listing_media(url, type), payments(id, status, amount_php, kind)";

/* ============= List tab ============= */

export const adminListListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum([...LISTING_STATUS_VALUES, "all"]).default("all"),
        category: z.string().max(60).optional(),
        search: z.string().max(120).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = supabaseAdmin
      .from("listings")
      .select(LIST_FIELDS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.category) q = q.eq("category_slug", data.category);
    if (data.search?.trim()) q = q.ilike("title", `%${data.search.trim()}%`);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    const listingIds = (rows ?? []).map((r: any) => r.id);

    const [profilesRes, reportsRes, fitmentRes] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select(SELLER_FIELDS).in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      listingIds.length
        ? supabaseAdmin
            .from("reports")
            .select("listing_id, status")
            .in("listing_id", listingIds)
            .eq("status", "open")
        : Promise.resolve({ data: [] as any[] }),
      listingIds.length
        ? supabaseAdmin
            .from("listing_fitment")
            .select("listing_id, make, model, trim, year_min, year_max")
            .in("listing_id", listingIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));

    const reportCounts = new Map<string, number>();
    for (const r of (reportsRes.data ?? []) as any[]) {
      if (!r.listing_id) continue;
      reportCounts.set(r.listing_id, (reportCounts.get(r.listing_id) ?? 0) + 1);
    }

    const fitmentMap = new Map<string, any[]>();
    for (const f of (fitmentRes.data ?? []) as any[]) {
      const arr = fitmentMap.get(f.listing_id) ?? [];
      arr.push(f);
      fitmentMap.set(f.listing_id, arr);
    }

    const items = (rows ?? []).map((r: any) => {
      const media = r.listing_media ?? [];
      const photos = media.filter((m: any) => m.type === "photo");
      const videos = media.filter((m: any) => m.type === "video");
      const payments = r.payments ?? [];
      const pendingPayment = payments.find((p: any) => p.status === "pending") ?? null;
      return {
        id: r.id,
        title: r.title,
        price_php: r.price_php,
        status: r.status,
        category_slug: r.category_slug,
        seller_type: r.seller_type,
        plan: r.plan,
        created_at: r.created_at,
        published_at: r.published_at,
        expires_at: r.expires_at,
        boost_until: r.boost_until,
        boost_until_active: !!r.boost_until && new Date(r.boost_until) > new Date(),
        user_id: r.user_id,
        view_count: r.view_count,
        cover_url: photos[0]?.url ?? null,
        photo_count: photos.length,
        has_video: videos.length > 0,
        seller: profileMap.get(r.user_id) ?? null,
        openReportCount: reportCounts.get(r.id) ?? 0,
        fitment: fitmentMap.get(r.id) ?? [],
        pendingPayment,
      };
    });

    return { items, total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const adminListingCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("slug, name")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return { categories: data ?? [] };
  });

/* ============= Detail drawer ============= */

export const adminGetListingDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: listing, error } = await supabaseAdmin
      .from("listings")
      .select(
        "*, listing_media(id, url, type, sort_order), listing_fitment(id, make, model, trim, year_min, year_max)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing) throw new Error("Listing not found");

    const [profileRes, reportsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select(SELLER_FIELDS).eq("id", (listing as any).user_id).maybeSingle(),
      supabaseAdmin
        .from("reports")
        .select("id, reason, category, status, details, created_at")
        .eq("listing_id", data.id)
        .order("created_at", { ascending: false }),
    ]);

    const media = ((listing as any).listing_media ?? [])
      .slice()
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return {
      listing: { ...(listing as any), listing_media: media },
      seller: profileRes.data ?? null,
      reports: reportsRes.data ?? [],
    };
  });

/* ============= Moderation actions ============= */

export const adminSetListingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(LISTING_STATUS_VALUES),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("listings")
      .update({
        status: data.status,
        published_at: data.status === "active" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBulkSetListingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(200),
        status: z.enum(LISTING_STATUS_VALUES),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("listings")
      .update({
        status: data.status,
        published_at: data.status === "active" ? new Date().toISOString() : null,
      })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const adminMarkListingPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        paymentId: z.string().uuid(),
        listingId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: payError } = await supabaseAdmin
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", data.paymentId);
    if (payError) throw new Error(payError.message);

    const { error: listError } = await supabaseAdmin
      .from("listings")
      .update({ status: "active", published_at: new Date().toISOString() })
      .eq("id", data.listingId);
    if (listError) throw new Error(listError.message);

    return { ok: true };
  });
