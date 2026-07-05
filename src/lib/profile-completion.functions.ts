// Server functions backing the /complete-profile route and the post-OAuth
// gate in use-auth. Enforces the same phone + address rules the signup form
// enforces client-side so a bypassed / half-completed OAuth signup can't
// leave the profile in an incomplete state.
//
// - checkProfileCompletion: reads the caller's profile and returns missing[].
// - submitProfileCompletion: validates the submitted patch (phone + address),
//   writes it, then re-reads and returns the resulting completeness.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getProfileMissingFields,
  isBusinessLike,
  type ProfileForCheck,
  type MissingField,
} from "./profile-validation";
import { validatePhone } from "@/data/country-codes";

const PROFILE_COLUMNS =
  "phone_e164, street_address, postal_code, business_address, business_postal_code, signup_intent, seller_type";

async function readProfile(
  supabase: any,
  userId: string,
): Promise<ProfileForCheck | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProfileForCheck | null) ?? null;
}

export const checkProfileCompletion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await readProfile(context.supabase, context.userId);
    if (!profile) {
      return {
        complete: false,
        missing: [
          {
            field: "profile",
            label: "Profile",
            message: "Profile record not found yet.",
          },
        ] as MissingField[],
        businessLike: false,
      };
    }
    const missing = getProfileMissingFields(profile);
    return {
      complete: missing.length === 0,
      missing,
      businessLike: isBusinessLike(profile),
    };
  });

const SubmitInput = z
  .object({
    phone_iso: z.string().trim().length(2).optional(),
    phone_national: z.string().trim().max(30).optional(),
    street_address: z.string().trim().max(200).optional(),
    postal_code: z.string().trim().max(20).optional(),
    business_address: z.string().trim().max(300).optional(),
    business_postal_code: z.string().trim().max(20).optional(),
  })
  .strict();

export type SubmitProfileCompletionResult =
  | { ok: true; complete: true; missing: [] }
  | { ok: false; complete: false; missing: MissingField[] };

export const submitProfileCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = SubmitInput.safeParse(input);
    if (!parsed.success) {
      throw new Error(
        `invalid_submit: ${parsed.error.issues.map((i) => i.path.join(".")).join(",")}`,
      );
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const current = await readProfile(supabase, userId);
    const businessLike = current ? isBusinessLike(current) : false;

    const patch: Record<string, unknown> = {};

    // Phone → E.164, only apply if the submitted pair is valid.
    if (data.phone_iso && data.phone_national) {
      const v = validatePhone(data.phone_iso, data.phone_national);
      if (v.valid && v.e164) patch.phone_e164 = v.e164;
    }

    if (businessLike) {
      if (data.business_address?.trim()) patch.business_address = data.business_address.trim();
      const bpc = data.business_postal_code?.trim();
      if (bpc) patch.business_postal_code = bpc;
    } else {
      if (data.street_address?.trim()) patch.street_address = data.street_address.trim();
      if (data.postal_code?.trim()) patch.postal_code = data.postal_code.trim();
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await (supabase.from("profiles") as any)
        .update(patch)
        .eq("id", userId);
      if (error) throw new Error(error.message);
    }

    const after = await readProfile(supabase, userId);
    const missing = after ? getProfileMissingFields(after) : [];
    if (missing.length === 0) {
      return { ok: true as const, complete: true as const, missing: [] as [] };
    }
    return { ok: false as const, complete: false as const, missing };
  });
