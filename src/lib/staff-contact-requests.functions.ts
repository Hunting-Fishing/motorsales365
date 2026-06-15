import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffContactRequestRow = {
  id: string;
  requester_id: string;
  owner_id: string;
  client_profile_id: string | null;
  lead_id: string | null;
  ad_inquiry_id: string | null;
  reason: string;
  status: "pending" | "approved" | "denied" | "expired" | "revoked";
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  requester_email?: string | null;
  requester_name?: string | null;
  owner_email?: string | null;
  owner_name?: string | null;
  client_name?: string | null;
};

export type StaffContactAuditRow = {
  id: string;
  request_id: string;
  actor_id: string | null;
  action: "created" | "approved" | "denied" | "revoked" | "expired" | "accessed";
  note: string | null;
  metadata: Record<string, any>;
  created_at: string;
};

async function decorateRows(
  rows: any[],
): Promise<StaffContactRequestRow[]> {
  if (!rows.length) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const userIds = Array.from(
    new Set(
      rows.flatMap((r) => [r.requester_id, r.owner_id, r.client_profile_id].filter(Boolean)),
    ),
  );
  const emailMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  if (userIds.length) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name")
      .in("id", userIds);
    (profs ?? []).forEach((p: any) => {
      if (p.full_name) nameMap.set(p.id, p.full_name);
    });
    // Best-effort email lookup
    for (const id of userIds) {
      try {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        if (data?.user?.email) emailMap.set(id, data.user.email);
      } catch {
        // ignore
      }
    }
  }
  return rows.map((r) => ({
    ...r,
    requester_email: emailMap.get(r.requester_id) ?? null,
    requester_name: nameMap.get(r.requester_id) ?? null,
    owner_email: emailMap.get(r.owner_id) ?? null,
    owner_name: nameMap.get(r.owner_id) ?? null,
    client_name: r.client_profile_id ? nameMap.get(r.client_profile_id) ?? null : null,
  }));
}

export const listStaffContactRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ box: z.enum(["inbox", "outbox", "all"]).default("inbox") })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("staff_client_contact_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.box === "inbox") q = q.eq("owner_id", userId);
    else if (data.box === "outbox") q = q.eq("requester_id", userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: await decorateRows(rows ?? []) };
  });

export const createStaffContactRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        owner_id: z.string().uuid(),
        client_profile_id: z.string().uuid().optional().nullable(),
        lead_id: z.string().uuid().optional().nullable(),
        ad_inquiry_id: z.string().uuid().optional().nullable(),
        reason: z.string().min(5).max(2000),
        expires_in_days: z.number().int().min(1).max(30).default(7),
      })
      .refine(
        (v) => v.client_profile_id || v.lead_id || v.ad_inquiry_id,
        { message: "Provide a client, lead, or inquiry reference" },
      )
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (userId === data.owner_id) throw new Error("Cannot request access to yourself");
    const expires = new Date(Date.now() + data.expires_in_days * 86400000).toISOString();
    const { data: row, error } = await supabase
      .from("staff_client_contact_requests")
      .insert({
        requester_id: userId,
        owner_id: data.owner_id,
        client_profile_id: data.client_profile_id ?? null,
        lead_id: data.lead_id ?? null,
        ad_inquiry_id: data.ad_inquiry_id ?? null,
        reason: data.reason,
        expires_at: expires,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .from("staff_client_contact_audit")
      .insert({
        request_id: row.id,
        actor_id: userId,
        action: "created",
        note: data.reason.slice(0, 500),
      });
    return { ok: true, id: row.id };
  });

export const decideStaffContactRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        request_id: z.string().uuid(),
        decision: z.enum(["approved", "denied"]),
        note: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: getErr } = await supabase
      .from("staff_client_contact_requests")
      .select("*")
      .eq("id", data.request_id)
      .single();
    if (getErr || !existing) throw new Error("Request not found");
    if (existing.owner_id !== userId) {
      // allow admins
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Only the assigned staff can decide this request");
    }
    if (existing.status !== "pending") throw new Error("Request already decided");
    const { error } = await supabase
      .from("staff_client_contact_requests")
      .update({
        status: data.decision,
        decided_by: userId,
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", data.request_id);
    if (error) throw new Error(error.message);
    await supabase.from("staff_client_contact_audit").insert({
      request_id: data.request_id,
      actor_id: userId,
      action: data.decision,
      note: data.note ?? null,
    });
    return { ok: true };
  });

export const revokeStaffContactRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ request_id: z.string().uuid(), note: z.string().max(2000).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: getErr } = await supabase
      .from("staff_client_contact_requests")
      .select("*")
      .eq("id", data.request_id)
      .single();
    if (getErr || !existing) throw new Error("Request not found");
    if (existing.owner_id !== userId && existing.requester_id !== userId) {
      throw new Error("Not permitted");
    }
    const { error } = await supabase
      .from("staff_client_contact_requests")
      .update({
        status: "revoked",
        decided_by: userId,
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", data.request_id);
    if (error) throw new Error(error.message);
    await supabase.from("staff_client_contact_audit").insert({
      request_id: data.request_id,
      actor_id: userId,
      action: "revoked",
      note: data.note ?? null,
    });
    return { ok: true };
  });

export const getStaffContactRequestAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ request_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("staff_client_contact_audit")
      .select("*")
      .eq("request_id", data.request_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as StaffContactAuditRow[] };
  });
