import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const statusSchema = z.enum(["new", "qualified", "quoted", "won", "lost"]);

// PUBLIC: submit inquiry
export const submitExportInquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      buyer_name: z.string().min(1).max(120),
      buyer_email: z.string().email().max(255),
      buyer_phone: z.string().max(40).optional().nullable(),
      country: z.string().min(2).max(80),
      destination_port: z.string().max(120).optional().nullable(),
      listing_id: z.string().uuid().optional().nullable(),
      vehicle_interest: z.string().max(500).optional().nullable(),
      budget_usd: z.number().min(0).max(10_000_000).optional().nullable(),
      message: z.string().min(10).max(3000),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("export_inquiries").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// PUBLIC: list export-available listings
export const listExportListings = createServerFn({ method: "GET" })
  .inputValidator((input: { search?: string; limit?: number }) =>
    z.object({
      search: z.string().max(120).optional(),
      limit: z.number().int().min(1).max(60).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("listings")
      .select("id, title, price_php, region, city, attributes, view_count")
      .eq("export_available", true)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 24);
    if (data.search) {
      q = q.ilike("title", `%${data.search}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { listings: rows ?? [] };
  });

// OWNER: toggle export availability
export const setExportAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string; available: boolean }) =>
    z.object({ listingId: z.string().uuid(), available: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify owner is verified
    const { data: profile } = await supabase
      .from("profiles").select("verification_status").eq("id", userId).maybeSingle();
    if (data.available && profile?.verification_status !== "verified") {
      throw new Error("Only verified accounts can opt-in to the export program.");
    }
    const { error } = await supabase
      .from("listings").update({ export_available: data.available })
      .eq("id", data.listingId).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// STAFF: list inquiries
export const listExportInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: canSupport } = await supabase.rpc("can_support", { _user_id: userId });
    if (!canSupport) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("export_inquiries").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { inquiries: data ?? [] };
  });

// STAFF: update inquiry
export const updateExportInquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: statusSchema.optional(),
      assigned_to: z.string().uuid().nullable().optional(),
      internal_notes: z.string().max(5000).nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("export_inquiries").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
