import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// AUTHENTICATED: update alert preferences on a saved search owned by current user.
// "instant" is gated to Premium users (business owners on featured/premium tier OR active org members).
export const updateSavedSearchAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; frequency: "off" | "daily" | "instant" }) =>
    z.object({ id: z.string().uuid(), frequency: z.enum(["off", "daily", "instant"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    if (data.frequency === "instant") {
      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("owner_id", userId)
        .in("subscription_tier", ["featured", "premium"])
        .limit(1);
      if (!biz || biz.length === 0) {
        throw new Error(
          "Instant alerts require a Featured or Premium business plan. Upgrade to unlock real-time alerts.",
        );
      }
    }

    // RLS scopes saved_searches to auth.uid(); the server uses supabaseAdmin but we
    // explicitly filter by user_id to enforce ownership.
    const { error } = await supabaseAdmin
      .from("saved_searches")
      .update({ alert_frequency: data.frequency })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
