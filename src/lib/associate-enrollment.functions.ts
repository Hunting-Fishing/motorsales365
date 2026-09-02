import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAssociateEnrollmentContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [owned, staff] = await Promise.all([
      supabase
        .from("businesses")
        .select("id,name,slug,type_slug,status,city,province")
        .eq("owner_id", userId)
        .eq("status", "active"),
      supabase
        .from("business_staff")
        .select("business_id,role,active")
        .eq("user_id", userId)
        .eq("active", true)
        .in("role", ["owner", "manager", "assistant_manager"]),
    ]);
    if (owned.error) throw owned.error;
    if (staff.error) throw staff.error;
    const staffIds = (staff.data ?? []).map((row: any) => row.business_id);
    const staffed = staffIds.length
      ? await supabase
          .from("businesses")
          .select("id,name,slug,type_slug,status,city,province")
          .in("id", staffIds)
          .eq("status", "active")
      : ({ data: [], error: null } as any);
    if (staffed.error) throw staffed.error;
    const byId = new Map<string, any>();
    [...(owned.data ?? []), ...(staffed.data ?? [])].forEach((row: any) => byId.set(row.id, row));
    const businesses = [...byId.values()];
    const ids = businesses.map((row: any) => row.id);
    const applications = ids.length
      ? await supabase
          .from("business_associate_applications" as any)
          .select("*")
          .in("business_id", ids)
      : ({ data: [], error: null } as any);
    if (applications.error) throw applications.error;
    return { businesses, applications: applications.data ?? [] };
  });

export const applyForAssociateNetwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        track: z.enum(["parts_supplier", "repair_shop", "both"]),
        acceptTerms: z.literal(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: application, error } = await context.supabase.rpc(
      "apply_business_associate" as any,
      {
        _business_id: data.businessId,
        _track: data.track,
        _terms_version: "associate-v1",
      },
    );
    if (error) throw error;
    return application;
  });

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Administrator access required");
}

export const adminListAssociateApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("business_associate_applications" as any)
      .select("*,businesses(id,name,slug,type_slug,city,province,owner_id)")
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminReviewAssociateApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        status: z.enum(["reviewing", "approved", "rejected", "suspended"]),
        note: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: result, error } = await context.supabase.rpc(
      "review_business_associate_application" as any,
      {
        _application_id: data.applicationId,
        _status: data.status,
        _review_note: data.note ?? null,
      },
    );
    if (error) throw error;
    return result;
  });

export const adminOffboardAssociate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        reason: z.string().trim().min(5).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: result, error } = await context.supabase.rpc(
      "offboard_business_associate" as any,
      { _application_id: data.applicationId, _reason: data.reason },
    );
    if (error) throw error;
    return result;
  });
