import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  }) as any;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null);

export type CatalogMatch = {
  id: string;
  slug: string;
  title: string;
  category: string;
  manufacturer: string | null;
  manufacturer_part_number: string | null;
  product_type: string;
  warranty_months: number | null;
  compatible_makes: string[];
  compatible_models: string[];
  year_min: number | null;
  year_max: number | null;
  alternate_numbers: Array<{ number: string; number_type: string }>;
  match_reason: string;
  fitment_confidence: number | null;
  fitment_confirmed: boolean;
};

export const getCanonicalCatalogMatches = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        query: z.string().trim().max(120).optional(),
        make: z.string().trim().max(80).optional(),
        model: z.string().trim().max(80).optional(),
        year: z.number().int().min(1886).max(2200).optional(),
        engine: z.string().trim().max(120).optional(),
        chassisCode: z.string().trim().max(30).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<CatalogMatch[]> => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("parts_catalog")
      .select(
        "id,slug,title,category,manufacturer,manufacturer_part_number,product_type,warranty_months,compatible_makes,compatible_models,year_min,year_max,parts_product_numbers(number,number_type,active),parts_fitment(fitment_status,confidence,position,parts_vehicle_profiles(make,model,variant,year_min,year_max,engine_code,chassis_code,status))",
      )
      .eq("active", true)
      .eq("catalog_status", "active")
      .limit(300);
    if (error) throw error;

    const norm = (value: unknown) =>
      String(value ?? "")
        .trim()
        .toLowerCase();
    const numberNorm = (value: unknown) =>
      String(value ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    const wantQuery = norm(data.query);
    const wantNumber = numberNorm(data.query);
    const wantMake = norm(data.make);
    const wantModel = norm(data.model);
    const wantEngine = norm(data.engine);
    const wantChassis = norm(data.chassisCode).split("-")[0];

    const scored = ((rows ?? []) as any[]).map((row) => {
      let score = 0;
      const reasons: string[] = [];
      const numbers = ((row.parts_product_numbers ?? []) as any[]).filter(
        (n) => n.active !== false,
      );
      const searchableNumbers = [
        row.manufacturer_part_number,
        ...numbers.map((n) => n.number),
      ].filter(Boolean);

      if (wantQuery) {
        if (searchableNumbers.some((n) => numberNorm(n) === wantNumber)) {
          score += 120;
          reasons.push("Exact part number");
        } else if (searchableNumbers.some((n) => numberNorm(n).includes(wantNumber))) {
          score += 70;
          reasons.push("Related part number");
        }
        if ([row.title, row.category, row.manufacturer].some((v) => norm(v).includes(wantQuery))) {
          score += 30;
          reasons.push("Catalogue text");
        }
      }

      let bestConfidence: number | null = null;
      let fitmentConfirmed = false;
      for (const fit of (row.parts_fitment ?? []) as any[]) {
        const profile = Array.isArray(fit.parts_vehicle_profiles)
          ? fit.parts_vehicle_profiles[0]
          : fit.parts_vehicle_profiles;
        if (!profile || fit.fitment_status !== "confirmed" || profile.status !== "approved")
          continue;
        const makeMatch = !wantMake || norm(profile.make) === wantMake;
        const modelMatch = !wantModel || norm(profile.model) === wantModel;
        const yearMatch =
          !data.year ||
          ((!profile.year_min || data.year >= Number(profile.year_min)) &&
            (!profile.year_max || data.year <= Number(profile.year_max)));
        const engineMatch =
          !wantEngine ||
          !profile.engine_code ||
          wantEngine.includes(norm(profile.engine_code)) ||
          norm(profile.engine_code).includes(wantEngine);
        const chassisMatch =
          !wantChassis ||
          !profile.chassis_code ||
          wantChassis.startsWith(norm(profile.chassis_code)) ||
          norm(profile.chassis_code).startsWith(wantChassis);
        if (makeMatch && modelMatch && yearMatch && engineMatch && chassisMatch) {
          score += 100;
          fitmentConfirmed = true;
          bestConfidence = Math.max(bestConfidence ?? 0, Number(fit.confidence ?? 0));
          reasons.push(
            profile.chassis_code ? "Confirmed chassis fitment" : "Confirmed vehicle fitment",
          );
        }
      }

      // Preserve the original catalogue's broad make/model/year applicability.
      if (!fitmentConfirmed && (wantMake || wantModel || data.year)) {
        const makes = (row.compatible_makes ?? []).map(norm);
        const models = (row.compatible_models ?? []).map(norm);
        const broadMatch =
          (!wantMake || makes.length === 0 || makes.includes(wantMake)) &&
          (!wantModel || models.length === 0 || models.includes(wantModel)) &&
          (!data.year ||
            ((!row.year_min || data.year >= row.year_min) &&
              (!row.year_max || data.year <= row.year_max)));
        if (broadMatch && (makes.length > 0 || models.length > 0 || row.year_min || row.year_max)) {
          score += 35;
          reasons.push("Legacy vehicle range");
        }
      }

      return {
        row,
        score,
        reasons: Array.from(new Set(reasons)),
        bestConfidence,
        fitmentConfirmed,
        numbers,
      };
    });

    return scored
      .filter((entry) => {
        const hasCriteria = !!(
          wantQuery ||
          wantMake ||
          wantModel ||
          data.year ||
          wantEngine ||
          wantChassis
        );
        return hasCriteria ? entry.score > 0 : true;
      })
      .sort((a, b) => b.score - a.score || String(a.row.title).localeCompare(String(b.row.title)))
      .slice(0, data.limit ?? 12)
      .map(({ row, reasons, bestConfidence, fitmentConfirmed, numbers }) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category,
        manufacturer: row.manufacturer ?? null,
        manufacturer_part_number: row.manufacturer_part_number ?? null,
        product_type: row.product_type ?? "replacement",
        warranty_months: row.warranty_months ?? null,
        compatible_makes: row.compatible_makes ?? [],
        compatible_models: row.compatible_models ?? [],
        year_min: row.year_min ?? null,
        year_max: row.year_max ?? null,
        alternate_numbers: numbers.map((n: any) => ({
          number: n.number,
          number_type: n.number_type,
        })),
        match_reason: reasons.join(" · ") || "Catalogue result",
        fitment_confidence: bestConfidence,
        fitment_confirmed: fitmentConfirmed,
      }));
  });

export type PartsBusinessOption = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  locations: Array<{
    id: string;
    name: string;
    code: string;
    city: string | null;
    province: string | null;
  }>;
};

export const listMyPartsBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PartsBusinessOption[]> => {
    const { supabase, userId } = context;
    const { data: staffRows, error: staffError } = await supabase
      .from("business_staff")
      .select("business_id,role")
      .eq("user_id", userId)
      .eq("active", true)
      .in("role", ["owner", "manager"]);
    if (staffError) throw staffError;
    const staffIds = (staffRows ?? []).map((row: any) => row.business_id);

    let query = supabase
      .from("businesses")
      .select("id,name,city,province")
      .eq("status", "active")
      .order("name");
    query = staffIds.length
      ? query.or(`owner_id.eq.${userId},id.in.(${staffIds.join(",")})`)
      : query.eq("owner_id", userId);
    const { data: businesses, error } = await query;
    if (error) throw error;
    const ids = (businesses ?? []).map((row: any) => row.id);
    if (!ids.length) return [];

    const { data: locations, error: locationError } = await (supabase as any)
      .from("business_inventory_locations")
      .select("id,business_id,name,code,city,province")
      .in("business_id", ids)
      .eq("active", true)
      .order("name");
    if (locationError) throw locationError;

    return (businesses ?? []).map((business: any) => ({
      ...business,
      locations: (locations ?? [])
        .filter((location: any) => location.business_id === business.id)
        .map(({ business_id: _businessId, ...location }: any) => location),
    }));
  });

export const listBusinessPartsLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertBusinessMember(context.supabase, context.userId, data.businessId);
    const { data: rows, error } = await (context.supabase as any)
      .from("business_inventory_locations")
      .select(
        "id,business_id,code,name,location_type,address_line,barangay,city,province,region,postal_code,lat,lng,pickup_notes,network_visible,active",
      )
      .eq("business_id", data.businessId)
      .order("name");
    if (error) throw error;
    return rows ?? [];
  });

export const upsertBusinessPartsLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        businessId: z.string().uuid(),
        code: z.string().trim().min(1).max(40),
        name: z.string().trim().min(1).max(160),
        locationType: z.enum(["store", "warehouse", "repair_shop", "counter", "mobile", "other"]),
        addressLine: optionalText(300),
        barangay: optionalText(120),
        city: optionalText(120),
        province: optionalText(120),
        region: optionalText(120),
        postalCode: optionalText(20),
        lat: z.number().min(-90).max(90).optional().nullable(),
        lng: z.number().min(-180).max(180).optional().nullable(),
        pickupNotes: optionalText(1000),
        networkVisible: z.boolean().default(true),
        active: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: manager, error: managerError } = await context.supabase.rpc("has_business_role", {
      _user: context.userId,
      _business: data.businessId,
      _role: "manager",
    });
    if (managerError || !manager) throw new Error("Business manager access required");
    const { data: row, error } = await (context.supabase as any)
      .from("business_inventory_locations")
      .upsert({
        id: data.id,
        business_id: data.businessId,
        code: data.code.toUpperCase(),
        name: data.name,
        location_type: data.locationType,
        address_line: data.addressLine,
        barangay: data.barangay,
        city: data.city,
        province: data.province,
        region: data.region,
        postal_code: data.postalCode,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        pickup_notes: data.pickupNotes,
        network_visible: data.networkVisible,
        active: data.active,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const createPartsNetworkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        requesterBusinessId: z.string().uuid(),
        supplierBusinessId: z.string().uuid(),
        itemId: z.string().uuid(),
        quantity: z.number().positive().max(999999),
        sourceLocationId: z.string().uuid().optional().nullable(),
        destinationLocationId: z.string().uuid().optional().nullable(),
        requesterShopId: z.string().uuid().optional().nullable(),
        workOrderId: z.string().uuid().optional().nullable(),
        fulfillmentMethod: z.enum(["pickup", "delivery", "courier", "transfer"]),
        note: optionalText(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const transfer = data.requesterBusinessId === data.supplierBusinessId;
    const { data: result, error } = await (context.supabase as any).rpc(
      "create_parts_network_order",
      {
        _requester_business_id: data.requesterBusinessId,
        _supplier_business_id: data.supplierBusinessId,
        _source_location_id: data.sourceLocationId ?? undefined,
        _destination_location_id: data.destinationLocationId ?? undefined,
        _requester_shop_id: data.requesterShopId ?? undefined,
        _work_order_id: data.workOrderId ?? undefined,
        _order_kind: transfer ? "transfer" : "purchase",
        _fulfillment_method: transfer ? "transfer" : data.fulfillmentMethod,
        _requester_note: data.note ?? undefined,
        _lines: [{ inventory_item_id: data.itemId, quantity: data.quantity }],
      },
    );
    if (error) throw new Error(error.message);
    return result as { id: string; order_number: string; status: string; total: number };
  });

async function assertBusinessMember(supabase: any, userId: string, businessId: string) {
  const { data, error } = await supabase.rpc("is_business_member", {
    _user: userId,
    _business: businessId,
  });
  if (error || !data) throw new Error("Business workspace access required");
}

async function assertApprovedAssociate(supabase: any, businessId: string) {
  const { data, error } = await supabase
    .from("business_associate_applications")
    .select("status")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw error;
  if (data?.status !== "approved") {
    throw new Error("Approved 365 Associate enrollment is required for Parts Network operations");
  }
}

export const listPartsOperations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertBusinessMember(context.supabase, context.userId, data.businessId);
    await assertApprovedAssociate(context.supabase, data.businessId);
    const supabase = context.supabase as any;
    const { data: orders, error } = await supabase
      .from("parts_orders")
      .select(
        "*,requester:businesses!parts_orders_requester_business_id_fkey(id,name,slug),supplier:businesses!parts_orders_supplier_business_id_fkey(id,name,slug),source_location:business_inventory_locations!parts_orders_source_location_id_fkey(id,name,city,province),destination_location:business_inventory_locations!parts_orders_destination_location_id_fkey(id,name,city,province),parts_order_lines(*),parts_order_events(*)",
      )
      .or(`requester_business_id.eq.${data.businessId},supplier_business_id.eq.${data.businessId}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const { data: returns, error: returnsError } = await supabase
      .from("parts_returns")
      .select("*,parts_return_lines(*,parts_order_lines(name_snapshot,part_number_snapshot))")
      .or(`requester_business_id.eq.${data.businessId},supplier_business_id.eq.${data.businessId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (returnsError) throw returnsError;

    const { data: warranties, error: warrantyError } = await supabase
      .from("parts_warranty_claims")
      .select("*,parts_order_lines(name_snapshot,part_number_snapshot,warranty_months_snapshot)")
      .or(`claimant_business_id.eq.${data.businessId},supplier_business_id.eq.${data.businessId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (warrantyError) throw warrantyError;

    const { data: locations, error: locationsError } = await supabase
      .from("business_inventory_locations")
      .select("id,name,code,city,province,location_type,network_visible,active")
      .eq("business_id", data.businessId)
      .order("name");
    if (locationsError) throw locationsError;

    return {
      orders: orders ?? [],
      returns: returns ?? [],
      warranties: warranties ?? [],
      locations: locations ?? [],
    };
  });

const ORDER_STATUSES = [
  "accepted",
  "declined",
  "picking",
  "ready",
  "shipped",
  "cancelled",
] as const;
export const transitionPartsNetworkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(ORDER_STATUSES),
        note: optionalText(2000),
        holdHours: z.number().int().min(1).max(336).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc(
      "transition_parts_network_order",
      {
        _order_id: data.orderId,
        _target_status: data.status,
        _note: data.note ?? undefined,
        _hold_hours: data.holdHours ?? 72,
      },
    );
    if (error) throw new Error(error.message);
    return result;
  });

export const receivePartsNetworkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        lines: z
          .array(
            z.object({
              order_line_id: z.string().uuid(),
              quantity: z.number().positive(),
              condition: z.enum(["accepted", "damaged", "incorrect", "short"]).optional(),
              notes: optionalText(500),
            }),
          )
          .optional(),
        note: optionalText(2000),
        deliveryReference: optionalText(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc(
      "receive_parts_network_order",
      {
        _order_id: data.orderId,
        _lines: data.lines ?? undefined,
        _note: data.note ?? undefined,
        _delivery_reference: data.deliveryReference ?? undefined,
      },
    );
    if (error) throw new Error(error.message);
    return result;
  });

export const createPartsReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        reasonCode: z.enum([
          "incorrect_part",
          "damaged",
          "defective",
          "not_as_described",
          "core_return",
          "buyer_error",
          "other",
        ]),
        resolution: z.enum(["refund", "replacement", "credit", "repair"]),
        note: optionalText(2000),
        lines: z
          .array(
            z.object({
              order_line_id: z.string().uuid(),
              quantity: z.number().positive(),
              condition_notes: optionalText(1000),
            }),
          )
          .min(1)
          .max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc("create_parts_return", {
      _order_id: data.orderId,
      _reason_code: data.reasonCode,
      _requested_resolution: data.resolution,
      _requester_note: data.note ?? undefined,
      _lines: data.lines,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const createPartsWarrantyClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        orderLineId: z.string().uuid().optional().nullable(),
        installedComponentId: z.string().uuid().optional().nullable(),
        issue: z.string().trim().min(10).max(4000),
        failureDate: z.string().date().optional().nullable(),
        odometerKm: z.number().int().nonnegative().optional().nullable(),
      })
      .refine((value) => value.orderLineId || value.installedComponentId, {
        message: "Order line or installed component required",
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc(
      "create_parts_warranty_claim",
      {
        _claimant_business_id: data.businessId,
        _order_line_id: data.orderLineId ?? undefined,
        _installed_component_id: data.installedComponentId ?? undefined,
        _issue_description: data.issue,
        _failure_date: data.failureDate ?? undefined,
        _odometer_km: data.odometerKm ?? undefined,
        _evidence: [],
      },
    );
    if (error) throw new Error(error.message);
    return result;
  });

export const recordInstalledComponent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        orderLineId: z.string().uuid(),
        workOrderId: z.string().uuid(),
        quantity: z.number().positive().max(9999),
        position: optionalText(120),
        serialNumber: optionalText(200),
        odometerKm: z.number().int().nonnegative().optional().nullable(),
        installedAt: z.string().datetime().optional(),
        notes: optionalText(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc(
      "record_installed_component",
      {
        _business_id: data.businessId,
        _order_line_id: data.orderLineId,
        _work_order_id: data.workOrderId,
        _quantity: data.quantity,
        _position: data.position ?? undefined,
        _serial_number: data.serialNumber ?? undefined,
        _installed_odometer_km: data.odometerKm ?? undefined,
        _installed_at: data.installedAt ?? undefined,
        _notes: data.notes ?? undefined,
      },
    );
    if (error) throw new Error(error.message);
    return result;
  });

export const transitionPartsReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "approved",
          "rejected",
          "shipped",
          "received",
          "refunded",
          "replaced",
          "cancelled",
          "closed",
        ]),
        note: optionalText(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc("transition_parts_return", {
      _return_id: data.id,
      _target_status: data.status,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const transitionPartsWarrantyClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "reviewing",
          "approved",
          "rejected",
          "replacement_sent",
          "credit_issued",
          "cancelled",
          "closed",
        ]),
        note: optionalText(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc(
      "transition_parts_warranty_claim",
      { _claim_id: data.id, _target_status: data.status, _note: data.note ?? undefined },
    );
    if (error) throw new Error(error.message);
    return result;
  });
