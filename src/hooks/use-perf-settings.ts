import { useEffect, useState } from "react";
import {
  DEFAULT_PERF_SETTINGS,
  getPerfSettings,
  subscribePerfSettings,
  type PerfSettings,
} from "@/lib/perf-settings";

export function usePerfSettings(): PerfSettings {
  const [s, setS] = useState<PerfSettings>(() =>
    typeof window === "undefined" ? DEFAULT_PERF_SETTINGS : getPerfSettings(),
  );
  useEffect(() => {
    setS(getPerfSettings());
    return subscribePerfSettings(setS);
  }, []);
  return s;
}
