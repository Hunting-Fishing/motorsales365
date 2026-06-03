import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withRouteAudit } from "@/integrations/supabase/route-audit.server";


const uuid = z.string().uuid();

async function assertOrgMember(supabase: any, userId: string, orgId: string) {
  const { data, error } = await supabase.rpc("is_org_member", {
    _user_id: userId,
    _org_id: orgId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

async function assertOrgManager(supabase: any, userId: string, orgId: string) {
  const { data, error } = await supabase.rpc("can_manage_org", {
    _user_id: userId,
    _org_id: orgId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden — owner or admin role required");
}

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; kind?: string }) => ({
    name: z.string().trim().min(2).max(120).parse(d.name),
    kind: d.kind,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const slug =
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) +
      "-" +
      Math.random().toString(36).slice(2, 6);
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        name: data.name,
        slug,
        kind: (data.kind as any) ?? "dealer",
        created_by: userId,
      } as any)
      .select("id, name, slug")
      .single();
    if (error) throw new Error(error.message);
    return org;
  });

export const inviteOrgMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { orgId: string; email: string; role: "admin" | "manager" | "member" | "viewer" }) => ({
      orgId: uuid.parse(d.orgId),
      email: z.string().email().toLowerCase().parse(d.email),
      role: z.enum(["admin", "manager", "member", "viewer"]).parse(d.role),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrgManager(supabase, userId, data.orgId);
    const token = crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 8);
    const { data: invite, error } = await supabase
      .from("organization_invites")
      .insert({
        organization_id: data.orgId,
        email: data.email,
        role: data.role as any,
        token,
        invited_by: userId,
        expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      } as any)
      .select("id, email, role, token")
      .single();
    if (error) throw new Error(error.message);

    try {
      const [{ data: org }, { data: inviter }] = await Promise.all([
        supabase.from("organizations").select("name").eq("id", data.orgId).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      ]);
      const origin = (
        process.env.SITE_URL ||
        process.env.VITE_SITE_URL ||
        "https://365motorsales.com"
      ).replace(/\/+$/, "");
      await supabase.rpc(
        "enqueue_email" as any,
        {
          queue_name: "transactional_emails",
          payload: {
            template: "team-invite",
            to: data.email,
            data: {
              org_name: (org as any)?.name ?? "a team",
              inviter_name: (inviter as any)?.full_name ?? "Your teammate",
              role: data.role,
              invite_url: `${origin}/invites/${token}`,
            },
          },
        } as any,
      );
    } catch {
      // swallow — surfaced via email_send_log in admin tooling
    }

    return invite;
  });

export const listOrgInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => ({ orgId: uuid.parse(d.orgId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrgMember(supabase, userId, data.orgId);
    const { data: rows, error } = await supabase
      .from("organization_invites")
      .select("id, email, role, token, expires_at, accepted_at, created_at")
      .eq("organization_id", data.orgId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; userId: string; role: string }) => ({
    orgId: uuid.parse(d.orgId),
    userId: uuid.parse(d.userId),
    role: z.enum(["owner", "admin", "manager", "member", "viewer"]).parse(d.role),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrgManager(supabase, userId, data.orgId);
    const { error } = await supabase
      .from("organization_members")
      .update({ role: data.role as any })
      .eq("organization_id", data.orgId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string; userId: string }) => ({
    orgId: uuid.parse(d.orgId),
    userId: uuid.parse(d.userId),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrgManager(supabase, userId, data.orgId);
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", data.orgId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
