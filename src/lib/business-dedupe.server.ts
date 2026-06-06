// Server-only helpers to detect and merge duplicate businesses when importing
// from Google Places or Facebook. Matching strategy:
//   1) Exact (source, source_external_id) — handled by the upsert conflict.
//   2) Normalized name within ~250m of provided coordinates.
//   3) Normalized name + normalized street_address (fallback when coords differ).
//
// When a duplicate is found we merge — fill missing fields on the existing
// business and record the secondary source under import_metadata.merged_sources
// so we never create a second listing for the same shop.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NAME_NOISE = [
  "inc", "incorporated", "corp", "corporation", "co", "company", "llc", "ltd",
  "limited", "philippines", "ph", "the", "and", "official", "shop", "store",
  "branch", "auto", "motors", "motor", "motorshop",
];

export function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  const base = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const tokens = base.split(/\s+/).filter((t) => t && !NAME_NOISE.includes(t));
  return tokens.join(" ");
}

function normalizeAddress(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSetSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = new Set(a.split(" "));
  const tb = new Set(b.split(" "));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type DedupeCandidate = {
  name: string;
  lat: number | null;
  lng: number | null;
  streetAddress: string | null;
  source: string;
  externalId: string;
};

export type DuplicateMatch = {
  id: string;
  name: string;
  slug: string;
  source: string | null;
  source_external_id: string | null;
  distance_m: number | null;
  name_similarity: number;
  reason: "coord_near_name" | "name_address";
};

const NAME_SIM_THRESHOLD = 0.7;
const NEAR_METERS = 250;

/** Find an existing business that likely refers to the same place. */
export async function findDuplicateBusiness(
  c: DedupeCandidate,
): Promise<DuplicateMatch | null> {
  const normName = normalizeName(c.name);
  if (!normName) return null;

  // Pull candidates inside a small bbox first (fast) when we have coords.
  const candidates: any[] = [];
  if (c.lat != null && c.lng != null) {
    const dLat = 0.003; // ~330m
    const dLng = 0.003;
    const { data } = await (supabaseAdmin as any)
      .from("businesses")
      .select("id,name,slug,source,source_external_id,lat,lng,street_address")
      .gte("lat", c.lat - dLat)
      .lte("lat", c.lat + dLat)
      .gte("lng", c.lng - dLng)
      .lte("lng", c.lng + dLng)
      .limit(50);
    if (Array.isArray(data)) candidates.push(...data);
  }

  // Geo match.
  if (c.lat != null && c.lng != null) {
    for (const b of candidates) {
      if (b.lat == null || b.lng == null) continue;
      if (b.source === c.source && b.source_external_id === c.externalId) {
        return {
          id: b.id, name: b.name, slug: b.slug,
          source: b.source, source_external_id: b.source_external_id,
          distance_m: 0, name_similarity: 1, reason: "coord_near_name",
        };
      }
      const dist = haversineMeters(
        { lat: c.lat, lng: c.lng },
        { lat: Number(b.lat), lng: Number(b.lng) },
      );
      if (dist > NEAR_METERS) continue;
      const sim = tokenSetSimilarity(normName, normalizeName(b.name));
      if (sim >= NAME_SIM_THRESHOLD) {
        return {
          id: b.id, name: b.name, slug: b.slug,
          source: b.source, source_external_id: b.source_external_id,
          distance_m: Math.round(dist), name_similarity: Number(sim.toFixed(2)),
          reason: "coord_near_name",
        };
      }
    }
  }

  // Address fallback — same normalized address and similar name.
  const normAddr = normalizeAddress(c.streetAddress);
  if (normAddr && normName) {
    // Cheap prefix prefilter on name's first significant token.
    const firstTok = normName.split(" ")[0];
    if (firstTok && firstTok.length >= 3) {
      const { data } = await (supabaseAdmin as any)
        .from("businesses")
        .select("id,name,slug,source,source_external_id,street_address,lat,lng")
        .ilike("name", `%${firstTok}%`)
        .limit(50);
      for (const b of (data ?? []) as any[]) {
        if (normalizeAddress(b.street_address) !== normAddr) continue;
        const sim = tokenSetSimilarity(normName, normalizeName(b.name));
        if (sim >= NAME_SIM_THRESHOLD) {
          return {
            id: b.id, name: b.name, slug: b.slug,
            source: b.source, source_external_id: b.source_external_id,
            distance_m: null, name_similarity: Number(sim.toFixed(2)),
            reason: "name_address",
          };
        }
      }
    }
  }

  return null;
}

export type MergePatch = {
  phone?: string | null;
  website?: string | null;
  street_address?: string | null;
  cover_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  region?: string | null;
  city?: string | null;
};

/**
 * Merge new source data into an existing business without overwriting
 * non-null fields. Appends the new source under import_metadata.merged_sources.
 */
export async function mergeIntoExisting(
  existingId: string,
  incoming: MergePatch & {
    source: string;
    externalId: string;
    about?: string | null;
    sourceUrl?: string | null;
    coverUrl?: string | null;
  },
): Promise<{ merged: boolean; fields: string[] }> {
  const { data: existing, error } = await (supabaseAdmin as any)
    .from("businesses")
    .select("id, phone, website, street_address, cover_url, lat, lng, region, city, photos, import_metadata")
    .eq("id", existingId)
    .maybeSingle();
  if (error || !existing) return { merged: false, fields: [] };

  const patch: Record<string, unknown> = {};
  const fill = (k: keyof MergePatch, v: unknown) => {
    if (v == null || v === "") return;
    if (existing[k] == null || existing[k] === "") {
      patch[k as string] = v;
    }
  };
  fill("phone", incoming.phone);
  fill("website", incoming.website);
  fill("street_address", incoming.street_address);
  fill("cover_url", incoming.cover_url ?? incoming.coverUrl ?? null);
  fill("lat", incoming.lat);
  fill("lng", incoming.lng);
  fill("region", incoming.region);
  fill("city", incoming.city);

  // Append cover photo to photos[] if we didn't already have one and the incoming has one.
  const incomingCover = incoming.cover_url ?? incoming.coverUrl ?? null;
  const photos: any[] = Array.isArray(existing.photos) ? existing.photos : [];
  if (incomingCover && !photos.some((p) => p?.url === incomingCover)) {
    patch.photos = [...photos, { url: incomingCover, source: incoming.source }];
  }

  const meta = (existing.import_metadata && typeof existing.import_metadata === "object")
    ? { ...(existing.import_metadata as Record<string, unknown>) }
    : {};
  const merged = Array.isArray((meta as any).merged_sources) ? [...(meta as any).merged_sources] : [];
  if (!merged.some((m: any) => m?.source === incoming.source && m?.external_id === incoming.externalId)) {
    merged.push({
      source: incoming.source,
      external_id: incoming.externalId,
      source_url: incoming.sourceUrl ?? null,
      merged_at: new Date().toISOString(),
    });
  }
  (meta as any).merged_sources = merged;
  if (incoming.about && !(meta as any).about) (meta as any).about = incoming.about;
  patch.import_metadata = meta;

  const fields = Object.keys(patch).filter((k) => k !== "import_metadata");
  await (supabaseAdmin as any).from("businesses").update(patch).eq("id", existingId);
  return { merged: true, fields };
}
