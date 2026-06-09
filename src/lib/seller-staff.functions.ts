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
      .select(
        "user_id, role, joined_at, profiles:profiles!organization_members_user_id_fkey(id, full_name, login_username, is_staff_account)",
      )
      .eq("organization_id", data.orgId)
      .order("joined_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
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
