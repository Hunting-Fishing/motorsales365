// Admin-only server functions for the unified "Discover Businesses" page.
// - Facebook Page scraping + search
// - Geocoding any free-form address with a confidence hint
// - Importing curated rows (Google or Facebook) into public.businesses
//
// Google search/import still lives in business-seed.functions.ts and is reused
// by the new admin page. This file owns the Facebook + geocode + unified-import
// surface.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  scrapeFbPage,
  searchFbPages,
  geocodeWithConfidence,
  extractFbPageId,
  isFacebookPageUrl,
  type FbPageData,
  type GeocodedAddress,
} from "./business-discover.server";
import { findDuplicateBusiness, mergeIntoExisting } from "./business-dedupe.server";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "business"
  );
}

/** Resolve a free-form address into lat/lng with a confidence hint. */
export const geocodeForImport = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("businesses.discover.geocode")])
  .inputValidator((d: unknown) => z.object({ address: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }): Promise<GeocodedAddress> => {
    return geocodeWithConfidence(data.address);
  });

/** Scrape a Facebook Page URL and return parsed business fields + geocoded address. */
export const scrapeFbPageForAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("businesses.discover.scrapeFbPage")])
  .inputValidator((d: unknown) =>
    z.object({ url: z.string().url().max(2000) }).parse(d),
  )
  .handler(async ({ data }): Promise<FbCandidate> => {
    if (!isFacebookPageUrl(data.url)) {
      throw new Error("That URL doesn't look like a Facebook Page.");
    }
    const page = await scrapeFbPage(data.url);
    const geo = await geocodeWithConfidence(page.addressText);
    const exists = await findExistingByExternal("facebook", page.pageId);
    return {
      source: "facebook",
      pageId: page.pageId,
      pageUrl: page.pageUrl,
      name: page.name,
      category: page.category,
      about: page.about,
      addressText: page.addressText,
      phone: page.phone,
      website: page.website,
      hoursRaw: page.hoursRaw,
      coverImage: page.coverImage,
      profileImage: page.profileImage,
      geo,
      alreadyImported: !!exists,
      existingBusinessId: exists?.id ?? null,
    };
  });

/** Web search for FB pages — returns candidate URLs the admin can then scrape. */
export const searchFbPagesForAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("businesses.discover.searchFbPages")])
  .inputValidator((d: unknown) =>
    z
      .object({ query: z.string().min(2).max(200), city: z.string().max(100).optional() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const results = await searchFbPages({ query: data.query, city: data.city });
    // Mark already-imported pages so the UI can hide them.
    const ids = results.map((r) => extractFbPageId(r.url));
    let importedSet = new Set<string>();
    if (ids.length) {
      const { data: rows } = await supabaseAdmin
        .from("businesses")
        .select("source_external_id")
        .eq("source", "facebook")
        .in("source_external_id", ids);
      importedSet = new Set(
        (rows ?? [])
          .map((r: { source_external_id: string | null }) => r.source_external_id)
          .filter((v): v is string => !!v),
      );
    }
    return {
      results: results.map((r) => ({
        ...r,
        pageId: extractFbPageId(r.url),
        alreadyImported: importedSet.has(extractFbPageId(r.url)),
      })),
    };
  });

export const searchWebsiteSignupsForAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("businesses.discover.searchWebsiteSignups")])
  .inputValidator((d: unknown) =>
    z
      .object({ query: z.string().max(160).optional(), status: z.string().max(40).optional() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const q = (data.query ?? "").trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ");
    let query = supabaseAdmin
      .from("businesses")
      .select(
        "id,name,slug,vanity_slug,status,type_slug,phone,email,website,city,region,created_at,updated_at,owner_id,source,logo_url,cover_url,description",
      )
      .not("owner_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.status && data.status !== "all") query = query.eq("status", data.status as any);
    if (q.length >= 2) {
      const pattern = `%${q}%`;
      query = query.or(
        `name.ilike.${pattern},slug.ilike.${pattern},vanity_slug.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},city.ilike.${pattern}`,
      );
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

const ImportInput = z.object({
  rows: z
    .array(
      z.object({
        source: z.enum(["facebook", "google_places"]),
        externalId: z.string().min(1).max(200),
        name: z.string().min(1).max(200),
        typeSlug: z.string().min(1).max(64),
        streetAddress: z.string().max(500).nullable(),
        lat: z.number().nullable(),
        lng: z.number().nullable(),
        phone: z.string().max(60).nullable(),
        website: z.string().max(500).nullable(),
        coverUrl: z.string().max(2000).nullable(),
        region: z.string().max(120).nullable().optional(),
        city: z.string().max(120).nullable().optional(),
        about: z.string().max(2000).nullable().optional(),
        sourceUrl: z.string().max(500).nullable().optional(),
        attribution: z.string().max(200).nullable().optional(),
      }),
    )
    .min(1)
    .max(50),
});

/** Final import — gated. Skips rows without coordinates so map plotting always works. */
export const importDiscoveredBusinesses = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("businesses.discover.import")])
  .inputValidator((d: unknown) => ImportInput.parse(d))
  .handler(async ({ data }) => {
    const skipped: { name: string; reason: string }[] = [];
    const merged: { name: string; existingId: string; reason: string; fields: string[] }[] = [];
    const usable = data.rows.filter((r) => {
      if (r.lat == null || r.lng == null) {
        skipped.push({ name: r.name, reason: "Missing coordinates" });
        return false;
      }
      return true;
    });

    if (!usable.length) return { imported: 0, rows: [], skipped, merged };

    // First, detect and merge duplicates against existing businesses.
    const toInsert: typeof usable = [];
    for (const r of usable) {
      const dup = await findDuplicateBusiness({
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        streetAddress: r.streetAddress,
        source: r.source,
        externalId: r.externalId,
      });
      if (dup) {
        const res = await mergeIntoExisting(dup.id, {
          source: r.source,
          externalId: r.externalId,
          phone: r.phone,
          website: r.website,
          street_address: r.streetAddress,
          cover_url: r.coverUrl,
          lat: r.lat,
          lng: r.lng,
          region: r.region ?? null,
          city: r.city ?? null,
          about: r.about ?? null,
          sourceUrl: r.sourceUrl ?? null,
        });
        merged.push({ name: r.name, existingId: dup.id, reason: dup.reason, fields: res.fields });
        continue;
      }
      toInsert.push(r);
    }

    if (!toInsert.length) {
      return { imported: 0, rows: [], skipped, merged };
    }

    const upserts = toInsert.map((r) => {
      const base = slugify(r.name);
      const suffix = r.externalId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase() || "x";
      return {
        slug: `${base}-${suffix}`,
        name: r.name,
        type_slug: r.typeSlug,
        street_address: r.streetAddress,
        lat: r.lat,
        lng: r.lng,
        phone: r.phone,
        website: r.website,
        region: r.region ?? null,
        city: r.city ?? null,
        status: "active" as const,
        claim_state: "unclaimed",
        source: r.source,
        source_external_id: r.externalId,
        attribution:
          r.attribution ??
          (r.source === "facebook" ? "Public data from Facebook" : "Listing data © Google"),
        import_metadata: {
          source_url: r.sourceUrl ?? null,
          about: r.about ?? null,
        },
        photos: r.coverUrl ? [{ url: r.coverUrl, source: r.source }] : [],
        cover_url: r.coverUrl,
        owner_id: null,
      };
    });

    const { data: inserted, error } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        upsert: (
          rows: unknown[],
          opts: { onConflict: string; ignoreDuplicates: boolean },
        ) => { select: (cols: string) => Promise<{ data: unknown[] | null; error: { message: string } | null }> };
      };
    })
      .from("businesses")
      .upsert(upserts, { onConflict: "source,source_external_id", ignoreDuplicates: true })
      .select("id,slug,name");
    if (error) throw new Error(error.message);

    return {
      imported: (inserted as { id: string }[] | null)?.length ?? 0,
      rows: (inserted as { id: string; slug: string; name: string }[] | null) ?? [],
      skipped,
      merged,
    };
  });

async function findExistingByExternal(
  source: string,
  externalId: string,
): Promise<{ id: string } | null> {
  const { data } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("source", source)
    .eq("source_external_id", externalId)
    .maybeSingle();
  return (data as { id: string } | null) ?? null;
}

export type FbCandidate = {
  source: "facebook";
  pageId: string;
  pageUrl: string;
  name: string;
  category: string | null;
  about: string | null;
  addressText: string | null;
  phone: string | null;
  website: string | null;
  hoursRaw: string | null;
  coverImage: string | null;
  profileImage: string | null;
  geo: GeocodedAddress;
  alreadyImported: boolean;
  existingBusinessId: string | null;
};
