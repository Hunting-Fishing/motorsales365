// Bundled Philippine Standard Geographic Code (PSGC) dataset.
// Source: psgc.gitlab.io (PSA, public domain). Compact tree:
// Region -> Provinces -> Cities/Municipalities. Highly Urbanized Cities and
// NCR districts have no province and live on `region.cities`.
import psgcData from "@/data/psgc.json";

export type PSGCRegion = {
  code: string;
  name: string;
  regionName: string;
  provinces: { code: string; name: string; cities: string[] }[];
  cities: string[];
};

export const PSGC: PSGCRegion[] = psgcData as PSGCRegion[];

export function regionLabel(r: PSGCRegion): string {
  // e.g. "NCR — National Capital Region"
  if (r.regionName === r.name) return r.name;
  return `${r.regionName} — ${r.name}`;
}

export function findRegionByLabel(label: string | null | undefined): PSGCRegion | undefined {
  if (!label) return undefined;
  return PSGC.find((r) => regionLabel(r) === label || r.name === label || r.regionName === label);
}

export function provincesOf(regionLabel: string | null | undefined): string[] {
  const r = findRegionByLabel(regionLabel);
  return r?.provinces.map((p) => p.name) ?? [];
}

export function citiesOf(
  regionLabel: string | null | undefined,
  provinceName: string | null | undefined,
): string[] {
  const r = findRegionByLabel(regionLabel);
  if (!r) return [];
  if (provinceName) {
    const p = r.provinces.find((x) => x.name === provinceName);
    return p?.cities ?? [];
  }
  // No province: return HUCs / NCR cities
  return r.cities;
}

export const REGION_OPTIONS = PSGC.map((r) => ({ value: regionLabel(r), label: regionLabel(r) }));

// --- Fuzzy resolution from free-text (e.g. reverse-geocoded place names) ---

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bcity of\b/g, "")
    .replace(/\bcity\b/g, "")
    .replace(/\bmunicipality of\b/g, "")
    .replace(/\bprovince of\b/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function eqLoose(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Resolve free-text place fields (from a reverse geocoder) into a PSGC tuple.
 * Any of the inputs may be missing; we match what we can.
 */
export function resolvePsgc(input: {
  region?: string | null;
  province?: string | null;
  city?: string | null;
  municipality?: string | null;
  town?: string | null;
}): { region: string | null; province: string | null; city: string | null } {
  const cityish = [input.city, input.municipality, input.town].filter(Boolean) as string[];

  // 1) Try to find the city/municipality across all regions.
  for (const r of PSGC) {
    // Province cities
    for (const p of r.provinces) {
      const hit = p.cities.find((c) => cityish.some((q) => eqLoose(c, q)));
      if (hit) return { region: regionLabel(r), province: p.name, city: hit };
    }
    // HUC / NCR cities
    const huc = r.cities.find((c) => cityish.some((q) => eqLoose(c, q)));
    if (huc) return { region: regionLabel(r), province: null, city: huc };
  }

  // 2) Fall back to province match.
  if (input.province) {
    for (const r of PSGC) {
      const p = r.provinces.find((x) => eqLoose(x.name, input.province!));
      if (p) return { region: regionLabel(r), province: p.name, city: null };
    }
  }

  // 3) Fall back to region match.
  if (input.region) {
    const r = PSGC.find((x) => eqLoose(x.name, input.region!) || eqLoose(x.regionName, input.region!));
    if (r) return { region: regionLabel(r), province: null, city: null };
  }

  return { region: null, province: null, city: null };
}
