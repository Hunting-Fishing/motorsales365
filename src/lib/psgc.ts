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
