import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

const SERVICE_TYPES = [
  "oil_change",
  "tire_change",
  "brake_service",
  "battery",
  "tune_up",
  "transmission",
  "inspection",
  "registration",
  "insurance",
  "accident_repair",
  "other",
] as const;

const vehicleInput = z.object({
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  vin: z.string().trim().max(20).optional().nullable(),
  plateNumber: z.string().trim().max(20).optional().nullable(),
  nickname: z.string().trim().max(60).optional().nullable(),
  coverUrl: z.string().url().max(2000).optional().nullable(),
  isPublic: z.boolean().optional(),
});

export const listMyVehicles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid.parse(d.id) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", data.id)
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!vehicle) throw new Error("Vehicle not found");
    const { data: records } = await supabase
      .from("vehicle_service_records")
      .select("*")
      .eq("vehicle_id", data.id)
      .order("performed_at", { ascending: false });
    return { vehicle, records: records ?? [] };
  });

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vehicleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("vehicles")
      .insert({
        owner_user_id: userId,
        make: data.make,
        model: data.model,
        year: data.year ?? null,
        color: data.color ?? null,
        vin: data.vin ?? null,
        plate_number: data.plateNumber ?? null,
        nickname: data.nickname ?? null,
        cover_url: data.coverUrl ?? null,
        is_public: data.isPublic ?? false,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vehicleInput.extend({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("vehicles")
      .update({
        make: data.make,
        model: data.model,
        year: data.year ?? null,
        color: data.color ?? null,
        vin: data.vin ?? null,
        plate_number: data.plateNumber ?? null,
        nickname: data.nickname ?? null,
        cover_url: data.coverUrl ?? null,
        is_public: data.isPublic ?? false,
      })
      .eq("id", data.id)
      .eq("owner_user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid.parse(d.id) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", data.id)
      .eq("owner_user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const recordInput = z.object({
  vehicleId: uuid,
  performedAt: z.string().min(8).max(20),
  mileageKm: z.number().int().min(0).max(2_000_000).optional().nullable(),
  serviceType: z.enum(SERVICE_TYPES),
  title: z.string().trim().min(1).max(200),
  shopName: z.string().trim().max(120).optional().nullable(),
  costPhp: z.number().min(0).max(99_999_999).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  receiptUrl: z.string().url().max(2000).optional().nullable(),
});

export const addServiceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => recordInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("vehicle_service_records")
      .insert({
        vehicle_id: data.vehicleId,
        performed_at: data.performedAt,
        mileage_km: data.mileageKm ?? null,
        service_type: data.serviceType,
        title: data.title,
        shop_name: data.shopName ?? null,
        cost_php: data.costPhp ?? null,
        notes: data.notes ?? null,
        receipt_url: data.receiptUrl ?? null,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteServiceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid.parse(d.id) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify the record belongs to a vehicle owned by the caller.
    const { data: rec, error: lookupErr } = await supabase
      .from("vehicle_service_records")
      .select("id, vehicles!inner(owner_user_id)")
      .eq("id", data.id)
      .eq("vehicles.owner_user_id", userId)
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);
    if (!rec) throw new Error("Service record not found");
    const { error } = await supabase.from("vehicle_service_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
