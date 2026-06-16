import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertManager(supabase: any, userId: string, businessId: string) {
  const { data: ok } = await supabase.rpc("has_business_role", {
    _user: userId,
    _business: businessId,
    _role: "manager",
  });
  if (!ok) throw new Error("Forbidden");
}

export const listBusinessInventory = createServerFn({ method: "POST" })
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
      .from("business_inventory_items")
      .select("*")
      .eq("business_id", data.businessId)
      .order("name", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const upsertBusinessInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      businessId: string;
      sku?: string | null;
      name: string;
      category?: string | null;
      unit?: string;
      qty_on_hand?: number;
      reorder_at?: number | null;
      cost?: number | null;
      location?: string | null;
      active?: boolean;
    }) => {
      if (!d.name?.trim()) throw new Error("Name required");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);

    if (!data.id) {
      const { enforceLimit, planLimitErrorPayload, PlanLimitError } = await import(
        "@/lib/business-plan-enforcement.server"
      );
      try {
        await enforceLimit(supabase as any, data.businessId, "inventory_skus", userId);
      } catch (e) {
        if (e instanceof PlanLimitError) return planLimitErrorPayload(e)! as any;
        throw e;
      }
    }

    const payload = {
      id: data.id,
      business_id: data.businessId,
      sku: data.sku ?? null,
      name: data.name.trim(),
      category: data.category ?? null,
      unit: data.unit ?? "pc",
      qty_on_hand: data.qty_on_hand ?? 0,
      reorder_at: data.reorder_at ?? null,
      cost: data.cost ?? null,
      location: data.location ?? null,
      active: data.active ?? true,
    };
    const { data: row, error } = await supabase
      .from("business_inventory_items")
      .upsert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });


export const adjustBusinessInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { itemId: string; businessId: string; delta: number; reason?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isMember } = await supabase.rpc("is_business_member", {
      _user: userId,
      _business: data.businessId,
    });
    if (!isMember) throw new Error("Forbidden");

    // Log movement
    const { error: movErr } = await supabase.from("business_inventory_movements").insert({
      item_id: data.itemId,
      business_id: data.businessId,
      delta: data.delta,
      reason: data.reason ?? null,
      actor_id: userId,
    });
    if (movErr) throw movErr;

    // Adjust qty_on_hand
    const { data: cur } = await supabase
      .from("business_inventory_items")
      .select("qty_on_hand")
      .eq("id", data.itemId)
      .maybeSingle();
    const newQty = Number(cur?.qty_on_hand ?? 0) + Number(data.delta);
    const { error: updErr } = await supabase
      .from("business_inventory_items")
      .update({ qty_on_hand: newQty })
      .eq("id", data.itemId);
    if (updErr) throw updErr;
    return { ok: true, qty_on_hand: newQty };
  });

export const deleteBusinessInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);
    const { error } = await supabase.from("business_inventory_items").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
