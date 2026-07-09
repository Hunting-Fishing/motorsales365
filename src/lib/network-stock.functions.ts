import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type NetworkStockRow = {
  id: string;
  business_id: string;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string;
  qty_on_hand: number;
  price: number | null;
  catalog_part_id: string | null;
  updated_at: string;
  business_name: string;
  business_slug: string;
  city: string | null;
  province: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
};

export const searchNetworkStock = createServerFn({ method: "POST" })
  .inputValidator((d: { query?: string; province?: string; limit?: number }) =>
    z
      .object({
        query: z.string().trim().max(120).optional(),
        province: z.string().trim().max(80).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const limit = data.limit ?? 60;
    let q = supabase
      .from("network_stock")
      .select("*")
      .gt("qty_on_hand", 0)
      .order("updated_at", { ascending: false })
      .limit(limit);

    const term = data.query?.trim();
    if (term) {
      const like = `%${term.replace(/[%_]/g, "\\$&")}%`;
      q = q.or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like}`);
    }
    if (data.province) q = q.eq("province", data.province);

    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as NetworkStockRow[];
  });

export const getNetworkStockForSku = createServerFn({ method: "POST" })
  .inputValidator((d: { sku?: string; catalogPartId?: string; name?: string }) =>
    z
      .object({
        sku: z.string().trim().max(120).optional(),
        catalogPartId: z.string().uuid().optional(),
        name: z.string().trim().max(200).optional(),
      })
      .refine((v) => v.sku || v.catalogPartId || v.name, {
        message: "sku, catalogPartId, or name required",
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    let q = supabase
      .from("network_stock")
      .select("*")
      .gt("qty_on_hand", 0)
      .order("qty_on_hand", { ascending: false })
      .limit(100);

    if (data.catalogPartId) q = q.eq("catalog_part_id", data.catalogPartId);
    else if (data.sku) q = q.ilike("sku", data.sku);
    else if (data.name) q = q.ilike("name", `%${data.name}%`);

    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as NetworkStockRow[];
  });

export const submitNetworkPartInquiry = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      business_id: string;
      item_id?: string | null;
      sku?: string | null;
      part_name: string;
      quantity?: number;
      contact_name: string;
      contact_email: string;
      contact_phone?: string | null;
      message?: string | null;
    }) =>
      z
        .object({
          business_id: z.string().uuid(),
          item_id: z.string().uuid().nullable().optional(),
          sku: z.string().trim().max(120).nullable().optional(),
          part_name: z.string().trim().min(1).max(200),
          quantity: z.number().positive().max(9999).optional(),
          contact_name: z.string().trim().min(1).max(120),
          contact_email: z.string().trim().email().max(180),
          contact_phone: z.string().trim().max(40).nullable().optional(),
          message: z.string().trim().max(2000).nullable().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("network_part_inquiries")
      .insert({
        business_id: data.business_id,
        item_id: data.item_id ?? null,
        sku: data.sku ?? null,
        part_name: data.part_name,
        quantity: data.quantity ?? 1,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone ?? null,
        message: data.message ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: row.id };
  });

export const listShopInquiries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("network_part_inquiries")
      .select("*")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return rows ?? [];
  });

export const setBusinessNetworkExposure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; expose: boolean }) =>
    z.object({ businessId: z.string().uuid(), expose: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase.rpc("has_business_role", {
      _user: userId,
      _business: data.businessId,
      _role: "manager",
    });
    if (!ok) throw new Error("Forbidden");
    const { error } = await supabase
      .from("businesses")
      .update({ expose_inventory_to_network: data.expose })
      .eq("id", data.businessId);
    if (error) throw error;
    return { ok: true };
  });

export const getBusinessNetworkExposure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase.rpc("is_business_member", {
      _user: userId,
      _business: data.businessId,
    });
    if (!ok) throw new Error("Forbidden");
    const { data: row, error } = await supabase
      .from("businesses")
      .select("expose_inventory_to_network")
      .eq("id", data.businessId)
      .maybeSingle();
    if (error) throw error;
    return { expose: !!row?.expose_inventory_to_network };
  });
