// Server function that persists a client-stashed signup payload into the
// caller's own `profiles` row. Used by the post-auth applier so that fields
// captured during the signup form (phone, address, business_*) end up on the
// profile even when signup completed via a path that bypasses the standard
// /api/public/auth/signup route — most notably Google OAuth.
//
// Only whitelisted, non-sensitive profile columns are writable, and the
// server acts through requireSupabaseAuth so RLS scopes the update to the
// caller's own row.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BUSINESS_KIND_VALUES } from "@/data/business-kinds";
import { validatePhone } from "@/data/country-codes";

const IntentEnum = z.enum(["buyer", "business", "service_provider"]);

const Pending = z
  .object({
    intent: IntentEnum.optional(),
    first_name: z.string().trim().max(80).optional(),
    last_name: z.string().trim().max(80).optional(),
    email: z.string().trim().email().max(255).optional(),
    personal_email: z.string().trim().email().max(255).optional(),
    phone_iso: z.string().trim().length(2).optional(),
    phone_national: z.string().trim().max(30).optional(),
    region: z.string().trim().max(120).optional(),
    province: z.string().trim().max(120).optional(),
    city: z.string().trim().max(120).optional(),
    barangay: z.string().trim().max(120).optional(),
    street_address: z.string().trim().max(200).optional(),
    postal_code: z.string().trim().max(20).optional(),
    business_name: z.string().trim().max(160).optional(),
    business_kind: z.enum(BUSINESS_KIND_VALUES).optional(),
    business_address: z.string().trim().max(300).optional(),
    business_postal_code: z.string().trim().max(20).optional(),
    is_business: z.boolean().optional(),
    // Attribution passthrough — accepted here so OAuth signups (which
    // detour through this pending applier) don't lose referral / visitor
    // context between the stash and the profile write.
    referral_code: z.string().trim().max(80).optional(),
    signup_source: z.enum(["qr", "link", "direct"]).optional(),
    visitor_id: z.string().trim().uuid().optional(),
  })
  .strict();

export type PendingSignupPayload = z.infer<typeof Pending>;

export const applyPendingSignupProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = Pending.safeParse(input);
    if (!parsed.success) {
      throw new Error(
        `invalid_pending: ${parsed.error.issues.map((i) => i.path.join(".")).join(",")}`,
      );
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Derive E.164 phone if both parts present + valid; otherwise skip so we
    // don't overwrite a good stored value with a bad new one.
    const phoneE164 =
      data.phone_iso && data.phone_national
        ? validatePhone(data.phone_iso, data.phone_national).e164 ?? null
        : null;

    const isBusinessLike =
      data.is_business === true ||
      data.intent === "business" ||
      data.intent === "service_provider";

    // Build patch of only the columns we actually want to touch. Skipping
    // undefined/empty keeps prior-set values intact.
    const patch: Record<string, unknown> = {};
    const set = (col: string, val: unknown) => {
      if (val === undefined || val === null) return;
      if (typeof val === "string" && val.trim() === "") return;
      patch[col] = typeof val === "string" ? val.trim() : val;
    };

    set("first_name", data.first_name);
    set("last_name", data.last_name);
    set("personal_email", data.personal_email ?? data.email);
    if (phoneE164) set("phone_e164", phoneE164);
    set("signup_intent", data.intent);
    set("signup_region", data.region);
    set("signup_province", data.province);
    set("signup_city", data.city);
    set("barangay", data.barangay);
    set("street_address", data.street_address);
    set(
      "postal_code",
      isBusinessLike ? data.business_postal_code ?? data.postal_code : data.postal_code,
    );
    set("referral_code", data.referral_code);
    set(
      "signup_source",
      data.signup_source ?? (data.referral_code ? "link" : undefined),
    );

    if (isBusinessLike) {
      set("business_name", data.business_name);
      set("business_kind", data.business_kind);
      set("business_address", data.business_address);
      set("business_postal_code", data.business_postal_code);
      set("business_region", data.region);
      set("business_province", data.province);
      set("business_city", data.city);
    }

    let updated = 0;
    if (Object.keys(patch).length > 0) {
      const { error } = await (supabase.from("profiles") as any).update(patch).eq("id", userId);
      if (error) throw new Error(error.message);
      updated = Object.keys(patch).length;
    }

    // Back-fill QR / referral attribution rows with the new user_id whenever
    // we have either a visitor id (QR scan touched the browser) or an
    // explicit referral code. Uses the caller's own RLS scope via the
    // SECURITY DEFINER RPC — safe to call from an authenticated context.
    let attribution_linked = false;
    let attribution_error: string | null = null;
    if (data.visitor_id || data.referral_code) {
      const { error: linkErr } = await (supabase as any).rpc(
        "link_signup_attribution",
        {
          _visitor_id: data.visitor_id ?? null,
          _user_id: userId,
          _referral_code: data.referral_code ?? null,
          _signup_source:
            data.signup_source ?? (data.referral_code ? "link" : null),
        },
      );
      if (linkErr) {
        // Soft-fail: attribution linkage failing must not block profile save.
        attribution_error = String(linkErr.message ?? "link_failed").slice(0, 300);
      } else {
        attribution_linked = true;
      }
    }

    return {
      ok: true as const,
      updated,
      attribution_linked,
      attribution_error,
    };
  });
