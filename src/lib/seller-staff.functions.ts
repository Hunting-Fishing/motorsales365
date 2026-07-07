import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

async function assertManager(supabase: any, userId: string, orgId: string) {
  const { data, error } = await supabase.rpc("can_manage_org", {
    _user_id: userId,
    _org_id: orgId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getMyOwnedOrg = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations(id, name, slug)")
      .eq("user_id", userId)
      .eq("role", "owner" as any)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as any)?.organizations ?? null;
  });

export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => ({ orgId: uuid.parse(d.orgId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.orgId);
    const { data: rows, error } = await supabase
      .from("organization_members")
      .select("user_id, role, joined_at")
      .eq("organization_id", data.orgId)
      .order("joined_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r: any) => r.user_id);
    let profilesById = new Map<string, { id: string; full_name: string | null; login_username: string | null; is_staff_account: boolean | null }>();
    if (ids.length) {
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, login_username, is_staff_account")
        .in("id", ids);
      if (pErr) throw new Error(pErr.message);
      profilesById = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }
    return (rows ?? []).map((r: any) => ({ ...r, profiles: profilesById.get(r.user_id) ?? null }));

  });

export const getSeatUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => ({ orgId: uuid.parse(d.orgId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.orgId);
    const [{ data: count }, { data: max }] = await Promise.all([
      supabase.rpc("org_seat_count", { _org_id: data.orgId }),
      supabase.rpc("org_max_seats", { _org_id: data.orgId }),
    ]);
    return { used: Number(count ?? 0), max: max == null ? null : Number(max) };
  });
