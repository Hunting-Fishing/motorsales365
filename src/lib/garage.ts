import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getGarageVehicle,
  setGarageVehicle,
  clearGarageVehicle,
} from "@/lib/garage.functions";
import type { VehicleCategory } from "@/data/vehicles";

export type GarageVehicle = {
  category: VehicleCategory;
  make: string;
  model: string;
  year?: number;
  /** Trim level, e.g. "G", "V", "Sport". Optional. */
  trim?: string;
  /** Engine variant label, e.g. "2.4L Diesel (2GD-FTV)". Optional. */
  engine?: string;
  /** Transmission, e.g. "Manual", "Automatic", "CVT". Optional. */
  transmission?: string;
};


const KEY = "garage_vehicle_v1";
const EVT = "garage:changed";
let syncedForUser: string | null = null;

export function getGarage(): GarageVehicle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GarageVehicle) : null;
  } catch {
    return null;
  }
}

function writeLocal(v: GarageVehicle | null) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(KEY, JSON.stringify(v));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function setGarage(v: GarageVehicle | null) {
  writeLocal(v);
  // Fire-and-forget remote sync if signed in.
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      if (v) {
        await setGarageVehicle({
          data: {
            category: v.category,
            make: v.make,
            model: v.model,
            year: v.year ?? null,
            trim: v.trim ?? null,
            engine: v.engine ?? null,
          },
        });
      } else {
        await clearGarageVehicle();
      }
    } catch {
      // best-effort sync
    }
  })();
}

async function pullFromServer(userId: string) {
  if (syncedForUser === userId) return;
  syncedForUser = userId;
  try {
    const remote = (await getGarageVehicle()) as GarageVehicle | null;
    const local = getGarage();
    if (remote) {
      writeLocal({
        category: remote.category,
        make: remote.make,
        model: remote.model,
        year: remote.year ?? undefined,
        trim: remote.trim ?? undefined,
        engine: remote.engine ?? undefined,
      });
    } else if (local) {
      // Migrate anonymous-cached vehicle to the account once.
      await setGarageVehicle({
        data: {
          category: local.category,
          make: local.make,
          model: local.model,
          year: local.year ?? null,
          trim: local.trim ?? null,
          engine: local.engine ?? null,
        },
      });
    }
  } catch {
    // ignore
  }
}

export function useGarage(): [GarageVehicle | null, (v: GarageVehicle | null) => void] {
  const [v, setV] = useState<GarageVehicle | null>(() => getGarage());
  useEffect(() => {
    const onChange = () => setV(getGarage());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);

    // Initial pull + react to auth changes.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) void pullFromServer(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user?.id) {
        void pullFromServer(session.user.id);
      } else {
        syncedForUser = null;
      }
    });

    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
      sub.subscription.unsubscribe();
    };
  }, []);
  return [v, (next) => setGarage(next)];
}

export function formatVehicle(v: GarageVehicle): string {
  const base = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  return v.engine ? `${base} — ${v.engine}` : base;
}
