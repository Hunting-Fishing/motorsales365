import { useEffect, useState } from "react";

export type GridDensity = 1 | 2 | 3 | 4;

const KEY = "marketplace:grid-density";

export function useGridDensity(defaultValue: GridDensity = 3) {
  const [density, setDensity] = useState<GridDensity>(defaultValue);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const n = raw ? Number(raw) : NaN;
      if (n === 1 || n === 2 || n === 3 || n === 4) setDensity(n);
    } catch {
      // ignore
    }
  }, []);

  const update = (v: GridDensity) => {
    setDensity(v);
    try {
      localStorage.setItem(KEY, String(v));
    } catch {
      // ignore
    }
  };

  return [density, update] as const;
}

/** Tailwind class for the responsive grid given the user's desktop preference. */
export function densityGridClass(density: GridDensity): string {
  switch (density) {
    case 1:
      return "grid grid-cols-1 gap-4";
    case 2:
      return "grid grid-cols-1 gap-4 sm:grid-cols-2";
    case 4:
      return "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    case 3:
    default:
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";
  }
}
