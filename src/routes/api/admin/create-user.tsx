import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { logRouteAccess } from "@/integrations/supabase/route-audit.server";
import { BUSINESS_KIND_VALUES } from "@/data/business-kinds";


const RoleEnum = z.enum(["admin", "moderator", "support", "sales", "advertising"]);
const SellerTypeEnum = z.enum(["private", "dealer", "repair_shop", "insurance"]);

const Body = z.object({
  email: z.string().email().max(255),
  full_name: z.string().trim().min(1).max(120),
  first_name: z.string().trim().max(80).optional(),
  last_name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  personal_email: z.string().trim().email().max(255).optional().or(z.literal("")),
  password: z.string().min(8).max(72),
  account_type: z.enum(["staff", "business"]),
  roles: z.array(RoleEnum).default([]),
  // address
  street_address: z.string().trim().max(200).optional(),
  signup_city: z.string().trim().max(120).optional(),
  signup_province: z.string().trim().max(120).optional(),
  signup_region: z.string().trim().max(120).optional(),
  postal_code: z.string().trim().max(20).optional(),
  // business
  seller_type: SellerTypeEnum.optional(),
  business_name: z.string().trim().max(160).optional(),
  business_kind: z.enum(BUSINESS_KIND_VALUES).optional(),
  business_address: z.string().trim().max(300).optional(),
  business_city: z.string().trim().max(120).optional(),
  business_province: z.string().trim().max(120).optional(),
  business_region: z.string().trim().max(120).optional(),
  business_postal_code: z.string().trim().max(20).optional(),
  mark_verified: z.boolean().optional(),
  enforce_domain: z.string().trim().max(120).optional(),
});

function admin() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("09") && digits.length === 11) return "+63" + digits.slice(1);
  if (digits.startsWith("9") && digits.length === 10) return "+63" + digits;
  if (digits.startsWith("63") && digits.length === 12) return "+" + digits;
  return digits || null;
}

export const Route = createFileRoute("/api/admin/create-user")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const label = "admin.createUser";
        let actorId: string | null = null;
        const start = Date.now();
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
          if (!token) {
            await logRouteAccess({
              actorId: null,
              role: "admin",
              label,
              method: "POST",
              outcome: "denied",
              errorMessage: "No bearer token",
              request,
            });
            return new Response("Unauthorized", { status: 401 });
          }

          const sb = admin();
          const { data: userData, error: userErr } = await sb.auth.getUser(token);
          if (userErr || !userData.user) {
            await logRouteAccess({
              actorId: null,
              role: "admin",
              label,
              method: "POST",
              outcome: "denied",
              errorMessage: userErr?.message ?? "Invalid token",
              request,
            });
            return new Response("Unauthorized", { status: 401 });
          }
          actorId = userData.user.id;

          const { data: rolesData } = await sb
            .from("user_roles")
            .select("role")
            .eq("user_id", actorId);
          const isAdmin = (rolesData ?? []).some((r: any) => r.role === "admin");
          if (!isAdmin) {
            await logRouteAccess({
              actorId,
              role: "admin",
              label,
              method: "POST",
              outcome: "denied",
              errorMessage: "Not an admin",
              request,
            });
            return new Response("Forbidden", { status: 403 });
          }

          const json = await request.json();
          const parsed = Body.safeParse(json);
          if (!parsed.success) {
            await logRouteAccess({
              actorId,
              role: "admin",
              label,
              method: "POST",
              outcome: "error",
              errorMessage: "Invalid payload",
              durationMs: Date.now() - start,
              request,
            });
            return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
          }
          const input = parsed.data;

          if (
            input.enforce_domain &&
            !input.email.toLowerCase().endsWith(input.enforce_domain.toLowerCase())
          ) {
            return new Response(
              JSON.stringify({ error: `Email must end with ${input.enforce_domain}` }),
              { status: 400 },
            );
          }

          const { data: created, error: createErr } = await sb.auth.admin.createUser({
            email: input.email,
            password: input.password,
            email_confirm: true,
            user_metadata: {
              full_name: input.full_name,
              first_name: input.first_name,
              last_name: input.last_name,
            },
          });
          if (createErr || !created.user) {
            await logRouteAccess({
              actorId,
              role: "admin",
              label,
              method: "POST",
              outcome: "error",
              errorMessage: createErr?.message ?? "Failed to create user",
              durationMs: Date.now() - start,
              request,
              targetSummary: { email: input.email, account_type: input.account_type },
            });
            return new Response(
              JSON.stringify({ error: createErr?.message ?? "Failed to create user" }),
              { status: 400 },
            );
          }
          const newUserId = created.user.id;

          if (input.account_type === "staff" && input.roles.length > 0) {
            const rows = input.roles.map((role) => ({ user_id: newUserId, role }));
            const { error: roleErr } = await sb.from("user_roles").insert(rows as any);
            if (roleErr) {
              await logRouteAccess({
                actorId,
                role: "admin",
                label,
                method: "POST",
                outcome: "error",
                errorMessage: `Role assignment failed: ${roleErr.message}`,
                durationMs: Date.now() - start,
                request,
                targetSummary: { email: input.email, new_user_id: newUserId },
              });
              return new Response(
                JSON.stringify({
                  error: `User created but role assignment failed: ${roleErr.message}`,
                  userId: newUserId,
                }),
                { status: 207 },
              );
            }
          }

          // Build a full profile update from every provided field.
          const profilePatch: Record<string, any> = { full_name: input.full_name };
          const copyIf = (k: keyof typeof input, dst?: string) => {
            const v = input[k];
            if (v !== undefined && v !== "") profilePatch[(dst ?? (k as string))] = v;
          };
          copyIf("first_name");
          copyIf("last_name");
          if (input.personal_email && input.personal_email.trim() !== "") {
            profilePatch.personal_email = input.personal_email.trim().toLowerCase();
          }
          if (input.phone) {
            profilePatch.phone = input.phone;
            profilePatch.phone_e164 = normalizeE164(input.phone);
          }
          copyIf("street_address");
          copyIf("signup_city");
          copyIf("signup_province");
          copyIf("signup_region");
          copyIf("postal_code");

          if (input.account_type === "business") {
            profilePatch.seller_type = input.seller_type ?? "private";
            copyIf("business_name");
            copyIf("business_kind");
            copyIf("business_address");
            copyIf("business_city");
            copyIf("business_province");
            copyIf("business_region");
            copyIf("business_postal_code");
            if (input.mark_verified) {
              profilePatch.verification_status = "verified";
              profilePatch.verified_at = new Date().toISOString();
            }
          }

          await sb.from("profiles").update(profilePatch as any).eq("id", newUserId);

          await logRouteAccess({
            actorId,
            role: "admin",
            label,
            method: "POST",
            outcome: "allowed",
            durationMs: Date.now() - start,
            request,
            targetSummary: {
              email: input.email,
              new_user_id: newUserId,
              account_type: input.account_type,
              roles: input.roles,
            },
          });

          return new Response(JSON.stringify({ ok: true, userId: newUserId, email: input.email }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          await logRouteAccess({
            actorId,
            role: "admin",
            label,
            method: "POST",
            outcome: "error",
            errorMessage: e?.message ?? "Server error",
            durationMs: Date.now() - start,
            request,
          });
          return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), {
            status: 500,
          });
        }
      },

    },
  },
});
