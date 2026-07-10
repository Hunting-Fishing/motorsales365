import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  aiDecode,
  cacheGet,
  cacheSet,
  mergeDecodes,
  nhtsaDecode,
  structuralDecode,
  type DecodePartial,
  type DecodedFields,
  type FieldSource,
} from "./vin-decode.server";
import { regionFromWmi, type Region } from "@/data/vin-vds-tables";

const InputSchema = z.object({
  value: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .transform((s) => s.toUpperCase())
    .refine((s) => /^[A-Z0-9-]+$/.test(s), "Letters, numbers, and dashes only"),
});

export type DecodeSuccess = {
  ok: true;
  input: string;
  vin: string;
  region: Region;
  sources: Partial<Record<keyof DecodedFields, FieldSource>>;
  primarySource: "nhtsa" | "vds" | "ai" | "jdm_table" | "wmi";
  missing: string[];
  notes: string[];
} & DecodedFields;

export type DecodeFailure = { ok: false; reason: string; input: string };
export type DecodeResult = DecodeSuccess | DecodeFailure;

function looksLikeVin17(s: string) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(s);
}

function firstConfidentSource(sources: DecodePartial["sources"]): DecodeSuccess["primarySource"] {
  const rank: FieldSource[] = ["nhtsa", "vds", "ai", "wmi", "jdm", "vin_year"];
  for (const src of rank) {
    if (Object.values(sources).includes(src)) {
      if (src === "jdm") return "jdm_table";
      if (src === "vin_year") return "wmi";
      return src as DecodeSuccess["primarySource"];
    }
  }
  return "wmi";
}

async function decodeChassisCode(raw: string): Promise<DecodeResult | null> {
  const head = raw.split("-")[0];
  const candidates = Array.from(new Set([raw, head])).filter((c) => c.length >= 2 && c.length <= 10);
  if (!candidates.length) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("jdm_chassis_codes")
    .select("code,make,model,year_min,year_max,engine")
    .in("code", candidates)
    .limit(1);
  const hit = rows?.[0];
  if (!hit) return null;
  return {
    ok: true,
    input: raw,
    vin: raw,
    region: "Asia",
    sources: { make: "jdm", model: "jdm", year: "jdm", engine: "jdm" },
    primarySource: "jdm_table",
    missing: [],
    notes: [`Matched JDM chassis code table (${hit.code}).`],
    make: hit.make,
    model: hit.model,
    year: hit.year_min ? String(hit.year_min) : undefined,
    engine: hit.engine ?? undefined,
  };
}

export const decodeVin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<DecodeResult> => {
    const raw = data.value;

    // JDM chassis lookup for non-17-char inputs.
    if (!looksLikeVin17(raw)) {
      const jdm = await decodeChassisCode(raw);
      if (jdm) return jdm;
      return { ok: false, reason: "Unrecognized chassis code — try the make/model picker", input: raw };
    }

    // Cache hit?
    const cached = await cacheGet(raw);
    if (cached) {
      return buildSuccess(raw, cached);
    }

    // Waterfall — each step returns fields; mergeDecodes prefers earlier sources.
    const parts: DecodePartial[] = [];
    const nhtsa = await nhtsaDecode(raw);
    if (nhtsa) parts.push(nhtsa);
    const structural = structuralDecode(raw);
    if (structural) parts.push(structural);

    let merged = mergeDecodes(...parts);
    const region = merged.region ?? regionFromWmi(raw);
    merged.region = region;

    // AI fallback when core fields still missing.
    const coreMissing = !merged.fields.make || !merged.fields.model || !merged.fields.year;
    if (coreMissing) {
      const ai = await aiDecode({ vin: raw, region, known: merged.fields });
      if (ai) merged = mergeDecodes(merged, ai);
    }

    if (!merged.fields.make && !merged.fields.model && !merged.fields.year) {
      return {
        ok: false,
        reason:
          "This VIN isn't in NHTSA and we don't have a structural pattern for its manufacturer. Please fill the vehicle fields manually.",
        input: raw,
      };
    }

    await cacheSet(raw, merged, firstConfidentSource(merged.sources));
    return buildSuccess(raw, merged);
  });

function buildSuccess(raw: string, merged: DecodePartial): DecodeSuccess {
  const fields = merged.fields;
  const missing = (
    ["year", "make", "model", "trim", "engine", "fuel", "transmission", "bodyType", "drivetrain"] as Array<keyof DecodedFields>
  ).filter((k) => !fields[k]);
  return {
    ok: true,
    input: raw,
    vin: raw,
    region: merged.region ?? regionFromWmi(raw),
    sources: merged.sources,
    primarySource: firstConfidentSource(merged.sources),
    missing: missing as string[],
    notes: merged.notes ?? [],
    ...fields,
  };
}
