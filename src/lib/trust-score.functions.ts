import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireDomainRole } from "@/integrations/supabase/admin-middleware";

export type TrustScoreEvent = {
  id: string;
  user_id: string;
  delta: number;
  reason_code: string;
  reason_label: string;
  source_type: string;
  source_id: string | null;
  created_at: string;
};

export const getMyTrustScore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: score } = await supabase.rpc("get_trust_score", { _user_id: userId } as never);
    const { data: events } = await supabase
      .from("trust_score_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return {
      score: (score as unknown as number) ?? 500,
      events: (events ?? []) as TrustScoreEvent[],
    };
  });

export const getUserTrustScore = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("moderator", "trustScore.getUser")])
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: score } = await context.supabase.rpc("get_trust_score", {
      _user_id: data.userId,
    } as never);
    const { data: events } = await context.supabase
      .from("trust_score_events")
      .select("*")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return {
      score: (score as unknown as number) ?? 500,
      events: (events ?? []) as TrustScoreEvent[],
    };
  });

export const adjustTrustScore = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("trustScore.adjust")])
  .inputValidator((input: { userId: string; delta: number; reason: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        delta: z.number().int().min(-500).max(500),
        reason: z.string().min(10).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("trust_score_events").insert({
      user_id: data.userId,
      delta: data.delta,
      reason_code: "manual_admin_adjustment",
      reason_label: data.reason,
      source_type: "manual",
      actor_id: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
