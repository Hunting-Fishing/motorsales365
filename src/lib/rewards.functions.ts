import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireDomainRole, requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";

export type MemberReward = {
  id: string;
  user_id: string;
  tier_id: string | null;
  kind: "boost_credit" | "featured_badge" | "spotlight" | "custom";
  amount: number;
  period: string | null;
  status: "granted" | "claimed" | "expired" | "revoked";
  expires_at: string | null;
  note: string | null;
  created_at: string;
  claimed_at: string | null;
};

export const listMyRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rewards } = await context.supabase
      .from("member_rewards")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    const { data: balance } = await context.supabase.rpc("get_boost_credit_balance", {
      _user_id: context.userId,
    } as never);
    return {
      rewards: (rewards ?? []) as MemberReward[],
      boostCreditBalance: (balance as unknown as number) ?? 0,
    };
  });

export const claimReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Most rewards auto-claim on grant; this is for badges/spotlights.
    const { data: row, error } = await context.supabase
      .from("member_rewards")
      .update({ status: "claimed", claimed_at: new Date().toISOString() } as never)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "granted")
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as any).id as string };
  });

export const adminGrantReward = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("rewards.grant")])
  .inputValidator(
    (input: {
      userId: string;
      kind: "boost_credit" | "featured_badge" | "spotlight" | "custom";
      amount: number;
      tierId?: string | null;
      period?: string | null;
      note: string;
      expiresAt?: string | null;
    }) =>
      z
        .object({
          userId: z.string().uuid(),
          kind: z.enum(["boost_credit", "featured_badge", "spotlight", "custom"]),
          amount: z.number().int().min(1).max(1000),
          tierId: z.string().nullable().optional(),
          period: z.string().max(20).nullable().optional(),
          note: z.string().min(5).max(500),
          expiresAt: z.string().nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("grant_member_reward", {
      _user_id: data.userId,
      _kind: data.kind,
      _amount: data.amount,
      _tier_id: data.tierId ?? null,
      _period: data.period ?? null,
      _note: data.note,
      _expires_at: data.expiresAt ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export const adminListRewards = createServerFn({ method: "GET" })
  .middleware([requireAdminRoleAudited("rewards.list")])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("member_rewards")
      .select("*, profiles:user_id(full_name, display_name, member_number)")
      .order("created_at", { ascending: false })
      .limit(200);
    return { rewards: (data ?? []) as any[] };
  });
