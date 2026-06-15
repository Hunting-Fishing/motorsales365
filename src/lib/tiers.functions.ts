import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MemberTier = {
  id: string;
  name: string;
  min_score: number;
  min_tenure_days: number;
  color: string;
  rank: number;
  quarterly_boost_credits: number;
  annual_boost_credits: number;
  annual_badge_months: number;
};

export const listTiers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("member_tiers")
    .select("*")
    .order("rank", { ascending: true });
  return { tiers: (data ?? []) as MemberTier[] };
});

export const getMyTier = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: tierId } = await context.supabase.rpc("compute_user_tier", {
      _user_id: context.userId,
    } as never);
    const { data: score } = await context.supabase.rpc("get_trust_score", {
      _user_id: context.userId,
    } as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tiers } = await supabaseAdmin
      .from("member_tiers")
      .select("*")
      .order("rank", { ascending: true });
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("created_at")
      .eq("id", context.userId)
      .maybeSingle();

    const allTiers = (tiers ?? []) as MemberTier[];
    const currentId = (tierId as unknown as string) ?? "common";
    const current = allTiers.find((t) => t.id === currentId) ?? allTiers[0];
    const next = allTiers.find((t) => t.rank === (current?.rank ?? 1) + 1) ?? null;

    return {
      tierId: currentId,
      tier: current ?? null,
      next,
      score: (score as unknown as number) ?? 500,
      memberSince: (profile as any)?.created_at ?? null,
      allTiers,
    };
  });

export const getUserTier = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: tierId } = await context.supabase.rpc("compute_user_tier", {
      _user_id: data.userId,
    } as never);
    return { tierId: (tierId as unknown as string) ?? "common" };
  });
