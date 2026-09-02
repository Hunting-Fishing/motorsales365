import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const adminListPartsFitmentWorkbench = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [catalog, profiles, fitments] = await Promise.all([
      supabaseAdmin
        .from("parts_catalog")
        .select("id,title,manufacturer,manufacturer_part_number,category,catalog_status,active")
        .order("title")
        .limit(500),
      supabaseAdmin
        .from("parts_vehicle_profiles")
        .select("id,country_code,make,model,variant,year_min,year_max,engine_code,chassis_code,status,source")
        .order("make")
        .order("model")
        .limit(1000),
      supabaseAdmin
        .from("parts_fitment")
        .select("id,product_id,vehicle_profile_id,position,fitment_status,source,source_reference,confidence,reviewed_at,parts_catalog(title,manufacturer_part_number),parts_vehicle_profiles(make,model,variant,year_min,year_max,engine_code,chassis_code)")
        .order("updated_at", { ascending: false })
        .limit(500),
    ]);
    if (catalog.error) throw new Error(catalog.error.message);
    if (profiles.error) throw new Error(profiles.error.message);
    if (fitments.error) throw new Error(fitments.error.message);
    return {
      catalog: catalog.data ?? [],
      profiles: profiles.data ?? [],
      fitments: fitments.data ?? [],
    };
  });

const VehicleProfileSchema = z.object({
  id: z.string().uuid().optional(),
  country_code: z.string().trim().toUpperCase().length(2).default("PH"),
  make: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  variant: z.string().trim().max(100).nullable().optional(),
  year_min: z.number().int().min(1886).max(2200).nullable().optional(),
  year_max: z.number().int().min(1886).max(2200).nullable().optional(),
  engine_code: z.string().trim().max(80).nullable().optional(),
  chassis_code: z.string().trim().toUpperCase().max(30).nullable().optional(),
  source: z.string().trim().min(2).max(120),
  source_reference: z.string().trim().min(2).max(500),
  status: z.enum(["pending", "approved", "retired"]).default("pending"),
}).refine((row) => !row.year_min || !row.year_max || row.year_min <= row.year_max, {
  message: "Starting year must be before ending year",
  path: ["year_max"],
});

export const adminUpsertPartsVehicleProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VehicleProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("parts_vehicle_profiles")
      .upsert(data as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const FitmentSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  vehicle_profile_id: z.string().uuid(),
  position: z.string().trim().max(80).nullable().optional(),
  fitment_status: z.enum(["confirmed", "unverified", "does_not_fit", "retired"]),
  source: z.string().trim().min(2).max(120),
  source_reference: z.string().trim().min(2).max(500),
  confidence: z.number().min(0).max(1),
});

export const adminUpsertPartsFitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FitmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      ...data,
      reviewed_by: context.userId,
      reviewed_at: data.fitment_status === "confirmed" ? new Date().toISOString() : null,
    };
    const { data: row, error } = await supabaseAdmin
      .from("parts_fitment")
      .upsert(payload as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeletePartsFitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("parts_fitment").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
