import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Allow admins OR sales-role staff. Throws if neither. */
async function assertStaff(context: any) {
  const [{ data: isAdmin }, { data: isSales }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "sales" }),
  ]);
  if (!isAdmin && !isSales) throw new Error("Forbidden");
}

export const PIPELINE_STAGES = [
  "lead",
  "researched",
  "contacted",
  "qualified",
  "pitched",
  "negotiating",
  "onboarding",
  "live",
  "lost",
] as const;

export const OUTCOMES = [
  "no_answer",
  "voicemail",
  "gatekeeper",
  "spoke",
  "interested",
  "not_interested",
  "callback",
  "meeting_set",
  "quote_sent",
  "won",
  "lost",
] as const;

export const CHANNELS = ["call", "email", "sms", "viber", "whatsapp", "messenger", "visit", "other"] as const;

// ------------- Today queue + pipeline list -------------

export const listOutreachBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("parts_suppliers")
      .select(
        "id, name, region, category, pipeline_stage, lead_score, next_action_at, last_contacted_at, owner_user_id, do_not_contact, website, signup_url, contact_phone, contact_name, account_email, city, province, google_maps_url, business_hours, brands, is_recommended"
      )
      .order("lead_score", { ascending: false })
      .order("next_action_at", { ascending: true, nullsFirst: true })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

// ------------- Supplier detail (contacts + outreach + tasks) -------------

export const getSupplierDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { supplier_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const [supplier, contacts, outreach, tasks] = await Promise.all([
      context.supabase.from("parts_suppliers").select("*").eq("id", data.supplier_id).single(),
      context.supabase
        .from("parts_supplier_contacts")
        .select("*")
        .eq("supplier_id", data.supplier_id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true }),
      context.supabase
        .from("parts_supplier_outreach")
        .select("*")
        .eq("supplier_id", data.supplier_id)
        .order("occurred_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("parts_supplier_tasks")
        .select("*")
        .eq("supplier_id", data.supplier_id)
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(100),
    ]);
    if (supplier.error) throw supplier.error;
    return {
      supplier: supplier.data,
      contacts: contacts.data ?? [],
      outreach: outreach.data ?? [],
      tasks: tasks.data ?? [],
    };
  });

// ------------- Update pipeline stage / owner / ops fields -------------

const UpdateSupplierOps = z.object({
  id: z.string().uuid(),
  pipeline_stage: z.enum(PIPELINE_STAGES).optional(),
  lead_score: z.number().int().min(0).max(100).optional(),
  next_action_at: z.string().nullable().optional(),
  owner_user_id: z.string().uuid().nullable().optional(),
  do_not_contact: z.boolean().optional(),
  lost_reason: z.string().max(500).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  province: z.string().max(120).nullable().optional(),
  google_maps_url: z.string().max(500).nullable().optional(),
  business_hours: z.string().max(200).nullable().optional(),
});

export const updateSupplierOps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateSupplierOps.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { id, ...patch } = data;
    const { data: out, error } = await context.supabase
      .from("parts_suppliers")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return out;
  });

// ------------- Contacts CRUD -------------

const ContactInput = z.object({
  id: z.string().uuid().optional(),
  supplier_id: z.string().uuid(),
  role: z.string().max(40).default("other"),
  name: z.string().min(1).max(160),
  title: z.string().max(120).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  mobile: z.string().max(60).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  viber: z.string().max(80).nullable().optional(),
  whatsapp: z.string().max(80).nullable().optional(),
  messenger: z.string().max(120).nullable().optional(),
  preferred_channel: z.string().max(40).nullable().optional(),
  preferred_time: z.string().max(80).nullable().optional(),
  language: z.string().max(40).nullable().optional(),
  is_primary: z.boolean().optional(),
  do_not_contact: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const upsertSupplierContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ContactInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    // If marking primary, unset others first
    if (data.is_primary) {
      await context.supabase
        .from("parts_supplier_contacts")
        .update({ is_primary: false })
        .eq("supplier_id", data.supplier_id);
    }
    const { data: out, error } = await context.supabase
      .from("parts_supplier_contacts")
      .upsert(data, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return out;
  });

export const deleteSupplierContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("parts_supplier_contacts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ------------- Log an outreach touch -------------

const LogOutreach = z.object({
  supplier_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  channel: z.enum(CHANNELS).default("call"),
  direction: z.enum(["inbound", "outbound"]).default("outbound"),
  outcome: z.enum(OUTCOMES).default("spoke"),
  duration_sec: z.number().int().min(0).max(36000).nullable().optional(),
  summary: z.string().max(4000).nullable().optional(),
  next_action: z.string().max(300).nullable().optional(),
  next_action_at: z.string().nullable().optional(),
  // Optional same-call pipeline move
  pipeline_stage: z.enum(PIPELINE_STAGES).optional(),
});

export const logOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LogOutreach.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { pipeline_stage, ...row } = data;
    const { data: out, error } = await context.supabase
      .from("parts_supplier_outreach")
      .insert({ ...row, owner_user_id: context.userId })
      .select()
      .single();
    if (error) throw error;

    if (pipeline_stage) {
      const { error: upErr } = await context.supabase
        .from("parts_suppliers")
        .update({ pipeline_stage })
        .eq("id", row.supplier_id);
      if (upErr) throw upErr;
    }
    return out;
  });

// ------------- Tasks -------------

const TaskInput = z.object({
  id: z.string().uuid().optional(),
  supplier_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).nullable().optional(),
  due_at: z.string().nullable().optional(),
  status: z.enum(["open", "done", "cancelled"]).default("open"),
});

export const upsertSupplierTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TaskInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload: any = { ...data };
    if (!data.id) payload.owner_user_id = context.userId;
    if (data.status === "done") payload.completed_at = new Date().toISOString();
    const { data: out, error } = await context.supabase
      .from("parts_supplier_tasks")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return out;
  });

export const deleteSupplierTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("parts_supplier_tasks").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
