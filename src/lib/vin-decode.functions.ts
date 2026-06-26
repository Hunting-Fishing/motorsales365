import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  value: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .transform((s) => s.toUpperCase())
    .refine((s) => /^[A-Z0-9-]+$/.test(s), "Letters, numbers, and dashes only"),
});

export type DecodedVehicle = {
  ok: true;
  source: "nhtsa" | "jdm_table";
  input: string;
  make: string;
  model: string;
  year: number | null;
  engine: string | null;
  trim: string | null;
};
export type DecodeFailure = { ok: false; reason: string; input: string };
export type DecodeResult = DecodedVehicle | DecodeFailure;

function looksLikeVin17(s: string) {
  // Standard 17-char VIN: no I/O/Q
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(s);
}

async function decodeNhtsa(vin: string): Promise<DecodeResult> {
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return { ok: false, reason: `NHTSA HTTP ${res.status}`, input: vin };
    const json: any = await res.json();
    const row = json?.Results?.[0];
    if (!row) return { ok: false, reason: "NHTSA returned no results", input: vin };
    const make = (row.Make || "").trim();
    const model = (row.Model || "").trim();
    if (!make || !model) {
      return { ok: false, reason: row.ErrorText?.split(";")?.[0] || "VIN not recognized", input: vin };
    }
    const year = row.ModelYear ? Number(row.ModelYear) : null;
    const engine =
      [row.DisplacementL ? `${row.DisplacementL}L` : null, row.EngineModel || row.EngineConfiguration]
        .filter(Boolean)
        .join(" ") || null;
    return {
      ok: true,
      source: "nhtsa",
      input: vin,
      make: titleCase(make),
      model: titleCase(model),
      year: Number.isFinite(year) ? (year as number) : null,
      engine,
      trim: row.Trim || row.Series || null,
    };
  } catch (e: any) {
    return { ok: false, reason: `NHTSA unreachable: ${e?.message ?? "network error"}`, input: vin };
  }
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export const decodeVin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<DecodeResult> => {
    const raw = data.value;
    // Try JDM chassis lookup first when it's NOT a 17-char VIN.
    // Many JDM codes are prefixes (e.g. JZX100-0012345) — split on dash and lookup head.
    if (!looksLikeVin17(raw)) {
      const head = raw.split("-")[0];
      const candidates = Array.from(new Set([raw, head])).filter((c) => c.length >= 2 && c.length <= 10);
      if (candidates.length) {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const { data: rows } = await supabase
          .from("jdm_chassis_codes")
          .select("code,make,model,year_min,year_max,engine")
          .in("code", candidates)
          .limit(1);
        const hit = rows?.[0];
        if (hit) {
          return {
            ok: true,
            source: "jdm_table",
            input: raw,
            make: hit.make,
            model: hit.model,
            year: hit.year_min ?? null,
            engine: hit.engine ?? null,
            trim: null,
          };
        }
      }
      return { ok: false, reason: "Unrecognized chassis code — try the make/model picker", input: raw };
    }
    return decodeNhtsa(raw);
  });
