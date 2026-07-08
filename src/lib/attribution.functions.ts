// Server function that links a signed-in user to their pre-signup QR /
// referral attribution. Called from the client the first time we see an
// authenticated session in a tab so OAuth signups that lost their
// localStorage stash still get their qr_scans / qr_lead_captures /
// referral_visits rows back-filled.
//
// The visitor_id is an opaque UUID minted client-side on QR landing
// (mref_vid cookie / localStorage). We accept it as a plain string so we
// can pass through both UUID and legacy text visitor IDs; the RPC casts
// to uuid for the qr_scans / referral_visits tables and treats it as
// text for qr_lead_captures.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z
  .object({
    visitor_id: z.string().trim().uuid().optional(),
    referral_code: z.string().trim().max(80).optional(),
    signup_source: z.enum(["qr", "link", "direct"]).optional(),
  })
  .strict();

export const linkPostAuthAttribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = Input.safeParse(input ?? {});
    if (!parsed.success) throw new Error("invalid_attribution_input");
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.visitor_id && !data.referral_code) {
      return { ok: true as const, skipped: "nothing_to_link" as const };
    }
    const { data: result, error } = await (supabase as any).rpc("link_signup_attribution", {
      _visitor_id: data.visitor_id ?? null,
      _user_id: userId,
      _referral_code: data.referral_code ?? null,
      _signup_source: data.signup_source ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, result };
  });
