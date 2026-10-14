import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VehicleHistoryEntry = {
  id: string;
  occurred_at: string;
  event_type: string;
  title: string;
  summary: string | null;
  odometer_km: number | null;
  verification_status: string;
  public_summary_allowed?: boolean;
};
export const getVehicleHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ vehicleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<VehicleHistoryEntry[]> => {
    const db = context.supabase as any;
    // Explicit ownership even for a vehicle whose public passport is enabled.
    const owned = await db
      .from("vehicles")
      .select("id")
      .eq("id", data.vehicleId)
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (owned.error || !owned.data) throw new Error("Vehicle owner access required");
    const result = await db
      .from("vehicle_history_events")
      .select(
        "id,occurred_at,event_type,title,summary,odometer_km,verification_status,public_summary_allowed",
      )
      .eq("vehicle_id", data.vehicleId)
      .order("occurred_at", { ascending: false });
    if (result.error) throw new Error(result.error.message);
    return result.data ?? [];
  });
// Deliberately fixed projection: no receipt URLs, vendor, prices, names, metadata,
// or account IDs. The owner's opt-in and public vehicle/ride status are both required.
export const getPublicVehicleHistory = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().min(1).max(200), surface: z.enum(["ride", "passport"]) }).parse(d),
  )
  .handler(async ({ data }): Promise<VehicleHistoryEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let vehicleId: string | null = null;
    if (data.surface === "ride") {
      const r = await db
        .from("rides")
        .select("vehicle_id,user_id")
        .eq("slug", data.slug)
        .eq("status", "published")
        .maybeSingle();
      if (r.error) throw new Error(r.error.message);
      if (r.data?.vehicle_id) {
        const v = await db
          .from("vehicles")
          .select("id")
          .eq("id", r.data.vehicle_id)
          .eq("owner_user_id", r.data.user_id)
          .maybeSingle();
        vehicleId = v.data?.id ?? null;
      }
    } else {
      const v = await db
        .from("vehicles")
        .select("id")
        .eq("passport_slug", data.slug)
        .eq("is_public", true)
        .maybeSingle();
      if (v.error) throw new Error(v.error.message);
      vehicleId = v.data?.id ?? null;
    }
    if (!vehicleId) return [];
    const events = await db
      .from("vehicle_history_events")
      .select("id,occurred_at,event_type,title,summary,odometer_km,verification_status")
      .eq("vehicle_id", vehicleId)
      .eq("public_summary_allowed", true)
      .order("occurred_at", { ascending: false });
    if (events.error) throw new Error(events.error.message);
    return events.data ?? [];
  });

export const setVehicleHistoryVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), publicSummary: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const r = await (context.supabase as any).rpc("set_vehicle_history_visibility", {
      _id: data.id,
      _public: data.publicSummary,
    });
    if (r.error) throw new Error(r.error.message);
  });
