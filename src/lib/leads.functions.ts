import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withRouteAudit } from "@/integrations/supabase/route-audit.server";
import { getRequest } from "@tanstack/react-start/server";
import { captureNativeRequestCaller } from "./native-request-caller.server";

const uuid = z.string().uuid();

// Throws if the caller is not a member of the org.
async function assertOrgMember(supabase: any, userId: string, orgId: string): Promise<void> {
  const { data, error } = await supabase.rpc("is_org_member", {
    _user_id: userId,
    _org_id: orgId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// Throws if the caller is not an owner/admin of the org.
async function assertOrgManager(supabase: any, userId: string, orgId: string): Promise<void> {
  const { data, error } = await supabase.rpc("can_manage_org", {
    _user_id: userId,
    _org_id: orgId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden — owner or admin role required");
}

// Returns the lead's organization_id, or throws if not found / caller is not a member.
async function loadLeadOrg(supabase: any, userId: string, leadId: string): Promise<string> {
  const { data, error } = await supabase
    .from("leads")
    .select("organization_id")
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.organization_id) throw new Error("Lead not found");
  await assertOrgMember(supabase, userId, data.organization_id);
  return data.organization_id as string;
}

export const listMyOrgs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("organization_members")
      .select("role, organization_id, organizations(id, name, slug, kind, logo_url)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({ ...r.organizations, role: r.role }));
  });

export const listOrgMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => ({ orgId: uuid.parse(d.orgId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrgMember(supabase, userId, data.orgId);
    const { data: members, error } = await supabase
      .from("organization_members")
      .select("user_id, role, joined_at")
      .eq("organization_id", data.orgId);
    if (error) throw new Error(error.message);
    const ids = (members ?? []).map((m: any) => m.user_id);
    let profilesById = new Map<
      string,
      { id: string; full_name: string | null; avatar_url: string | null }
    >();
    if (ids.length) {
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      if (pErr) throw new Error(pErr.message);
      profilesById = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }
    return (members ?? []).map((m: any) => ({
      ...m,
      profiles: profilesById.get(m.user_id) ?? null,
    }));
  });

export const listOrgLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      orgId: string;
      status?: "new" | "in_progress" | "won" | "lost" | "all";
      assignedTo?: string | "unassigned" | "all";
      source?: string;
      q?: string;
      limit?: number;
    }) => ({
      orgId: uuid.parse(d.orgId),
      status: d.status ?? "all",
      assignedTo: d.assignedTo ?? "all",
      source: d.source,
      q: d.q?.trim() || undefined,
      limit: Math.min(d.limit ?? 100, 200),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrgMember(supabase, userId, data.orgId);
    let q = supabase
      .from("leads")
      .select("*, assignee:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)")
      .eq("organization_id", data.orgId)
      .order("last_activity_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.assignedTo === "unassigned") q = q.is("assigned_to", null);
    else if (data.assignedTo !== "all") q = q.eq("assigned_to", data.assignedTo);
    if (data.source) q = q.eq("source", data.source as any);
    if (data.q)
      q = q.or(
        `customer_name.ilike.%${data.q}%,subject.ilike.%${data.q}%,preview.ilike.%${data.q}%`,
      );
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid.parse(d.id) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await loadLeadOrg(supabase, userId, data.id);
    const [{ data: lead, error: e1 }, { data: activities, error: e2 }] = await Promise.all([
      supabase
        .from("leads")
        .select("*, assignee:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)")
        .eq("id", data.id)
        .maybeSingle(),
      supabase
        .from("lead_activities")
        .select("*, actor:profiles!lead_activities_actor_id_fkey(id, full_name, avatar_url)")
        .eq("lead_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (!lead) throw new Error("Lead not found");
    return { lead, activities: activities ?? [] };
  });

export const assignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = z
      .object({
        id: uuid,
        userId: uuid.nullable(),
        expectedAccountId: uuid,
        expectedOrgId: uuid,
      })
      .strict()
      .safeParse(input);
    if (!parsed.success) throw new Error("Invalid lead assignment request.");
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const failure = "Could not assign this lead. Refresh and try again.";
    const uncertain =
      "Assignment outcome could not be confirmed. Review this lead before assigning again.";
    const { id: leadId, userId: assigneeId, expectedAccountId, expectedOrgId } = data;
    function assertActor() {
      if (context?.userId !== expectedAccountId)
        throw new Error("Account changed. Refresh before assigning this lead.");
    }
    assertActor();
    let dispatched = false;
    try {
      const caller = captureNativeRequestCaller(context, expectedAccountId);
      const request = getRequest();
      const assertCaller = await caller.verify(request);
      const { supabase, userId } = context;
      function ready() {
        assertActor();
        assertCaller();
      }
      const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      const identity = z.object({ id: uuid, organization_id: uuid }).strict();
      const acknowledgment = identity.extend({ assigned_to: uuid.nullable() });
      function exactRow(value: unknown, keys: string[]) {
        if (typeof value !== "object" || value === null || Array.isArray(value))
          throw new Error(failure);
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (
          Reflect.ownKeys(value).length !== keys.length ||
          keys.some((key) => !Object.hasOwn(descriptors, key) || !("value" in descriptors[key]))
        )
          throw new Error(failure);
        return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
      }
      async function check(name: "is_org_member" | "can_manage_org", actor: string) {
        try {
          ready();
          const query = supabase
            .rpc(name, { _user_id: actor, _org_id: expectedOrgId })
            .abortSignal(request.signal)
            .retry(false);
          ready();
          const result = await query;
          ready();
          if (result.error !== null || result.data !== true) throw new Error(failure);
        } catch {
          throw new Error(failure);
        }
      }
      ready();
      const primaryQuery = supabase
        .from("leads")
        .select("id,organization_id")
        .eq("id", leadId)
        .eq("organization_id", expectedOrgId)
        .abortSignal(request.signal)
        .retry(false)
        .maybeSingle();
      ready();
      const primary = await primaryQuery;
      ready();
      const lead = identity.safeParse(exactRow(primary.data, ["id", "organization_id"]));
      if (
        primary.error !== null ||
        !lead.success ||
        !sameId(lead.data.id, leadId) ||
        !sameId(lead.data.organization_id, expectedOrgId)
      )
        throw new Error(failure);
      await check("is_org_member", userId);
      ready();
      const result = await withRouteAudit({
        actorId: userId,
        label: "leads.assignLead",
        role: "org_manager",
        targetSummary: { org_id: expectedOrgId, lead_id: leadId, assignee: assigneeId },
        check: () => check("can_manage_org", userId),
        run: async () => {
          try {
            ready();
            if (assigneeId !== null) await check("is_org_member", assigneeId);
            ready();
            const update = supabase
              .from("leads")
              .update({ assigned_to: assigneeId })
              .eq("id", leadId)
              .eq("organization_id", expectedOrgId)
              .select("id,organization_id,assigned_to")
              .abortSignal(request.signal)
              .retry(false)
              .maybeSingle();
            ready();
            dispatched = true;
            const updated = await update;
            ready();
            const receipt = acknowledgment.safeParse(
              exactRow(updated.data, ["id", "organization_id", "assigned_to"]),
            );
            if (
              updated.error !== null ||
              !receipt.success ||
              !sameId(receipt.data.id, leadId) ||
              !sameId(receipt.data.organization_id, expectedOrgId) ||
              (assigneeId === null
                ? receipt.data.assigned_to !== null
                : receipt.data.assigned_to === null ||
                  !sameId(receipt.data.assigned_to, assigneeId))
            )
              throw new Error(uncertain);
            return { ok: true as const, assignment: receipt.data };
          } catch {
            throw new Error(dispatched ? uncertain : failure);
          }
        },
      });
      ready();
      return result;
    } catch {
      throw new Error(dispatched ? uncertain : failure);
    }
  });

// This caller preflight/receipt is not atomic membership or revocation fencing.
// Native org helpers, RLS and the existing activity/audit mechanisms remain in force.

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "new" | "in_progress" | "won" | "lost" }) => ({
    id: uuid.parse(d.id),
    status: z.enum(["new", "in_progress", "won", "lost"]).parse(d.status),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const orgId = await loadLeadOrg(supabase, userId, data.id);
    return withRouteAudit({
      actorId: userId,
      label: "leads.updateLeadStatus",
      role: "org_manager",
      targetSummary: { org_id: orgId, lead_id: data.id, status: data.status },
      run: async () => {
        const { error } = await supabase
          .from("leads")
          .update({ status: data.status })
          .eq("id", data.id);
        if (error) throw new Error(error.message);
        return { ok: true };
      },
    });
  });

export const addLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; body: string }) => ({
    id: uuid.parse(d.id),
    body: z.string().trim().min(1).max(2000).parse(d.body),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await loadLeadOrg(supabase, userId, data.id);
    const { error } = await supabase.from("lead_activities").insert({
      lead_id: data.id,
      actor_id: userId,
      kind: "note",
      body: data.body,
    });
    if (error) throw new Error(error.message);
    await supabase
      .from("leads")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true };
  });

export const getOrgPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; sinceDays?: number }) => ({
    orgId: uuid.parse(d.orgId),
    sinceDays: Math.min(Math.max(d.sinceDays ?? 30, 1), 365),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    return withRouteAudit({
      actorId: userId,
      label: "leads.getOrgPerformance",
      role: "org_manager",
      targetSummary: { org_id: data.orgId, since_days: data.sinceDays },
      check: () => assertOrgMember(supabase, userId, data.orgId),
      run: async () => {
        const since = new Date(Date.now() - data.sinceDays * 86400000).toISOString();

        const [{ data: members, error: e1 }, { data: leads, error: e2 }] = await Promise.all([
          supabase
            .from("organization_members")
            .select("user_id, role")
            .eq("organization_id", data.orgId),
          supabase
            .from("leads")
            .select("id, status, assigned_to, created_at")
            .eq("organization_id", data.orgId)
            .gte("created_at", since),
        ]);
        if (e1) throw new Error(e1.message);
        if (e2) throw new Error(e2.message);

        const memberIds = (members ?? []).map((m: any) => m.user_id);
        let profilesById = new Map<string, any>();
        if (memberIds.length) {
          const { data: profs, error: pErr } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", memberIds);
          if (pErr) throw new Error(pErr.message);
          profilesById = new Map((profs ?? []).map((p: any) => [p.id, p]));
        }

        const rows = (members ?? []).map((m: any) => {
          const mine = (leads ?? []).filter((l) => l.assigned_to === m.user_id);
          const won = mine.filter((l) => l.status === "won").length;
          const lost = mine.filter((l) => l.status === "lost").length;
          const inProgress = mine.filter((l) => l.status === "in_progress").length;
          const nw = mine.filter((l) => l.status === "new").length;
          const closed = won + lost;
          return {
            userId: m.user_id,
            role: m.role,
            profile: profilesById.get(m.user_id) ?? null,
            total: mine.length,
            new: nw,
            in_progress: inProgress,
            won,
            lost,
            win_rate: closed === 0 ? null : Math.round((won / closed) * 100),
          };
        });

        const unassigned = (leads ?? []).filter((l) => !l.assigned_to).length;
        return { members: rows, unassigned, since };
      },
    });
  });
