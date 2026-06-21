import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildTitleSearchTerms } from "@/lib/vehicle-aliases";
import { fuzzyFilter } from "@/lib/fuzzy";
import type { ListingCardData } from "@/components/listing-card";

const optStr = z.string().optional();
const optNum = z.coerce.number().optional();
const optBool = z.boolean().optional();

const filtersSchema = z.object({
  category: z.string().min(1).max(40),
  q: optStr,
  region: optStr,
  province: optStr,
  city: optStr,
  min: optNum,
  max: optNum,
  sort: z.enum(["recent", "price_asc", "price_desc"]).optional(),
  year: optNum,
  make: optStr,
  model: optStr,
  engine: optStr,
  transmission: optStr,
  fuel: optStr,
  body_type: optStr,
  drivetrain: optStr,
  mileage_min: optNum,
  mileage_max: optNum,
  owner_status: optStr,
  or_cr_status: optStr,
  flood_history: optStr,
  accident_history: optStr,
  registered_owner: optStr,
  deed_chain_available: optBool,
  financing_available: optBool,
  trade_accepted: optBool,
  verified_documents_only: optBool,
  moto_type: optStr,
  engine_cc_min: optNum,
  engine_cc_max: optNum,
  plate_status: optStr,
  moto_condition: optStr,
  delivery_available: optBool,
  equipment_type: optStr,
  brand: optStr,
  hours_min: optNum,
  hours_max: optNum,
  weight_min: optNum,
  weight_max: optNum,
  attachment_type: optStr,
  rental_or_sale: optStr,
  with_operator: optBool,
  inspection_available: optBool,
  boat_type: optStr,
  hull_material: optStr,
  boat_engine_type: optStr,
  length_min: optNum,
  length_max: optNum,
  boat_registration_status: optStr,
  boat_usage: optStr,
  trailer_included: optBool,
  registration_no: optStr,
  airworthiness: optStr,
  maintenance_logs: optStr,
  engine_hours_min: optNum,
  engine_hours_max: optNum,
  airport_code: optStr,
  aircraft_seller: optStr,
  inspection_required: optBool,
});

export type BrowseFiltersInput = z.infer<typeof filtersSchema>;

export interface BrowseListingsResult {
  items: ListingCardData[];
  userIds: string[];
}

/**
 * PUBLIC: Returns browse listings for a category with all filters applied.
 * Runs on the server so the route loader can SSR the cards into the HTML —
 * avoids the client-side useEffect waterfall that made /browse/* feel laggy.
 *
 * Security: returns only a fixed projection of columns that are already
 * visible to anonymous browsers via existing RLS read policies. No PII,
 * no contact fields, no admin-only columns.
 */
export const getBrowseListings = createServerFn({ method: "POST" })
  .inputValidator((input: BrowseFiltersInput) => filtersSchema.parse(input))
  .handler(async ({ data: search }): Promise<BrowseListingsResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const category = search.category;

    const baseSelect =
      "id,title,price_php,monthly_php,down_payment_php,negotiable,price_hidden,registration_status,region,city,lat,lng,seller_type,boost_until,status,category_slug,view_count,attributes,user_id,vehicle_id,published_at,updated_at,listing_media(url,type)";

    const buildBase = () => {
      let q = supabaseAdmin
        .from("listings")
        .select(baseSelect)
        .in("status", ["active", "pending_sale"])
        .eq("category_slug", category);
      if (search.region && search.region !== "all") q = q.eq("region", search.region);
      if (search.province) q = q.eq("province", search.province);
      if (search.city) q = q.eq("city", search.city);
      if (search.min) q = q.gte("price_php", search.min);
      if (search.max) q = q.lte("price_php", search.max);
      if (search.year) q = q.eq("attributes->>year", String(search.year));
      if (search.make) q = q.ilike("attributes->>make", search.make);
      if (search.model) q = q.ilike("attributes->>model", search.model);
      if (search.engine) q = q.ilike("attributes->>engine", search.engine);
      const eq = (k: string, v?: string) => {
        if (v) q = q.eq(`attributes->>${k}`, v);
      };
      const ilike = (k: string, v?: string) => {
        if (v) q = q.ilike(`attributes->>${k}`, `%${v}%`);
      };
      const gte = (k: string, v?: number) => {
        if (v != null && !Number.isNaN(v)) q = q.gte(`attributes->>${k}::numeric` as any, v);
      };
      const lte = (k: string, v?: number) => {
        if (v != null && !Number.isNaN(v)) q = q.lte(`attributes->>${k}::numeric` as any, v);
      };
      const isTrue = (k: string, v?: boolean) => {
        if (v) q = q.eq(`attributes->>${k}`, "true");
      };
      eq("transmission", search.transmission);
      eq("fuel", search.fuel);
      eq("body_type", search.body_type);
      eq("drivetrain", search.drivetrain);
      gte("mileage_km", search.mileage_min);
      lte("mileage_km", search.mileage_max);
      eq("owner_status", search.owner_status);
      eq("or_cr_status", search.or_cr_status);
      eq("flood_history", search.flood_history);
      eq("accident_history", search.accident_history);
      eq("registered_owner", search.registered_owner);
      isTrue("deed_chain_available", search.deed_chain_available);
      isTrue("financing_available", search.financing_available);
      isTrue("trade_accepted", search.trade_accepted);
      if (search.verified_documents_only) q = q.eq("attributes->>or_cr_status", "complete");
      eq("moto_type", search.moto_type);
      gte("engine_cc", search.engine_cc_min);
      lte("engine_cc", search.engine_cc_max);
      eq("plate_status", search.plate_status);
      eq("moto_condition", search.moto_condition);
      isTrue("delivery_available", search.delivery_available);
      eq("equipment_type", search.equipment_type);
      ilike("brand", search.brand);
      gte("hours", search.hours_min);
      lte("hours", search.hours_max);
      gte("operating_weight_tons", search.weight_min);
      lte("operating_weight_tons", search.weight_max);
      ilike("attachment_type", search.attachment_type);
      eq("rental_or_sale", search.rental_or_sale);
      isTrue("with_operator", search.with_operator);
      isTrue("inspection_available", search.inspection_available);
      eq("boat_type", search.boat_type);
      eq("hull_material", search.hull_material);
      eq("boat_engine_type", search.boat_engine_type);
      gte("length_ft", search.length_min);
      lte("length_ft", search.length_max);
      eq("boat_registration_status", search.boat_registration_status);
      eq("boat_usage", search.boat_usage);
      isTrue("trailer_included", search.trailer_included);
      ilike("registration_no", search.registration_no);
      eq("airworthiness", search.airworthiness);
      eq("maintenance_logs", search.maintenance_logs);
      gte("engine_hours", search.engine_hours_min);
      lte("engine_hours", search.engine_hours_max);
      ilike("airport_code", search.airport_code);
      eq("aircraft_seller", search.aircraft_seller);
      isTrue("inspection_required", search.inspection_required);

      if (search.sort === "price_asc") q = q.order("price_php", { ascending: true });
      else if (search.sort === "price_desc") q = q.order("price_php", { ascending: false });
      else
        q = q
          .order("boost_until", { ascending: false, nullsFirst: false })
          .order("published_at", { ascending: false, nullsFirst: false });
      return q;
    };

    const terms = search.q ? buildTitleSearchTerms(search.q, 6) : [];
    const escape = (s: string) => s.replace(/[%,()]/g, " ").trim();

    let q = buildBase();
    if (search.q && terms.length > 0) {
      const orExpr = terms.map((t) => `title.ilike.%${escape(t)}%`).join(",");
      q = q.or(orExpr);
    }

    let { data, error } = await q.limit(60);
    if (error) throw new Error(error.message);

    if (search.q && (!data || data.length < 6)) {
      const fb = await buildBase().limit(200);
      if (fb.data) {
        const fuzz = fuzzyFilter(fb.data as any[], search.q, (r) => r.title ?? "");
        const seen = new Set((data ?? []).map((r: any) => r.id));
        for (const r of fuzz) {
          if (!seen.has((r as any).id)) {
            (data ??= []).push(r as any);
            if (data.length >= 60) break;
          }
        }
      }
    }

    const rows = (data ?? []) as any[];
    const userIdsAll = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
    const vehicleIdsAll = Array.from(
      new Set(rows.map((r) => r.vehicle_id).filter(Boolean)),
    ) as string[];

    const listingIds = rows.map((r) => r.id);

    const [profilesRes, vehiclesRes, subsRes, trendsRes, promosRes] = await Promise.all([
      userIdsAll.length
        ? supabaseAdmin
            .from("profiles")
            .select("id,verification_status,phone_verified_at")
            .in("id", userIdsAll)
        : Promise.resolve({ data: [] as any[] }),
      vehicleIdsAll.length
        ? supabaseAdmin
            .from("vehicles")
            .select("id,is_public,passport_slug,vehicle_passport_verifications(status)")
            .in("id", vehicleIdsAll)
        : Promise.resolve({ data: [] as any[] }),
      userIdsAll.length
        ? supabaseAdmin
            .from("subscriptions")
            .select(
              "user_id,status,current_period_end,cancel_at_period_end,plan:subscription_plans(name)",
            )
            .in("user_id", userIdsAll)
            .in("status", ["active", "trialing", "past_due"])
        : Promise.resolve({ data: [] as any[] }),
      listingIds.length
        ? (supabaseAdmin as any).rpc("get_listing_price_trends", {
            _listing_ids: listingIds,
          })
        : Promise.resolve({ data: [] as any[] }),
      listingIds.length
        ? supabaseAdmin
            .from("listing_promotions")
            .select("listing_id,label,percent_off,amount_off_php,ends_at,starts_at")
            .in("listing_id", listingIds)
            .gt("ends_at", new Date().toISOString())
            .lte("starts_at", new Date().toISOString())
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profilesMap = new Map<string, any>(
      ((profilesRes as any).data ?? []).map((p: any) => [p.id, p]),
    );
    const vehiclesMap = new Map<string, any>(
      ((vehiclesRes as any).data ?? []).map((v: any) => [v.id, v]),
    );
    const subsMap = new Map<string, any>();
    for (const s of (subsRes as any).data ?? []) {
      if (!subsMap.has(s.user_id)) subsMap.set(s.user_id, s);
    }
    const trendsMap = new Map<string, any>();
    for (const t of (trendsRes as any).data ?? []) trendsMap.set(t.listing_id, t);
    const promosMap = new Map<string, any>();
    for (const p of (promosRes as any).data ?? []) {
      if (!promosMap.has(p.listing_id)) promosMap.set(p.listing_id, p);
    }

    const items: ListingCardData[] = rows.map((r) => {
      const photos = (r.listing_media ?? []).filter((m: any) => m.type === "photo");
      const videos = (r.listing_media ?? []).filter((m: any) => m.type === "video");
      const profile = r.user_id ? profilesMap.get(r.user_id) : null;
      const vehicle = r.vehicle_id ? vehiclesMap.get(r.vehicle_id) : null;
      const sub = r.user_id ? subsMap.get(r.user_id) : null;
      const trend = trendsMap.get(r.id);
      const promo = promosMap.get(r.id);
      return {
        id: r.id,
        title: r.title,
        price_php: Number(r.price_php),
        monthly_php: r.monthly_php,
        down_payment_php: r.down_payment_php,
        negotiable: r.negotiable,
        price_hidden: r.price_hidden,
        registration_status: r.registration_status,
        region: r.region,
        city: r.city,
        seller_type: r.seller_type,
        boost_until: r.boost_until,
        category_slug: r.category_slug,
        view_count: r.view_count ?? 0,
        cover_url: photos[0]?.url ?? null,
        photo_count: photos.length,
        has_video: videos.length > 0,
        seller_verified: profile?.verification_status === "verified",
        seller_phone_verified: !!profile?.phone_verified_at,
        passport_published: !!(vehicle?.is_public && vehicle?.passport_slug),
        passport_documents_checked: !!vehicle?.vehicle_passport_verifications?.some(
          (v: any) => v.status === "approved",
        ),
        seller_user_id: r.user_id ?? null,
        seller_dealer_plan: sub?.plan?.name ?? null,
        seller_dealer_period_end: sub?.current_period_end ?? null,
        seller_dealer_cancel_at_period_end: !!sub?.cancel_at_period_end,
        status: r.status,
        attributes: r.attributes,
        published_at: r.published_at,
        updated_at: r.updated_at,
        price_trend: trend
          ? {
              direction: trend.direction,
              delta_pct: trend.delta_pct,
              field: trend.field,
              changed_at: trend.changed_at,
            }
          : null,
        promotion: promo
          ? {
              label: promo.label,
              percent_off: promo.percent_off,
              amount_off_php: promo.amount_off_php,
              ends_at: promo.ends_at,
            }
          : null,
      } as ListingCardData;
    });

    return { items, userIds: userIdsAll };
  });
