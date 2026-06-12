import { createServerFn } from "@tanstack/react-start";

/** Search the used-parts marketplace. Public (no auth) — uses service role
 *  for the join with listing_fitment and returns only safe public columns. */
export const searchUsedParts = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      make?: string | null;
      model?: string | null;
      year?: number | null;
      partKeys?: string[] | null;
      systems?: string[] | null;
      limit?: number;
    }) => ({
      make: input.make ?? null,
      model: input.model ?? null,
      year: input.year ?? null,
      partKeys: input.partKeys ?? null,
      systems: input.systems ?? null,
      limit: Math.min(input.limit ?? 60, 120),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Find listing_ids matching the fitment filter (if any vehicle provided).
    let fitmentListingIds: string[] | null = null;
    if (data.make) {
      let fq = supabaseAdmin
        .from("listing_fitment")
        .select("listing_id")
        .ilike("make", data.make);
      if (data.model) fq = fq.ilike("model", data.model);
      const { data: rows, error: fErr } = await fq.limit(2000);
      if (fErr) throw fErr;
      fitmentListingIds = (rows ?? [])
        .map((r) => r.listing_id as string)
        .filter(Boolean);
    }

    // 2) Query parts listings.
    let q = supabaseAdmin
      .from("listings")
      .select(
        "id,title,price_php,negotiable,price_hidden,region,city,seller_type,boost_until,status,category_slug,view_count,attributes,user_id,listing_media(url,type)",
      )
      .eq("status", "active")
      .in("category_slug", ["parts", "salvage"])
      .order("boost_until", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);

    // Vehicle filter: match either fitment table OR listing attributes.
    if (data.make) {
      const orParts: string[] = [];
      if (fitmentListingIds && fitmentListingIds.length > 0) {
        orParts.push(`id.in.(${fitmentListingIds.join(",")})`);
      }
      orParts.push(`attributes->>make.ilike.${data.make}`);
      q = q.or(orParts.join(","));
      if (data.model) {
        // Model match falls back to attribute; fitment already filtered by model above.
        // (We keep this loose to avoid over-filtering when fitment rows aren't present.)
      }
    }

    const { data: listings, error } = await q;
    if (error) throw error;

    // 3) Client-side filter for part keys / systems (stored in attributes.part_keys / part_system).
    const wantKeys = new Set((data.partKeys ?? []).filter(Boolean));
    const wantSystems = new Set((data.systems ?? []).filter(Boolean));
    const filtered = (listings ?? []).filter((l: any) => {
      if (wantKeys.size === 0 && wantSystems.size === 0) return true;
      const keys: string[] = Array.isArray(l.attributes?.part_keys) ? l.attributes.part_keys : [];
      const systems: string[] = Array.isArray(l.attributes?.part_systems)
        ? l.attributes.part_systems
        : l.attributes?.part_system
          ? [l.attributes.part_system]
          : [];
      const keyHit = wantKeys.size === 0 || keys.some((k) => wantKeys.has(k));
      const sysHit = wantSystems.size === 0 || systems.some((s) => wantSystems.has(s));
      return keyHit && sysHit;
    });

    return { listings: filtered.map(mapListing) };
  });

function mapListing(r: any) {
  const media = Array.isArray(r.listing_media) ? r.listing_media : [];
  const photos = media.filter((m: any) => m.type === "photo");
  const videos = media.filter((m: any) => m.type === "video");
  return {
    id: r.id,
    title: r.title,
    price_php: Number(r.price_php ?? 0),
    region: r.region ?? null,
    city: r.city ?? null,
    seller_type: r.seller_type ?? "private",
    boost_until: r.boost_until ?? null,
    category_slug: r.category_slug,
    view_count: r.view_count ?? 0,
    cover_url: photos[0]?.url ?? null,
    photo_count: photos.length,
    has_video: videos.length > 0,
    seller_user_id: r.user_id ?? null,
    status: r.status,
    attributes: r.attributes,
    negotiable: r.negotiable ?? null,
    price_hidden: r.price_hidden ?? null,
  };
}

/** Browse parts hub default feed (no vehicle filter). */
export const browseUsedParts = createServerFn({ method: "POST" })
  .inputValidator((input: { systems?: string[]; limit?: number }) => ({
    systems: input.systems ?? [],
    limit: Math.min(input.limit ?? 30, 120),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listings, error } = await supabaseAdmin
      .from("listings")
      .select(
        "id,title,price_php,negotiable,price_hidden,region,city,seller_type,boost_until,status,category_slug,view_count,attributes,user_id,listing_media(url,type)",
      )
      .eq("status", "active")
      .in("category_slug", ["parts", "salvage"])
      .order("boost_until", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return { listings: (listings ?? []).map(mapListing) };
  });
