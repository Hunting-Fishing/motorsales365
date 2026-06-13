// Pure helpers to resolve free-text into structured vehicle + engine info.
// Used by the parts-wanted form to pre-fill make/model/year/engine from
// queries like "engine for 91 pajero 4d56t".

import { CAR_MAKES, MOTORCYCLE_MAKES, HEAVY_TRUCK_MAKES } from "@/data/vehicles";
import { VEHICLE_ENGINES, type EngineSpec } from "@/data/vehicle-engines";

const ALL_MAKES = [...CAR_MAKES, ...HEAVY_TRUCK_MAKES, ...MOTORCYCLE_MAKES];

export interface ResolvedVehicle {
  make?: string;
  model?: string;
  year?: number;
  engine_code?: string;
  engine_label?: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function expandYear(y: number): number {
  if (y < 100) return y >= 50 ? 1900 + y : 2000 + y;
  return y;
}

/** Pull the most plausible 4-digit or 2-digit year from text. */
function extractYear(text: string): number | undefined {
  const m = text.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  if (m) return Number(m[1]);
  const short = text.match(/\b'?(\d{2})\b/);
  if (short) {
    const y = expandYear(Number(short[1]));
    if (y >= 1950 && y <= new Date().getFullYear() + 1) return y;
  }
  return undefined;
}

export function listEnginesFor(make?: string, model?: string): EngineSpec[] {
  if (!make || !model) return [];
  for (const cat of Object.values(VEHICLE_ENGINES)) {
    const byMake = cat?.[make];
    if (byMake?.[model]) return byMake[model];
  }
  return [];
}

export function pickEngineForYear(engines: EngineSpec[], year?: number): EngineSpec | undefined {
  if (!engines.length) return undefined;
  if (!year) return engines[0];
  return (
    engines.find(
      (e) => (e.start ?? 0) <= year && year <= (e.end ?? new Date().getFullYear() + 1),
    ) ?? engines[0]
  );
}

/** Resolve free-text → make/model/year/engine_code best-effort. */
export function resolveVehicleFromText(text: string): ResolvedVehicle {
  const t = normalize(text);
  const year = extractYear(text);

  let bestMake: string | undefined;
  let bestModel: string | undefined;
  let bestModelLen = 0;

  for (const { make, models } of ALL_MAKES) {
    const m = normalize(make);
    if (!t.includes(m)) continue;
    for (const model of models) {
      const md = normalize(model);
      if (md.length < 3) continue;
      if (t.includes(md) && md.length > bestModelLen) {
        bestMake = make;
        bestModel = model;
        bestModelLen = md.length;
      }
    }
  }
  // Try model-only match when make missing (very common: "pajero")
  if (!bestModel) {
    for (const { make, models } of ALL_MAKES) {
      for (const model of models) {
        const md = normalize(model);
        if (md.length < 4 || !t.includes(md)) continue;
        if (md.length > bestModelLen) {
          bestMake = make;
          bestModel = model;
          bestModelLen = md.length;
        }
      }
    }
  }

  // Engine code: look for matches like 4D56T, 2GD-FTV, K15B from catalog first
  let engineCode: string | undefined;
  let engineLabel: string | undefined;
  if (bestMake && bestModel) {
    const engines = listEnginesFor(bestMake, bestModel);
    const tCompact = t.replace(/[-_ ]/g, "");
    const hit = engines.find((e) => {
      if (!e.code) return false;
      const c = normalize(e.code).replace(/[-_ ]/g, "");
      return tCompact.includes(c);
    });
    const picked = hit ?? pickEngineForYear(engines, year);
    if (picked) {
      engineCode = picked.code;
      engineLabel = picked.label;
    }
  }
  // Fallback: raw token shaped like an engine code
  if (!engineCode) {
    const raw = text.match(/\b([0-9]?[A-Z]{1,3}[0-9]{1,3}[A-Z\-]{0,4})\b/);
    if (raw) engineCode = raw[1].toUpperCase();
  }

  return { make: bestMake, model: bestModel, year, engine_code: engineCode, engine_label: engineLabel };
}
