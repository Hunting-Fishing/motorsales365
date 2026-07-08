import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { createHash } from "crypto";
import { validatePhone } from "@/data/country-codes";
import { BUSINESS_KIND_VALUES } from "@/data/business-kinds";
import { STAFF_EMAIL_DOMAIN, isStaffEmail } from "@/lib/staff-domain";

// Non-sensitive audit for failed signups. We record ONLY:
//   - reason category
//   - missing / invalid field names (no values)
//   - chosen intent + phone country iso (not the phone number)
//   - HTTP status
//   - salted SHA-256 hash of the caller IP for abuse-pattern grouping
//   - truncated user agent
// No emails, passwords, phone numbers, names, or addresses are stored.
async function logSignupFailure(
  sb: SupabaseClient<Database>,
  request: Request,
  args: {
    reason: string;
    missing_fields: string[];
    status_code: number;
    intent?: string | null;
    phone_iso?: string | null;
    error_code?: string | null;
    error_message?: string | null;
  },
) {
  try {
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const salt = process.env.SIGNUP_AUDIT_SALT ?? process.env.SUPABASE_URL ?? "";
    const ip_hash = ip ? createHash("sha256").update(`${salt}:${ip}`).digest("hex") : null;
    const ua = (request.headers.get("user-agent") ?? "").slice(0, 200);
    await (sb.from("signup_failure_events") as any).insert({
      reason: args.reason,
      missing_fields: args.missing_fields,
      status_code: args.status_code,
      intent: args.intent ?? null,
      phone_iso: args.phone_iso ?? null,
      ip_hash,
      user_agent: ua || null,
      error_code: args.error_code ? String(args.error_code).slice(0, 100) : null,
      error_message: args.error_message ? String(args.error_message).slice(0, 500) : null,
    });
  } catch {
    // never let audit failures block the response
  }
}




// Server-side signup validator + creator. The old client path called
// `supabase.auth.signUp` directly, so anyone bypassing the UI could create an
// account with no phone/address. This route is the single authority for what
// a valid signup looks like — the client posts here, the route validates
// against the same country phone rules and address requirements as the UI,
// then creates the auth user with the publishable key (so Supabase sends the
// standard confirmation email) and upserts the validated profile fields.

const IntentEnum = z.enum(["buyer", "business", "service_provider"]);

const Body = z
  .object({
    intent: IntentEnum,
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72),
    first_name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(80),
    phone_iso: z.string().trim().min(2).max(2),
    phone_national: z.string().trim().min(1).max(30),
    signup_region: z.string().trim().min(1).max(120),
    // Province/city optional when signup_region === "All Philippines" (nationwide).
    signup_province: z.string().trim().max(120).optional().default(""),
    signup_city: z.string().trim().max(120).optional().default(""),

    // Personal address (required unless business-like)
    street_address: z.string().trim().max(200).optional().default(""),
    postal_code: z.string().trim().max(20).optional().default(""),
    // Business fields (required when intent is business/service_provider)
    business_name: z.string().trim().max(160).optional().default(""),
    business_kind: z.enum(BUSINESS_KIND_VALUES).optional(),
    business_address: z.string().trim().max(300).optional().default(""),
    business_postal_code: z.string().trim().max(20).optional().default(""),
    referral_code: z.string().trim().max(80).optional().default(""),
    signup_source: z.enum(["qr", "link", "direct"]).optional(),
    redirect: z.string().trim().max(500).optional().default(""),
    origin: z.string().trim().url().max(500),
    agreed: z.literal(true),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.signup_region.trim() !== "All Philippines") {
      if (!val.signup_province || val.signup_province.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["signup_province"],
          message: "Province is required unless region is All Philippines",
        });
      }
      if (!val.signup_city || val.signup_city.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["signup_city"],
          message: "City is required unless region is All Philippines",
        });
      }
    }
  });


const POSTAL_RE = /^[A-Za-z0-9][A-Za-z0-9 \-]{2,10}$/;
const ADDRESS_MIN = 5;
function looksLikeAddress(s: string): boolean {
  return s.trim().length >= ADDRESS_MIN && /[A-Za-z]/.test(s) && /\d/.test(s);
}

type ErrorList = { field: string; message: string }[];

function admin() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function pub() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/public/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sbAdmin = admin();
        try {
          const json = await request.json().catch(() => null);
          const parsed = Body.safeParse(json);
          if (!parsed.success) {
            const errors: ErrorList = parsed.error.issues.map((i) => ({
              field: String(i.path[0] ?? ""),
              message: i.message,
            }));
            await logSignupFailure(sbAdmin, request, {
              reason: "schema_invalid",
              missing_fields: Array.from(new Set(errors.map((e) => e.field).filter(Boolean))),
              status_code: 422,
              intent: (json as any)?.intent ?? null,
              phone_iso: (json as any)?.phone_iso ?? null,
              error_code: "zod_schema_invalid",
              error_message: errors.map((e) => `${e.field}: ${e.message}`).join("; "),
            });
            return Response.json({ ok: false, errors }, { status: 422 });
          }
          const input = parsed.data;
          const errors: ErrorList = [];

          if (isStaffEmail(input.email)) {
            await logSignupFailure(sbAdmin, request, {
              reason: "staff_domain_blocked",
              missing_fields: [],
              status_code: 403,
              intent: input.intent,
              phone_iso: input.phone_iso,
            });
            return Response.json(
              {
                ok: false,
                errors: [
                  {
                    field: "email",
                    message: `${STAFF_EMAIL_DOMAIN} is reserved for 365 employees.`,
                  },
                ],
              },
              { status: 403 },
            );
          }

          // Country-aware phone validation (same rules as the UI).
          const phone = validatePhone(input.phone_iso, input.phone_national);
          if (!phone.valid || !phone.e164) {
            errors.push({ field: "phone", message: phone.message ?? "Invalid mobile number." });
          }

          const isBusinessLike = input.intent === "business" || input.intent === "service_provider";

          if (isBusinessLike) {
            if (!input.business_name) errors.push({ field: "business_name", message: "Business name required." });
            if (!input.business_kind) errors.push({ field: "business_kind", message: "Pick a business category." });
            if (!input.business_address) errors.push({ field: "business_address", message: "Business street address required." });
            else if (!looksLikeAddress(input.business_address))
              errors.push({ field: "business_address", message: "Include a building/unit number and street name." });
            if (!input.business_postal_code) errors.push({ field: "business_postal_code", message: "Business postal code required." });
            else if (!POSTAL_RE.test(input.business_postal_code))
              errors.push({ field: "business_postal_code", message: "Invalid postal / ZIP code." });
          } else {
            if (!input.street_address) errors.push({ field: "street_address", message: "Street address required." });
            else if (!looksLikeAddress(input.street_address))
              errors.push({ field: "street_address", message: "Include a house/unit number and street name." });
            if (!input.postal_code) errors.push({ field: "postal_code", message: "Postal / ZIP code required." });
            else if (!POSTAL_RE.test(input.postal_code))
              errors.push({ field: "postal_code", message: "Invalid postal / ZIP code." });
          }

          if (errors.length > 0) {
            await logSignupFailure(sbAdmin, request, {
              reason: "field_validation_failed",
              missing_fields: Array.from(new Set(errors.map((e) => e.field).filter(Boolean))),
              status_code: 422,
              intent: input.intent,
              phone_iso: input.phone_iso,
            });
            return Response.json({ ok: false, errors }, { status: 422 });
          }

          const emailLower = input.email.toLowerCase();

          // Check for existing account up front so the response is deterministic.
          const { data: existing } = await (sbAdmin as any)
            .schema("auth")
            .from("users")
            .select("id")
            .eq("email", emailLower)
            .maybeSingle();
          if (existing) {
            await logSignupFailure(sbAdmin, request, {
              reason: "email_already_registered",
              missing_fields: ["email"],
              status_code: 409,
              intent: input.intent,
              phone_iso: input.phone_iso,
            });
            return Response.json(
              { ok: false, errors: [{ field: "email", message: "That email is already registered." }] },
              { status: 409 },
            );
          }

          const fullName = `${input.first_name} ${input.last_name}`.trim();
          const userMeta: Record<string, unknown> = {
            full_name: fullName,
            first_name: input.first_name,
            last_name: input.last_name,
            phone: phone.e164,
            phone_iso: input.phone_iso,
            phone_national: input.phone_national,
            signup_intent: input.intent,
            signup_region: input.signup_region,
            signup_province: input.signup_province,
            signup_city: input.signup_city,
            street_address: input.street_address || undefined,
            postal_code: isBusinessLike ? input.business_postal_code : input.postal_code,
            business_name: isBusinessLike ? input.business_name : undefined,
            business_kind: isBusinessLike ? input.business_kind : undefined,
            business_address: isBusinessLike ? input.business_address : undefined,
            referral_code: input.referral_code || undefined,
            signup_source:
              input.signup_source ?? (input.referral_code ? "link" : "direct"),
          };

          const originUrl = (() => {
            try {
              return new URL(input.origin).origin;
            } catch {
              return "";
            }
          })();
          if (!originUrl) {
            await logSignupFailure(sbAdmin, request, {
              reason: "invalid_origin",
              missing_fields: ["origin"],
              status_code: 400,
              intent: input.intent,
              phone_iso: input.phone_iso,
            });
            return Response.json(
              { ok: false, errors: [{ field: "origin", message: "Invalid origin." }] },
              { status: 400 },
            );
          }
          const redirectQuery = input.redirect
            ? `&redirect=${encodeURIComponent(input.redirect)}`
            : "";
          const emailRedirectTo = `${originUrl}/verify-email?intent=${input.intent}${redirectQuery}`;

          const sbPub = pub();
          const { data, error } = await sbPub.auth.signUp({
            email: emailLower,
            password: input.password,
            options: { data: userMeta, emailRedirectTo },
          });
          if (error) {
            const msg = error.message || "";
            if (/already|registered|exists|in use/i.test(msg)) {
              await logSignupFailure(sbAdmin, request, {
                reason: "email_already_registered",
                missing_fields: ["email"],
                status_code: 409,
                intent: input.intent,
                phone_iso: input.phone_iso,
              });
              return Response.json(
                { ok: false, errors: [{ field: "email", message: "That email is already registered." }] },
                { status: 409 },
              );
            }
            await logSignupFailure(sbAdmin, request, {
              reason: "auth_signup_error",
              missing_fields: [],
              status_code: 400,
              intent: input.intent,
              phone_iso: input.phone_iso,
            });
            return Response.json({ ok: false, errors: [{ field: "email", message: msg }] }, { status: 400 });
          }
          const identities = (data.user as { identities?: unknown[] } | null)?.identities;
          if (data.user && Array.isArray(identities) && identities.length === 0) {
            await logSignupFailure(sbAdmin, request, {
              reason: "email_already_registered",
              missing_fields: ["email"],
              status_code: 409,
              intent: input.intent,
              phone_iso: input.phone_iso,
            });
            return Response.json(
              { ok: false, errors: [{ field: "email", message: "That email is already registered." }] },
              { status: 409 },
            );
          }

          if (data.user?.id) {
            const profilePatch: Record<string, unknown> = {
              first_name: input.first_name,
              last_name: input.last_name,
              phone_e164: phone.e164,
              signup_intent: input.intent,
              signup_region: input.signup_region,
              signup_province: input.signup_province,
              signup_city: input.signup_city,
              street_address: input.street_address || null,
              postal_code: isBusinessLike ? input.business_postal_code : input.postal_code,
            };
            if (isBusinessLike) {
              profilePatch.business_name = input.business_name;
              profilePatch.business_kind = input.business_kind;
              profilePatch.business_address = input.business_address;
              profilePatch.business_postal_code = input.business_postal_code;
              profilePatch.business_region = input.signup_region;
              profilePatch.business_province = input.signup_province;
              profilePatch.business_city = input.signup_city;
            }
            await (sbAdmin.from("profiles") as any).update(profilePatch).eq("id", data.user.id);
          }

          return Response.json({
            ok: true,
            needs_verify: !data.session,
            user_id: data.user?.id ?? null,
          });
        } catch (e: any) {
          await logSignupFailure(sbAdmin, request, {
            reason: "unhandled_exception",
            missing_fields: [],
            status_code: 500,
          });
          return Response.json(
            { ok: false, errors: [{ field: "", message: e?.message ?? "Unhandled" }] },
            { status: 500 },
          );
        }
      },
    },
  },
});
