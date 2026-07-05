import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { validatePhone } from "@/data/country-codes";
import { BUSINESS_KIND_VALUES } from "@/data/business-kinds";
import { STAFF_EMAIL_DOMAIN, isStaffEmail } from "@/lib/staff-domain";

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
    signup_province: z.string().trim().min(1).max(120),
    signup_city: z.string().trim().min(1).max(120),
    // Personal address (required unless business-like)
    street_address: z.string().trim().max(200).optional().default(""),
    postal_code: z.string().trim().max(20).optional().default(""),
    // Business fields (required when intent is business/service_provider)
    business_name: z.string().trim().max(160).optional().default(""),
    business_kind: z.enum(BUSINESS_KIND_VALUES).optional(),
    business_address: z.string().trim().max(300).optional().default(""),
    business_postal_code: z.string().trim().max(20).optional().default(""),
    referral_code: z.string().trim().max(80).optional().default(""),
    redirect: z.string().trim().max(500).optional().default(""),
    origin: z.string().trim().url().max(500),
    agreed: z.literal(true),
  })
  .strict();

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
        try {
          const json = await request.json().catch(() => null);
          const parsed = Body.safeParse(json);
          if (!parsed.success) {
            const errors: ErrorList = parsed.error.issues.map((i) => ({
              field: String(i.path[0] ?? ""),
              message: i.message,
            }));
            return Response.json({ ok: false, errors }, { status: 422 });
          }
          const input = parsed.data;
          const errors: ErrorList = [];

          if (isStaffEmail(input.email)) {
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
            return Response.json({ ok: false, errors }, { status: 422 });
          }

          const emailLower = input.email.toLowerCase();
          const sbAdmin = admin();

          // Check for existing account up front so the response is deterministic.
          const { data: existing } = await (sbAdmin as any)
            .schema("auth")
            .from("users")
            .select("id")
            .eq("email", emailLower)
            .maybeSingle();
          if (existing) {
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
          };

          const originUrl = (() => {
            try {
              return new URL(input.origin).origin;
            } catch {
              return "";
            }
          })();
          if (!originUrl) {
            return Response.json(
              { ok: false, errors: [{ field: "origin", message: "Invalid origin." }] },
              { status: 400 },
            );
          }
          const redirectQuery = input.redirect
            ? `&redirect=${encodeURIComponent(input.redirect)}`
            : "";
          const emailRedirectTo = `${originUrl}/verify-email?intent=${input.intent}${redirectQuery}`;

          // Use the publishable-key client so Supabase sends the standard
          // confirmation email using the configured template. Admin
          // createUser + generateLink would skip that flow.
          const sbPub = pub();
          const { data, error } = await sbPub.auth.signUp({
            email: emailLower,
            password: input.password,
            options: { data: userMeta, emailRedirectTo },
          });
          if (error) {
            const msg = error.message || "";
            if (/already|registered|exists|in use/i.test(msg)) {
              return Response.json(
                { ok: false, errors: [{ field: "email", message: "That email is already registered." }] },
                { status: 409 },
              );
            }
            return Response.json({ ok: false, errors: [{ field: "email", message: msg }] }, { status: 400 });
          }
          // Supabase returns identities=[] when the email exists.
          const identities = (data.user as { identities?: unknown[] } | null)?.identities;
          if (data.user && Array.isArray(identities) && identities.length === 0) {
            return Response.json(
              { ok: false, errors: [{ field: "email", message: "That email is already registered." }] },
              { status: 409 },
            );
          }

          // Belt-and-suspenders: upsert validated fields onto the freshly
          // created profile row. `handle_new_user` reads user_metadata, but
          // we don't want silent gaps if the trigger definition drifts.
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
          return Response.json(
            { ok: false, errors: [{ field: "", message: e?.message ?? "Unhandled" }] },
            { status: 500 },
          );
        }
      },
    },
  },
});
