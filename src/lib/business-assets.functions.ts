import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KINDS = ["tow_truck", "flatbed", "wrecker", "service_van", "trailer", "equipment", "other"] as const;
const STATUSES = ["active", "maintenance", "out_of_service", "retired"] as const;

async function assertManager(supabase: any, userId: string, businessId: string) {
  const { data: ok } = await supabase.rpc("has_business_role", {
    _user: userId,
    _business: businessId,
    _role: "manager",
  });
  if (!ok) throw new Error("Forbidden");
}

export const listBusinessAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isMember } = await supabase.rpc("is_business_member", {
      _user: userId,
      _business: data.businessId,
    });
    if (!isMember) throw new Error("Forbidden");

    const { data: rows, error } = await supabase
      .from("business_assets")
      .select("*")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const upsertBusinessAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      businessId: string;
      kind: (typeof KINDS)[number];
      name: string;
      plate?: string | null;
      vin?: string | null;
      capacity_kg?: number | null;
      status?: (typeof STATUSES)[number];
      assigned_driver_id?: string | null;
      notes?: string | null;
    }) => {
      if (!KINDS.includes(d.kind)) throw new Error("Invalid kind");
      if (!d.name?.trim()) throw new Error("Name required");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);

    // On insert only, enforce plan asset cap
    if (!data.id) {
      const { enforceLimit, planLimitErrorPayload, PlanLimitError } = await import(
        "@/lib/business-plan-enforcement.server"
      );
      try {
        await enforceLimit(supabase as any, data.businessId, "assets", userId);
      } catch (e) {
        if (e instanceof PlanLimitError) return planLimitErrorPayload(e)! as any;
        throw e;
      }
    }

    const payload = {
      id: data.id,
      business_id: data.businessId,
      kind: data.kind,
      name: data.name.trim(),
      plate: data.plate ?? null,
      vin: data.vin ?? null,
      capacity_kg: data.capacity_kg ?? null,
      status: data.status ?? "active",
      assigned_driver_id: data.assigned_driver_id ?? null,
      notes: data.notes ?? null,
    };
    const { data: row, error } = await supabase
      .from("business_assets")
      .upsert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });


export const deleteBusinessAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);
    const { error } = await supabase.from("business_assets").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
