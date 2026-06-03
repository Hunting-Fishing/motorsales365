import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Reads the signed-in user's preferred display currency from their profile.
 * Returns null when the user hasn't picked one yet.
 */
export const getMyDisplayCurrency = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("display_currency")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { code: data?.display_currency ?? null };
  });

/**
 * Writes the signed-in user's preferred display currency.
 * RLS on profiles already restricts writes to the row owner.
 */
export const setMyDisplayCurrency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().trim().min(2).max(8) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ display_currency: data.code })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
