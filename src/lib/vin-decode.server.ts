// Server-only helpers backing the multi-region VIN decoder waterfall.
// Nothing here should ever be imported from a client-reachable module at
// the module top level (except through the .functions.ts handler via
// dynamic import) — everything reads process.env or the admin client.

import type { WmiRow } from "@/data/vin-vds-tables";
import { lookupVds, lookupWmi, regionFromWmi, type Region } from "@/data/vin-vds-tables";
import { callStandaloneAi } from "@/lib/ai-provider.server";

export type DecodedFields = {
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  fuel?: string;
  bodyType?: string;
  drivetrain?: string;
  category?: "car" | "motorcycle";
  color_hint?: string;
};

export type FieldSource = "nhtsa" | "vds" | "wmi" | "vin_year" | "ai" | "jdm";

export type DecodePartial = {
  fields: DecodedFields;
  sources: Partial<Record<keyof DecodedFields, FieldSource>>;
  region?: Region;
  notes?: string[];
};

const DECODER_CACHE_VERSION = 2;

const FIELD_KEYS: Array<keyof DecodedFields> = [
  "year", "make", "model", "trim", "engine",
  "transmission", "fuel", "bodyType", "drivetrain", "category", "color_hint",
];

/** Merge partials in priority order. Earlier entries win over later ones. */
export function mergeDecodes(...parts: DecodePartial[]): DecodePartial {
  const out: DecodePartial = { fields: {}, sources: {}, notes: [] };
  for (const p of parts) {
    if (!p) continue;
    if (p.region && !out.region) out.region = p.region;
    if (p.notes) out.notes!.push(...p.notes);
    for (const k of FIELD_KEYS) {
      if (!out.fields[k] && p.fields[k]) {
        (out.fields[k] as string | undefined) = p.fields[k] as string | undefined;
        out.sources[k] = p.sources[k];
      }
    }
  }
  return out;
}

// --- NHTSA (North America) ------------------------------------------------

function titleCase(s: string) {
  return s.toLowerCase().split(/\s+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}
function mapFuel(s: string): string | undefined {
  const x = s.toLowerCase();
  if (x.includes("diesel")) return "Diesel";
  if (x.includes("electric")) return "Electric";
  if (x.includes("hybrid")) return "Hybrid";
  if (x.includes("gas")) return "Gasoline";
  return undefined;
}
function mapTransmission(s: string): string | undefined {
  const x = s.toLowerCase();
  if (x.includes("cvt") || x.includes("continuously")) return "CVT";
  if (x.includes("manual")) return "Manual";
  if (x.includes("auto")) return "Automatic";
  return undefined;
}
function mapBodyType(s: string): string | undefined {
  const x = s.toLowerCase();
  if (x.includes("pickup") || x.includes("truck")) return "pickup";
  if (x.includes("suv") || x.includes("sport utility") || x.includes("crossover")) return "suv";
  if (x.includes("mpv") || x.includes("multi-purpose") || x.includes("minivan") || x.includes("auv")) return "mpv";
  if (x.includes("van")) return "van";
  if (x.includes("hatch") || x.includes("liftback") || x.includes("notchback")) return "hatchback";
  if (x.includes("coupe")) return "coupe";
  if (x.includes("convertible") || x.includes("roadster") || x.includes("cabriolet")) return "convertible";
  if (x.includes("wagon") || x.includes("estate")) return "wagon";
  if (x.includes("sedan") || x.includes("saloon")) return "sedan";
  return undefined;
}
function mapDrivetrain(s: string): string | undefined {
  const x = s.toLowerCase();
  if (x.includes("awd") || x.includes("all-wheel") || x.includes("all wheel")) return "awd";
  if (x.includes("4wd") || x.includes("4x4") || x.includes("4-wheel") || x.includes("four-wheel")) return "4x4";
  if (x.includes("fwd") || x.includes("front-wheel") || x.includes("front wheel")) return "fwd";
  if (x.includes("rwd") || x.includes("rear-wheel") || x.includes("rear wheel")) return "rwd";
  if (x.includes("2wd") || x.includes("4x2")) return "4x2";
  return undefined;
}

export async function nhtsaDecode(vin: string): Promise<DecodePartial | null> {
  if (vin.length !== 17) return null;
  try {
    const r = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`,
      { headers: { accept: "application/json" } },
    );
    if (!r.ok) return null;
    const json = (await r.json()) as { Results?: Array<Record<string, string>> };
    const row = json.Results?.[0];
    if (!row) return null;
    const fields: DecodedFields = {};
    const sources: DecodePartial["sources"] = {};
    const put = <K extends keyof DecodedFields>(k: K, v: DecodedFields[K] | undefined) => {
      if (v) { fields[k] = v; sources[k] = "nhtsa"; }
    };
    if (row.ModelYear) put("year", row.ModelYear);
    if (row.Make) put("make", titleCase(row.Make));
    if (row.Model) put("model", titleCase(row.Model));
    if (row.FuelTypePrimary) put("fuel", mapFuel(row.FuelTypePrimary));
    if (row.TransmissionStyle) put("transmission", mapTransmission(row.TransmissionStyle));
    const engineParts = [
      row.DisplacementL ? `${Number(row.DisplacementL).toFixed(1)}L` : "",
      row.EngineCylinders ? `${row.EngineCylinders}-cyl` : "",
      row.EngineModel || "",
    ].filter(Boolean);
    if (engineParts.length) put("engine", engineParts.join(" ").trim());
    const trim = row.Trim || row.Series;
    if (trim) put("trim", trim);
    if (row.BodyClass) put("bodyType", mapBodyType(row.BodyClass));
    if (row.DriveType) put("drivetrain", mapDrivetrain(row.DriveType));
    if (row.VehicleType) put("category", /motorcycle/i.test(row.VehicleType) ? "motorcycle" : "car");
    return Object.keys(fields).length ? { fields, sources, region: "NA" } : null;
  } catch {
    return null;
  }
}

// --- Structural (Asia / Europe) ------------------------------------------

const YEAR_CHARS_1 = "ABCDEFGHJKLMNPRSTVWXY"; // 1980–2000
const YEAR_CHARS_2 = "123456789";               // 2001–2009
export function decodeVinYear(vin: string): number | null {
  if (vin.length !== 17) return null;
  const pos10 = vin[9];
  const pos7 = vin[6];
  const isModern = /[A-Z]/.test(pos7 ?? "");
  const digitIdx = YEAR_CHARS_2.indexOf(pos10);
  if (digitIdx >= 0) return (isModern ? 2031 : 2001) + digitIdx;
  const letterIdx = YEAR_CHARS_1.indexOf(pos10);
  if (letterIdx >= 0) return (isModern ? 2010 : 1980) + letterIdx;
  return null;
}

export function structuralDecode(vin: string): DecodePartial | null {
  const wmi: WmiRow | null = lookupWmi(vin);
  const region = regionFromWmi(vin);
  if (!wmi) return { fields: {}, sources: {}, region };
  const fields: DecodedFields = {};
  const sources: DecodePartial["sources"] = {};
  fields.make = wmi.make; sources.make = "wmi";
  const yr = decodeVinYear(vin);
  if (yr) { fields.year = String(yr); sources.year = "vin_year"; }
  const vds = lookupVds(wmi, vin);
  if (vds) {
    const assign = <K extends keyof DecodedFields>(k: K, v: DecodedFields[K] | undefined) => {
      if (v !== undefined) { fields[k] = v; sources[k] = "vds"; }
    };
    assign("model", vds.model);
    assign("bodyType", vds.bodyType);
    assign("drivetrain", vds.drivetrain);
    assign("fuel", vds.fuel);
    assign("transmission", vds.transmission);
    assign("engine", vds.engine);
    assign("category", vds.category);
    assign("trim", vds.trim);
    if (vds.yearMin && vds.yearMax) {
      const y = Number(fields.year);
      if (!Number.isFinite(y) || y < vds.yearMin || y > vds.yearMax) {
        fields.year = String(vds.yearMin);
        sources.year = "vds";
      }
    }
  }
  return { fields, sources, region };
}

// --- Standalone AI fallback ----------------------------------------------

export async function aiDecode(opts: {
  vin: string;
  region: Region;
  known: DecodedFields;
}): Promise<DecodePartial | null> {
  const missingList = FIELD_KEYS.filter((k) => !opts.known[k]).join(", ");
  if (!missingList) return null;

  const prompt = `You are decoding a Vehicle Identification Number (VIN) for a ${opts.region} market vehicle.
VIN: ${opts.vin}
Already known: ${JSON.stringify(opts.known)}
Fill ONLY these missing fields based on VIN structural knowledge (WMI + VDS patterns) for this manufacturer: ${missingList}.
Return strict JSON with exactly these keys (use null when you cannot confidently determine the field):
{"year":string|null,"make":string|null,"model":string|null,"trim":string|null,"engine":string|null,"transmission":"Automatic"|"Manual"|"CVT"|null,"fuel":"Gasoline"|"Diesel"|"Hybrid"|"Electric"|null,"bodyType":"sedan"|"suv"|"hatchback"|"mpv"|"van"|"pickup"|"coupe"|"convertible"|"wagon"|null,"drivetrain":"fwd"|"rwd"|"awd"|"4x4"|"4x2"|null,"category":"car"|"motorcycle"|null,"color_hint":string|null,"confidence":"high"|"medium"|"low"}
Never invent — a wrong guess is worse than null.`;

  try {
    const raw = await callStandaloneAi({
      model: process.env.AI_MODEL_VIN,
      messages: [{ role: "user", content: prompt }],
      responseFormat: { type: "json_object" },
    });
    if (!raw) return null;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (parsed.confidence === "low") return null;
    const fields: DecodedFields = {};
    const sources: DecodePartial["sources"] = {};
    for (const k of FIELD_KEYS) {
      const v = parsed[k as string];
      if (typeof v === "string" && v.trim() && v !== "null") {
        (fields[k] as string) = v.trim();
        sources[k] = "ai";
      }
    }
    return { fields, sources };
  } catch {
    return null;
  }
}

// --- Cache ----------------------------------------------------------------

export async function cacheGet(vin: string): Promise<DecodePartial | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("vin_decode_cache" as never)
      .select("result")
      .eq("vin", vin)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = data as any;
    const result = row?.result;
    if (!result || result.cacheVersion !== DECODER_CACHE_VERSION) return null;
    return result;
  } catch {
    return null;
  }
}

export async function cacheSet(vin: string, result: DecodePartial, source: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    await admin
      .from("vin_decode_cache")
      .upsert({ vin, result: { ...result, cacheVersion: DECODER_CACHE_VERSION }, source, decoded_at: new Date().toISOString() });
  } catch {
    /* cache write failures are non-fatal */
  }
}
