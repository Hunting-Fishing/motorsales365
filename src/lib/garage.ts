import { useEffect, useState } from "react";

export type GarageVehicle = {
  category: "car" | "motorcycle";
  make: string;
  model: string;
  year?: number;
};

const KEY = "garage_vehicle_v1";
const EVT = "garage:changed";

export function getGarage(): GarageVehicle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GarageVehicle) : null;
  } catch {
    return null;
  }
}

export function setGarage(v: GarageVehicle | null) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(KEY, JSON.stringify(v));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useGarage(): [GarageVehicle | null, (v: GarageVehicle | null) => void] {
  const [v, setV] = useState<GarageVehicle | null>(() => getGarage());
  useEffect(() => {
    const onChange = () => setV(getGarage());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return [v, (next) => setGarage(next)];
}

export function formatVehicle(v: GarageVehicle): string {
  return [v.year, v.make, v.model].filter(Boolean).join(" ");
}
