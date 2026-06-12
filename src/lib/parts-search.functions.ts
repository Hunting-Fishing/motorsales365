import { createServerFn } from "@tanstack/react-start";

type OemPref = "any" | "oem" | "aftermarket";

/** Search the used-parts marketplace. Public (no auth). Service role for
 *  joining listing_fitment; only safe public columns are returned. */
export const searchUsedParts = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      make?: string | null;
      model?: string | null;
      year?: number | null;
      partKeys?: string[] | null;
      systems?: string[] | null;
      oemPreference?: OemPref;
      partNumber?: string | null;
      limit?: number;
    }) => ({
      make: input.make ?? null,
      model: input.model ?? null,
      year: input.year ?? null,
      partKeys: input.partKeys ?? null,
      systems: input.systems ?? null,
      oemPreference: (input.oemPreference ?? "any") as OemPref,
      partNumber: input.partNumber?.trim() || null,
      limit: Math.min(input.limit ?? 60, 120),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Fitment rows for the chosen make (full row, used for scoring).
    type FitRow = {
      listing_id: string;
      make: string;
      model: string;
      year_min: number | null;
      year_max: number | null;
    };
    let fitmentRows: FitRow[] = [];
    if (data.make) {
      const { data: rows, error: fErr } = await supabaseAdmin
        .from("listing_fitment")
        .select("listing_id,make,model,year_min,year_max")
        .ilike("make", data.make)
        .limit(4000);
      if (fErr) throw fErr;
      fitmentRows = (rows ?? []) as FitRow[];
    }
    const fitmentListingIds = data.make
      ? Array.from(new Set(fitmentRows.map((r) => r.listing_id))).filter(Boolean)
      : null;

    // 2) Pull candidate listings.
    let q = supabaseAdmin
      .from("listings")
      .select(
        "id,title,price_php,negotiable,price_hidden,region,city,seller_type,boost_until,status,category_slug,view_count,attributes,user_id,created_at,listing_media(url,type)",
      )
      .eq("status", "active")
      .in("category_slug", ["parts", "salvage"])
      .order("boost_until", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(Math.max(data.limit * 2, 120));

    if (data.make) {
      const orParts: string[] = [];
      if (fitmentListingIds && fitmentListingIds.length > 0) {
        orParts.push(`id.in.(${fitmentListingIds.join(",")})`);
      }
      orParts.push(`attributes->>make.ilike.${data.make}`);
      q = q.or(orParts.join(","));
    }

    const { data: listings, error } = await q;
    if (error) throw error;

    // 3) Filter (part keys/systems/oem/part number) + score.
    const wantKeys = new Set((data.partKeys ?? []).filter(Boolean));
    const wantSystems = new Set((data.systems ?? []).filter(Boolean));
    const oemPref = data.oemPreference;
    const wantPN = data.partNumber ? data.partNumber.toLowerCase() : null;
    const makeLc = data.make?.toLowerCase() ?? null;
    const modelLc = data.model?.toLowerCase() ?? null;

    // Group fitment by listing for fast scoring.
    const fitByListing = new Map<string, FitRow[]>();
    for (const r of fitmentRows) {
      const arr = fitByListing.get(r.listing_id) ?? [];
      arr.push(r);
      fitByListing.set(r.listing_id, arr);
    }

    const scored = (listings ?? [])
      .filter((l: any) => {
        // part keys / systems
        if (wantKeys.size > 0 || wantSystems.size > 0) {
          const keys: string[] = Array.isArray(l.attributes?.part_keys) ? l.attributes.part_keys : [];
          const systems: string[] = Array.isArray(l.attributes?.part_systems)
            ? l.attributes.part_systems
            : l.attributes?.part_system
              ? [l.attributes.part_system]
              : [];
          const keyHit = wantKeys.size === 0 || keys.some((k) => wantKeys.has(k));
          const sysHit = wantSystems.size === 0 || systems.some((s) => wantSystems.has(s));
          if (!(keyHit && sysHit)) return false;
        }
        // OEM/aftermarket
        if (oemPref !== "any") {
          const raw = String(l.attributes?.oem_or_aftermarket ?? l.attributes?.oem_aftermarket ?? "").toLowerCase();
          if (oemPref === "oem" && !raw.includes("oem")) return false;
          if (oemPref === "aftermarket" && !raw.includes("after")) return false;
        }
        // Part number substring
        if (wantPN) {
          const pn = String(l.attributes?.part_number ?? "").toLowerCase();
          if (!pn.includes(wantPN)) return false;
        }
        return true;
      })
      .map((l: any) => {
        let score = 0;
        if (makeLc) {
          const rows = fitByListing.get(l.id) ?? [];
          for (const r of rows) {
            if (r.make.toLowerCase() !== makeLc) continue;
            const modelOk = !modelLc || r.model.toLowerCase() === modelLc;
            let s = 1; // make match
            if (modelOk) s = 2;
            if (modelOk && data.year != null) {
              const yMin = r.year_min ?? -Infinity;
              const yMax = r.year_max ?? Infinity;
              if (data.year >= yMin && data.year <= yMax) s = 3;
            }
            if (s > score) score = s;
          }
          if (score === 0) {
            // attribute fallback
            const am = String(l.attributes?.make ?? "").toLowerCase();
            const amm = String(l.attributes?.model ?? "").toLowerCase();
            if (am === makeLc) {
              score = modelLc && amm === modelLc ? 2 : 1;
            }
          }
        }
        return { l, score };
      })
      .filter(({ score }) => (makeLc ? score > 0 : true))
      .sort((a, b) => {
        const ab = a.l.boost_until && new Date(a.l.boost_until) > new Date() ? 1 : 0;
        const bb = b.l.boost_until && new Date(b.l.boost_until) > new Date() ? 1 : 0;
        if (ab !== bb) return bb - ab;
        if (b.score !== a.score) return b.score - a.score;
        return String(b.l.created_at).localeCompare(String(a.l.created_at));
      })
      .slice(0, data.limit);

    return { listings: scored.map(({ l, score }) => mapListing(l, score)) };
  });

function mapListing(r: any, matchScore = 0) {
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
    match_score: matchScore,
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
    return { listings: (listings ?? []).map((l) => mapListing(l, 0)) };
  });

/** Catalog suggestions (OEM-equivalent reference cards) for the chosen
 *  systems / parts / vehicle. Pulls from parts_catalog. */
export const suggestCatalogParts = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      partKeys?: string[];
      partLabels?: string[];
      systems?: string[];
      make?: string | null;
      model?: string | null;
      year?: number | null;
      limit?: number;
    }) => ({
      partKeys: input.partKeys ?? [],
      partLabels: input.partLabels ?? [],
      systems: input.systems ?? [],
      make: input.make ?? null,
      model: input.model ?? null,
      year: input.year ?? null,
      limit: Math.min(input.limit ?? 6, 12),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("parts_catalog")
      .select(
        "id,slug,title,description,category,base_price_php,photo_url,compatible_makes,compatible_models,year_min,year_max",
      )
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(60);
    if (data.systems.length > 0) q = q.in("category", data.systems);

    const { data: rows, error } = await q;
    if (error) throw error;

    const labelTokens = data.partLabels
      .concat(data.partKeys.map((k) => k.replace(/_/g, " ")))
      .map((s) => s.toLowerCase())
      .filter(Boolean);

    const makeLc = data.make?.toLowerCase() ?? null;
    const modelLc = data.model?.toLowerCase() ?? null;

    const scored = (rows ?? [])
      .map((r: any) => {
        const hay = `${r.title} ${r.slug} ${r.description ?? ""}`.toLowerCase();
        let score = 0;
        for (const t of labelTokens) {
          if (!t) continue;
          if (hay.includes(t)) score += 3;
          else {
            // partial word hit
            const words = t.split(/\s+/).filter(Boolean);
            for (const w of words) if (w.length > 3 && hay.includes(w)) score += 1;
          }
        }
        if (makeLc && Array.isArray(r.compatible_makes)) {
          const m = (r.compatible_makes as string[]).map((s) => s.toLowerCase());
          if (m.length === 0 || m.includes(makeLc)) score += 1;
          else score -= 2;
        }
        if (modelLc && Array.isArray(r.compatible_models)) {
          const m = (r.compatible_models as string[]).map((s) => s.toLowerCase());
          if (m.length === 0 || m.includes(modelLc)) score += 1;
          else score -= 1;
        }
        if (data.year != null) {
          const yMin = r.year_min ?? -Infinity;
          const yMax = r.year_max ?? Infinity;
          if (data.year < yMin || data.year > yMax) score -= 1;
        }
        return { r, score };
      })
      .filter(({ score }) => score > 0 || labelTokens.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, data.limit)
      .map(({ r }) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        description: r.description,
        category: r.category,
        base_price_php: r.base_price_php != null ? Number(r.base_price_php) : null,
        photo_url: r.photo_url,
      }));

    return { suggestions: scored };
  });
