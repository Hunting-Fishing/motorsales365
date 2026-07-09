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
  brand: string | null;
  unit: string;
  qty_on_hand: number;
  available_qty: number;
  reserved_qty: number;
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
  compatible_makes: string[] | null;
  compatible_models: string[] | null;
  year_min: number | null;
  year_max: number | null;
};

export type NetworkStockPage = {
  rows: NetworkStockRow[];
  nextOffset: number | null;
  total: number | null;
};

export const searchNetworkStock = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      query?: string;
      province?: string;
      category?: string;
      brand?: string;
      make?: string;
      model?: string;
      year?: number;
      inStockOnly?: boolean;
      limit?: number;
      offset?: number;
    }) =>
      z
        .object({
          query: z.string().trim().max(120).optional(),
          province: z.string().trim().max(80).optional(),
          category: z.string().trim().max(80).optional(),
          brand: z.string().trim().max(80).optional(),
          make: z.string().trim().max(80).optional(),
          model: z.string().trim().max(80).optional(),
          year: z.number().int().min(1900).max(2100).optional(),
          inStockOnly: z.boolean().optional(),
          limit: z.number().int().min(1).max(100).optional(),
          offset: z.number().int().min(0).max(10000).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }): Promise<NetworkStockPage> => {
    const supabase = publicClient();
    const limit = data.limit ?? 20;
    const offset = data.offset ?? 0;
    let q = supabase
      .from("network_stock")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data.inStockOnly !== false) q = q.gt("qty_on_hand", 0);

    const term = data.query?.trim();
    if (term) {
      const like = `%${term.replace(/[%_]/g, "\\$&")}%`;
      q = q.or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like},brand.ilike.${like}`);
    }
    if (data.province) q = q.eq("province", data.province);
    if (data.category) q = q.ilike("category", data.category);
    if (data.brand) q = q.ilike("brand", data.brand);
    if (data.make) q = q.contains("compatible_makes", [data.make]);
    if (data.model) q = q.contains("compatible_models", [data.model]);
    if (data.year) {
      q = q.or(`year_min.is.null,year_min.lte.${data.year}`)
           .or(`year_max.is.null,year_max.gte.${data.year}`);
    }

    const { data: rows, error, count } = await q;
    if (error) throw error;
    const list = (rows ?? []) as NetworkStockRow[];
    const nextOffset = list.length === limit ? offset + limit : null;
    return { rows: list, nextOffset, total: count ?? null };
  });

export type NetworkFacets = {
  categories: string[];
  brands: string[];
  makes: string[];
  provinces: string[];
};

export const getNetworkStockFacets = createServerFn({ method: "GET" })
  .handler(async (): Promise<NetworkFacets> => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("network_stock")
      .select("category, brand, province, compatible_makes")
      .limit(2000);
    if (error) throw error;

    const cats = new Set<string>();
    const brands = new Set<string>();
    const provinces = new Set<string>();
    const makes = new Set<string>();
    for (const r of (rows ?? []) as any[]) {
      if (r.category) cats.add(String(r.category));
      if (r.brand) brands.add(String(r.brand));
      if (r.province) provinces.add(String(r.province));
      for (const m of (r.compatible_makes ?? []) as string[]) if (m) makes.add(m);
    }
    const sort = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b));
    return {
      categories: sort(cats),
      brands: sort(brands),
      makes: sort(makes),
      provinces: sort(provinces),
    };
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

    // If the caller is signed in, tag the row with their user id so they can
    // track it in "My requests".
    let requester_user_id: string | null = null;
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const auth =
        getRequestHeader("authorization") ?? getRequestHeader("Authorization");
      const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
      if (token) {
        const { data: u } = await supabase.auth.getUser(token);
        requester_user_id = u.user?.id ?? null;
      }
    } catch {
      requester_user_id = null;
    }

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
        requester_user_id,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: row.id };
  });

export const NETWORK_INQUIRY_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "fulfilled",
  "closed",
] as const;
export type NetworkInquiryStatus = (typeof NETWORK_INQUIRY_STATUSES)[number];

export const updateNetworkInquiryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      businessId: string;
      status: NetworkInquiryStatus;
      note?: string | null;
      fulfilled_price?: number | null;
      fulfilled_quantity?: number | null;
      fulfilled_eta?: string | null;
      fulfilled_message?: string | null;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          businessId: z.string().uuid(),
          status: z.enum(NETWORK_INQUIRY_STATUSES),
          note: z.string().trim().max(2000).nullable().optional(),
          fulfilled_price: z.number().nonnegative().max(99999999).nullable().optional(),
          fulfilled_quantity: z.number().positive().max(9999).nullable().optional(),
          fulfilled_eta: z.string().datetime().nullable().optional(),
          fulfilled_message: z.string().trim().max(2000).nullable().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase.rpc("has_business_role", {
      _user: userId,
      _business: data.businessId,
      _role: "manager",
    });
    if (!ok) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {
      status: data.status,
      response_note: data.note ?? null,
    };
    // Only overwrite fulfillment fields when explicitly provided so a later
    // status change (e.g. Closed after Fulfilled) doesn't blank prior details.
    if (data.fulfilled_price !== undefined) patch.fulfilled_price = data.fulfilled_price;
    if (data.fulfilled_quantity !== undefined) patch.fulfilled_quantity = data.fulfilled_quantity;
    if (data.fulfilled_eta !== undefined) patch.fulfilled_eta = data.fulfilled_eta;
    if (data.fulfilled_message !== undefined) patch.fulfilled_message = data.fulfilled_message;

    const { data: row, error } = await supabase
      .from("network_part_inquiries")
      .update(patch as any)
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const listMyNetworkInquiries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("network_part_inquiries")
      .select("*, businesses:business_id(name, slug, city, province)")
      .eq("requester_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return rows ?? [];
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

// ============================================================
// Network exposure (opt-in + admin approval + audit)
// ============================================================

export type NetworkExposureStatus = "none" | "pending" | "approved" | "revoked";

export type NetworkExposureState = {
  expose: boolean;
  status: NetworkExposureStatus;
  requested_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
};

export const setBusinessNetworkExposure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; expose: boolean; note?: string | null }) =>
    z
      .object({
        businessId: z.string().uuid(),
        expose: z.boolean(),
        note: z.string().trim().max(500).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("request_network_exposure", {
      _business_id: data.businessId,
      _expose: data.expose,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as { status: NetworkExposureStatus; expose: boolean };
  });

export const getBusinessNetworkExposure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<NetworkExposureState> => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase.rpc("is_business_member", {
      _user: userId,
      _business: data.businessId,
    });
    if (!ok) throw new Error("Forbidden");
    const { data: row, error } = await supabase
      .from("businesses")
      .select(
        "expose_inventory_to_network, network_exposure_status, network_exposure_requested_at, network_exposure_reviewed_at, network_exposure_review_note",
      )
      .eq("id", data.businessId)
      .maybeSingle();
    if (error) throw error;
    return {
      expose: !!(row as any)?.expose_inventory_to_network,
      status: (((row as any)?.network_exposure_status as NetworkExposureStatus) ?? "none"),
      requested_at: (row as any)?.network_exposure_requested_at ?? null,
      reviewed_at: (row as any)?.network_exposure_reviewed_at ?? null,
      review_note: (row as any)?.network_exposure_review_note ?? null,
    };
  });

export type NetworkExposureAuditRow = {
  id: string;
  business_id: string;
  actor_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  previous_expose: boolean | null;
  new_expose: boolean | null;
  note: string | null;
  created_at: string;
};

export const listNetworkExposureAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<NetworkExposureAuditRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("business_network_exposure_audit" as any)
      .select("*")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return ((rows as any[]) ?? []) as NetworkExposureAuditRow[];
  });

// -------- Admin --------

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export type AdminNetworkExposureRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  province: string | null;
  expose_inventory_to_network: boolean;
  network_exposure_status: NetworkExposureStatus;
  network_exposure_requested_at: string | null;
  network_exposure_reviewed_at: string | null;
  network_exposure_review_note: string | null;
};

export const adminListNetworkExposure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: NetworkExposureStatus | "all"; search?: string | null }) =>
    z
      .object({
        status: z.enum(["all", "none", "pending", "approved", "revoked"]).optional(),
        search: z.string().trim().max(120).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<AdminNetworkExposureRow[]> => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("businesses")
      .select(
        "id, name, slug, city, province, expose_inventory_to_network, network_exposure_status, network_exposure_requested_at, network_exposure_reviewed_at, network_exposure_review_note",
      )
      .order("network_exposure_requested_at", { ascending: false, nullsFirst: false })
      .limit(300);

    const status = data.status ?? "pending";
    if (status !== "all") q = q.eq("network_exposure_status", status);

    if (data.search) {
      const s = data.search.replace(/[%_]/g, " ");
      q = q.or(`name.ilike.%${s}%,slug.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw error;
    return ((rows as any[]) ?? []) as AdminNetworkExposureRow[];
  });

export const adminReviewNetworkExposure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { businessId: string; decision: "approve" | "reject" | "revoke"; note?: string | null }) =>
      z
        .object({
          businessId: z.string().uuid(),
          decision: z.enum(["approve", "reject", "revoke"]),
          note: z.string().trim().max(1000).nullable().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: res, error } = await context.supabase.rpc("review_network_exposure", {
      _business_id: data.businessId,
      _decision: data.decision,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as { status: NetworkExposureStatus };
  });

export const adminListNetworkExposureAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<NetworkExposureAuditRow[]> => {
    await ensureAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("business_network_exposure_audit" as any)
      .select("*")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return ((rows as any[]) ?? []) as NetworkExposureAuditRow[];
  });

// ============================================================
// Short-term stock reservations
// ============================================================

export const reserveNetworkInquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      inquiryId: string;
      businessId: string;
      quantity: number;
      hours: number;
      note?: string | null;
    }) =>
      z
        .object({
          inquiryId: z.string().uuid(),
          businessId: z.string().uuid(),
          quantity: z.number().positive().max(9999),
          hours: z.number().int().positive().max(168),
          note: z.string().trim().max(1000).nullable().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("reserve_network_inquiry", {
      _inquiry_id: data.inquiryId,
      _business_id: data.businessId,
      _quantity: data.quantity,
      _hours: data.hours,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as { reserved_quantity: number; reserved_until: string };
  });

export const releaseNetworkInquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { inquiryId: string; businessId: string }) =>
    z.object({ inquiryId: z.string().uuid(), businessId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("release_network_inquiry", {
      _inquiry_id: data.inquiryId,
      _business_id: data.businessId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

