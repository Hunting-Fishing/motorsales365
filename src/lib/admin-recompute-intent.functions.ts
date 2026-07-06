import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPER_ADMIN_EMAIL = "jordilwbailey@gmail.com";

async function assertAdmin(context: { userId: string; claims?: Record<string, unknown> | null }) {
  const email = ((context.claims?.email as string | undefined) ?? "").toLowerCase();
  if (email === SUPER_ADMIN_EMAIL) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Not permitted");
}

type Intent = "buyer" | "business" | "service_provider";

/**
 * Derive signup_intent from a profile's authoritative signals.
 * Priority: explicit seller_type → ownership of a business → referral hint → default buyer.
 * Rules:
 *  - seller_type "repair_shop" → service_provider
 *  - seller_type "dealer" | "insurance" → business
 *  - owns any row in businesses → business
 *  - fallback: buyer
 */
function deriveIntent(args: {
  seller_type: string | null;
  ownsBusiness: boolean;
}): Intent {
  const st = (args.seller_type ?? "").toLowerCase();
  if (st === "repair_shop") return "service_provider";
  if (st === "dealer" || st === "insurance") return "business";
  if (args.ownsBusiness) return "business";
  return "buyer";
}

/**
 * Recompute signup_intent for one or many users based on current profile +
 * referral/business data. Only writes when the derived value differs from
 * the stored value. Returns a per-user report so admins can see what changed.
 */
export const recomputeUserIntents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userIds: z.array(z.string().uuid()).min(1).max(500),
        dryRun: z.boolean().optional().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles, error: pErr }, { data: businesses, error: bErr }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, seller_type, signup_intent")
          .in("id", data.userIds),
        supabaseAdmin
          .from("businesses")
          .select("owner_id")
          .in("owner_id", data.userIds),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (bErr) throw new Error(bErr.message);

    const ownerSet = new Set<string>(
      (businesses ?? []).map((r: any) => r.owner_id).filter(Boolean),
    );

    const results: Array<{
      user_id: string;
      previous: string | null;
      next: Intent;
      changed: boolean;
    }> = [];

    for (const p of profiles ?? []) {
      const prev = (p as any).signup_intent as string | null;
      const next = deriveIntent({
        seller_type: (p as any).seller_type,
        ownsBusiness: ownerSet.has((p as any).id),
      });
      const changed = prev !== next;
      if (changed) {
        const { error: uErr } = await supabaseAdmin
          .from("profiles")
          .update({ signup_intent: next })
          .eq("id", (p as any).id);
        if (uErr) throw new Error(uErr.message);
        try {
          await supabaseAdmin.from("admin_audit_log").insert({
            actor_id: context.userId,
            target_user_id: (p as any).id,
            action: "intent_recomputed",
            field: "signup_intent",
            old_value: prev ?? null,
            new_value: next,
            note: "Recomputed via /admin/users",
          } as any);
        } catch {
          // audit failure is non-fatal
        }
      }
      results.push({ user_id: (p as any).id, previous: prev, next, changed });
    }

    return {
      updated: results.filter((r) => r.changed).length,
      unchanged: results.filter((r) => !r.changed).length,
      results,
    };
  });
