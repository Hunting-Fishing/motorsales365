import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type CatalogOptions = {
  makes: string[];
  models: string[];
  engines: { label: string; cc: number | null; nominalCc: number | null; yearVerified: boolean; sourceUrl: string }[];
  hasUnverifiedYears: boolean;
};
const empty: CatalogOptions = { makes: [], models: [], engines: [], hasUnverifiedYears: false };

export function useVehicleCatalog(category: string, year: number | undefined, make: string, model: string) {
  const [result, setResult] = useState<{ key: string; data: CatalogOptions; failed: boolean }>();
  const key = JSON.stringify([category, year, make, model]);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc("vehicle_catalog_options", {
          _category: category, _year: year ?? null, _make: make, _model: model, _market: "PH",
        });
        if (error) throw error;
        if (!data || !Array.isArray(data.makes) || !Array.isArray(data.models) || !Array.isArray(data.engines)) throw new Error("Invalid catalogue response");
        if (active) setResult({ key, data, failed: false });
      } catch {
        if (active) setResult({ key, data: empty, failed: true });
      }
    })();
    return () => { active = false; };
  }, [category, year, make, model, key]);
  return result?.key === key ? result : { key, data: empty, failed: false };
}
